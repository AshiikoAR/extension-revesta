/**
 * popup.js — Interface principale de l'extension REVESTA
 *
 * Responsabilités :
 *  1. Détecter si l'onglet actif est une annonce immobilière supportée.
 *  2. Récupérer les données extraites par le content script via 3 stratégies :
 *       a) scripting.executeScript → window.propertyData  (MV3, prioritaire)
 *       b) tabs.sendMessage → 'GET_PROPERTY_DATA'         (fallback messaging)
 *       c) scripting.executeScript → sessionStorage        (fallback stockage)
 *  3. Afficher le récapitulatif du bien et l'estimation des aides.
 *  4. Construire le payload complet et l'envoyer au backend REVESTA via background.js.
 */

// ─────────────────────────────────────────────────────────────
// Références DOM — tous les éléments UI manipulés dans ce script
// ─────────────────────────────────────────────────────────────
const dom = {
    // Sections de navigation principales
    loading:  document.getElementById('loading'),   // Spinner de chargement
    results:  document.getElementById('results'),   // Résultats des aides
    error:    document.getElementById('error'),     // Message d'erreur
    empty:    document.getElementById('empty'),     // État vide (site non supporté)
    analysis: document.getElementById('analysis'), // Récapitulatif du bien

    // Informations du bien (section results)
    propertyTitle:      document.getElementById('propertyTitle'),
    propertyPrice:      document.getElementById('propertyPrice'),
    propertyPricePerM2: document.getElementById('propertyPricePerM2'),

    // Récapitulatif du bien (section analysis)
    analysisTitle:          document.getElementById('analysisTitle'),
    analysisPrice:          document.getElementById('analysisPrice'),
    analysisPricePerM2:     document.getElementById('analysisPricePerM2'),
    analysisSummaryType:    document.getElementById('analysisSummaryType'),
    analysisSummarySurface: document.getElementById('analysisSummarySurface'),
    analysisCommune:        document.getElementById('analysisCommune'),
    analysisDPE:            document.getElementById('analysisDPE'),
    analysisBudgetTravaux:  document.getElementById('analysisBudgetTravaux'),
    analysisStatut:         document.getElementById('analysisStatut'),
    analysisMenage:         document.getElementById('analysisMenage'),

    // Bloc estimation aides
    aidAmount:  document.getElementById('aidAmount'),  // Montant total animé
    aidPercent: document.getElementById('aidPercent'), // % du prix du bien
    aidesList:  document.getElementById('aidesList'),  // Liste des aides éligibles

    // Formulaire email (envoi simulation)
    emailSection:        document.getElementById('emailSection'),
    emailForm:           document.getElementById('emailForm'),
    emailNom:            document.getElementById('emailNom'),
    emailPrenom:         document.getElementById('emailPrenom'),
    emailAddress:        document.getElementById('emailAddress'),
    emailTelephone:      document.getElementById('emailTelephone'),
    emailMessage:        document.getElementById('emailMessage'),       // Zone de feedback
    showEmailFormButton: document.getElementById('showEmailFormButton'),
    backToResults:       document.getElementById('backToResults'),

    // Divers
    errorMessage:        document.getElementById('errorMessage'),
    openOptions:         document.getElementById('openOptions'),
    openSettings:        document.getElementById('openSettings'),
    calculateAidsButton: document.getElementById('calculateAidsButton')
};

// Données de l'annonce extraites par le content script (partagées entre les fonctions)
let currentPropertyData = null;

// ─────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Point d'entrée du popup.
 * Vérifie que l'onglet actif est une annonce supportée, puis tente de
 * récupérer les données du content script en 3 stratégies successives.
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
        
        // Vérifier si l'URL correspond à une annonce de vente immobilière
        if (!isValidPropertyUrl(tab.url)) {
            console.log('❌ URL non valide (pas une annonce ventes_immobilieres)');
            showEmpty();
            return;
        }

        console.log('✅ Site supporté, tentative de récupération des données...');

        // ── Stratégie 1 : window.propertyData via scripting.executeScript (MV3) ──
        // Le content script expose ses données dans window.propertyData dès son init.
        // On réessaie 5 fois (avec 500 ms d'intervalle) car la page peut mettre
        // quelques instants à charger complètement avant que le script s'exécute.
        try {
            console.log('📡 Tentative scripting.executeScript (Manifest v3)...');

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

        // ── Stratégie 2 : tabs.sendMessage → 'GET_PROPERTY_DATA' ──
        // Le content script écoute ce message et renvoie window.propertyData.
        // Si le listener n'est pas enregistré (script pas encore injecté),
        // on tente d'injecter manuellement leboncoin.js puis on réessaie.
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

            // Sous-fallback : injecter le content script à la volée puis réessayer
            try {
                console.log('📡 Injection du content script LeBonCoin + retry sendMessage...');
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-scripts/leboncoin.js']
                });

                // Laisser au script le temps de s'initialiser
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

        // ── Stratégie 3 : sessionStorage (backup écrit par le content script) ──
        // Le content script stocke aussi les données en sessionStorage au cas où
        // les deux premières stratégies échouent (ex : contexte MV3 isolé).
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

// ─────────────────────────────────────────────────────────────
// Utilitaires de détection d'URL
// ─────────────────────────────────────────────────────────────

/**
 * Vérifie si l'URL appartient à un site immobilier supporté.
 * @param {string} url
 * @returns {boolean}
 */
function isSupportedSite(url) {
    const supportedDomains = ['leboncoin.fr'];
    const isSupported = supportedDomains.some(domain => url.includes(domain));
    console.log('URL check:', url, '-> Supporté:', isSupported);
    return isSupported;
}

/**
 * Vérifie que l'URL est bien une annonce de vente immobilière LeBonCoin.
 * Format attendu : https://www.leboncoin.fr/ad/ventes_immobilieres/{id}
 * @param {string} url
 * @returns {boolean}
 */
function isValidPropertyUrl(url) {
    const regex = /^https:\/\/www\.leboncoin\.fr\/ad\/ventes_immobilieres\/\d+/;
    return regex.test(url);
}

// ─────────────────────────────────────────────────────────────
// Affichage des écrans
// ─────────────────────────────────────────────────────────────

/**
 * Affiche le récapitulatif du bien avec les paramètres utilisateur.
 * Priorité DPE : annonce > profil utilisateur > valeur par défaut (F).
 * La ligne DPE est masquée si le bien est déjà classé A ou B (pas de travaux nécessaires).
 */
async function showAnalysis() {
    // Masquer toutes les sections, afficher uniquement 'analysis'
    dom.loading.classList.add('hidden');
    dom.results.classList.add('hidden');
    dom.error.classList.add('hidden');
    dom.empty.classList.add('hidden');
    dom.analysis.classList.remove('hidden');

    if (!currentPropertyData) return;

    // Récupérer la config sauvée via options.html
    const userConfig = await new Promise(resolve => {
        chrome.storage.sync.get(['userConfig'], (result) => resolve(result.userConfig || {}));
    });

    // ── Informations de base ──
    dom.analysisTitle.textContent = currentPropertyData.titre || 'Propriété';
    dom.analysisPrice.textContent = currentPropertyData.prix?.toLocaleString() || '?';

    // Prix au m² : surface issue de l'annonce, sinon du profil utilisateur
    const surface = currentPropertyData.surface || userConfig.surfaceLogement;
    const prix    = currentPropertyData.prix;
    dom.analysisPricePerM2.textContent = (prix && surface)
        ? Math.round(prix / surface).toLocaleString()
        : '?';

    // ── Récapitulatif du bien ──
    const typeLabels = { appartement: 'Appartement', maison: 'Maison', terrain: 'Terrain' };
    dom.analysisSummaryType.textContent = typeLabels[currentPropertyData.typeLogement] || currentPropertyData.typeLogement || '?';
    dom.analysisSummarySurface.textContent = surface ? `${surface} m²` : '?';
    dom.analysisCommune.textContent = currentPropertyData.ville
        ? `${currentPropertyData.codePostal} - ${currentPropertyData.ville}`
        : (currentPropertyData.codePostal || '?');

    // ── DPE : numérique (1–7) → lettre (A–G) ──
    // Le content script retourne un DPE numérique ; on le convertit en lettre ici.
    const dpeLabels = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' };
    const dpeActuel = currentPropertyData.dpe || userConfig.dpeActuel || 6; // 6 = F par défaut
    const dpeVise   = userConfig.dpeVise || 2;                              // 2 = B par défaut

    const dpeItem = document.querySelector('.analysis-item:has(#analysisDPE)');
    if (dpeActuel === 1 || dpeActuel === 2) {
        // Bien déjà très bien classé : on masque la ligne pour ne pas induire en erreur
        if (dpeItem) dpeItem.style.display = 'none';
    } else {
        if (dpeItem) dpeItem.style.display = '';
        const dpeSource = currentPropertyData.dpe ? '' : ' (par défaut)';
        dom.analysisDPE.textContent = `${dpeLabels[dpeActuel]}${dpeSource} → ${dpeLabels[dpeVise]}`;
    }

    // ── Profil utilisateur ──
    dom.analysisBudgetTravaux.textContent = `${(userConfig.budgetTravaux || 50000).toLocaleString()} €`;
    const statutLabels = { 'propriétaire': 'Propriétaire occupant', bailleur: 'Propriétaire bailleur' };
    dom.analysisStatut.textContent = statutLabels[userConfig.statut] || 'Propriétaire occupant';
    const personnes = userConfig.nombrePersonnes || 3;
    const revenus   = userConfig.revenus || 25000;
    dom.analysisMenage.textContent = `${personnes} personne${personnes > 1 ? 's' : ''} • ${revenus.toLocaleString()} €/an`;
}

/**
 * Déclenche le calcul des aides via le service worker (qui appelle l'API Mes Aides Réno).
 * Affiche un spinner pendant la requête, puis appelle displayResults() ou showError().
 */
async function analyzeProperty() {
    showSection('loading');

    try {
        // Le background worker fait le fetch cross-origin (requête GET vers mesaidesreno.beta.gouv.fr)
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: 'ANALYZE_PROPERTY', propertyData: currentPropertyData },
                (response) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(response);
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
 * Affiche la section résultats avec les aides éligibles et les compteurs animés.
 * @param {object} data - Réponse du background worker (aides + estimationAide)
 */
function displayResults(data) {
    // ── Informations du bien ──
    dom.propertyTitle.textContent = currentPropertyData.titre;
    dom.propertyPrice.textContent = formatNumber(currentPropertyData.prix);
    const surface = currentPropertyData.surface;
    const prix    = currentPropertyData.prix;
    dom.propertyPricePerM2.textContent = (prix && surface)
        ? Math.round(prix / surface).toLocaleString()
        : '?';

    // ── Estimation des aides ──
    const montantTotal    = data.estimationAide.montantTotal;
    // Le pourcentage représente ce que les aides couvrent du prix d'achat
    const percentEstimate = prix ? (montantTotal / prix) * 100 : 0;

    const aidEstimateText = document.getElementById('aidEstimateText');

    if (montantTotal === 0) {
        // Aucune subvention disponible → message d'absence
        aidEstimateText.innerHTML = 'Aïe... Pas de subventions pour ce bien !&ensp;&#x1F62C;';
    } else {
        // On réécrit le HTML pour injecter le <span> animé, puis on récupère la nouvelle référence
        aidEstimateText.innerHTML = '&#x1F4B0;&ensp;Subventions estimées &bull; Soit <span id="aidPercent">0</span>% du bien !';
        const aidPercentElement = document.getElementById('aidPercent');

        // Compteurs animés : montant en euros (arrondi) et pourcentage (1 décimale)
        animateCounter(dom.aidAmount, 0, montantTotal, 1500, true, false);
        animateCounter(aidPercentElement, 0, percentEstimate, 1500, false, true);
    }

    displayAides(data.aides);
    prefillEmailForm();   // Pré-remplir le formulaire email avec le profil sauvé
    showSection('results');
}

/**
 * Pré-remplit les champs du formulaire email avec les données du profil
 * sauvées dans chrome.storage.sync (via options.html).
 * On ne remplace que les champs non vides pour ne pas écraser une saisie manuelle.
 */
async function prefillEmailForm() {
    const userConfig = await new Promise(resolve => {
        chrome.storage.sync.get(['userConfig'], (result) => resolve(result.userConfig || {}));
    });

    if (userConfig.nom)       dom.emailNom.value       = userConfig.nom;
    if (userConfig.prenom)    dom.emailPrenom.value    = userConfig.prenom;
    if (userConfig.email)     dom.emailAddress.value   = userConfig.email;
    if (userConfig.telephone) dom.emailTelephone.value = userConfig.telephone;
}

/**
 * Affiche la liste des aides avec infos complètes (nom, montant, type, détails).
 * Chaque élément HTML reçoit des attributs data-type et data-valeur pour reconstruction du payload.
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
        
        // Stocker le type (subvention ou prêt) dans un attribut data pour reconstruction
        aidElement.setAttribute('data-type', aide.type || 'subvention');
        // Stocker le montant estimé en euros pour envoi au backend
        aidElement.setAttribute('data-valeur', aide.montantEstime || 0);
        
        // Pour les prêts, afficher le taux et la durée
        let montantInfo = '';
        if (aide.montantEstime) {
            if (aide.details) {
                montantInfo = `${aide.details} &bull; Jusqu'à ${formatNumber(aide.montantEstime)} €`;
            } else {
                montantInfo = `Subvention directe &bull; ${formatNumber(aide.montantEstime)} €`;
            }
        }
        
        // Mettre la première lettre en majuscule
        const nomAide = aide.nom || 'Aide';
        const nomAideCapitalized = nomAide.charAt(0).toUpperCase() + nomAide.slice(1);
        
        aidElement.innerHTML = `
            <h5 title="${aide.description || ''} maximum">${nomAideCapitalized}</h5>
            ${montantInfo ? `<p>${montantInfo}</p>` : ''}
        `;
        dom.aidesList.appendChild(aidElement);
    });
}

// ─────────────────────────────────────────────────────────────
// Navigation entre sections
// ─────────────────────────────────────────────────────────────

/**
 * Affiche une section et masque toutes les autres.
 * @param {'loading'|'results'|'error'|'empty'|'analysis'|'emailSection'} section
 */
function showSection(section) {
    // Masquer toutes les sections connues
    ['loading', 'results', 'error', 'empty', 'analysis', 'emailSection'].forEach(key => {
        dom[key]?.classList.add('hidden');
    });
    // Afficher uniquement la section demandée
    dom[section]?.classList.remove('hidden');
}

/**
 * Affiche la section erreur avec un message.
 * @param {string} message
 */
function showError(message) {
    dom.errorMessage.textContent = message;
    showSection('error');
}

/** Affiche la section vide (site non supporté ou pas d'annonce détectée). */
function showEmpty() {
    showSection('empty');
}

// ─────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────

/**
 * Formate un nombre en notation française (ex : 15000 → « 15 000»).
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Retourne le label lisible du type de bien.
 * @param {string} type - 'maison'|'appartement'|'terrain'|'autre'
 * @returns {string}
 */
function getPropertyTypeLabel(type) {
    const labels = { maison: '🏠 Maison', appartement: '🏢 Appartement', terrain: '🌳 Terrain', autre: 'Autre' };
    return labels[type] || 'Autre';
}

/**
 * Anime un compteur numérique avec un effet ease-out.
 * Utilisé pour afficher le montant des aides et le pourcentage.
 *
 * @param {HTMLElement} element      - Élément dont le textContent sera mis à jour
 * @param {number}      start        - Valeur de départ (généralement 0)
 * @param {number}      end          - Valeur finale
 * @param {number}      duration     - Durée de l'animation en ms
 * @param {boolean}     withFormat   - Si true, formate en notation française (ex : « 15 000»)
 * @param {boolean}     withDecimals - Si true, affiche 1 décimale (ex : « 3.4 %»)
 */
function animateCounter(element, start, end, duration, withFormat = true, withDecimals = false) {
    if (!element) return;

    const startTime = performance.now();
    const range     = end - start;

    // Fonction récursive appelée à chaque frame
    function update(currentTime) {
        const elapsed  = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing ease-out quadratique : décélère en fin d'animation pour un rendu naturel
        const easeOut = progress * (2 - progress);
        const current = start + range * easeOut;

        element.textContent = withDecimals
            ? current.toFixed(1)
            : (withFormat ? formatNumber(Math.round(current)) : Math.round(current));

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Forcer la valeur finale exacte pour éviter les erreurs d'arrondi
            element.textContent = withDecimals
                ? end.toFixed(1)
                : (withFormat ? formatNumber(Math.round(end)) : Math.round(end));
        }
    }

    requestAnimationFrame(update);
}

// ─────────────────────────────────────────────────────────────
// Event listeners — navigation et actions utilisateur
// ─────────────────────────────────────────────────────────────

// Ouvrir la page de configuration (options.html)
dom.openOptions?.addEventListener('click', () => chrome.runtime.openOptionsPage());
dom.openSettings?.addEventListener('click', () => chrome.runtime.openOptionsPage());

// Lancer le calcul des aides via l'API Mes Aides Réno
dom.calculateAidsButton?.addEventListener('click', async () => {
    if (currentPropertyData) await analyzeProperty();
});

// Afficher le formulaire d'envoi du compte-rendu
dom.showEmailFormButton?.addEventListener('click', () => {
    prefillEmailForm();   // Pré-remplir avec le profil sauvé
    showSection('emailSection');
});

// Retour depuis le formulaire email vers les résultats
dom.backToResults?.addEventListener('click', () => showSection('results'));

// ─────────────────────────────────────────────────────────────
// Envoi de la simulation au backend
// ─────────────────────────────────────────────────────────────

/**
 * Soumission du formulaire email.
 * Valide les champs, construit le payload complet (annonce + utilisateur + simulation)
 * et l'envoie au backend REVESTA (POST /simulations) via le service worker.
 *
 * Les helpers de normalisation garantissent que les valeurs envoyées
 * respectent les enums attendus par l'API Laravel (minuscules, sans accents, etc.).
 */
dom.emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nom       = dom.emailNom.value.trim();
    const prenom    = dom.emailPrenom.value.trim();
    const email     = dom.emailAddress.value.trim();
    const telephone = dom.emailTelephone.value.trim();

    // ── Validation des champs ──
    if (!nom || !prenom || !email) {
        showEmailMessage('Veuillez remplir tous les champs', 'error');
        return;
    }
    // Regex email basique (pas de bibliothèque externe)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showEmailMessage('Veuillez entrer une adresse email valide', 'error');
        return;
    }
    // Téléphone optionnel — on accepte les formats internationaux (min 10 caractères)
    if (telephone && !/^[0-9 +().-]{10,}$/.test(telephone)) {
        showEmailMessage('Numéro de téléphone invalide', 'error');
        return;
    }

    // Désactiver le bouton pendant l'envoi pour éviter les double-clics
    const submitBtn      = dom.emailForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = 'Envoi en cours...&ensp;<i class="bx bx-loader-alt bx-spin"></i>';

    try {
        // Récupérer le profil complet sauvé via options.html
        const userConfig = await new Promise(resolve => {
            chrome.storage.sync.get(['userConfig'], (result) => resolve(result.userConfig || {}));
        });

        // ── Helpers de normalisation ──
        // Convertit un DPE numérique (1–7) en lettre (A–G) attendu par le backend Laravel
        const dpeMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' };

        // S'assure que le type de logement est dans l'enum backend : maison|appartement|terrain|autre
        const normalizeTypeLogement = (value) => {
            const v = (value || '').toString().trim().toLowerCase();
            if (v === 'maison')      return 'maison';
            if (v === 'appartement') return 'appartement';
            if (v === 'terrain')     return 'terrain';
            return 'autre';
        };

        // S'assure que le statut est dans l'enum backend : propriétaire|bailleur
        const normalizeStatut = (value) => {
            const v = (value || '').toString().trim().toLowerCase();
            if (v === 'bailleur' || v.includes('bailleur')) return 'bailleur';
            if (v === 'propriétaire' || v === 'proprietaire' || v.includes('occupant')) return 'propriétaire';
            return 'propriétaire'; // Valeur inconnue → propriétaire occupant par défaut
        };

        // Nettoie un montant affiché dans le DOM (ex : « 15 000,50 €» → 15000.5)
        const normalizeAmount = (value) => {
            if (value == null) return 0;
            const cleaned = String(value).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            const parsed  = Number.parseFloat(cleaned);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        // ── Reconstruction des aides depuis le DOM (écran résultats) ──
        // On lit les cartes .aide-item affichées pour reconstituer aides_details
        // au format attendu par le backend : [{ nom, detail, type, valeur }]
        const aidesFromDom = Array.from(dom.aidesList.querySelectorAll('.aide-item')).map(item => ({
            nom:    item.querySelector('h5')?.textContent || '',
            detail: item.querySelector('p')?.textContent  || '',
            type:   item.getAttribute('data-type') || 'subvention',  // 'subvention' ou 'prêt'
            valeur: parseInt(item.getAttribute('data-valeur') || '0', 10) // Montant en euros
        }));
        const aidesDetails = aidesFromDom
            .filter(aide => aide.nom)  // Le backend refuse les objets sans nom
            .map(aide => ({ nom: aide.nom, detail: aide.detail || null, type: aide.type, valeur: aide.valeur }));

        // Filtrer les images pour ne garder que les URLs http/https valides
        const validImages = Array.isArray(currentPropertyData.images)
            ? Array.from(new Set(currentPropertyData.images.filter(url => /^https?:\/\//i.test(url))))
            : [];

        // ── Payload complet envoyé au backend POST /simulations ──
        const payload = {
            // Données extraites de l'annonce immobilière
            annonce: {
                site:            currentPropertyData.site,
                titre:           currentPropertyData.titre,
                prix:            currentPropertyData.prix,
                localisation:    currentPropertyData.localisation,
                ville:           currentPropertyData.ville,
                code_postal:     currentPropertyData.codePostal,
                surface:         currentPropertyData.surface,
                pieces:          currentPropertyData.pieces,
                description:     currentPropertyData.description,
                type_logement:   normalizeTypeLogement(currentPropertyData.typeLogement),
                dpe:             dpeMap[currentPropertyData.dpe] || currentPropertyData.dpe || null,
                etage:           currentPropertyData.etage != null ? String(currentPropertyData.etage) : null,
                type_travaux:    currentPropertyData.typeWork,
                images:          validImages,
                url:             currentPropertyData.url,
                date_extraction: currentPropertyData.dateExtraction
            },

            // Profil de l'utilisateur sauvé dans options.html
            utilisateur: {
                nom:                  nom,
                prenom:               prenom,
                email:                email,
                telephone:            telephone || null,
                statut:               normalizeStatut(userConfig.statut),
                code_postal:          userConfig.codePostal || null,
                revenus:              userConfig.revenus || null,
                nombre_personnes:     userConfig.nombrePersonnes || null,
                residence_principale: userConfig.residencePrincipale === 'oui', // boolean
                // DPE priorité : profil utilisateur > DPE de l'annonce > valeur par défaut
                dpe_actuel:           dpeMap[userConfig.dpeActuel] || dpeMap[currentPropertyData.dpe] || 'F',
                dpe_vise:             dpeMap[userConfig.dpeVise] || 'D',
                budget_achat:         userConfig.budgetAchat || null,
                surface_logement:     userConfig.surfaceLogement || null,
                periode_construction: userConfig.periodeConstruction || 'au moins 15 ans',
                budget_travaux:       userConfig.budgetTravaux || null,
                taxe_fonciere:        userConfig.taxeFonciere || null,
                gain_energetique:     userConfig.gainEnergetique ? Number(userConfig.gainEnergetique) : null,
                // Si l'utilisateur a choisi "indifferent" dans ses options, on envoie null
                type_logement:        (userConfig.typeLogement && userConfig.typeLogement !== 'indifferent')
                                          ? normalizeTypeLogement(userConfig.typeLogement)
                                          : null,
                parcours_aide:        userConfig.parcoursAide || null,
                condition_depenses:   userConfig.conditionDepenses !== false,  // true par défaut
                notifications_aides:  userConfig.notificationsAides !== false, // true par défaut
                notifications_prix:   userConfig.notificationsPrix !== false,  // true par défaut
                accept_analytics:     userConfig.acceptAnalytics !== false     // true par défaut
            },

            // Résultats de the simulation affichés à l'écran
            simulation: {
                gain_energetique:    userConfig.gainEnergetique ? Number(userConfig.gainEnergetique) : null,
                parcours_aide:       userConfig.parcoursAide || null,
                condition_depenses:  userConfig.conditionDepenses !== false,
                // On lit les valeurs des compteurs animés affichés à l'écran
                montant_total_aides: normalizeAmount(dom.aidAmount?.textContent || 0),
                pourcentage_bien:    normalizeAmount(dom.aidPercent?.textContent || 0),
                aides_details:       aidesDetails,
                travaux:             userConfig.travaux || [],
                date:                new Date().toISOString().slice(0, 19) // Format Laravel sans timezone
            }
        };

        console.log('📤 Envoi simulation au backend:', payload);

        // Le fetch cross-origin doit passer par le service worker
        // (les fetch() depuis le popup vers une IP externe peuvent être bloqués)
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: 'SEND_SIMULATION', payload: payload },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message || 'Le service worker n\'a pas répondu'));
                    } else if (!response) {
                        reject(new Error('Aucune réponse du service worker'));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
        
        if (response.success) {
            showEmailMessage(`✅ Compte-rendu envoyé à ${email}`, 'success');
            // Masquer automatiquement le message de succès après 4 secondes
            setTimeout(() => dom.emailMessage.classList.add('hidden'), 4000);
        } else {
            // On logue le détail technique en console (pas visible par l'utilisateur final)
            console.error('Échec envoi simulation (backend):', response.error);
            showEmailMessage('❌ L\'envoi a échoué. Veuillez réessayer ultérieurement.', 'error');
        }

    } catch (error) {
        console.error('Erreur envoi simulation:', error);
        showEmailMessage('❌ L\'envoi a échoué. Veuillez réessayer ultérieurement.', 'error');
    } finally {
        // Réactiver le bouton dans tous les cas (succès ou échec)
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

/**
 * Affiche un message de feedback sous le formulaire email.
 * @param {string}            message - Texte à afficher
 * @param {'success'|'error'} type    - Classe CSS appliquée pour le style
 */
function showEmailMessage(message, type) {
    dom.emailMessage.textContent = message;
    dom.emailMessage.className   = `email-message ${type}`; // Remplace toutes les classes
    dom.emailMessage.classList.remove('hidden');
}
