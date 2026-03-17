/**
 * Configuration & Constantes de l'extension REVESTA
 *
 * Ce module centralise toutes les valeurs partag\u00e9es entre background.js, popup.js
 * et les content-scripts : URLs d'API, tokens, types de travaux, plafonds de revenus, etc.
 *
 * Import\u00e9 en ES module (`import CONFIG from './config.js'`).
 * Modifier ici plut\u00f4t que de dupliquer les constantes dans chaque fichier.
 */

const CONFIG = {
  // Informations de l'extension
  EXTENSION_NAME: 'REVESTA - Assistant Immobilier',
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
    REVESTA_BACKEND: 'https://31.207.38.67/api/v1'  // URL du backend Laravel
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
    }
  ],

  // Types d'aides (Mes Aides Réno)
  AIDE_TYPES: {
    MAPRIMERENOV: 'MaPrimeRénov\'',
    ECO_PTZ: 'Éco-PTZ',
    CEE: 'Certificats d\'Économies d\'Énergie',
    DENORMANDIE: 'Dispositif Denormandie'
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
