/**
 * Configuration & Constantes de l'extension
 */

const CONFIG = {
  // Informations de l'extension
  EXTENSION_NAME: 'RénoAides',
  VERSION: '1.0.0',
  
  // Durée de cache (en millisecondes)
  CACHE_TTL: {
    AIDES: 24 * 60 * 60 * 1000,        // 24h
    GEO: 7 * 24 * 60 * 60 * 1000,       // 7j
    PROPERTIES: 60 * 60 * 1000          // 1h
  },

  // URLs des APIs
  APIS: {
    MES_AIDES_RENO: 'https://mesaidesreno.beta.gouv.fr/api/v1',
    MAPRIME_RENOV: 'https://api.gouv.fr/api/v1/mesaides',
    GEO: 'https://api.geo.gouv.fr',
    ANAH: 'https://www.anah.fr/api'
  },

  // Tokens d'authentification
  API_TOKENS: {
    MES_AIDES_RENO: 'lyZLuv25wCwJkpJtWYwlMuT2XO4U2XSU'
  },

  // Sites supportés
  SUPPORTED_SITES: [
    {
      name: 'LeBonCoin',
      domain: 'leboncoin.fr',
      pattern: /https:\/\/(www\.)?leboncoin\.fr\/ventes_immobilieres\/.*/,
      scriptFile: 'content-scripts/leboncoin.js'
    },
    {
      name: 'SeLoger',
      domain: 'seloger.com',
      pattern: /https:\/\/(www\.)?seloger\.com\/annonces\/.*/,
      scriptFile: 'content-scripts/seloger.js'
    },
    {
      name: 'BienIci',
      domain: 'bienici.com',
      pattern: /https:\/\/(www\.)?bienici\.com\/annonce\/.*/,
      scriptFile: 'content-scripts/bienici.js'
    }
  ],

  // Types d'aides
  AIDE_TYPES: {
    MAPRIMERENOV: 'MaPrimeRénov\'',
    MES_AIDES_RENO: 'Mes Aides Rénov\'',
    PTZ: 'Prêt à Taux Zéro',
    ECO_PTZ: 'Éco-PTZ',
    AIDE_REGION: 'Aide régionale',
    AIDE_LOCALE: 'Aide locale',
    CEE: 'Certificats d\'Économies d\'Énergie'
  },

  // Types de travaux
  WORK_TYPES: {
    ISOLATION: 'Isolation thermique',
    CHAUFFAGE: 'Chauffage',
    ECS: 'Eau chaude sanitaire',
    MENUISERIE: 'Fenêtres/Portes',
    TOITURE: 'Toiture',
    VENTILATION: 'Ventilation',
    RENOVATION_GLOBALE: 'Rénovation globale',
    ENERGIES_RENOUVELABLES: 'Énergies renouvelables'
  },

  // Types de logement
  PROPERTY_TYPES: {
    MAISON: 'Maison',
    APPARTEMENT: 'Appartement',
    TERRAIN: 'Terrain',
    IMMEUBLE: 'Immeuble',
    COMMERCE: 'Commerce',
    AUTRE: 'Autre'
  },

  // Critères d'éligibilité MaprimeRénov' (plafonds de revenus 2025)
  MAPRIMERENOV_REVENUS: {
    'Très modeste': 15000,
    'Modeste': 25000,
    'Intermédiaire': 45000,
    'Supérieur': 100000
  },

  // Montants d'aides estimés (à jour 2025)
  AIDE_AMOUNTS: {
    ISOLATION_MUR: { min: 25, max: 90 },          // € par m²
    ISOLATION_COMBLE: { min: 10, max: 50 },
    CHAUFFAGE_POMPE_CHALEUR: { min: 5000, max: 15000 },
    CHAUFFAGE_GRES: { min: 3000, max: 10000 },
    MENUISERIE: { min: 100, max: 500 }            // € par fenêtre
  },

  // Messages d'erreur
  ERRORS: {
    API_UNREACHABLE: 'Impossible de contacter les APIs gouvernementales',
    INVALID_POSTAL_CODE: 'Code postal invalide',
    NO_DATA: 'Aucune donnée trouvée',
    NETWORK_ERROR: 'Erreur de connexion réseau'
  },

  // Paramètres de production
  DEBUG: {
    ENABLED: false,
    LOG_API_CALLS: true
  }
};

export default CONFIG;
