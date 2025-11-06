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
      return (
        document.querySelector('[data-qa-id="adview_title"]')?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() ||
        document.querySelector('[data-testid="ad-title"]')?.textContent?.trim() ||
        ''
      );
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
      return (
        document.querySelector('[data-qa-id="adview_location_link"]')?.textContent?.trim() ||
        document.querySelector('[data-testid="ad-location"]')?.textContent?.trim() ||
        document.body.textContent.match(/(\d{5}\s+\w+)/)?.[1] ||
        ''
      );
    };

    const data = {
      site: 'leboncoin',
      titre: getTitre(),
      prix: getPrix(),
      localisation: getLocalisation(),
      codePostal: extractCodePostal(getLocalisation()),
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
 * Extraire le code postal
 */
function extractCodePostal(text) {
  const match = text.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
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
  const text = document.body.textContent.toLowerCase();
  if (text.includes('maison')) return 'maison';
  if (text.includes('appartement') || text.includes('studio')) return 'appartement';
  if (text.includes('terrain')) return 'terrain';
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
  button.textContent = '🏠 Voir les aides disponibles';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    transition: all 0.3s ease;
  `;

  button.addEventListener('mouseover', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.6)';
  });

  button.addEventListener('mouseout', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
  });

  button.addEventListener('click', () => {
    // Ouvrir le popup de l'extension
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP',
      propertyData: window.propertyData
    });
  });

  document.body.appendChild(button);
}

// Écouter les messages du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message reçu:', request.type);
  
  if (request.type === 'GET_PROPERTY_DATA') {
    console.log('🔄 Envoi des données:', window.propertyData);
    sendResponse({ propertyData: window.propertyData });
  }
});

// Extraire les données au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractLeBonCoinData);
} else {
  extractLeBonCoinData();
}

// Re-extraire si les données changent
const observer = new MutationObserver(() => {
  extractLeBonCoinData();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});

console.log('✅ LeBonCoin Content Script prêt');
