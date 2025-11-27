/**
 * Script du Popup - Interface principale de l'extension
 */

const dom = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    error: document.getElementById('error'),
    empty: document.getElementById('empty'),
    analysis: document.getElementById('analysis'),
    
    propertyTitle: document.getElementById('propertyTitle'),
    propertyPrice: document.getElementById('propertyPrice'),
    propertyPricePerM2: document.getElementById('propertyPricePerM2'),
    
    analysisTitle: document.getElementById('analysisTitle'),
    analysisPrice: document.getElementById('analysisPrice'),
    analysisPricePerM2: document.getElementById('analysisPricePerM2'),
    analysisSummaryType: document.getElementById('analysisSummaryType'),
    analysisSummarySurface: document.getElementById('analysisSummarySurface'),
    analysisCommune: document.getElementById('analysisCommune'),
    analysisDPE: document.getElementById('analysisDPE'),
    analysisBudgetTravaux: document.getElementById('analysisBudgetTravaux'),
    analysisStatut: document.getElementById('analysisStatut'),
    analysisMenage: document.getElementById('analysisMenage'),
    
    aidAmount: document.getElementById('aidAmount'),
    aidPercent: document.getElementById('aidPercent'),
    aidesList: document.getElementById('aidesList'),
    
    emailSection: document.getElementById('emailSection'),
    emailForm: document.getElementById('emailForm'),
    emailNom: document.getElementById('emailNom'),
    emailPrenom: document.getElementById('emailPrenom'),
    emailAddress: document.getElementById('emailAddress'),
    emailMessage: document.getElementById('emailMessage'),
    showEmailFormButton: document.getElementById('showEmailFormButton'),
    backToResults: document.getElementById('backToResults'),
    
    errorMessage: document.getElementById('errorMessage'),
    openOptions: document.getElementById('openOptions'),
    openSettings: document.getElementById('openSettings'),
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
                showAnalysis();
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
                showAnalysis();
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
                    showAnalysis();
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
 * Afficher l'analyse complète du bien
 */
async function showAnalysis() {
    // Masquer toutes les sections
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');
    
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
    
    // Calculer le prix au m²
    const surface = currentPropertyData.surface || userConfig.surfaceLogement;
    const prix = currentPropertyData.prix;
    if (prix && surface) {
        const prixM2 = Math.round(prix / surface);
        dom.analysisPricePerM2.textContent = prixM2.toLocaleString();
    } else {
        dom.analysisPricePerM2.textContent = '?';
    }
    
    // Remplir les données d'analyse (dans le récapitulatif)
    const typeLabels = { 'appartement': 'Appartement', 'maison': 'Maison', 'terrain': 'Terrain' };
    dom.analysisSummaryType.textContent = typeLabels[currentPropertyData.typeLogement] || currentPropertyData.typeLogement || '?';
    
    dom.analysisSummarySurface.textContent = surface ? `${surface} m²` : '?';
    
    const commune = currentPropertyData.ville 
        ? `${currentPropertyData.codePostal} - ${currentPropertyData.ville}` 
        : (currentPropertyData.codePostal || '?');
    dom.analysisCommune.textContent = commune;
    
    const dpeLabels = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' };
    
    // Utiliser le DPE de l'annonce si disponible, sinon celui de l'utilisateur
    const dpeActuel = currentPropertyData.dpe || userConfig.dpeActuel || 6;
    const dpeVise = userConfig.dpeVise || 2;
    
    // Masquer la ligne DPE si le DPE actuel est déjà A ou B
    const dpeItem = document.querySelector('.analysis-item:has(#analysisDPE)');
    if (dpeActuel === 1 || dpeActuel === 2) {
        if (dpeItem) dpeItem.style.display = 'none';
    } else {
        if (dpeItem) dpeItem.style.display = '';
        // Afficher la source du DPE
        const dpeSource = currentPropertyData.dpe ? '' : ' (tiré de vos paramètres)';
        dom.analysisDPE.textContent = `${dpeLabels[dpeActuel]}${dpeSource} → ${dpeLabels[dpeVise]}`;
    }
    
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
    
    // Calculer le prix au m²
    const surface = currentPropertyData.surface;
    const prix = currentPropertyData.prix;
    if (prix && surface) {
        const prixM2 = Math.round(prix / surface);
        dom.propertyPricePerM2.textContent = prixM2.toLocaleString();
    } else {
        dom.propertyPricePerM2.textContent = '?';
    }

    // Estimation avec animation
    const montantTotal = data.estimationAide.montantTotal;
    const percentEstimate = currentPropertyData.prix 
        ? Math.round((montantTotal / currentPropertyData.prix) * 100)
        : 0;
    
    // Animer le montant et le pourcentage
    animateCounter(dom.aidAmount, 0, montantTotal, 1500, true);
    animateCounter(dom.aidPercent, 0, percentEstimate, 1500, false);

    // Aides
    displayAides(data.aides);
    
    // Pré-remplir les champs email avec les données utilisateur
    prefillEmailForm();

    showSection('results');
}

/**
 * Pré-remplir le formulaire email avec les données utilisateur
 */
async function prefillEmailForm() {
    const userConfig = await new Promise(resolve => {
        chrome.storage.sync.get(['userConfig'], (result) => {
            resolve(result.userConfig || {});
        });
    });
    
    if (userConfig.nom) dom.emailNom.value = userConfig.nom;
    if (userConfig.prenom) dom.emailPrenom.value = userConfig.prenom;
    if (userConfig.email) dom.emailAddress.value = userConfig.email;
}

/**
 * Afficher la liste des aides
 */
function displayAides(aides) {
    dom.aidesList.innerHTML = '';

    if (!aides || aides.length === 0) {
        dom.aidesList.innerHTML = '<p>Aucune aide trouvée pour cette propriété.</p>';
        return;
    }

    aides.forEach(aide => {
        const aidElement = document.createElement('div');
        aidElement.className = 'aide-item';
        aidElement.innerHTML = `
            <h5 title="Max ${aide.description || ''}.">${aide.nom || 'Aide'}</h5>
            ${aide.montantEstime ? `<p>Jusqu'à ${formatNumber(aide.montantEstime)} €</p>` : ''}
        `;
        dom.aidesList.appendChild(aidElement);
    });
}

/**
 * Afficher une section
 */
function showSection(section) {
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');
    dom.analysis.classList.add('hidden');
    dom.emailSection.classList.add('hidden');

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
 * Animer un compteur numérique
 */
function animateCounter(element, start, end, duration, withFormat = true) {
    if (!element) return;
    
    const startTime = performance.now();
    const range = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Utiliser une fonction d'easing pour un effet plus naturel (ease-out)
        const easeOutQuad = progress * (2 - progress);
        const current = Math.round(start + range * easeOutQuad);
        
        element.textContent = withFormat ? formatNumber(current) : current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // S'assurer que la valeur finale est exacte
            element.textContent = withFormat ? formatNumber(end) : end;
        }
    }
    
    requestAnimationFrame(update);
}

// Event listeners
dom.openOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

dom.openSettings?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Gestion du bouton de calcul des aides (lance l'API)
dom.calculateAidsButton?.addEventListener('click', async () => {
    if (currentPropertyData) {
        await analyzeProperty();
    }
});

// Gestion du bouton "Récupérer mon compte-rendu"
dom.showEmailFormButton?.addEventListener('click', () => {
    // Pré-remplir le formulaire
    prefillEmailForm();
    
    // Afficher la section email
    showSection('emailSection');
});

// Gestion du bouton retour aux résultats
dom.backToResults?.addEventListener('click', () => {
    showSection('results');
});

// Gestion de l'envoi par email
dom.emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nom = dom.emailNom.value.trim();
    const prenom = dom.emailPrenom.value.trim();
    const email = dom.emailAddress.value.trim();
    
    if (!nom || !prenom || !email) {
        showEmailMessage('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    // Vérification basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showEmailMessage('Veuillez entrer une adresse email valide', 'error');
        return;
    }
    
    try {
        // Préparer le contenu du compte-rendu
        const aidesText = Array.from(dom.aidesList.querySelectorAll('.aide-item'))
            .map(item => {
                const name = item.querySelector('h5')?.textContent || '';
                const amount = item.querySelector('.aide-amount')?.textContent || '';
                return `• ${name}: ${amount}`;
            }).join('\n');
        
        const emailContent = {
            to: email,
            nom: nom,
            prenom: prenom,
            property: {
                titre: currentPropertyData.titre,
                prix: currentPropertyData.prix,
                localisation: currentPropertyData.localisation || currentPropertyData.codePostal,
                surface: currentPropertyData.surface
            },
            aides: {
                montantTotal: dom.aidAmount.textContent,
                pourcentage: dom.aidPercent.textContent,
                liste: aidesText
            }
        };
        
        // Simuler l'envoi (à remplacer par un vrai service d'email)
        console.log('📧 Envoi du compte-rendu:', emailContent);
        
        // Simulation d'un délai d'envoi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showEmailMessage(`✅ Compte-rendu envoyé à ${email}`, 'success');
        
        // Réinitialiser le formulaire après 3 secondes
        setTimeout(() => {
            dom.emailMessage.classList.add('hidden');
        }, 3000);
        
    } catch (error) {
        console.error('Erreur envoi email:', error);
        showEmailMessage('❌Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
    }
});

/**
 * Afficher un message dans le formulaire email
 */
function showEmailMessage(message, type) {
    dom.emailMessage.textContent = message;
    dom.emailMessage.className = `email-message ${type}`;
    dom.emailMessage.classList.remove('hidden');
}
