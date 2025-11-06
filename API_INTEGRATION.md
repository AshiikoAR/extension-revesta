# 📡 Guide d'intégration des APIs

Ce document explique comment intégrer les différentes APIs gouvernementales avec RénoAides.

## 1. Mes Aides Rénov' (MESR)

### Endpoint
```
https://mesaidesreno.gouv.fr/api/aides
```

### Paramètres
```javascript
{
  code_postal: "75001",
  type_travaux: "isolation",  // isolation, chauffage, menuiserie, renovation_globale
  budget: 50000,
  type_logement: "maison"     // maison, appartement
}
```

### Réponse
```json
{
  "aides": [
    {
      "id": "aide_1",
      "nom": "MaPrimeRénov'",
      "montant_min": 1000,
      "montant_max": 25000,
      "conditions": "Revenus modestes",
      "url": "https://www.maprimerenov.gouv.fr/"
    }
  ]
}
```

### Implémentation
```javascript
async function fetchMesAidesReno(propertyData) {
  const params = new URLSearchParams({
    code_postal: propertyData.codePostal,
    type_travaux: propertyData.typeWork || 'renovation',
    budget: propertyData.prix || 0
  });

  try {
    const response = await fetch(
      `https://mesaidesreno.gouv.fr/api/aides?${params}`
    );
    return await response.json();
  } catch (error) {
    console.error('Erreur Mes Aides Rénov:', error);
    return null;
  }
}
```

---

## 2. MaPrimeRénov' (ANAH)

### Endpoint
```
https://www.maprimerenov.gouv.fr/api/eligibility/check
```

### Paramètres
```javascript
{
  code_postal: "75001",
  revenus_annuels: 45000,
  nombre_personnes: 2,
  type_logement: "maison",
  travaux_envisages: ["isolation", "chauffage"]
}
```

### Réponse
```json
{
  "eligible": true,
  "bareme": "intermédiaire",
  "montant_aide_estimee": 12000,
  "travaux_eligibles": [
    {
      "type": "isolation",
      "taux": 80,
      "montant_max": 8000
    }
  ]
}
```

### Implémentation
```javascript
async function checkMaprimeRenovEligibility(userProfile) {
  const response = await fetch(
    'https://www.maprimerenov.gouv.fr/api/eligibility/check',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code_postal: userProfile.codePostal,
        revenus_annuels: userProfile.revenus,
        nombre_personnes: userProfile.nombrePersonnes,
        type_logement: userProfile.typeLogement
      })
    }
  );
  return await response.json();
}
```

---

## 3. API Géo - Gouvernement

### Endpoint
```
https://api.geo.gouv.fr/communes?codePostal=75001
```

### Réponse
```json
{
  "communes": [
    {
      "code": "75056",
      "nom": "Paris",
      "codesPostaux": ["75001", "75002"],
      "region": "11-IDF",
      "departement": "75"
    }
  ]
}
```

### Implémentation
```javascript
async function getRegionFromPostalCode(codePostal) {
  const response = await fetch(
    `https://api.geo.gouv.fr/communes?codePostal=${codePostal}&limit=1`
  );
  const data = await response.json();
  return data.communes?.[0]?.region || null;
}
```

---

## 4. ANAH (Agence Nationale de l'Habitat)

### Endpoint
```
https://www.anah.fr/api/aides
```

### Paramètres
```javascript
{
  region: "11",
  code_postal: "75001",
  revenus: "modeste",
  type_logement: "ancien"
}
```

### Implémentation
```javascript
async function fetchANAHAides(region, codePostal) {
  const params = new URLSearchParams({
    region,
    code_postal: codePostal
  });
  
  const response = await fetch(
    `https://www.anah.fr/api/aides?${params}`
  );
  return await response.json();
}
```

---

## 5. Certificats d'Économies d'Énergie (CEE)

### Endpoint
```
https://www.echelon.gouv.fr/api/cee/eligibility
```

### Implémentation
```javascript
async function checkCEEEligibility(propertyData) {
  const response = await fetch(
    'https://www.echelon.gouv.fr/api/cee/eligibility',
    {
      method: 'POST',
      body: JSON.stringify({
        type_travaux: propertyData.typeWork,
        localisation: propertyData.codePostal
      })
    }
  );
  return await response.json();
}
```

---

## 6. API PTZ (Prêt à Taux Zéro)

### Endpoint
```
https://api.gouv.fr/ptz/eligibility
```

### Paramètres
```javascript
{
  prix_achat: 300000,
  localisation: "zone_A",
  revenus: 45000,
  nombre_personnes: 3,
  premiere_accession: true  // Premier achat immobilier
}
```

### Implémentation
```javascript
async function checkPTZEligibility(propertyData, userProfile) {
  const response = await fetch(
    'https://api.gouv.fr/ptz/eligibility',
    {
      method: 'POST',
      body: JSON.stringify({
        prix_achat: propertyData.prix,
        localisation: propertyData.zone || 'zone_B',
        revenus: userProfile.revenus,
        nombre_personnes: userProfile.nombrePersonnes,
        premiere_accession: true
      })
    }
  );
  return await response.json();
}
```

---

## 🔑 Authentification & Rate Limiting

### Headers recommandés
```javascript
const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'RénoAides-Extension/1.0',
  'Accept': 'application/json'
};
```

### Gestion du Rate Limiting
```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - attendre avant de réessayer
        const retryAfter = response.headers.get('Retry-After') || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

---

## 📊 Calcul d'estimation des aides

```javascript
function estimateAidAmount(propertyData, userProfile) {
  let totalAids = 0;
  const breakdown = [];

  // MaPrimeRénov' - Isolation
  if (userProfile.typeProjet === 'renovation') {
    const isolationAmount = calculateMaprimeRenovAid(
      userProfile.revenus,
      propertyData.surface,
      'isolation'
    );
    totalAids += isolationAmount;
    breakdown.push({
      aide: 'MaPrimeRénov\' - Isolation',
      montant: isolationAmount
    });
  }

  // Chauffage
  if (propertyData.typeWork === 'chauffage') {
    const chauffageAmount = calculateChauffageAid(
      userProfile.barème,
      propertyData.typeLogement
    );
    totalAids += chauffageAmount;
  }

  return {
    total: totalAids,
    breakdown: breakdown,
    pct_propriete: Math.round((totalAids / propertyData.prix) * 100)
  };
}
```

---

## 🧪 Tests avec Postman/cURL

### Test Mes Aides Rénov'
```bash
curl -X GET "https://mesaidesreno.gouv.fr/api/aides?code_postal=75001&type_travaux=isolation" \
  -H "Accept: application/json"
```

### Test Géolocalisation
```bash
curl -X GET "https://api.geo.gouv.fr/communes?codePostal=75001" \
  -H "Accept: application/json"
```

---

## ⚠️ Gestion d'erreurs

```javascript
async function safeApiCall(apiFunction, fallbackData = null) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API Error:', error);
    
    // Logger pour le debugging
    if (CONFIG.DEBUG.LOG_API_CALLS) {
      console.log('Failed API call:', error.message);
    }
    
    // Retourner un fallback ou null
    return fallbackData;
  }
}
```

---

## 📚 Ressources

- [Mes Aides Rénov' Docs](https://mesaidesreno.gouv.fr/docs)
- [MaPrimeRénov' API](https://www.maprimerenov.gouv.fr/api)
- [API.gouv.fr](https://api.gouv.fr/)
- [ANAH Documentation](https://www.anah.fr/documentation)

---

**Dernière mise à jour : Novembre 2025**
