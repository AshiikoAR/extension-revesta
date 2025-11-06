/**
 * Content Script - BienIci
 * Extrait les données de l'annonce immobilière
 */

console.log('🏠 BienIci Content Script chargé');

function extractBienIciData() {
  try {
    // Sélecteurs spécifiques à BienIci
    const data = {
      site: 'bienici',
      titre: document.querySelector('h1')?.textContent?.trim() || '',
      prix: parseInt(
        document.querySelector('[data-qa="price"]')?.textContent?.replace(/[^\d]/g, '') || '0'
      ),
      localisation: document.querySelector('[data-qa="location"]')?.textContent?.trim() || '',
      codePostal: extractCodePostal(document.body.textContent),
      surface: extractNumber(document.body.textContent, /(\d+)\s*m²/i),
      pieces: extractNumber(document.body.textContent, /(\d+)\s*pièce/i),
      description: document.querySelector('[data-qa="description"]')?.textContent?.trim() || '',
      typeLogement: extractPropertyType(),
      etage: extractNumber(document.body.textContent, /(\d+)(?:er|ère|e)?\s*étage/i),
      url: window.location.href,
      dateExtraction: new Date().toISOString()
    };

    data.typeWork = detectWorkType(data.description);

    window.propertyData = data;
    console.log('✅ Données BienIci extraites:', data);
    
    addExtensionButton();
    return data;
  } catch (error) {
    console.error('Erreur extraction BienIci:', error);
    return null;
  }
}

function extractCodePostal(text) {
  const match = text.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
}

function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
}

function extractPropertyType() {
  const text = document.body.textContent.toLowerCase();
  if (text.includes('maison')) return 'maison';
  if (text.includes('appartement') || text.includes('studio')) return 'appartement';
  if (text.includes('terrain')) return 'terrain';
  return 'autre';
}

function detectWorkType(description) {
  const descLower = description.toLowerCase();
  
  if (descLower.includes('rénovation') || descLower.includes('travaux')) return 'renovation';
  if (descLower.includes('isolation') || descLower.includes('chauffage')) return 'isolation_chauffage';
  if (descLower.includes('toiture')) return 'toiture';
  if (descLower.includes('fenêtre')) return 'menuiserie';
  
  return 'renovation';
}

function addExtensionButton() {
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
  `;

  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP',
      propertyData: window.propertyData
    });
  });

  document.body.appendChild(button);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractBienIciData);
} else {
  extractBienIciData();
}

console.log('✅ BienIci Content Script prêt');
