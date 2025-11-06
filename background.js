/**
 * Service Worker - Backend de l'extension
 * Gère les appels API, le scraping et la logique
 */

// Importer la configuration (Note: en Manifest v3, on peut aussi utiliser importScripts)
// Pour l'instant, on utilise directement le token ici
const API_TOKEN_MES_AIDES_RENO = 'lyZLuv25wCwJkpJtWYwlMuT2XO4U2XSU';

// Cache des API avec TTL
const API_CACHE = {
  DUREE_TTL: 24 * 60 * 60 * 1000, // 24h
};

/**
 * Extraire les informations clés d'une annonce
 */
async function extractPropertyInfo(tabId, url) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        // Sera exécuté dans le contexte du content script
        return window.propertyData || null;
      }
    });
    
    return result?.result || null;
  } catch (error) {
    console.error('Erreur extraction propriété:', error);
    return null;
  }
}

/**
 * Appeler l'API Mes Aides Rénov'
 */
async function fetchMesAidesReno(propertyData) {
  try {
    console.log('📡 Appel API Mes Aides Rénov pour', propertyData.codePostal);
    
    // Paramètres de la requête
    const params = new URLSearchParams({
      code_postal: propertyData.codePostal || '',
      type_travaux: propertyData.typeWork || 'renovation',
      budget: propertyData.prix || 0,
      revenus: propertyData.revenus || 0,
      api_key: API_TOKEN_MES_AIDES_RENO
    });

    console.log('🔑 Token API utilisé:', API_TOKEN_MES_AIDES_RENO.substring(0, 8) + '...');
    
    // Ajouter timeout pour éviter les longs hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://mesaidesreno.gouv.fr/api/aides?${params}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN_MES_AIDES_RENO}`,
          'User-Agent': 'RénoAides-Extension/1.0'
        }
      }
    );

    clearTimeout(timeout);
    console.log('📊 Réponse API:', response.status, response.statusText);

    if (!response.ok) {
      console.warn('⚠️ API Mes Aides Rénov retourna:', response.status);
      
      // Si 401, token invalide
      if (response.status === 401) {
        console.error('❌ Token API invalide ou expiré');
      }
      // Si 429, limite dépassée
      if (response.status === 429) {
        console.warn('⚠️ Limite d\'appels API atteinte');
      }
      
      // Retourner données de fallback
      return getFallbackAides(propertyData);
    }
    
    const aides = await response.json();
    console.log('✅ Aides récupérées:', aides.length, 'aides');
    
    return cacheResult('mesaidesreno', propertyData.codePostal, aides);
  } catch (error) {
    console.error('❌ Erreur Mes Aides Rénov:', error.name, error.message);
    console.log('⚠️ Utilisation des données de fallback');
    return getFallbackAides(propertyData);
  }
}

/**
 * Données de fallback intelligentes basées sur le code postal
 */
function getFallbackAides(propertyData) {
  const codePostal = propertyData.codePostal || '';
  
  // Base d'aides standard disponibles partout
  const aidesBase = [
    {
      nom: 'MaPrimeRénov\'',
      montantEstime: 5000,
      description: 'Aide pour améliorer la performance énergétique',
      lien: 'https://www.maprimerenov.gouv.fr/',
      source: 'fallback'
    },
    {
      nom: 'Éco-PTZ',
      montantEstime: 15000,
      description: 'Prêt à taux zéro pour travaux de rénovation énergétique',
      lien: 'https://www.ecoptiz.gouv.fr/',
      source: 'fallback'
    },
    {
      nom: 'MaPrimeRénov Sérénité',
      montantEstime: 8000,
      description: 'Aide pour bouquet de travaux en rénovation complète',
      lien: 'https://www.maprimerenov.gouv.fr/',
      source: 'fallback'
    }
  ];

  // Aides régionales (exemple: Pays de la Loire pour 49xxx)
  if (codePostal.startsWith('49')) {
    aidesBase.push({
      nom: 'Aide Région Pays de la Loire',
      montantEstime: 3000,
      description: 'Aide régionale pour rénovation thermique',
      lien: 'https://www.paysdelaloire.fr/',
      source: 'fallback-region'
    });
  }
  
  // Aides locales (exemple: Angers pour 49100)
  if (codePostal === '49100') {
    aidesBase.push({
      nom: 'Aide Commune Angers',
      montantEstime: 2000,
      description: 'Subvention locale pour amélioration de l\'habitat',
      lien: 'https://www.angers.fr/',
      source: 'fallback-local'
    });
  }

  console.log('💡 Utilisation de', aidesBase.length, 'aides de fallback');
  return aidesBase;
}

/**
 * Appeler MaPrimeRénov' via l'API gouvernementale
 */
async function fetchMaprimeRenov(propertyData) {
  try {
    console.log('📡 Appel API MaPrimeRénov pour', propertyData.codePostal);
    
    const params = new URLSearchParams({
      code_postal: propertyData.codePostal || '',
      revenus: propertyData.revenus || 0,
      type_travaux: propertyData.typeWork || 'renovation'
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://www.maprimerenov.gouv.fr/api/aides?${params}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'RénoAides-Extension/1.0'
        }
      }
    );

    clearTimeout(timeout);
    console.log('📊 Réponse API MaPrimeRénov:', response.status);

    if (!response.ok) {
      console.warn('⚠️ API MaPrimeRénov retourna:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Données MaPrimeRénov reçues:', data.length, 'aides');
    
    return cacheResult('maprimerenov', propertyData.codePostal, data);
  } catch (error) {
    console.error('❌ Erreur MaPrimeRénov:', error.name, error.message);
    return [];
  }
}

/**
 * Récupérer les informations géographiques via l'API Géo
 */
async function fetchGeoInfo(codePostal) {
  try {
    console.log('📡 Récupération info géo pour', codePostal);
    
    // Validation du code postal
    if (!codePostal || codePostal.length < 5) {
      console.warn('⚠️ Code postal invalide:', codePostal);
      return getGeoFallback(codePostal);
    }
    
    // Ajouter timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const url = `https://api.geo.gouv.fr/communes?codePostal=${encodeURIComponent(codePostal)}&limit=1`;
    console.log('🔗 URL API Géo:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RénoAides-Extension/1.0'
      }
    });

    clearTimeout(timeout);
    console.log('📊 Réponse API Géo:', response.status, response.statusText);

    if (!response.ok) {
      console.warn('⚠️ API Géo retourna status:', response.status);
      return getGeoFallback(codePostal);
    }
    
    const data = await response.json();
    console.log('📦 Données API Géo reçues');
    
    const commune = data.communes?.[0];
    
    if (!commune) {
      console.warn('⚠️ Aucune commune trouvée pour', codePostal);
      return getGeoFallback(codePostal);
    }
    
    console.log('✅ Commune trouvée:', commune.nom);
    return {
      ...commune,
      source: 'api'
    };
  } catch (error) {
    console.error('❌ Erreur API Géo:', error.name, error.message);
    console.log('⚠️ Utilisation du fallback géographique');
    return getGeoFallback(codePostal);
  }
}

/**
 * Données géographiques de fallback
 */
function getGeoFallback(codePostal) {
  // Mappings simples pour les grandes villes
  const mappings = {
    '75001': { nom: 'Paris 1er', region: 'Île-de-France' },
    '75002': { nom: 'Paris 2e', region: 'Île-de-France' },
    '69001': { nom: 'Lyon 1er', region: 'Auvergne-Rhône-Alpes' },
    '13001': { nom: 'Marseille 1er', region: 'Provence-Alpes-Côte d\'Azur' },
    '49100': { nom: 'Angers', region: 'Pays de la Loire' },
    '49000': { nom: 'Angers', region: 'Pays de la Loire' },
  };

  const fallback = mappings[codePostal] || {
    nom: 'Localisation inconnue',
    region: 'Région inconnue'
  };

  return {
    ...fallback,
    codePostal: codePostal,
    source: 'fallback'
  };
}

/**
 * Analyser les aides disponibles
 */
async function analyzeAids(propertyData) {
  const [geoInfo, aidesReno, maprimeRenov] = await Promise.all([
    fetchGeoInfo(propertyData.codePostal),
    fetchMesAidesReno(propertyData),
    fetchMaprimeRenov(propertyData)
  ]);

  return {
    region: geoInfo?.region,
    commune: geoInfo?.nom,
    aides: [
      ...aidesReno,
      ...maprimeRenov
    ],
    estimationAide: calculateEstimatedAid(propertyData, aidesReno, maprimeRenov),
    links: {
      mesAidesReno: 'https://mesaidesreno.gouv.fr/',
      maprimeRenov: 'https://www.maprimerenov.gouv.fr/',
      france2reno: 'https://www.france-reno.gouv.fr/'
    }
  };
}

/**
 * Estimer le montant total des aides
 */
function calculateEstimatedAid(propertyData, aidesReno, maprimeRenov) {
  let total = 0;
  
  // Calculer estimation basée sur les aides disponibles
  aidesReno.forEach(aide => {
    total += aide.montantEstime || 0;
  });
  
  maprimeRenov.forEach(aide => {
    total += aide.montantEstime || 0;
  });

  return {
    montantTotal: total,
    estimationBudgetTotal: propertyData.prix ? propertyData.prix + total : total,
    estimationAideEnPourcent: propertyData.prix ? Math.round((total / propertyData.prix) * 100) : 0
  };
}

/**
 * Mettre en cache les résultats
 */
function cacheResult(source, key, data) {
  const cacheKey = `cache_${source}_${key}`;
  chrome.storage.local.set({
    [cacheKey]: {
      data,
      timestamp: Date.now()
    }
  });
  return data;
}

/**
 * Récupérer depuis le cache si valide
 */
async function getCachedResult(source, key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(`cache_${source}_${key}`, (result) => {
      const cached = result[`cache_${source}_${key}`];
      
      if (cached && (Date.now() - cached.timestamp) < API_CACHE.DUREE_TTL) {
        resolve(cached.data);
      } else {
        resolve(null);
      }
    });
  });
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
    
    // Indiquer qu'on répondra de manière asynchrone
    return true;
  }

  if (request.type === 'GET_USER_CONFIG') {
    chrome.storage.sync.get(['userConfig'], (result) => {
      sendResponse(result.userConfig || {});
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
