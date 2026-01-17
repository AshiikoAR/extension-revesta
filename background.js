/**
 * Service Worker - Backend de l'extension
 * Gère les appels API Mes Aides Réno uniquement
 */

// Token API Mes Aides Réno (à demander via contact@mesaidesreno.fr)
const API_TOKEN_MES_AIDES_RENO = 'lyZLuv25wCwJkpJtWYwlMuT2XO4U2XSU';

// API endpoint
const API_BASE_URL = 'https://mesaidesreno.beta.gouv.fr/api/v1';

/**
 * Convertir code postal en code INSEE via l'API geo.gouv.fr
 * @param {string} codePostal - Le code postal
 * @param {string} ville - Le nom de la ville (optionnel, pour matcher la bonne commune)
 */
async function getCodeInsee(codePostal, ville = null) {
  try {
    console.log('🗺️ Recherche code INSEE pour:', codePostal, ville ? `(${ville})` : '');
    const response = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=code,nom,codesPostaux`);
    
    if (!response.ok) {
      throw new Error(`API Geo erreur ${response.status}`);
    }
    
    const communes = await response.json();
    
    if (!communes || communes.length === 0) {
      throw new Error(`Code postal ${codePostal} introuvable`);
    }
    
    // Si le nom de la ville est fourni, chercher la correspondance exacte
    if (ville) {
      const villeNormalized = ville.toLowerCase().trim();
      const communeMatch = communes.find(c => 
        c.nom.toLowerCase() === villeNormalized ||
        c.nom.toLowerCase().includes(villeNormalized) ||
        villeNormalized.includes(c.nom.toLowerCase())
      );
      
      if (communeMatch) {
        console.log(`✅ Code INSEE trouvé (match ville): ${communeMatch.code} (${communeMatch.nom})`);
        return communeMatch.code;
      } else {
        console.warn(`⚠️ Ville "${ville}" non trouvée dans les ${communes.length} communes. Communes disponibles:`, communes.map(c => c.nom).join(', '));
      }
    }
    
    // Si plusieurs communes ont ce code postal, prendre la première
    const commune = communes[0];
    console.log(`✅ Code INSEE trouvé (première commune): ${commune.code} (${commune.nom})`);
    
    return commune.code;
  } catch (error) {
    console.error('❌ Erreur conversion code postal:', error);
    throw new Error(`Impossible de trouver le code INSEE pour ${codePostal}`);
  }
}

/**
 * Appeler l'API Mes Aides Réno - Endpoint eligibilite
 */
async function fetchMesAidesReno(propertyData) {
  try {
    console.log('📡 Appel API Mes Aides Réno (eligibilite) pour', propertyData.codePostal, propertyData.ville || '');
    
    // Charger les préférences utilisateur
    const userConfig = await new Promise(resolve => {
      chrome.storage.sync.get(['userConfig'], (result) => {
        resolve(result.userConfig || {});
      });
    });
    
    const codePostal = propertyData.codePostal || userConfig.codePostal || '44109';
    const ville = propertyData.ville || '';
    
    console.log('📍 Utilisation code postal:', codePostal, ville);
    
    // Récupérer les paramètres utilisateur avec valeurs par défaut
    const statut = userConfig.statut === 'bailleur' ? 'bailleur' : 'propriétaire';
    const typeLogement = propertyData.typeLogement === 'appartement' ? 'appartement' : 'maison';
    const travaux = userConfig.budgetTravaux || propertyData.prix || 50000;
    const revenus = userConfig.revenus || 25000;
    const personnes = userConfig.nombrePersonnes || 3;
    
    // Utiliser le DPE de l'annonce si disponible, sinon celui de l'utilisateur
    const dpeActuel = propertyData.dpe || userConfig.dpeActuel || 6;
    const dpeVise = userConfig.dpeVise || 2;
    
    // Log pour debug
    if (propertyData.dpe) {
      console.log(`📊 DPE extrait de l'annonce: ${propertyData.dpe}`);
    } else {
      console.log(`📊 DPE utilisateur utilisé: ${dpeActuel}`);
    }
    
    const residencePrincipale = userConfig.residencePrincipale === 'oui' ? 'oui' : 'non';
    const periodeConstruction = userConfig.periodeConstruction || 'au moins 15 ans';
    const surface = userConfig.surfaceLogement || propertyData.surface || null;
    const prixAchat = propertyData.prix || userConfig.budgetAchat || null;
    const taxeFonciere = userConfig.taxeFonciere || null;
    const conditionDepenses = userConfig.conditionDepenses !== false ? 'oui' : 'non';
    
    // Construire l'URL avec le code postal au lieu du code INSEE
    // L'API Mes Aides Réno utilise directement le code postal
    const params = {
      'vous.propriétaire.statut': statut,
      'ménage.personnes': personnes.toString(),
      'ménage.revenu': revenus.toString(),
      'DPE.actuel': dpeActuel.toString(),
      'projet.DPE visé': dpeVise.toString(),
      'projet.travaux': travaux.toString(),
      'logement.type': typeLogement,
      'logement.code postal': codePostal,
      'logement.propriétaire occupant': residencePrincipale,
      'logement.résidence principale propriétaire': residencePrincipale,
      'logement.période de construction': periodeConstruction,
      'taxe foncière.condition de dépenses': conditionDepenses,
      'fields': 'eligibilite'
    };
    
    // Ajouter les paramètres optionnels seulement s'ils sont définis
    if (surface) {
      params['logement.surface'] = surface.toString();
    }
    if (prixAchat) {
      params['logement.prix d\'achat'] = prixAchat.toString();
    }
    if (taxeFonciere) {
      params['logement.taxe foncière'] = taxeFonciere.toString();
    }
    
    // Construire manuellement la query string
    const queryString = Object.entries(params)
      .map(([key, value]) => {
        // Encoder la clé
        const encodedKey = encodeURIComponent(key);
        // Encoder la valeur
        const encodedValue = encodeURIComponent(value);
        return `${encodedKey}=${encodedValue}`;
      })
      .join('&');
    
    const url = `${API_BASE_URL}?${queryString}`;
    
    console.log('🔑 Token API utilisé:', API_TOKEN_MES_AIDES_RENO.substring(0, 8) + '...');
    console.log('🔗 URL complète:', url);
    console.log('📦 Query string:', queryString);
    
    // Afficher chaque paramètre pour debug
    console.log('📋 Paramètres détaillés:');
    Object.entries(params).forEach(([key, value]) => {
      console.log(`  ${key} = ${value}`);
    });
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 secondes
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RénoAides-Extension/1.0'
      }
    });

    clearTimeout(timeout);
    console.log('📊 Réponse API:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Mes Aides Réno retourna:', response.status);
      console.error('📄 Réponse complète:', errorText);
      
      // Erreur spécifique pour les codes postaux non supportés
      if (errorText.includes('Unexpected end of JSON input')) {
        throw new Error(`Code INSEE ${codeInsee} (${codePostal}) non reconnu par l'API. Certaines communes ne sont pas encore supportées par Mes Aides Réno.`);
      }
      
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Données API reçues:', data);
    console.log('📋 Nombre d\'aides retournées:', Array.isArray(data) ? data.length : 0);
    
    // Parser les aides depuis la réponse
    const aides = parseEligibiliteResponse(data, propertyData);
    console.log('✅ Aides éligibles:', aides.length, 'aides');
    
    return aides;
  } catch (error) {
    console.error('❌ Erreur Mes Aides Réno:', error.name, error.message);
    
    // Message d'erreur plus explicite pour le timeout
    if (error.name === 'AbortError') {
      throw new Error('L\'API Mes Aides Réno met trop de temps à répondre. Veuillez réessayer.');
    }
    
    throw error;
  }
}

/**
 * Parser la réponse de l'endpoint eligibilite
 */
function parseEligibiliteResponse(data, propertyData) {
  const aides = [];
  
  if (!Array.isArray(data)) {
    console.warn('⚠️ Réponse API non-array:', data);
    return aides;
  }
  
  // Filtrer uniquement les aides éligibles (status === true)
  const aidesEligibles = data.filter(aide => aide.status === true);
  
  console.log(`📊 ${aidesEligibles.length} aides éligibles sur ${data.length} au total`);
  
  aidesEligibles.forEach(aide => {
    // Extraire le montant
    let montant = 0;
    if (typeof aide.rawValue === 'number') {
      montant = aide.rawValue;
    } else if (aide.rawValue === true && aide.value) {
      // Pour les aides sans montant précis (éligibilité booléenne)
      // Extraire le montant du champ "value" si possible
      const match = aide.value.match(/(\d[\d\s]*)/);
      if (match) {
        montant = parseInt(match[1].replace(/\s/g, ''));
      }
    }
    
    // Construire l'objet aide
    const aideObj = {
      nom: aide.label,
      montantEstime: montant,
      description: aide.type === 'prêt' 
        ? `${aide.type.charAt(0).toUpperCase() + aide.type.slice(1)} - ${aide.value}`
        : aide.value,
      lien: 'https://mesaidesreno.beta.gouv.fr/',
      source: 'api',
      type: aide.type
    };
    
    // Ajouter les détails pour les prêts
    if (aide.type === 'prêt' && (aide.taux || aide.durée)) {
      aideObj.details = [];
      if (aide.taux) aideObj.details.push(`Taux à ${aide.taux}`);
      if (aide.durée) aideObj.details.push(`sur ${aide.durée}`);
      aideObj.details = aideObj.details.join(' ');
    }
    
    aides.push(aideObj);
  });
  
  // Trier par montant décroissant
  aides.sort((a, b) => b.montantEstime - a.montantEstime);
  
  console.log('✅ Aides parsées:', aides);
  return aides;
}



/**
 * Analyser les aides disponibles
 */
async function analyzeAids(propertyData) {
  const aides = await fetchMesAidesReno(propertyData);

  return {
    commune: propertyData.localisation || 'Non renseignée',
    codePostal: propertyData.codePostal,
    aides: aides,
    estimationAide: calculateEstimatedAid(aides),
    links: {
      mesAidesReno: 'https://mesaidesreno.beta.gouv.fr/',
      franceRenov: 'https://france-renov.gouv.fr/'
    }
  };
}

/**
 * Estimer le montant total des aides
 * Exclut les prêts du calcul (ce sont des prêts, pas des subventions)
 */
function calculateEstimatedAid(aides) {
  let total = 0;
  let nombreAidesSubventions = 0;
  
  aides.forEach(aide => {
    // Exclure les prêts du calcul total
    if (aide.type !== 'prêt') {
      total += aide.montantEstime || 0;
      nombreAidesSubventions++;
    }
  });

  return {
    montantTotal: total,
    nombreAides: nombreAidesSubventions,
    nombrePrets: aides.filter(a => a.type === 'prêt').length
  };
}

/**
 * Écouter les messages du popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_PROPERTY') {
    analyzeAids(request.propertyData)
      .then(results => {
        sendResponse({ success: true, data: results });
      })
      .catch(error => {
        console.error('Erreur analyse:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Réponse asynchrone
  }

  if (request.type === 'GET_USER_CONFIG') {
    chrome.storage.sync.get(['userConfig'], (result) => {
      sendResponse(result.userConfig || {});
    });
    return true;
  }
  
  if (request.type === 'OPEN_POPUP') {
    // Ouvrir le popup de l'extension
    chrome.action.openPopup()
      .then(() => {
        console.log('✅ Popup ouvert');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('❌ Erreur ouverture popup:', error);
        // Fallback: l'utilisateur devra cliquer sur l'icône de l'extension
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.type === 'SAVE_USER_CONFIG') {
    chrome.storage.sync.set({ userConfig: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Logger l'installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('RénoAides Extension installée');
    chrome.tabs.create({ url: 'options.html' });
  }
});

console.log('✅ Service Worker RénoAides chargé');
