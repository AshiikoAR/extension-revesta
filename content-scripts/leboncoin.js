/**
 * Content Script - LeBonCoin
 * Extrait les données de l'annonce immobilière
 */

console.log('🔧 Initialisation Content Script LeBonCoin');

// Extraction des données de l'annonce
function extractLeBonCoinData() {
  try {
    console.log('🔍 Tentative extraction données LeBonCoin...');
    
    // Essayer différents sélecteurs possibles
    const getTitre = () => {
      // Priorité 1: Élément spécifique au titre (le plus fiable)
      const titleElement = document.querySelector('[data-qa-id="adview_title"]');
      if (titleElement) {
        return titleElement.textContent.trim();
      }
      
      // Priorité 2: h1 (mais peut contenir d'autres infos)
      const h1 = document.querySelector('h1');
      if (h1) {
        let title = h1.textContent.trim();
        // Retirer le prix s'il est présent (format "XXX €" ou "XXX€")
        title = title.replace(/\d+\s*€.*$/, '').trim();
        // Retirer les infos de surface si présentes (format "XXX m²")
        title = title.replace(/\d+\s*m².*$/, '').trim();
        return title;
      }
      
      // Fallback
      return document.querySelector('[data-testid="ad-title"]')?.textContent?.trim() || '';
    };

    const getPrix = () => {
      const priceText =
        document.querySelector('[data-qa-id="adview_price"]')?.textContent ||
        document.querySelector('[data-testid="ad-price"]')?.textContent ||
        document.querySelector('[class*="price"]')?.textContent ||
        '';
      return parseInt(priceText.replace(/[^\d]/g, '') || '0');
    };

    const getLocalisation = () => {
      // PRIORITÉ #1 : Lien d'adresse avec format "Ville CodePostal"
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const location = ariaLabel || linkText;
        
        // Vérifier que c'est bien au format "Ville CodePostal"
        if (location && /\d{5}/.test(location)) {
          console.log('📍 Localisation extraite (lien #map):', location);
          return location;
        }
      }
      
      // PRIORITÉ #2 : Autres sélecteurs de localisation
      let location = 
        document.querySelector('[data-qa-id="adview_location_informations"]')?.textContent?.trim() ||
        document.querySelector('[data-qa-id="adview_location_link"]')?.textContent?.trim() ||
        document.querySelector('[data-testid="ad-location"]')?.textContent?.trim() ||
        document.querySelector('[data-test="location"]')?.textContent?.trim() ||
        '';
      
      // Si pas trouvé, chercher dans les critères de l'annonce
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
      
      // Dernière tentative : chercher dans tout le body
      if (!location) {
        const bodyMatch = document.body.textContent.match(/(\d{5}\s+[\wÀ-ÿ\-]+)/);
        if (bodyMatch) {
          location = bodyMatch[1];
        }
      }
      
      console.log('📍 Localisation extraite:', location);
      return location;
    };

    const getVille = () => {
      // Extraire le nom de la ville depuis le lien d'adresse
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const textToSearch = ariaLabel || linkText;
        
        // Format "Ville CodePostal" - extraire la ville
        const villeMatch = textToSearch.match(/^([\wÀ-ÿ\-\s]+?)\s+\d{5}$/);
        if (villeMatch) {
          console.log('✅ Ville extraite:', villeMatch[1]);
          return villeMatch[1].trim();
        }
      }
      
      // Fallback: extraire depuis localisation
      const location = getLocalisation();
      const villeMatch = location.match(/^([\wÀ-ÿ\-\s]+?)\s+\d{5}/);
      if (villeMatch) {
        return villeMatch[1].trim();
      }
      
      return '';
    };

    const getCodePostal = () => {
      // Stratégie : prioriser le lien d'adresse dans les attributs du top de l'annonce
      
      // 1. PRIORITÉ #1 : Lien d'adresse dans data-test-id="adview-top-criteria-atttributes" (le plus fiable)
      // Cherche un lien <a> contenant "Ville CodePostal" avec href="#map"
      const topCriteriaLinks = Array.from(document.querySelectorAll('a[href*="#map"]'));
      for (const link of topCriteriaLinks) {
        const linkText = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        const textToSearch = ariaLabel || linkText;
        
        console.log('🔍 Lien adresse trouvé:', textToSearch);
        
        // Format "Ville CodePostal" ou "Ville - CodePostal"
        const cpMatch = textToSearch.match(/\b(\d{5})\b/);
        if (cpMatch) {
          console.log('✅ Code postal trouvé (lien adresse #map):', cpMatch[1]);
          return cpMatch[1];
        }
      }
      
      // 2. Chercher dans data-test-id="adview-top-criteria-atttributes" (sans nécessiter le lien)
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
      
      // 3. Chercher dans le titre/header de localisation
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
      
      // 4. Chercher dans les métadonnées structurées JSON-LD
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
      
      // 5. Chercher dans les critères "Ville"
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
      
      // 6. Fallback : extraire depuis localisation générale
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

    const data = {
      site: 'leboncoin',
      titre: getTitre(),
      prix: getPrix(),
      localisation: getLocalisation(),
      ville: getVille(),
      codePostal: getCodePostal(),
      surface: extractNumber(document.body.textContent, /(\d+(?:[.,]\d+)?)\s*m²/i),
      pieces: extractNumber(document.body.textContent, /(\d+)\s*pièces?/i),
      description: document.body.textContent.substring(0, 500), // Premier 500 chars
      typeLogement: extractPropertyType(),
      etage: extractNumber(document.body.textContent, /(\d+)(?:er|ère|e)?\s*étage/i),
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
 * Extraire un nombre avec regex
 */
function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
}

/**
 * Détecter le type de logement
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
 * Détecter le type de travaux à partir de la description
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
 * Ajouter un bouton pour analyser les aides
 */
function addExtensionButton() {
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
    font-weight: 500;
    letter-spacing: -0.04em;
    padding: 0.5em 1.25em;
    border-radius: 2em;
    z-index: 10000;
  `;

  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#a4c520';
    button.style.transition = 'background-color 0.5s ease;';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#0b1c13';
    button.style.transition = 'background-color 0.5s ease;';
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

// Écouter les messages du popup
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

// Extraire les données au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu que le titre soit chargé
    setTimeout(extractLeBonCoinData, 500);
  });
} else {
  // Attendre un peu que le titre soit chargé
  setTimeout(extractLeBonCoinData, 500);
}

// Re-extraire si les données changent (avec debounce pour éviter trop d'appels)
let extractTimeout = null;
const observer = new MutationObserver(() => {
  if (extractTimeout) clearTimeout(extractTimeout);
  extractTimeout = setTimeout(() => {
    extractLeBonCoinData();
  }, 1000); // Attendre 1s après le dernier changement
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});

console.log('✅ LeBonCoin Content Script prêt');
