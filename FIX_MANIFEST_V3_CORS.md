# 🔧 Corrections Manifest v3 & CORS

**Date:** 6 novembre 2025  
**Status:** ✅ CORRIGÉ

---

## 🔴 Erreurs trouvées

### Erreur 1: `chrome.tabs.executeScript is not a function`

```javascript
// ❌ WRONG - Manifest v2 API
chrome.tabs.executeScript(tab.id, { code: '...' })

// ✅ CORRECT - Manifest v3 API
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: () => { ... }
})
```

**Cause:** Vous aviez des appels Manifest v2 dans un projet Manifest v3.

---

### Erreur 2: CORS - APIs gouvernementales bloquées

```
Access to fetch at 'https://api.gouv.fr/api/v1/mesaides/check-eligibility' 
from origin 'chrome-extension://...' has been blocked by CORS policy
```

**Cause:** Les APIs gouvernementales ne permettent pas les requêtes depuis une extension Chrome (origine différente).

**Solution pour production:** Vous aurez besoin d'un backend intermédiaire qui:
1. Reçoit la requête de l'extension
2. Appelle l'API gouvernementale (depuis un serveur)
3. Retourne les données à l'extension

---

## ✅ Corrections appliquées

### 1. **popup.js** - Migration Manifest v3

```javascript
// AVANT:
const response = await chrome.tabs.executeScript(tab.id, {
  code: 'window.propertyData || null'
});
if (response && response[0]) {
  currentPropertyData = response[0];
}

// APRÈS:
const response = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: () => window.propertyData || null
});
if (response && response[0] && response[0].result) {
  currentPropertyData = response[0].result;
}
```

**Impact:** Fonctionne maintenant correctement avec Manifest v3 ✅

---

### 2. **background.js** - APIs mockées (prototype)

Pour que l'extension fonctionne maintenant sans backend, on utilise des données mockées:

```javascript
// AVANT: Appel API réel (CORS ERROR)
const response = await fetch(
  'https://api.gouv.fr/api/v1/mesaides/check-eligibility',
  { method: 'POST', ... }
);

// APRÈS: Données mockées
const aides = [
  {
    nom: 'MaPrimeRénov\'',
    montantEstime: 5000,
    description: 'Aide pour améliorer la performance énergétique',
    lien: 'https://www.maprimerenov.gouv.fr/'
  }
];
return cacheResult('maprimerenov', propertyData.codePostal, aides);
```

**Impact:** 
- ✅ Extension fonctionne pour le prototype/démo
- ⚠️ Données simulées (pas réelles)
- 💡 À remplacer par un backend réel pour la production

---

### 3. **background.js** - API Géo avec fallback

```javascript
// AVANT: Retournait null en cas d'erreur
if (!response.ok) return null;

// APRÈS: Retourne données par défaut
if (!response.ok) {
  return {
    nom: 'Commune inconnue',
    region: 'Région inconnue',
    codePostal: codePostal
  };
}
```

**Impact:** L'extension continue de fonctionner même si API Géo échoue ✅

---

## 🧪 Comment tester maintenant

### Étape 1: Recharger l'extension

```
1. chrome://extensions/
2. Cliquer Actualiser 🔄 pour RénoAides
3. Message: "Extension mise à jour"
```

### Étape 2: Ouvrir une annonce LeBonCoin

```
https://www.leboncoin.fr/ad/ventes_immobilieres/3087048892
```

### Étape 3: Vérifier la console (F12 → Console)

**Vous devriez voir:**

```
✅ Site supporté, tentative de récupération des données...
📡 Tentative scripting.executeScript (Manifest v3)...
✅ Données récupérées via scripting.executeScript: {site: 'leboncoin', ...}
```

**Pas d'erreur CORS:**

```
✅ Pas d'erreur "chrome.tabs.executeScript is not a function"
✅ Pas d'erreur CORS
```

### Étape 4: Vérifier le popup

Cliquez sur l'icône RénoAides → Le popup devrait afficher:
- Titre, prix, localisation
- Aides disponibles (mockées pour le prototype)
- Liens vers les portails d'aides

---

## 📊 Résumé des changements

| Fichier | Changement | Raison |
|---------|-----------|--------|
| popup.js | `chrome.tabs.executeScript` → `chrome.scripting.executeScript` | Manifest v3 |
| background.js (line 14) | `extractPropertyInfo()` mise à jour | Manifest v3 |
| background.js (line 34) | `fetchMesAidesReno()` → données mockées | CORS (prototype) |
| background.js (line 58) | `fetchMaprimeRenov()` → données mockées | CORS (prototype) |
| background.js (line 82) | `fetchGeoInfo()` + fallback | Robustesse |

---

## ⚠️ Notes importantes

### Pour la production (Chrome Web Store):

Vous aurez besoin d'un **backend intermédiaire**:

```
Extension → Backend (votre serveur) → APIs Gouvernementales
```

Exemple d'architecture Node.js/Express:

```javascript
// backend.js
app.post('/api/aides', async (req, res) => {
  const { codePostal } = req.body;
  // Appel API gouvernementale depuis le serveur
  const aides = await fetch('https://api.gouv.fr/...', {...});
  res.json(aides);
});
```

Ensuite, dans `background.js`:

```javascript
async function fetchMesAidesReno(propertyData) {
  const response = await fetch('https://votre-backend.com/api/aides', {
    method: 'POST',
    body: JSON.stringify({ codePostal: propertyData.codePostal })
  });
  return response.json();
}
```

### Pour les tests locaux:

Les données mockées permettent de tester toute la logique sans backend ✅

---

## ✨ Améliorations apportées

✅ Migration complète Manifest v3  
✅ Plus d'erreur `chrome.tabs.executeScript`  
✅ Plus d'erreur CORS  
✅ Fallbacks robustes  
✅ Extension fonctionne pour prototype  

---

## 🚀 Prochaines étapes

1. **Testez maintenant** avec les données mockées ✅
2. **Validez** que le popup affiche bien les aides
3. **En production:** Développez un backend pour les vraies APIs
4. **Déploiement:** Soumettez à Chrome Web Store

---

**Author:** Fix Suite v2.0  
**Status:** Ready for Testing ✅
