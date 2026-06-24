/**
 * Content Script - LeBonCoin
 *
 * Ce script s'exécute dans le contexte de la page LeBonCoin.
 * Il a deux responsabilités principales :
 *
 *  1. EXTRACTION  — Scraper les données de l'annonce (prix, surface, DPE, localisation,
 *                   images, type de bien...) et les exposer dans `window.propertyData`
 *                   ET dans `sessionStorage` pour la stratégie de récupération rapide du popup.
 *
 *  2. UI          — Injecter un bouton fixe "💰 Mes aides pour ce bien" pour ouvrir le popup,
 *                   uniquement si l'URL correpond à une annonce de vente immobilière.
 *
 * Gestion SPA :
 *   LeBonCoin est une Single Page Application. Deux MutationObservers sont actifs :
 *   - L'un ré-extrait les données après des mutations DOM (contenu chargé en lazy).
 *   - L'autre détecte les changements d'URL (navigation sans rechargement) et ajuste le bouton.
 */

console.log('🔧 Initialisation Content Script LeBonCoin');

/**
 * Point d'entrée principal : extrait toutes les données de l'annonce LeBonCoin courante.
 *
 * Les sous-fonctions sont définies en interne pour garder le scope privé.
 * Chaque sous-fonction applique plusieurs stratégies de sélecteurs par ordre de fiabilité.
 *
 * @returns {object|null} Données structurées de l'annonce, ou null en cas d'erreur
 */
function extractLeBonCoinData() {
  try {
    console.log('🔍 Tentative extraction données LeBonCoin...');
    
    // • Chaque helper ci-dessous tente plusieurs sélecteurs dans l'ordre de fiabilité
    //   du plus spécifique (attributs data-qa-id) au plus générique (body textContent).
    const getTitre = () => {
      // Priorité 1: Élément spécifique au titre (le plus fiable)
      const titleElement = document.querySelector('[data-qa-id="adview_title"]');
      if (titleElement) {
        let title = titleElement.textContent.trim();
        // Nettoyer le titre au cas où
        title = title.replace(/\d+[\s\u00A0]*€.*$/, '').trim(); // Retirer le prix
        title = title.replace(/\d+[\s\u00A0]*m².*$/, '').trim(); // Retirer la surface
        return title;
      }
      
      // Priorité 2: h1 (mais peut contenir d'autres infos)
      const h1 = document.querySelector('h1');
      if (h1) {
        let title = h1.textContent.trim();
        // Retirer le prix s'il est présent (format "XXX €" ou "XXX€" avec espace insécable possible)
        title = title.replace(/\d+[\s\u00A0]*€.*$/, '').trim();
        // Retirer les infos de surface si présentes (format "XXX m²")
        title = title.replace(/\d+[\s\u00A0]*m².*$/, '').trim();
        return title;
      }
      
      // Fallback
      return document.querySelector('[data-testid="ad-title"]')?.textContent?.trim() || '';
    };

    /** Retourne le prix en euros (sans espaces ni symboles) */
    const getPrix = () => {
      const priceText =
        document.querySelector('[data-qa-id="adview_price"]')?.textContent ||
        document.querySelector('[data-testid="ad-price"]')?.textContent ||
        document.querySelector('[class*="price"]')?.textContent ||
        '';
      return parseInt(priceText.replace(/[^\d]/g, '') || '0');
    };

    /** Retourne la chaîne "Ville CodePostal" la plus complète trouvée sur la page */
    const getLocalisation = () => {
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const location = ariaLabel || linkText;

        if (location && /\d{5}/.test(location)) {
          console.log('📍 Localisation extraite (lien #map):', location);
          return location;
        }
      }

      let location =
        document.querySelector('[data-qa-id="adview_location_informations"]')?.textContent?.trim() ||
        document.querySelector('[data-qa-id="adview_location_link"]')?.textContent?.trim() ||
        document.querySelector('[data-testid="ad-location"]')?.textContent?.trim() ||
        document.querySelector('[data-test="location"]')?.textContent?.trim() ||
        '';

      if (!location) {
        const criteriaElements = Array.from(document.querySelectorAll('[data-qa-id*="criteria"]'));
        const villeElement = criteriaElements.find(el =>
          el.textContent.includes('Ville') ||
          el.textContent.match(/\d{5}/)
        );
        if (villeElement) {
          location = villeElement.textContent.trim();
        }
      }

      if (!location) {
        const bodyMatch = document.body.textContent.match(/(\d{5}\s+[\wÀ-ÿ\-]+)/);
        if (bodyMatch) {
          location = bodyMatch[1];
        }
      }

      console.log('📍 Localisation extraite:', location);
      return location;
    };

    /** Extrait uniquement le nom de la ville (sans le code postal) */
    const getVille = () => {
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const textToSearch = ariaLabel || linkText;

        const villeMatch = textToSearch.match(/^([\wÀ-ÿ\-\s]+?)\s+\d{5}$/);
        if (villeMatch) {
          console.log('✅ Ville extraite:', villeMatch[1]);
          return villeMatch[1].trim();
        }
      }

      const location = getLocalisation();
      const villeMatch = location.match(/^([\wÀ-ÿ\-\s]+?)\s+\d{5}/);
      if (villeMatch) {
        return villeMatch[1].trim();
      }

      return '';
    };

    /**
     * Extrait le code postal (5 chiffres) en appliquant 6 stratégies successives :
     * lien #map, data-test-id de critères, header localisation, JSON-LD, critère "Ville", fallback.
     */
    const getCodePostal = () => {
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const textToSearch = ariaLabel || linkText;

        console.log('🔍 Lien adresse trouvé:', textToSearch);

        const cpMatch = textToSearch.match(/\b(\d{5})\b/);
        if (cpMatch) {
          console.log('✅ Code postal trouvé (lien adresse #map):', cpMatch[1]);
          return cpMatch[1];
        }
      }

      const topCriteria = document.querySelector('[data-test-id="adview-top-criteria-atttributes"]');
      if (topCriteria) {
        const text = topCriteria.textContent.trim();
        console.log('📍 Top criteria:', text);
        const cpMatch = text.match(/\b(\d{5})\b/);
        if (cpMatch) {
          console.log('✅ Code postal trouvé (top criteria):', cpMatch[1]);
          return cpMatch[1];
        }
      }

      const locationHeader =
        document.querySelector('[data-qa-id="adview_location_informations"]') ||
        document.querySelector('[data-qa-id="adview_location_link"]');

      if (locationHeader) {
        const text = locationHeader.textContent.trim();
        console.log('📍 Texte localisation header:', text);
        const cpMatch = text.match(/\b(\d{5})\b/);
        if (cpMatch) {
          console.log('✅ Code postal trouvé (location header):', cpMatch[1]);
          return cpMatch[1];
        }
      }

      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLd) {
        try {
          const data = JSON.parse(script.textContent);
          if (data.address?.postalCode) {
            console.log('✅ Code postal trouvé (JSON-LD):', data.address.postalCode);
            return data.address.postalCode;
          }
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.address?.postalCode) {
                console.log('✅ Code postal trouvé (JSON-LD array):', item.address.postalCode);
                return item.address.postalCode;
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Erreur parsing JSON-LD:', e);
        }
      }

      const criteriaElements = Array.from(document.querySelectorAll('[data-qa-id*="criteria"]'));
      for (const el of criteriaElements) {
        const text = el.textContent;
        if (text.trim().startsWith('Ville')) {
          const cpMatch = text.match(/\b(\d{5})\b/);
          if (cpMatch) {
            console.log('✅ Code postal trouvé (critère Ville):', cpMatch[1]);
            return cpMatch[1];
          }
        }
      }

      const location = getLocalisation();
      if (location) {
        const cpMatch = location.match(/\b(\d{5})\b/);
        if (cpMatch) {
          console.log('✅ Code postal trouvé (fallback localisation):', cpMatch[1]);
          return cpMatch[1];
        }
      }

      console.warn('⚠️ Code postal non trouvé');
      return '';
    };

    /**
     * Retourne la valeur DPE (1=A à 7=G) ou null si non renseignée.
     * 3 stratégies : élément energy-criteria, attributs data-qa-id des critères, attributs class/alt.
     */
    const getDPE = () => {
      const energyCriteria = document.querySelector('[data-test-id="energy-criteria"]');
      if (energyCriteria) {
        const activeDPE = energyCriteria.querySelector('[class*="border-surface"], [class*="h-sz-24"]');
        if (activeDPE) {
          const lettre = activeDPE.textContent.trim().toUpperCase();
          if (/^[A-G]$/.test(lettre)) {
            const dpeValue = lettre.charCodeAt(0) - 64;
            console.log(`✅ DPE trouvé (energy-criteria): ${lettre} (${dpeValue})`);
            return dpeValue;
          }
        }
      }

      const criteriaElements = Array.from(document.querySelectorAll('[data-qa-id*="criteria"]'));
      for (const el of criteriaElements) {
        const text = el.textContent.toLowerCase();

        if (text.includes('classe énergie') || text.includes('dpe') || text.includes('diagnostic')) {
          console.log('🔍 Critère DPE trouvé:', text);

          const dpeMatch = text.match(/\b([A-G])\b/i);
          if (dpeMatch) {
            const lettre = dpeMatch[1].toUpperCase();
            const dpeValue = lettre.charCodeAt(0) - 64;
            console.log(`✅ DPE trouvé (critères): ${lettre} (${dpeValue})`);
            return dpeValue;
          }
        }
      }

      const dpeElements = Array.from(document.querySelectorAll('[class*="dpe"], [class*="DPE"], [alt*="dpe"], [alt*="DPE"]'));
      for (const el of dpeElements) {
        const text = (el.textContent || el.alt || '').toLowerCase();
        const dpeMatch = text.match(/\b([A-G])\b/i);
        if (dpeMatch) {
          const lettre = dpeMatch[1].toUpperCase();
          const dpeValue = lettre.charCodeAt(0) - 64;
          console.log(`✅ DPE trouvé (élément): ${lettre} (${dpeValue})`);
          return dpeValue;
        }
      }

      console.log('ℹ️ DPE non trouvé sur la page');
      return null;
    };

    /**
     * Collecte les URLs d'images de l'annonce (dédupliquées).
     * 4 stratégies successives : galerie/carrousel, srcset, JSON-LD, fallback toutes images.
     */
    const getImages = () => {
      const images = [];
      const seen = new Set();

      const galleryImgs = document.querySelectorAll(
        '[data-qa-id="adview_gallery_container"] img, ' +
        '[data-qa-id="adview_spotlight_container"] img, ' +
        '[data-test-id="ad-photo"] img, ' +
        '[class*="gallery"] img, ' +
        '[class*="carousel"] img, ' +
        '[class*="slider"] img, ' +
        '[class*="Slider"] img'
      );
      galleryImgs.forEach(img => {
        const src = img.src || img.dataset?.src || img.getAttribute('data-src') || '';
        if (src && !seen.has(src) && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar')) {
          seen.add(src);
          images.push(src);
        }
      });

      if (images.length === 0) {
        document.querySelectorAll('[class*="gallery"] img, [class*="carousel"] img, picture source').forEach(el => {
          const srcset = el.getAttribute('srcset') || '';
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
          urls.forEach(url => {
            if (url && !seen.has(url) && !url.includes('icon') && !url.includes('logo')) {
              seen.add(url);
              images.push(url);
            }
          });
        });
      }

      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const ld = JSON.parse(script.textContent);
          const extractFromLd = (obj) => {
            if (!obj) return;
            const imgField = obj.image || obj.photo;
            if (typeof imgField === 'string' && !seen.has(imgField)) {
              seen.add(imgField);
              images.push(imgField);
            } else if (Array.isArray(imgField)) {
              imgField.forEach(u => {
                const url = typeof u === 'string' ? u : u?.url || u?.contentUrl;
                if (url && !seen.has(url)) {
                  seen.add(url);
                  images.push(url);
                }
              });
            }
          };
          if (Array.isArray(ld)) {
            ld.forEach(extractFromLd);
          } else {
            extractFromLd(ld);
          }
        } catch (_) {}
      });

      if (images.length === 0) {
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || '';
          const w = img.naturalWidth || img.width || 0;
          if (src && w >= 200 && !seen.has(src) && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar') && !src.includes('sprite')) {
            seen.add(src);
            images.push(src);
          }
        });
      }

      console.log(`📸 ${images.length} image(s) extraite(s)`);
      return images;
    };

    // ── Assembler l'objet de données final ────────────────────────────────────────
    const data = {
      site: 'leboncoin',
      titre: getTitre(),
      prix: getPrix(),
      localisation: getLocalisation(),
      ville: getVille(),
      codePostal: getCodePostal(),
      surface: extractNumber(document.body.textContent, /(\d+(?:[.,]\d+)?)\s*m²/i),
      pieces: extractNumber(document.body.textContent, /(\d+)\s*pièces?/i),
      description: document.body.textContent.substring(0, 500),
      typeLogement: extractPropertyType(),
      dpe: getDPE(),
      etage: extractNumber(document.body.textContent, /(\d+)(?:er|ère|e)?\s*étage/i),
      images: getImages(),
      url: window.location.href,
      dateExtraction: new Date().toISOString()
    };

    // Déterminer le type de travaux potentiels basé sur la description
    data.typeWork = detectWorkType(data.description);

    // Stocker dans window pour accès via executeScript
    window.propertyData = data;
    console.log('✅ LeBonCoin - Données extraites:', data);
    
    // Aussi stocker dans sessionStorage comme backup
    try {
      sessionStorage.setItem('leboncoin_propertyData', JSON.stringify(data));
      console.log('💾 Données aussi stockées en sessionStorage');
    } catch (e) {
      console.warn('⚠️ Impossible stocker en sessionStorage');
    }

    // Ajouter le bouton de l'extension
    addExtensionButton();

    return data;
  } catch (error) {
    console.error('❌ Erreur extraction LeBonCoin:', error);
    console.log('URL actuelle:', window.location.href);
    return null;
  }
}

/**
 * Extrait un nombre entier depuis un texte à l'aide d'une expression régulière.
 * La regex doit contenir un groupe capturant le nombre.
 *
 * @param {string} text  - Texte source
 * @param {RegExp} regex - Pattern avec groupe capturant, ex : /(\ d+)\s*m²/i
 * @returns {number|null}
 */
function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
}

/**
 * Détecte le type de logement en cherchant des mots-clés dans le titre puis dans les critères.
 * Retourne 'appartement', 'maison', 'terrain' ou 'autre'.
 *
 * @returns {'appartement'|'maison'|'terrain'|'autre'}
 */
function extractPropertyType() {
  // Priorité 1: Chercher dans le titre de l'annonce
  const titleElement = document.querySelector('[data-qa-id="adview_title"]') || document.querySelector('h1');
  if (titleElement) {
    const titleText = titleElement.textContent.toLowerCase().trim();
    console.log('🏠 Titre pour détection type:', titleText);
    
    // Vérifier que le titre n'est pas vide
    if (titleText.length > 0) {
      if (titleText.includes('appartement') || titleText.includes('studio') || titleText.includes('f1') || titleText.includes('f2') || titleText.includes('f3') || titleText.includes('f4') || titleText.includes('f5')) {
        console.log('✅ Type détecté: appartement');
        return 'appartement';
      }
      if (titleText.includes('maison') || titleText.includes('villa')) {
        console.log('✅ Type détecté: maison');
        return 'maison';
      }
      if (titleText.includes('terrain')) {
        console.log('✅ Type détecté: terrain');
        return 'terrain';
      }
    }
  }
  
  // Priorité 2: Chercher dans les critères "Type de bien"
  const criteriaElements = Array.from(document.querySelectorAll('[data-qa-id*="criteria"]'));
  for (const el of criteriaElements) {
    const text = el.textContent.toLowerCase();
    if (text.includes('type de bien')) {
      console.log('🏠 Type de bien trouvé dans critères:', text);
      if (text.includes('appartement') || text.includes('studio')) {
        console.log('✅ Type détecté (critères): appartement');
        return 'appartement';
      }
      if (text.includes('maison') || text.includes('villa')) {
        console.log('✅ Type détecté (critères): maison');
        return 'maison';
      }
      if (text.includes('terrain')) {
        console.log('✅ Type détecté (critères): terrain');
        return 'terrain';
      }
    }
  }
  
  console.warn('⚠️ Type de bien non détecté, utilisation "autre"');
  return 'autre';
}

/**
 * Devine le type de travaux à envisager en recherchant des mots-clés dans la description.
 * Retourne 'renovation' par défaut si aucun mot-clé spécifique n'est trouvé.
 *
 * @param {string} description
 * @returns {'renovation'|'isolation_chauffage'|'toiture'|'menuiserie'}
 */
function detectWorkType(description) {
  const descLower = description.toLowerCase();
  
  if (descLower.includes('rénovation') || descLower.includes('travaux')) {
    return 'renovation';
  }
  if (descLower.includes('isolation') || descLower.includes('chauffage')) {
    return 'isolation_chauffage';
  }
  if (descLower.includes('toiture') || descLower.includes('toit')) {
    return 'toiture';
  }
  if (descLower.includes('fenêtre') || descLower.includes('porte')) {
    return 'menuiserie';
  }
  
  return 'renovation'; // Par défaut
}

/**
 * Retourne true si l'URL courante correspond à une annonce de vente immobilière LeBonCoin.
 * Format attendu : https://www.leboncoin.fr/ad/ventes_immobilieres/{id}
 *
 * @returns {boolean}
 */
function isValidPropertyUrl() {
  const url = window.location.href;
  // Format: https://www.leboncoin.fr/ad/ventes_immobilieres/[identifiant]
  const regex = /^https:\/\/www\.leboncoin\.fr\/ad\/ventes_immobilieres\/\d+/;
  return regex.test(url);
}

/**
 * Retire le bouton "💰 Mes aides" injecté par l'extension, s'il est présent.
 * Appelé lorsque la navigation SPA conduit vers une page qui n'est pas une annonce.
 */
function removeExtensionButton() {
  const existingButton = document.getElementById('reno-aides-btn');
  if (existingButton) {
    existingButton.remove();
    console.log('🗑️ Bouton supprimé (URL non valide)');
  }
}

/**
 * Injecte un bouton fixe en bas à droite de la page pour ouvrir le popup de l'extension.
 * Le bouton est créé uniquement si l'URL est celle d'une annonce de vente immobilière.
 * Il envoie un message 'OPEN_POPUP' au service worker via chrome.runtime.sendMessage.
 * En cas de contexte d'extension invalide (rechargement de l'extension), il recharge la page.
 */
function addExtensionButton() {
  // Vérifier si l'URL est valide
  if (!isValidPropertyUrl()) {
    console.log('⏭️ URL non valide pour afficher le bouton (pas une annonce ventes_immobilieres)');
    removeExtensionButton();
    return;
  }

  // Vérifier si le bouton existe déjà
  if (document.getElementById('reno-aides-btn')) return;

  const button = document.createElement('button');
  button.id = 'reno-aides-btn';
  button.textContent = '💰	Mes aides pour ce bien';
  button.style.cssText = `
    position: fixed;
    bottom: 1em;
    right: 1em;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: #0b1c13;
    transition: background-color 0.5s ease;
    color: #fff;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    font-size: 1.25em;
    font-weight: 600;
    letter-spacing: -0.04em;
    padding: 0.5em 1.25em;
    border-radius: 2em;
    z-index: 10000;
  `;

  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#a4c520';
    button.style.transition = 'all 0.5s ease;';
    button.style.boxShadow = 'rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset;';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#0b1c13';
    button.style.transition = 'all 0.5s ease;';
  });

  button.addEventListener('click', () => {
    button.style.transform = 'translateY(-1px)';
    button.style.transition = 'transform 0.2s ease;';
    button.style.boxShadow = '0 3px 8px rgba(46, 125, 50, 0.3)';
    // Vérifier que le contexte de l'extension est toujours valide
    if (!chrome.runtime?.id) {
      console.log('🔄 Extension rechargée - actualisation de la page...');
      window.location.reload();
      return;
    }
    
    // Ouvrir le popup de l'extension en envoyant un message au background
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('🔄 Extension context invalidé - rechargement...');
        window.location.reload();
        return;
      }
      console.log('✅ Demande d\'ouverture du popup envoyée');
    });
  });

  document.body.appendChild(button);
}

// ─────────────────────────────────────────────────────────────
// Listeners & initialisation
// ─────────────────────────────────────────────────────────────

// Répondre aux demandes du popup (qui ne peut pas lire window.propertyData directement)
try {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message reçu:', request.type);
    
    if (request.type === 'GET_PROPERTY_DATA') {
      console.log('🔄 Envoi des données:', window.propertyData);
      sendResponse({ propertyData: window.propertyData });
    }
  });
} catch (error) {
  console.warn('⚠️ Impossible d\'ajouter le listener (contexte invalidé):', error.message);
}

// Lancer l'extraction dès que le DOM est prêt.
// On attend 500 ms pour laisser LeBonCoin charger son titre via JavaScript.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(extractLeBonCoinData, 500));
} else {
  setTimeout(extractLeBonCoinData, 500);
}

// Observer les mutations DOM pour re-extraire si le contenu est injecté en lazy
// (debounce 1s pour éviter des appels trop fréquents lors de gros changements DOM)
let extractTimeout = null;
const observer = new MutationObserver(() => {
  if (extractTimeout) clearTimeout(extractTimeout);
  extractTimeout = setTimeout(extractLeBonCoinData, 1000);
});
observer.observe(document.body, { childList: true, subtree: true, attributes: false });

// Détecter les changements d'URL sans rechargement (navigation SPA LeBonCoin)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('🔄 Changement d\'URL détecté:', currentUrl);
    // Sur une annonce : re-scraper. Ailleurs : retirer le bouton injecté.
    if (isValidPropertyUrl()) {
      setTimeout(extractLeBonCoinData, 500);
    } else {
      removeExtensionButton();
    }
  }
}).observe(document, { subtree: true, childList: true });

console.log('✅ LeBonCoin Content Script prêt');
