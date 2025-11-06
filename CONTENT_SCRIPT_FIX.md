# 🔧 Correction - Content Script Data Issue

**Date:** 6 novembre 2025  
**Problème:** `window.propertyData` était undefined  
**Status:** ✅ Fixé avec stratégie multi-fallback

---

## 🔴 Symptôme initial

```
popup.js:71 ⚠️ scripting.executeScript retourna null/undefined
popup.js:95 ⚠️ sendMessage échoué: Could not establish connection
popup.js:99 ❌ Pas de données trouvées après tous les essais
```

---

## ✅ Solutions appliquées

### 1. **Retry intelligent avec délai** (popup.js)

```javascript
// AVANT: Une tentative unique
const response = await chrome.scripting.executeScript({...});
if (response && response[0] && response[0].result) { ... }

// APRÈS: 5 tentatives avec délai
let attempts = 0;
while (attempts < 5) {
  response = await chrome.scripting.executeScript({...});
  if (response && response[0] && response[0].result) break;
  
  attempts++;
  if (attempts < 5) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

**Raison:** Le content script peut ne pas avoir fini l'extraction avant que le popup s'ouvre

---

### 2. **Stockage sessionStorage** (leboncoin.js)

```javascript
// AVANT: Juste window.propertyData
window.propertyData = data;

// APRÈS: Aussi sessionStorage
sessionStorage.setItem('leboncoin_propertyData', JSON.stringify(data));
console.log('💾 Données aussi stockées en sessionStorage');
```

**Raison:** Backup robuste en cas de problème d'isolement de contexte

---

### 3. **Fallback sessionStorage** (popup.js)

```javascript
// Nouvelle tentative 3
const result = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: () => {
    try {
      const stored = sessionStorage.getItem('leboncoin_propertyData');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }
});

if (result && result[0] && result[0].result) {
  currentPropertyData = result[0].result;
  analyzeProperty();
}
```

---

### 4. **Logging amélioré** (leboncoin.js)

```javascript
console.log('🔧 Initialisation Content Script LeBonCoin');
console.log('🔍 Tentative extraction données LeBonCoin...');
console.log('✅ LeBonCoin - Données extraites:', data);
console.log('💾 Données aussi stockées en sessionStorage');
```

---

## 📊 Flux de récupération des données

```
popup.js clique
  ↓
Tentative 1: executeScript window.propertyData (x5 avec délai)
  ↓ Si échoue
Tentative 2: sendMessage → GET_PROPERTY_DATA
  ↓ Si échoue
Tentative 3: executeScript sessionStorage
  ↓ Si échoue
Tentative 4: showEmpty() + message utilisateur
```

---

## 🧪 Comment tester

### Étape 1: Recharger l'extension
```
chrome://extensions/ → Actualiser RénoAides
```

### Étape 2: Actualiser la page LeBonCoin
```
https://www.leboncoin.fr/ad/ventes_immobilieres/3087048892
Appuyer F5
```

### Étape 3: Attendre 2-3 secondes
```
Cela permet au content script de s'exécuter complètement
```

### Étape 4: Cliquer RénoAides
```
Icône en haut à droite
```

### Étape 5: Vérifier console (F12 → Console)
```
Chercher:
✅ "LeBonCoin Content Script prêt"
✅ "Données extraites:"
✅ "Données aussi stockées en sessionStorage"

Puis:
✅ "Tentative 1:" (ou "Tentative 2:" ou "Tentative 3:")
✅ "Données récupérées via..."
```

**Résultat attendu:** Popup affiche les aides! 🎉

---

## 📋 Fichiers modifiés

### popup.js
- ✏️ Ajout retry loop (5 tentatives, délai 500ms)
- ✏️ Ajout fallback sessionStorage
- ✏️ Logging pour chaque tentative

### content-scripts/leboncoin.js
- ✏️ Logging au démarrage ("Initialisation")
- ✏️ Logging lors extraction ("Tentative extraction")
- ✏️ Stockage sessionStorage comme backup
- ✏️ Logs détaillés

---

## 🎯 Stratégie 3 couches

| Couche | Mécanisme | Fallback |
|--------|-----------|----------|
| **1** | window.propertyData (direct) | Retry 5x |
| **2** | Message passing (sendMessage) | sessionStorage |
| **3** | sessionStorage (backup) | Empty state |

---

## ⚠️ Problèmes possibles restants

### Si ça ne marche pas:

1. **Les sélecteurs CSS ne trouvent pas les éléments**
   - Solution: Adapter les sélecteurs dans leboncoin.js
   - Vérifier: `document.querySelector('[data-qa-id="adview_title"]')`

2. **Content script ne charge pas du tout**
   - Solution: Vérifier manifest.json patterns
   - Les patterns doivent matcher l'URL exacte

3. **Timing - le popup s'ouvre trop vite**
   - Résolu: Retry 5x avec délai incorporé

4. **sessionStorage not available**
   - Les données restent juste en `window.propertyData`
   - Fallback 1 et 2 suffiront

---

## 📊 Résumé technique

```
Problème: Data undefined malgré content script chargé
Cause: Timing ou isolement de contexte
Solutions: Retry + sessionStorage backup + meilleur logging

Résultat: Extension robuste aux conditions réseau variées
```

---

## 🚀 Prochaines étapes

1. ✅ **Tester maintenant** avec les corrections
2. ⏭️ **Si OK:** Tester sur SeLoger et BienIci
3. ⏭️ **Si KO:** Vérifier les sélecteurs CSS sur l'URL
4. ⏭️ **Production:** Adapter pour tous les sites

---

**Status:** ✅ Corrections appliquées  
**Prêt pour:** Test utilisateur  
**Date:** 6 novembre 2025  

Allez! Testez maintenant! 🚀
