# 📚 Exemples d'utilisation & Cas d'usage

## Exemple 1 : Annonce LeBonCoin - Maison à rénover

### Scenario
Un couple cherche une maison à acheter et à rénover dans le Lot-et-Garonne (47).

### Flux
1. L'utilisateur va sur une annonce LeBonCoin
2. Il clique sur le bouton "🏠 Voir les aides disponibles"
3. Le popup affiche :
   - **Propriété** : Maison 150m², 4 pièces, 250 000€
   - **Aides estimées** : 45 000€ (soit 18% de la propriété)
   - **Aides disponibles** :
     - MaPrimeRénov' (isolation) : jusqu'à 25 000€
     - Éco-PTZ : jusqu'à 30 000€ (mais cumulable)
     - Aides Région Nouvelle-Aquitaine : jusqu'à 5 000€
   - **Budget réel** : 250 000€ - 45 000€ = 205 000€

### Code
```javascript
// Dans leboncoin.js - Extraction de données
const propertyData = {
  site: 'leboncoin',
  titre: 'Maison 150m², 4 pièces',
  prix: 250000,
  localisation: '47100 Agen',
  codePostal: '47100',
  surface: 150,
  pieces: 4,
  typeLogement: 'maison',
  typeWork: 'renovation', // Detecté automatiquement
  description: 'Maison à rénover...'
};

// Dans background.js - Analyse
const results = await analyzeAids(propertyData);
// Retourne: { aides: [...], estimationAide: { montantTotal: 45000, ... } }
```

---

## Exemple 2 : Annonce SeLoger - Appartement pour primo-accédant

### Scenario
Jeune couple (premiers acheteurs, revenus modestes) cherche un appartement à Toulouse

### Données utilisateur
```javascript
{
  codePostal: '31000',
  revenus: 42000,      // Combined household
  nombrePersonnes: 2,
  typeProjet: 'achat',
  typeLogement: 'appartement',
  primeAccession: true
}
```

### Réponse API
```json
{
  "aides": [
    {
      "nom": "Prêt à Taux Zéro (PTZ)",
      "montantMax": 250000,
      "description": "Pour primo-accédants",
      "eligible": true
    },
    {
      "nom": "MaPrimeAccès",
      "montantMax": 20000,
      "description": "Aide complémentaire accession",
      "eligible": true
    }
  ],
  "estimationAide": {
    "montantTotal": 70000,
    "estimationAideEnPourcent": 28
  }
}
```

---

## Exemple 3 : Tracking de propriété multiples

### Use Case
Comparaison de 3 propriétés différentes

```javascript
// Propriété 1 - Zone rurale (Corrèze)
const prop1 = {
  prix: 120000,
  codePostal: '19000',
  typeWork: 'renovation'
  // Aides estimées : 35 000€
};

// Propriété 2 - Banlieue parisienne (Val-de-Marne)
const prop2 = {
  prix: 350000,
  codePostal: '94200',
  typeWork: 'isolation'
  // Aides estimées : 18 000€
};

// Propriété 3 - Centre-ville Bordeaux
const prop3 = {
  prix: 400000,
  codePostal: '33000',
  typeWork: 'renovation_globale'
  // Aides estimées : 42 000€
};

// Comparaison
const comparison = [prop1, prop2, prop3].map(async (prop) => {
  return await analyzeAids(prop);
});
```

---

## Exemple 4 : Webhook pour notifications

### Système de notification d'aides

```javascript
// Enregistrer une notification
async function setupNotification(property) {
  const config = await getUserConfig();
  
  if (config.notificationsAides) {
    chrome.notifications.create('aide-notification-' + Date.now(), {
      type: 'basic',
      iconUrl: 'images/icon-128.png',
      title: '💰 Nouvelle aide disponible !',
      message: `Une nouvelle aide a été trouvée pour ${property.titre}`,
      buttons: [
        { title: 'Voir' },
        { title: 'Ignorer' }
      ]
    });
  }
}

// Écouter les clics
chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.runtime.openOptionsPage();
  }
});
```

---

## Exemple 5 : Export PDF des aides

```javascript
// Fonction pour générer un rapport
async function generateAidReport(propertyData) {
  const results = await analyzeAids(propertyData);
  
  const report = {
    property: propertyData,
    aides: results.aides,
    summary: {
      totalAmount: results.estimationAide.montantTotal,
      percentageOfProperty: results.estimationAide.estimationAideEnPourcent,
      generatedAt: new Date().toISOString()
    }
  };
  
  // À implémenter : conversion en PDF via jsPDF
  return report;
}
```

---

## Exemple 6 : Détection de type de travaux améliorée

```javascript
function detectDetailedWorkType(description) {
  const patterns = {
    isolation: /isolation|thermal|thermique|polystyrène|laine/gi,
    chauffage: /chauffage|radiateur|chaudière|boiler|radiators?/gi,
    menuiserie: /fenêtre|porte|menuiserie|window|door/gi,
    toiture: /toiture|toit|roof|tuiles/gi,
    electricite: /électricité|wiring|installation électrique/gi,
    plomberie: /plomberie|tuyauterie|plumbing/gi,
    peinture: /peinture|painting|décoration/gi
  };
  
  const detected = [];
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(description)) {
      detected.push(type);
    }
  }
  
  return detected.length > 0 ? detected : ['renovation'];
}
```

---

## Exemple 7 : Gestion du cache avec expiration

```javascript
const CACHE_MANAGER = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const cached = result[key];
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('✅ Cache hit:', key);
          resolve(cached.data);
        } else {
          console.log('❌ Cache miss or expired:', key);
          resolve(null);
        }
      });
    });
  },
  
  async set(key, data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [key]: {
          data,
          timestamp: Date.now()
        }
      }, resolve);
    });
  },
  
  async clear(pattern) {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items).filter(key => 
          key.match(pattern)
        );
        chrome.storage.local.remove(keys, resolve);
      });
    });
  }
};

// Usage
await CACHE_MANAGER.set('aid_75001', aidesData);
const cached = await CACHE_MANAGER.get('aid_75001');
```

---

## Exemple 8 : Intégration avec un backend (optionnel)

```javascript
// Envoyer les données vers un serveur pour analytics
async function logAnalytics(propertyData, results) {
  if (!config.acceptAnalytics) return;
  
  try {
    await fetch('https://analytics.example.com/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: propertyData.site,
        region: propertyData.codePostal.substring(0, 2),
        workType: propertyData.typeWork,
        aidsFound: results.aides.length,
        totalAid: results.estimationAide.montantTotal,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
}
```

---

## Exemple 9 : Tests unitaires basiques

```javascript
// test-extraction.js
function testLeBonCoinExtraction() {
  const mockHTML = /* ... */;
  const result = extractLeBonCoinData();
  
  console.assert(result.prix > 0, 'Price should be positive');
  console.assert(result.codePostal.length === 5, 'Postal code should be 5 digits');
  console.assert(['maison', 'appartement'].includes(result.typeLogement), 'Valid property type');
  
  console.log('✅ All tests passed!');
}
```

---

## Exemple 10 : Configuration personnalisée

```javascript
// options.js - Sauvegarde de la configuration
const userProfile = {
  codePostal: '75001',
  revenus: 65000,
  nombrePersonnes: 2,
  typeProjet: 'achat',
  typeLogement: 'appartement',
  travaux: ['isolation', 'chauffage'],
  notificationsAides: true,
  notificationsPrix: true,
  acceptAnalytics: false
};

chrome.storage.sync.set({ userConfig: userProfile });
```

---

**📌 Ces exemples montrent les cas d'usage principaux et comment les intégrer dans RénoAides**
