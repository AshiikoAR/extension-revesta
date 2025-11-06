/**
 * Script du Popup - Interface principale de l'extension
 */

const dom = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    error: document.getElementById('error'),
    empty: document.getElementById('empty'),
    
    propertyTitle: document.getElementById('propertyTitle'),
    propertyPrice: document.getElementById('propertyPrice'),
    propertyLocation: document.getElementById('propertyLocation'),
    propertyType: document.getElementById('propertyType'),
    
    aidAmount: document.getElementById('aidAmount'),
    aidPercent: document.getElementById('aidPercent'),
    aidesList: document.getElementById('aidesList'),
    linksList: document.getElementById('linksList'),
    
    errorMessage: document.getElementById('errorMessage'),
    openOptions: document.getElementById('openOptions'),
    openSettings: document.getElementById('openSettings')
};

// État de l'extension
let currentPropertyData = null;

/**
 * Initialiser le popup
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Récupérer les données de la propriété depuis le tab actif
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.log('❌ Pas de tab trouvé');
            showEmpty();
            return;
        }

        console.log('📍 Tab URL:', tab.url);
        
        // Vérifier si on est sur une page d'annonce supportée
        if (!isSupportedSite(tab.url)) {
            console.log('❌ Site non supporté');
            showEmpty();
            return;
        }

        console.log('✅ Site supporté, tentative de récupération des données...');

        // Essayer d'abord d'accéder directement au window.propertyData stocké
        // Le content script l'a mis à disposition globalement
        try {
            console.log('📡 Tentative scripting.executeScript (Manifest v3)...');
            
            // Attendre que le content script ait chargé les données
            let attempts = 0;
            let response = null;
            
            while (attempts < 5) {
                response = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => window.propertyData || null
                });
                
                console.log(`Tentative ${attempts + 1}: Response =`, response);
                
                if (response && response[0] && response[0].result) {
                    console.log('✅ Données trouvées!');
                    break;
                }
                
                attempts++;
                if (attempts < 5) {
                    console.log(`⏳ Attente 500ms avant nouvelle tentative...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            if (response && response[0] && response[0].result) {
                currentPropertyData = response[0].result;
                console.log('✅ Données récupérées via scripting.executeScript:', currentPropertyData);
                analyzeProperty();
                return;
            } else {
                console.log('⚠️ scripting.executeScript: Pas de données après 5 tentatives');
            }
        } catch (execError) {
            console.warn('⚠️ scripting.executeScript échoué:', execError.message);
        }

        // Fallback: Essayer avec sendMessage (ancien système)
        try {
            console.log('📡 Tentative sendMessage...');
            const results = await chrome.tabs.sendMessage(
                tab.id, 
                { type: 'GET_PROPERTY_DATA' },
                { frameId: 0 }
            );
            
            console.log('Response sendMessage:', results);
            
            if (results && results.propertyData) {
                currentPropertyData = results.propertyData;
                console.log('✅ Données récupérées via sendMessage:', currentPropertyData);
                analyzeProperty();
                return;
            }
        } catch (msgError) {
            console.warn('⚠️ sendMessage échoué:', msgError.message);
        }

        // Fallback 2: Essayer d'accéder via sessionStorage (stocké par le content script)
        try {
            console.log('📡 Tentative sessionStorage via scripting.executeScript...');
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    try {
                        const stored = sessionStorage.getItem('leboncoin_propertyData');
                        console.log('📦 sessionStorage value:', stored);
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) {
                        console.error('Error parsing sessionStorage:', e);
                        return null;
                    }
                }
            });
            
            console.log('sessionStorage result:', result);
            
            if (result && result[0] && result[0].result) {
                currentPropertyData = result[0].result;
                console.log('✅ Données récupérées via sessionStorage:', currentPropertyData);
                analyzeProperty();
                return;
            }
        } catch (storageError) {
            console.warn('⚠️ sessionStorage échoué:', storageError.message);
        }

        // Si aucune donnée n'a pu être récupérée
        console.log('❌ Pas de données trouvées après tous les essais');
        console.log('💡 Le content script n\'a peut-être pas encore chargé.');
        console.log('💡 Essayez de rafraîchir la page (F5)');
        showEmpty();
        
    } catch (error) {
        console.error('❌ Erreur initialisation popup:', error);
        showError('Erreur lors du chargement: ' + error.message);
    }
});

/**
 * Vérifier si le site est supporté
 */
function isSupportedSite(url) {
    const supportedDomains = ['leboncoin.fr', 'seloger.com', 'bienici.com'];
    const isSupported = supportedDomains.some(domain => url.includes(domain));
    console.log('URL check:', url, '-> Supporté:', isSupported);
    return isSupported;
}

/**
 * Analyser la propriété et récupérer les aides
 */
async function analyzeProperty() {
    showSection('loading');

    try {
        // Envoyer les données au background worker
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { 
                    type: 'ANALYZE_PROPERTY',
                    propertyData: currentPropertyData
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        if (response.success) {
            displayResults(response.data);
        } else {
            showError(response.error || 'Erreur lors de l\'analyse');
        }
    } catch (error) {
        console.error('Erreur analyse:', error);
        showError('Impossible de récupérer les aides. Vérifiez votre connexion.');
    }
}

/**
 * Afficher les résultats
 */
function displayResults(data) {
    // Propriété
    dom.propertyTitle.textContent = currentPropertyData.titre;
    dom.propertyPrice.textContent = formatNumber(currentPropertyData.prix);
    dom.propertyLocation.textContent = currentPropertyData.localisation;
    dom.propertyType.textContent = getPropertyTypeLabel(currentPropertyData.typeLogement);

    // Estimation
    dom.aidAmount.textContent = formatNumber(data.estimationAide.montantTotal);
    dom.aidPercent.textContent = data.estimationAide.estimationAideEnPourcent;

    // Aides
    displayAides(data.aides);

    // Liens
    displayLinks(data.links);

    showSection('results');
}

/**
 * Afficher la liste des aides
 */
function displayAides(aides) {
    dom.aidesList.innerHTML = '';

    if (!aides || aides.length === 0) {
        dom.aidesList.innerHTML = '<p style="color: #999; text-align: center;">Aucune aide trouvée pour cette propriété.</p>';
        return;
    }

    aides.forEach(aide => {
        const aidElement = document.createElement('div');
        aidElement.className = 'aid-item';
        aidElement.innerHTML = `
            <h5>${aide.nom || 'Aide'}</h5>
            <p>${aide.description || ''}</p>
            ${aide.montantEstime ? `<p class="aid-amount">Jusqu'à ${formatNumber(aide.montantEstime)} €</p>` : ''}
            ${aide.conditions ? `<p><small>Conditions: ${aide.conditions}</small></p>` : ''}
        `;
        dom.aidesList.appendChild(aidElement);
    });
}

/**
 * Afficher les liens utiles
 */
function displayLinks(links) {
    dom.linksList.innerHTML = '';

    if (links) {
        Object.entries(links).forEach(([key, url]) => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${url}" target="_blank">${getLinkLabel(key)} ↗</a>`;
            dom.linksList.appendChild(li);
        });
    }
}

/**
 * Afficher une section
 */
function showSection(section) {
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');

    const element = dom[section];
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Afficher une erreur
 */
function showError(message) {
    dom.errorMessage.textContent = message;
    showSection('error');
}

/**
 * Afficher l'état vide
 */
function showEmpty() {
    showSection('empty');
}

/**
 * Formater un nombre
 */
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Label du type de propriété
 */
function getPropertyTypeLabel(type) {
    const labels = {
        'maison': '🏠 Maison',
        'appartement': '🏢 Appartement',
        'terrain': '🌳 Terrain',
        'autre': 'Autre'
    };
    return labels[type] || 'Autre';
}

/**
 * Label des liens
 */
function getLinkLabel(key) {
    const labels = {
        'mesAidesReno': 'Mes Aides Rénov\'',
        'maprimeRenov': 'MaPrimeRénov\'',
        'france2reno': 'France Rénov'
    };
    return labels[key] || key;
}

// Event listeners
dom.openOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

dom.openSettings?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});
