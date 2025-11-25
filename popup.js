/**
 * Script du Popup - Interface principale de l'extension
 */

const dom = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    error: document.getElementById('error'),
    empty: document.getElementById('empty'),
    propertyDetected: document.getElementById('propertyDetected'),
    analysis: document.getElementById('analysis'),
    
    propertyTitle: document.getElementById('propertyTitle'),
    propertyPrice: document.getElementById('propertyPrice'),
    propertyLocation: document.getElementById('propertyLocation'),
    propertyType: document.getElementById('propertyType'),
    
    detectedTitle: document.getElementById('detectedTitle'),
    detectedPrice: document.getElementById('detectedPrice'),
    detectedLocation: document.getElementById('detectedLocation'),
    detectedType: document.getElementById('detectedType'),
    
    analysisTitle: document.getElementById('analysisTitle'),
    analysisPrice: document.getElementById('analysisPrice'),
    analysisLocation: document.getElementById('analysisLocation'),
    analysisType: document.getElementById('analysisType'),
    analysisSurface: document.getElementById('analysisSurface'),
    analysisCommune: document.getElementById('analysisCommune'),
    analysisDPE: document.getElementById('analysisDPE'),
    analysisBudgetTravaux: document.getElementById('analysisBudgetTravaux'),
    analysisStatut: document.getElementById('analysisStatut'),
    analysisMenage: document.getElementById('analysisMenage'),
    
    aidAmount: document.getElementById('aidAmount'),
    aidPercent: document.getElementById('aidPercent'),
    aidesList: document.getElementById('aidesList'),
    linksList: document.getElementById('linksList'),
    
    errorMessage: document.getElementById('errorMessage'),
    openOptions: document.getElementById('openOptions'),
    openSettings: document.getElementById('openSettings'),
    analyzeButton: document.getElementById('analyzeButton'),
    calculateAidsButton: document.getElementById('calculateAidsButton')
};

// État de l'extension
let currentPropertyData = null;

/**
 * Initialiser le popup
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Afficher la section vide par défaut immédiatement
        showEmpty();
        
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
                showPropertyDetected();
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
                showPropertyDetected();
                return;
            }
        } catch (msgError) {
            console.warn('⚠️ sendMessage échoué:', msgError.message);

            // Si le content script n'est pas présent, essayer d'injecter le parser LeBonCoin puis retenter
            try {
                console.log('📡 Tentative d\'injection du content script LeBonCoin puis retry sendMessage...');
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-scripts/leboncoin.js']
                });

                // Petite attente pour laisser le script s'initialiser
                await new Promise(resolve => setTimeout(resolve, 300));

                const retry = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROPERTY_DATA' });
                console.log('Retry sendMessage response:', retry);
                if (retry && retry.propertyData) {
                    currentPropertyData = retry.propertyData;
                    console.log('✅ Données récupérées après injection:', currentPropertyData);
                    showPropertyDetected();
                    return;
                }
            } catch (retryError) {
                console.warn('⚠️ Injection/Retry échoué:', retryError && retryError.message ? retryError.message : retryError);
            }
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
    const supportedDomains = ['leboncoin.fr'];
    const isSupported = supportedDomains.some(domain => url.includes(domain));
    console.log('URL check:', url, '-> Supporté:', isSupported);
    return isSupported;
}

/**
 * Afficher les données de la propriété détectées (sans analyser)
 */
function showPropertyDetected() {
    // Masquer toutes les sections
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');
    dom.analysis.classList.add('hidden');
    
    // Afficher la section propertyDetected
    dom.propertyDetected.classList.remove('hidden');
    
    if (!currentPropertyData) return;
    
    // Remplir les informations
    dom.detectedTitle.textContent = currentPropertyData.titre || 'Propriété';
    dom.detectedPrice.textContent = currentPropertyData.prix?.toLocaleString() || '?';
    dom.detectedLocation.textContent = currentPropertyData.localisation || currentPropertyData.codePostal || '?';
    dom.detectedType.textContent = currentPropertyData.typeLogement || '?';
}

/**
 * Afficher l'analyse complète du bien
 */
async function showAnalysis() {
    // Masquer toutes les sections
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');
    dom.propertyDetected.classList.add('hidden');
    
    // Afficher la section analysis
    dom.analysis.classList.remove('hidden');
    
    if (!currentPropertyData) return;
    
    // Charger la config utilisateur
    const userConfig = await new Promise(resolve => {
        chrome.storage.sync.get(['userConfig'], (result) => {
            resolve(result.userConfig || {});
        });
    });
    
    // Remplir les informations de base
    dom.analysisTitle.textContent = currentPropertyData.titre || 'Propriété';
    dom.analysisPrice.textContent = currentPropertyData.prix?.toLocaleString() || '?';
    dom.analysisLocation.textContent = currentPropertyData.localisation || currentPropertyData.codePostal || '?';
    dom.analysisType.textContent = currentPropertyData.typeLogement || '?';
    dom.analysisSurface.textContent = currentPropertyData.surface || userConfig.surfaceLogement || '?';
    
    // Remplir les données d'analyse
    dom.analysisCommune.textContent = `${currentPropertyData.codePostal || '?'} (converti en code INSEE)`;
    
    const dpeLabels = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' };
    const dpeActuel = userConfig.dpeActuel || 6;
    const dpeVise = userConfig.dpeVise || 2;
    dom.analysisDPE.textContent = `${dpeLabels[dpeActuel]} → ${dpeLabels[dpeVise]}`;
    
    dom.analysisBudgetTravaux.textContent = `${(userConfig.budgetTravaux || 50000).toLocaleString()} €`;
    
    const statutLabels = { 'propriétaire': 'Propriétaire occupant', 'bailleur': 'Propriétaire bailleur' };
    dom.analysisStatut.textContent = statutLabels[userConfig.statut] || 'Propriétaire occupant';
    
    const personnes = userConfig.nombrePersonnes || 3;
    const revenus = userConfig.revenus || 25000;
    dom.analysisMenage.textContent = `${personnes} personne${personnes > 1 ? 's' : ''} - ${revenus.toLocaleString()} €/an`;
}

/**
 * Analyser la propriété et afficher les aides
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
            // Message plus clair pour les erreurs de code postal
            const errorMsg = response.error || 'Erreur lors de l\'analyse';
            if (errorMsg.includes('non reconnu') || errorMsg.includes('non supporté')) {
                showError(`⚠️ ${errorMsg}\n\nL'API Mes Aides Réno ne supporte pas encore tous les codes postaux français. Les estimations ne sont pas disponibles pour cette localisation.`);
            } else {
                showError(errorMsg);
            }
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
    const percentEstimate = currentPropertyData.prix 
        ? Math.round((data.estimationAide.montantTotal / currentPropertyData.prix) * 100)
        : 0;
    dom.aidPercent.textContent = percentEstimate;

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
    dom.propertyDetected.classList.add('hidden');
    dom.analysis.classList.add('hidden');

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
        'mesAidesReno': 'Mes Aides Réno',
        'franceRenov': 'France Rénov\''
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

// Gestion du bouton d'analyse (affiche l'analyse du bien)
dom.analyzeButton?.addEventListener('click', async () => {
    if (currentPropertyData) {
        await showAnalysis();
    }
});

// Gestion du bouton de calcul des aides (lance l'API)
dom.calculateAidsButton?.addEventListener('click', async () => {
    if (currentPropertyData) {
        await analyzeProperty();
    }
});
