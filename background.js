/**
 * background.js — Service Worker de l'extension REVESTA
 *
 * Responsabilités :
 *  1. Appeler l'API Mes Aides Réno (GET) et parser les aides éligibles.
 *  2. Convertir un code postal en code INSEE via l'API geo.gouv.fr.
 *  3. Envoyer la simulation au backend REVESTA (POST /simulations).
 *  4. Relayer les messages du popup (chrome.runtime.onMessage) et répondre de manière asynchrone.
 *
 * Note : tous les fetch() cross-origin doivent passer par ce service worker,
 * car les requêtes depuis le popup sont parfois bloquées par le navigateur.
 */

// Token d'authentification Mes Aides Réno (obtenu via contact@mesaidesreno.fr)
const API_TOKEN_MES_AIDES_RENO = 'lyZLuv25wCwJkpJtWYwlMuT2XO4U2XSU';

// URL de base de l'API Mes Aides Réno
const API_BASE_URL = 'https://mesaidesreno.beta.gouv.fr/api/v1';

/**
 * Convertit un code postal en code INSEE via l'API geo.gouv.fr.
 * Si plusieurs communes partagent le même code postal, on cherche la correspondance
 * avec le nom de la ville (issu de l'annonce) avant de tomber sur la première commune.
 *
 * @param {string} codePostal - Code postal à 5 chiffres
 * @param {string|null} ville - Nom de la ville pour affiner la recherche (optionnel)
 * @returns {Promise<string>} Code INSEE de la commune
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

    // Si le nom de la ville est fourni, chercher la correspondance exacte ou partielle
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

    // Plusieurs communes pour ce code postal : on prend la première par défaut
    const commune = communes[0];
    console.log(`✅ Code INSEE trouvé (première commune): ${commune.code} (${commune.nom})`);
    return commune.code;
  } catch (error) {
    console.error('❌ Erreur conversion code postal:', error);
    throw new Error(`Impossible de trouver le code INSEE pour ${codePostal}`);
  }
}

/**
 * Appelle l'API Mes Aides Réno (endpoint eligibilite) avec les paramètres du bien
 * et du profil utilisateur, puis retourne la liste des aides éligibles parsées.
 *
 * @param {object} propertyData - Données extraites par le content script
 * @returns {Promise<Array>}    - Tableau d'aides éligibles
 */
async function fetchMesAidesReno(propertyData) {
  try {
    console.log('📡 Appel API Mes Aides Réno (eligibilite) pour', propertyData.codePostal, propertyData.ville || '');

    // Récupérer les préférences utilisateur sauvées
    const userConfig = await new Promise(resolve => {
      chrome.storage.sync.get(['userConfig'], (result) => {
        resolve(result.userConfig || {});
      });
    });

    // Code postal : priorité au code de l'annonce, sinon celui du profil
    const codePostal = propertyData.codePostal || userConfig.codePostal || '44109';
    const ville      = propertyData.ville || '';
    console.log('📍 Utilisation code postal:', codePostal, ville);
    
    // Récupérer les paramètres utilisateur avec leurs valeurs par défaut
    const statut    = userConfig.statut === 'bailleur' ? 'bailleur' : 'propriétaire';
    const typeLogement = propertyData.typeLogement === 'appartement' ? 'appartement' : 'maison';
    const travaux   = userConfig.budgetTravaux || propertyData.prix || 50000;
    const revenus   = userConfig.revenus || 25000;
    const personnes = userConfig.nombrePersonnes || 3;

    // DPE : priorité à celui de l'annonce (extrait par le content script), sinon au profil
    const dpeActuel = propertyData.dpe || userConfig.dpeActuel || 6;
    const dpeVise   = userConfig.dpeVise || 2;

    if (propertyData.dpe) {
      console.log(`📊 DPE extrait de l'annonce: ${propertyData.dpe}`);
    } else {
      console.log(`📊 DPE utilisateur utilisé: ${dpeActuel}`);
    }
    
    const residencePrincipale = userConfig.residencePrincipale === 'oui' ? 'oui' : 'non';
    const periodeConstruction = userConfig.periodeConstruction || 'au moins 15 ans';
    const surface     = userConfig.surfaceLogement || propertyData.surface || null;
    const prixAchat   = propertyData.prix || userConfig.budgetAchat || null;
    const taxeFonciere = userConfig.taxeFonciere || null;
    const conditionDepenses = userConfig.conditionDepenses !== false ? 'oui' : 'non';

    // ── Construction de la query string ──
    // L'API Mes Aides Réno utilise des clés avec caractères spéciaux (accents, espaces),
    // donc on construit manuellement la query string plutôt que URLSearchParams.
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
    // (l'API peut rejeter des paramètres vides)
    if (surface) {
      params['logement.surface'] = surface.toString();
    }
    if (prixAchat) {
      params['logement.prix d\'achat'] = prixAchat.toString();
    }
    if (taxeFonciere) {
      params['logement.taxe foncière'] = taxeFonciere.toString();
    }
    
    // Encoder manuellement chaque clé et valeur (les clés contiennent des accents et espaces)
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const url = `${API_BASE_URL}?${queryString}`;
    console.log('🔑 Token API utilisé:', API_TOKEN_MES_AIDES_RENO.substring(0, 8) + '...');
    console.log('🔗 URL complète:', url);
    console.log('📦 Query string:', queryString);
    console.log('📋 Paramètres détaillés:');
    Object.entries(params).forEach(([key, value]) => console.log(`  ${key} = ${value}`));
    
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30000); // Timeout 30 secondes

    const response = await fetch(url, {
      method:  'GET',
      signal:  controller.signal,
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'RénoAides-Extension/1.0'
      }
    });
    clearTimeout(timeout);
    console.log('📊 Réponse API:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Mes Aides Réno retourna:', response.status);
      console.error('📄 Réponse complète:', errorText);

      // Erreur spécifique pour les codes postaux non supportés par l'API
      if (errorText.includes('Unexpected end of JSON input')) {
        throw new Error(`Code postal ${codePostal} non reconnu par l'API. Certaines communes ne sont pas encore supportées par Mes Aides Réno.`);
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
 * Parse la réponse de l'endpoint eligibilite de l'API Mes Aides Réno.
 * Filtre les aides vraiment éligibles (status === true), extrait les montants,
 * et distingue les subventions des prêts.
 *
 * @param {Array}  data         - Réponse brute de l'API (tableau d'aides)
 * @param {object} propertyData - Non utilisé directement ici, passé pour contexte
 * @returns {Array} Tableau d'aides trié par montant décroissant
 */
function parseEligibiliteResponse(data, propertyData) {
  const aides = [];

  if (!Array.isArray(data)) {
    console.warn('⚠️ Réponse API non-array:', data);
    return aides;
  }

  // Filtrer uniquement les aides dont l'utilisateur est bien éligible
  const aidesEligibles = data.filter(aide => aide.status === true);
  console.log(`📊 ${aidesEligibles.length} aides éligibles sur ${data.length} au total`);

  aidesEligibles.forEach(aide => {
    // Extraire le montant : numérique direct ou récupéré depuis le champ 'value' (champ texte)
    let montant = 0;
    if (typeof aide.rawValue === 'number') {
      montant = aide.rawValue;
    } else if (aide.rawValue === true && aide.value) {
      // Pour les aides à éligibilité booléenne : on tente d'extraire un montant du texte
      const match = aide.value.match(/(\d[\d\s]*)/);
      if (match) montant = parseInt(match[1].replace(/\s/g, ''));
    }

    const aideObj = {
      nom:           aide.label,
      montantEstime: montant,
      // Les prêts affichent "Prêt - {conditions}" ; les subventions affichent directement la valeur
      description:   aide.type === 'prêt'
        ? `${aide.type.charAt(0).toUpperCase() + aide.type.slice(1)} - ${aide.value}`
        : aide.value,
      lien:   'https://mesaidesreno.beta.gouv.fr/',
      source: 'api',
      type:   aide.type
    };

    // Pour les prêts, ajouter le taux et la durée dans un champ 'details'
    if (aide.type === 'prêt' && (aide.taux || aide.durée)) {
      const parts = [];
      if (aide.taux)  parts.push(`Taux à ${aide.taux}`);
      if (aide.durée) parts.push(`sur ${aide.durée}`);
      aideObj.details = parts.join(' ');
    }

    aides.push(aideObj);
  });

  // Trier par montant décroissant pour afficher les aides les plus importantes en premier
  aides.sort((a, b) => b.montantEstime - a.montantEstime);
  console.log('✅ Aides parsées:', aides);
  return aides;
}



/**
 * Point d'entrée appelé par le listener 'ANALYZE_PROPERTY'.
 * Rassemble les aides et les métadonnées pour les renvoyer au popup.
 *
 * @param {object} propertyData - Données de l'annonce
 * @returns {Promise<object>}   - { commune, codePostal, aides, estimationAide, links }
 */
async function analyzeAids(propertyData) {
  const aides = await fetchMesAidesReno(propertyData);
  return {
    commune:       propertyData.localisation || 'Non renseignée',
    codePostal:    propertyData.codePostal,
    aides,
    estimationAide: calculateEstimatedAid(aides),
    links: {
      mesAidesReno: 'https://mesaidesreno.beta.gouv.fr/',
      franceRenov:  'https://france-renov.gouv.fr/'
    }
  };
}

/**
 * Calcule le montant total des subventions éligibles.
 * Les prêts (type === 'prêt') sont exclus du total : ce sont des crédits, pas des aides directes.
 *
 * @param {Array} aides
 * @returns {{ montantTotal: number, nombreAides: number, nombrePrets: number }}
 */
function calculateEstimatedAid(aides) {
  let total = 0;
  let nombreAidesSubventions = 0;

  aides.forEach(aide => {
    if (aide.type !== 'prêt') { // Exclure les prêts du total de subventions
      total += aide.montantEstime || 0;
      nombreAidesSubventions++;
    }
  });

  return {
    montantTotal:  total,
    nombreAides:   nombreAidesSubventions,
    nombrePrets:   aides.filter(a => a.type === 'prêt').length
  };
}

// ─────────────────────────────────────────────────────────────
// Envoi simulation au backend REVESTA
// ─────────────────────────────────────────────────────────────

// URL du backend Laravel REVESTA
const REVESTA_API_URL = 'https://admin.revesta.fr/api/v1';

/**
 * Parse le corps d'une réponse HTTP en JSON, ou retourne { raw } si ce n'est pas du JSON valide.
 * Utilisé après response.text() pour éviter que JSON.parse() ne plante le service worker.
 * @param {string|null} rawBody
 * @returns {object}
 */
function parseResponseBody(rawBody) {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch (e) {
    return { raw: rawBody }; // Réponse non-JSON (HTML d'erreur Nginx, etc.)
  }
}

/**
 * Extrait le premier message d'erreur d'une réponse 422 Laravel.
 * Le backend retourne un objet { message, errors: { champ: ["message"] } }.
 * On log le détail complet pour le débug sans l'afficher à l'utilisateur.
 * @param {object} data - Corps de réponse parsé
 * @returns {string}   - Message lisible (ex : "Validation failed - annonce.dpe: ...")
 */
function buildValidationErrorMessage(data) {
  const errors = data?.errors;
  if (!errors || typeof errors !== 'object') {
    return data?.message || 'Validation failed';
  }
  const firstField   = Object.keys(errors)[0];
  const firstValue   = errors[firstField];
  const firstMessage = Array.isArray(firstValue) ? firstValue[0] : String(firstValue);
  return `${data?.message || 'Validation failed'} - ${firstField}: ${firstMessage}`;
}

/**
 * Construit un payload minimal et robuste pour fallback en cas d'erreur 500 backend.
 * Objectif : éviter qu'un champ optionnel mal formaté fasse tomber toute la création.
 *
 * @param {object} payload
 * @returns {object}
 */
function buildMinimalSimulationPayload(payload) {
  const annonceUrl = payload?.annonce?.url || '';
  const email      = payload?.utilisateur?.email || '';

  const toNumber = (value, defaultValue = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  };

  return {
    annonce: {
      url: annonceUrl
    },
    utilisateur: {
      email,
      nom: payload?.utilisateur?.nom || null,
      prenom: payload?.utilisateur?.prenom || null
    },
    simulation: {
      montant_total_aides: toNumber(payload?.simulation?.montant_total_aides, 0),
      pourcentage_bien: toNumber(payload?.simulation?.pourcentage_bien, 0),
      aides_details: Array.isArray(payload?.simulation?.aides_details) ? payload.simulation.aides_details : []
    }
  };
}

/**
 * Tronque de façon sûre une chaîne (trim + maxLength).
 * @param {any} value
 * @param {number} maxLength
 * @returns {string|null}
 */
function truncateString(value, maxLength) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

/**
 * Convertit en nombre si possible, sinon fallback.
 * @param {any} value
 * @param {number} fallback
 * @returns {number}
 */
function toNumberSafe(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Sanitize le payload avant envoi backend pour limiter les erreurs 500
 * dues à des types inattendus, chaînes trop longues ou URLs invalides.
 *
 * @param {object} payload
 * @returns {object}
 */
function sanitizeSimulationPayload(payload) {
  const annonce = payload?.annonce || {};
  const utilisateur = payload?.utilisateur || {};
  const simulation = payload?.simulation || {};

  const safeImages = Array.isArray(annonce.images)
    ? Array.from(new Set(
        annonce.images
          .map((imageUrl) => truncateString(imageUrl, 2048))
          .filter((imageUrl) => imageUrl && /^https?:\/\//i.test(imageUrl))
      )).slice(0, 20)
    : [];

  const safeAidesDetails = Array.isArray(simulation.aides_details)
    ? simulation.aides_details
        .slice(0, 100)
        .map((aide) => ({
          nom: truncateString(aide?.nom, 255) || 'Aide',
          detail: truncateString(aide?.detail, 2000),
          type: (aide?.type === 'prêt' || aide?.type === 'subvention') ? aide.type : 'subvention',
          valeur: toNumberSafe(aide?.valeur, 0)
        }))
    : [];

  const safeTravaux = Array.isArray(simulation.travaux)
    ? simulation.travaux
        .map((workType) => truncateString(workType, 120))
        .filter(Boolean)
        .slice(0, 30)
    : [];

  return {
    ...payload,
    annonce: {
      ...annonce,
      site: truncateString(annonce.site, 100),
      titre: truncateString(annonce.titre, 500),
      prix: toNumberSafe(annonce.prix, 0),
      localisation: truncateString(annonce.localisation, 255),
      ville: truncateString(annonce.ville, 255),
      code_postal: truncateString(annonce.code_postal, 10),
      surface: toNumberSafe(annonce.surface, 0),
      pieces: toNumberSafe(annonce.pieces, 0),
      description: truncateString(annonce.description, 10000),
      type_logement: truncateString(annonce.type_logement, 50),
      dpe: truncateString(annonce.dpe, 2),
      etage: truncateString(annonce.etage, 20),
      type_travaux: truncateString(annonce.type_travaux, 120),
      images: safeImages,
      url: truncateString(annonce.url, 2048),
      date_extraction: truncateString(annonce.date_extraction, 40)
    },
    utilisateur: {
      ...utilisateur,
      nom: truncateString(utilisateur.nom, 120),
      prenom: truncateString(utilisateur.prenom, 120),
      email: truncateString(utilisateur.email, 320),
      telephone: truncateString(utilisateur.telephone, 40),
      statut: truncateString(utilisateur.statut, 50),
      code_postal: truncateString(utilisateur.code_postal, 10),
      revenus: toNumberSafe(utilisateur.revenus, 0),
      nombre_personnes: toNumberSafe(utilisateur.nombre_personnes, 0),
      residence_principale: Boolean(utilisateur.residence_principale),
      dpe_actuel: truncateString(utilisateur.dpe_actuel, 2),
      dpe_vise: truncateString(utilisateur.dpe_vise, 2),
      budget_achat: toNumberSafe(utilisateur.budget_achat, 0),
      surface_logement: toNumberSafe(utilisateur.surface_logement, 0),
      periode_construction: truncateString(utilisateur.periode_construction, 80),
      budget_travaux: toNumberSafe(utilisateur.budget_travaux, 0),
      taxe_fonciere: toNumberSafe(utilisateur.taxe_fonciere, 0),
      gain_energetique: utilisateur.gain_energetique == null ? null : toNumberSafe(utilisateur.gain_energetique, 0),
      type_logement: utilisateur.type_logement == null ? null : truncateString(utilisateur.type_logement, 50),
      parcours_aide: utilisateur.parcours_aide == null ? null : truncateString(utilisateur.parcours_aide, 50),
      condition_depenses: Boolean(utilisateur.condition_depenses),
      notifications_aides: Boolean(utilisateur.notifications_aides),
      notifications_prix: Boolean(utilisateur.notifications_prix),
      accept_analytics: Boolean(utilisateur.accept_analytics)
    },
    simulation: {
      ...simulation,
      gain_energetique: simulation.gain_energetique == null ? null : toNumberSafe(simulation.gain_energetique, 0),
      parcours_aide: simulation.parcours_aide == null ? null : truncateString(simulation.parcours_aide, 50),
      condition_depenses: Boolean(simulation.condition_depenses),
      montant_total_aides: toNumberSafe(simulation.montant_total_aides, 0),
      pourcentage_bien: toNumberSafe(simulation.pourcentage_bien, 0),
      aides_details: safeAidesDetails,
      travaux: safeTravaux,
      date: truncateString(simulation.date, 40)
    }
  };
}

/**
 * Envoie la simulation au backend REVESTA via POST /simulations.
 *
 * Stratégie de robustesse :
 *  1. Tentative fetch() avec AbortController (timeout 25 s)
 *  2. Si la réponse est 405 GET (redirect HTTP→HTTPS qui transforme POST en GET),
 *     on réessaie avec les variantes HTTPS et la barre oblique finale
 *
 * @param {object} payload - Payload complet (annonce + utilisateur + simulation)
 * @returns {Promise<object>} - Corps de la réponse backend (201 Created)
 * @throws {Error} En cas d'échec réseau, timeout ou réponse non-2xx
 */
async function sendSimulation(payload) {
  try {
    const safePayload = sanitizeSimulationPayload(payload || {});

    console.log('📤 Envoi simulation au backend REVESTA...');
    console.log('📦 Payload:', JSON.stringify(safePayload).substring(0, 500) + '...');

    /**
    * Tente un POST fetch() sur l'URL donnée.
    * Gère manuellement les redirections pour éviter toute conversion implicite POST -> GET.
    * @param {string} url
    * @param {number} redirectCount
    * @param {object} requestPayload
    */
    const postJson = async (url, redirectCount = 0, requestPayload = safePayload) => {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(url, {
          method:   'POST',
          redirect: 'manual',
          signal:   controller.signal,
          headers:  {
            'Content-Type': 'application/json',
            'Accept':       'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        if (response.status >= 300 && response.status < 400) {
          if (redirectCount >= 3) {
            throw new Error('Trop de redirections backend');
          }

          const locationHeader = response.headers.get('Location');
          if (!locationHeader) {
            throw new Error(`Redirection ${response.status} sans en-tête Location`);
          }

          const redirectedUrl = new URL(locationHeader, url).toString();
          console.warn(`⚠️ Redirection ${response.status} détectée: ${url} -> ${redirectedUrl}`);
          return await postJson(redirectedUrl, redirectCount + 1, requestPayload);
        }

        const rawBody = await response.text();
        const data    = parseResponseBody(rawBody);
        return { response, data };
      } catch (fetchError) {
        console.warn('⚠️ fetch a échoué:', fetchError?.message || fetchError);
        throw fetchError;
      } finally {
        clearTimeout(timeout);
      }
    };

    const primaryUrl = `${REVESTA_API_URL}/simulations`;
    let { response, data } = await postJson(primaryUrl);
    let usedFallbackPayload = false;

    if (!response.ok) {
      console.warn('⚠️ Réponse backend non-OK', {
        status: response.status,
        url: response.url,
        redirected: response.redirected
      });

      const backendMessage    = (data?.message || '').toLowerCase();
      const seemsRedirectMethodLoss = response.status === 405 && backendMessage.includes('get method is not supported');
      if (seemsRedirectMethodLoss) {
        throw new Error('Le backend répond comme si la requête était en GET. Vérifiez les redirections/proxy (nginx/cdn) de /api/v1/simulations pour conserver POST.');
      }

      if (response.status === 500) {
        console.warn('⚠️ 500 backend détecté. Tentative avec payload minimal sécurisé...');
        const minimalPayload = buildMinimalSimulationPayload(safePayload);
        const retryResult = await postJson(primaryUrl, 0, minimalPayload);
        response = retryResult.response;
        data = retryResult.data;
        usedFallbackPayload = true;

        if (response.ok) {
          console.log('✅ Simulation envoyée avec payload fallback minimal.');
          return data;
        }
      }

      console.error('❌ Backend REVESTA erreur:', response.status, data);

      // 422 : erreur de validation Laravel → éxtraire le premier champ/message pour le log
      if (response.status === 422) {
        throw new Error(buildValidationErrorMessage(data));
      }
      if (usedFallbackPayload) {
        throw new Error(`Échec backend après fallback minimal (${response.status}) : ${data.message || 'Erreur inconnue'}`);
      }

      throw new Error(data.message || `Erreur serveur (${response.status})`);
    }

    console.log('✅ Simulation envoyée avec succès:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur envoi simulation:', error);
    if (error?.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre (timeout).');
    }
    if (error?.name === 'TypeError') {
      throw new Error('Erreur réseau vers le backend (TLS/CORS/DNS). Vérifiez un certificat HTTPS valide pour le domaine API et les host_permissions de l\'extension.');
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Routeur de messages (popup → service worker)
// ─────────────────────────────────────────────────────────────

/**
 * Listener principal des messages envoyés par popup.js et content-scripts.
 * Chaque handler retourne `true` pour signaler une réponse asynchrone
 * (obligatoire en MV3 ; sans ce return true, le port est fermé avant la réponse).
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
  // ── SEND_SIMULATION : envoie la simulation au backend REVESTA ──
  if (request.type === 'SEND_SIMULATION') {
    (async () => {
      try {
        const result = await sendSimulation(request.payload || {});
        sendResponse({ success: true, data: result });
      } catch (error) {
        console.error('Erreur envoi simulation:', error);
        sendResponse({ success: false, error: error?.message || 'Erreur inconnue lors de l\'envoi' });
      }
    })();
    return true; // Réponse asynchrone
  }

  // ── ANALYZE_PROPERTY : appelle l'API Mes Aides Réno et retourne les aides ──
  if (request.type === 'ANALYZE_PROPERTY') {
    analyzeAids(request.propertyData)
      .then(results => sendResponse({ success: true,  data: results }))
      .catch(error  => {
        console.error('Erreur analyse:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // ── GET_USER_CONFIG : lit la config depuis chrome.storage.sync ──
  if (request.type === 'GET_USER_CONFIG') {
    chrome.storage.sync.get(['userConfig'], (result) => {
      sendResponse(result.userConfig || {});
    });
    return true;
  }

  // ── OPEN_POPUP : ouvre le popup de l'extension via l'API chrome.action ──
  if (request.type === 'OPEN_POPUP') {
    chrome.action.openPopup()
      .then(() => {
        console.log('✅ Popup ouvert');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('❌ Erreur ouverture popup:', error);
        // L'utilisateur peut toujours cliquer sur l'icône de l'extension manuellement
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // ── SAVE_USER_CONFIG : sauvegarde la config dans chrome.storage.sync ──
  if (request.type === 'SAVE_USER_CONFIG') {
    chrome.storage.sync.set({ userConfig: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  } catch (error) {
    console.error('❌ Erreur listener onMessage:', error);
    sendResponse({ success: false, error: error?.message || 'Erreur interne service worker' });
    return true;
  }
});

/**
 * Au premier lancement de l'extension, ouvrir automatiquement la page de configuration.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('RénoAides Extension installée');
    chrome.tabs.create({ url: 'options.html' });
  }
});

console.log('✅ Service Worker RénoAides chargé');
