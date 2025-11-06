# 🔍 Guide Debugging Détaillé

## 🐛 Erreurs actuelles

```
Tab URL: https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412
ExecuteScript échoué
SendMessage échoué: Could not establish connection. Receiving end does not exist.
Pas de données trouvées
```

### Cause racine
**Le content script ne charge PAS sur cette URL** parce que le pattern du manifest ne matchait pas.

---

## ✅ Correction appliquée

### 1. Manifest.json corrigé
```json
// AVANT (ne fonctionnait pas):
"matches": ["https://www.leboncoin.fr/ventes_immobilieres/*"]

// APRÈS (fonctionne maintenant):
"matches": [
  "https://www.leboncoin.fr/ventes_immobilieres/*",
  "https://www.leboncoin.fr/ad/ventes_immobilieres/*"
]
```

### 2. Sélecteurs CSS améliorés
- Ajout de fallbacks multiples
- Support des anciennes et nouvelles structures de LeBonCoin
- Meilleure extraction du texte

### 3. Logs améliorés
- Marqueurs visuels (✅, ❌, ⚠️, 📡, 💡)
- Messages plus détaillés à chaque étape
- URL affichée pour debugging

---

## 🧪 Comment vérifier maintenant

### ÉTAPE 1: Recharger l'extension

```
1. Aller à: chrome://extensions/
2. Cliquer le bouton "Actualiser" 🔄 pour RénoAides
3. Vérifier: "Extension mise à jour"
```

### ÉTAPE 2: Ouvrir la console de la page

```
1. Aller sur: https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412
2. Ouvrir la console: F12 → Console
3. Chercher les logs RénoAides (devraient commencer par ✅)
```

### ÉTAPE 3: Vérifier que le content script a chargé

**En console (F12) sur la page LeBonCoin, écrire:**

```javascript
window.propertyData
```

**Si cela fonctionne, vous verrez:**

```javascript
{
  site: "leboncoin",
  titre: "Titre de l'annonce",
  prix: 250000,
  localisation: "Paris 75001",
  codePostal: "75001",
  ...
}
```

**Si vous voyez `undefined`, le content script n'a pas chargé.**

---

## 📋 Checklist de debugging

### Content Script (F12 sur la page)
- [ ] Console affiche "✅ LeBonCoin Content Script prêt"
- [ ] Console affiche "✅ LeBonCoin - Données extraites:"
- [ ] `window.propertyData` retourne un objet (pas undefined)
- [ ] Le bouton "🏠 Voir les aides" est visible en bas-droit

### Manifest
- [ ] L'URL `https://www.leboncoin.fr/ad/ventes_immobilieres/*` est dans les patterns
- [ ] `run_at: "document_end"` est configuré
- [ ] Les permissions incluent les APIs

### Popup
- [ ] Le popup s'ouvre sans erreur
- [ ] Console du popup (clic-droit → Inspecter) affiche les logs détaillés
- [ ] "Tab URL:" est affiché avec l'URL correcte

---

## 🔬 Tests progressifs

### Test 1: Vérifier que le site est supporté
```javascript
// En console du popup:
isSupportedSite('https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412')
// Devrait retourner: true
```

### Test 2: Vérifier le pattern d'URL
```javascript
// Votre URL:
https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412

// Pattern du manifest:
https://www.leboncoin.fr/ad/ventes_immobilieres/*

// Devrait matcher: ✅ OUI
```

### Test 3: Vérifier executeScript
```javascript
// En console du popup (Developer Tools):
chrome.tabs.executeScript(tab.id, {
  code: 'window.propertyData'
})
// Devrait retourner un objet avec les données
```

---

## 🚨 Si ça n'apparaît toujours pas

### Option A: Forcer un rafraîchissement complet

```bash
# Sur la page LeBonCoin:
1. F5 (rafraîchir la page)
2. Attendre 2 secondes
3. Vérifier les logs (F12)
```

### Option B: Vérifier la version de Chrome

```
1. chrome://version/
2. Vérifier que la version est >= 90
3. Manifest v3 nécessite Chrome 90+
```

### Option C: Nettoyer le cache

```bash
# Terminal macOS:
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Service\ Worker/

# Puis recharger l'extension
```

---

## 📊 Flux d'exécution attendu

```
1. Utilisateur ouvre: https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412
   ↓
2. Content script (leboncoin.js) charge automatiquement
   ↓ (Console affiche: ✅ LeBonCoin Content Script prêt)
   
3. Le script analyse la page
   ↓ (Console affiche: ✅ LeBonCoin - Données extraites: {...})
   
4. Stocke les données dans window.propertyData
   ↓ (test: window.propertyData → affiche l'objet)
   
5. Ajoute le bouton "🏠 Voir les aides" en bas-droit
   ↓ (Bouton visible sur la page)
   
6. Utilisateur clique le bouton
   ↓
7. Popup s'ouvre (ou peut cliquer l'icône extension)
   ↓
8. Popup.js essaie executeScript puis sendMessage
   ↓ (Console popup affiche: ✅ Données récupérées)
   
9. Données analysées, résultats affichés
   ↓ (Montant des aides affiché)
```

---

## 🎯 Logs à envoyer si besoin

### 1. Console de la page LeBonCoin (F12)
```
Copier/coller tout ce qui contient:
- ✅
- ❌
- ⚠️
- LeBonCoin
- propertyData
```

### 2. Console du popup (Clic-droit → Inspecter)
```
Copier/coller:
Tab URL: ...
Tentative executeScript...
Tentative sendMessage...
```

### 3. Service Worker logs
```
chrome://extensions/ → RénoAides → "Service Worker"
Copier/coller les erreurs
```

---

## ✨ Signes que ça fonctionne

### Console de la page LeBonCoin:
```
✅ LeBonCoin Content Script prêt
✅ LeBonCoin - Données extraites: {site: 'leboncoin', titre: '...', ...}
```

### Page:
```
Bouton "🏠 Voir les aides disponibles" visible en bas-droit
```

### Popup:
```
📍 Tab URL: https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412
✅ Site supporté, tentative de récupération des données...
📡 Tentative executeScript...
✅ Données récupérées via executeScript: {...}
```

### Résultat final:
```
Popup affiche:
- Titre de l'annonce
- Prix
- Localisation
- Montant estimé des aides
- Liste des aides
- Liens officiels
```

---

## 🔗 Ressources

- Chrome Manifest v3: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
- executeScript: https://developer.chrome.com/docs/extensions/reference/tabs/#method-executeScript
- sendMessage: https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage

---

**Créé: Novembre 2025**  
**Pour: Debugging erreur "Could not establish connection"**  
**Status: À jour avec les derniers fixes**
