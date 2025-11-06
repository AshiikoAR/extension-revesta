# 🔍 Diagnostic - Content Script ne renvoie rien

**Problème:** `window.propertyData` est `undefined`  
**Date:** 6 novembre 2025

---

## 📊 Symptômes

```
popup.js:71 ⚠️ scripting.executeScript retourna null/undefined
popup.js:95 ⚠️ sendMessage échoué: Could not establish connection
```

**Signification:** Le content script n'a pas stocké de données dans `window.propertyData`

---

## 🔧 Causes possibles

### 1. **Content script ne s'exécute pas du tout** ❌
- Fichier leboncoin.js ne s'initialise pas
- Solution: Vérifier manifest.json patterns

### 2. **Sélecteurs CSS ne trouvent rien** ⚠️
- Les sélecteurs `[data-qa-id="adview_title"]` n'existent pas sur la page
- Résultat: `data.titre = ''`, `data.prix = 0`
- Solution: Utiliser des sélecteurs génériques

### 3. **Timing - Le popup s'ouvre trop tôt** ⏳
- Le content script est chargé mais `extractLeBonCoinData()` n'a pas fini
- Solution: Implémenter retry avec délai

### 4. **CORS/Isolement contexte** 🔒
- Le content script tourne dans un contexte isolé
- `window.propertyData` ne peut pas être accédée depuis popup
- Solution: Modifier l'approche

---

## ✅ Solutions implémentées

### 1. **Logging amélioré au démarrage**
```javascript
console.log('🔧 Initialisation Content Script LeBonCoin');
console.log('🔍 Tentative extraction données LeBonCoin...');
```

### 2. **Fallbacks multiples dans popup.js**
```
Tentative 1: window.propertyData (via executeScript)
  ↓ Retry 5x avec délai 500ms
  ↓
Tentative 2: sendMessage → GET_PROPERTY_DATA
  ↓
Tentative 3: sessionStorage → leboncoin_propertyData
  ↓
Tentative 4: Afficher empty state
```

### 3. **Stockage en sessionStorage**
```javascript
sessionStorage.setItem('leboncoin_propertyData', JSON.stringify(data));
```

### 4. **Retry intelligent**
```javascript
while (attempts < 5) {
  // Tenter executeScript
  // Attendre 500ms entre essais
}
```

---

## 🧪 Comment diagnostiquer

### Test 1: Vérifier que le content script s'exécute
```
1. Ouvrir: https://www.leboncoin.fr/ad/ventes_immobilieres/3087048892
2. F12 → Console
3. Chercher: "✅ LeBonCoin Content Script prêt"
```

**Si vous le voyez:** Content script s'exécute ✅  
**Si vous ne le voyez pas:** Content script ne charge pas ❌

---

### Test 2: Vérifier que les sélecteurs trouvent des éléments
```
1. F12 → Console
2. Taper: document.querySelector('[data-qa-id="adview_title"]')
3. Vérifier: Retourne un élément (pas null)
```

**Si vous voyez un élément:** Sélecteurs OK ✅  
**Si null:** Sélecteurs à adapter ❌

---

### Test 3: Vérifier window.propertyData
```
1. F12 → Console
2. Taper: window.propertyData
3. Vérifier: Retourne un objet avec {site, titre, prix, ...}
```

**Si vous voyez l'objet:** Données extraites ✅  
**Si undefined:** Sélecteurs ne trouvent rien ❌

---

### Test 4: Tester executeScript directement
```javascript
// En console:
const response = await chrome.scripting.executeScript({
  target: { tabId: chrome.tabs.getCurrent()[0].id },
  function: () => window.propertyData
});
console.log(response);
```

**Résultat attendu:** 
```javascript
[{ result: { site: 'leboncoin', titre: '...', ... } }]
```

---

### Test 5: Vérifier sessionStorage
```
1. F12 → Application → Storage → Session Storage
2. Chercher: "leboncoin_propertyData"
3. Vérifier: Contient l'objet JSON
```

---

## 📋 Plan d'action

### Maintenant (Immédiat):
1. ✅ Ajouter retry avec délai (FAIT)
2. ✅ Ajouter fallback sessionStorage (FAIT)
3. ✅ Améliorer logging (FAIT)

### À tester:
1. Recharger extension: `chrome://extensions/`
2. Actualiser page LeBonCoin: F5
3. Cliquer RénoAides
4. Vérifier console pour logs détaillés

### Si encore ça ne marche pas:
1. Adapter les sélecteurs CSS (voir Test 2)
2. Vérifier manifest.json patterns
3. Implémenter extraction simple et généralisée

---

## 🎯 Solution de secours: Sélecteurs génériques

Si les sélecteurs LeBonCoin ne trouvent rien, voici une approche plus robuste:

```javascript
// Au lieu de:
document.querySelector('[data-qa-id="adview_title"]')

// Utiliser:
document.evaluate("//h1", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue

// Ou:
Array.from(document.querySelectorAll('*')).find(el => 
  el.textContent.includes('€') && el.textContent.length < 100
)
```

---

## 📊 Checklist diagnostic

| Item | Status |
|------|--------|
| Content script se charge | ? |
| Sélecteurs trouvent éléments | ? |
| window.propertyData existe | ? |
| sessionStorage stocke les données | ? |
| popup.js récupère les données | ? |
| Popup affiche les aides | ? |

---

## 🚀 Prochaines étapes

1. **Tester maintenant** avec les améliorations
2. **Regarder les logs** pour identifier le problème exact
3. **Adapter les sélecteurs** si nécessaire
4. **Tester les 3 sites** (LeBonCoin, SeLoger, BienIci)

---

**Status:** 🔧 Diagnostics appliqués, prêt au test  
**Prochaine vérification:** Console F12 pour logs détaillés

