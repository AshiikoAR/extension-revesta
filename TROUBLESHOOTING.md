# 🔧 Troubleshooting - Erreur "Could not establish connection"

## ❌ Erreur rencontrée
```
popup.js:53 Erreur communication: Error: Could not establish connection. 
Receiving end does not exist.
```

## ✅ Solutions appliquées

### 1. **Popup.js corrigé**
- Ajout de try/catch robuste
- Utilisation de `executeScript` comme fallback
- Meilleure gestion d'erreurs avec logs détaillés
- Support des 2 méthodes de communication

### 2. **Content script LeBonCoin amélioré**
- Ajout de listener `chrome.runtime.onMessage`
- Stockage dans `window.propertyData` accessible
- Logs de debug pour tracer le flux
- Réponse au message GET_PROPERTY_DATA

### 3. **Manifest.json corrigé**
- Vérification des URL patterns
- Host permissions complètes
- Timing d'injection optimal (`document_end`)

---

## 🧪 Comment tester maintenant

### Étape 1: Recharger l'extension
```
1. chrome://extensions/
2. Cliquer le bouton "Actualiser" (🔄) pour RénoAides
3. Vérifier le message "Extension mise à jour"
```

### Étape 2: Tester sur LeBonCoin
```
1. Aller sur: https://www.leboncoin.fr/ventes_immobilieres/
2. Chercher une annonce (ex: maison, appartement)
3. Cliquer sur l'annonce
4. Ouvrir la console (F12) et voir les logs
5. Un bouton "🏠 Voir les aides" devrait apparaître en bas-droit
```

### Étape 3: Vérifier les logs
```
Console (F12) devrait afficher:
✅ LeBonCoin Content Script prêt
✅ Données extraites: { site: 'leboncoin', titre: '...', ... }
```

### Étape 4: Cliquer le bouton
```
1. Cliquer "🏠 Voir les aides disponibles"
2. Popup s'ouvre
3. Vérifier les logs du popup (clic-droit → Inspecter)
4. Devrait voir "Tab URL: https://..."
```

---

## 🔍 Diagnostic détaillé

### 1. Vérifier que le content script est chargé
```javascript
// Dans la console (F12) sur une page LeBonCoin:
window.propertyData
// Devrait afficher un objet avec { site: 'leboncoin', titre: '...', etc. }
```

### 2. Vérifier le manifest
```json
// Vérifier que les patterns correspondent à votre URL
"content_scripts": [
  {
    "matches": ["https://www.leboncoin.fr/ventes_immobilieres/*"],
    "js": ["content-scripts/leboncoin.js"]
  }
]
```

### 3. Vérifier les logs du background worker
```
1. chrome://extensions/
2. Cliquer sur "Service Worker" pour RénoAides
3. Voir les logs de background.js
```

---

## 🛠️ Corrections appliquées

### popup.js
```javascript
// AVANT (ne fonctionnait pas):
const results = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROPERTY_DATA' });

// APRÈS (avec fallback):
try {
  const response = await chrome.tabs.executeScript(tab.id, {
    code: 'window.propertyData || null'
  });
  if (response && response[0]) {
    currentPropertyData = response[0];
    analyzeProperty();
    return;
  }
} catch (execError) {
  // Essai avec sendMessage si executeScript échoue
}
```

### leboncoin.js
```javascript
// AJOUT: Listener pour les messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PROPERTY_DATA') {
    sendResponse({ propertyData: window.propertyData });
  }
});
```

---

## 📋 Checklist pour résoudre

- [ ] Extension reloadée (F5 sur chrome://extensions/)
- [ ] Console testée (F12 sur la page)
- [ ] `window.propertyData` visible en console
- [ ] Bouton "🏠 Voir les aides" visible sur l'annonce
- [ ] Logs affichent "✅ Données extraites"
- [ ] Popup s'ouvre sans erreur
- [ ] Service Worker logs visibles

---

## 🆘 Si ça ne fonctionne toujours pas

### Option 1: Forcer un re-chargement complet
```bash
# Supprimer le dossier de cache Chrome
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extensions
# Recharger l'extension
```

### Option 2: Vérifier la version de Chrome
```
Minimum: Chrome 90+ (Manifest v3 support)
Vérifier: chrome://version/
```

### Option 3: Tester sur une autre page
```
Essayer sur d'autres annonces ou sites pour voir si c'est un problème de sélecteurs
```

---

## 📞 Logs à envoyer si besoin

Si le problème persiste, ouvrir la console (F12) et copier:

1. **Console page LeBonCoin**:
   ```
   window.propertyData
   // Devrait afficher l'objet avec les données
   ```

2. **Console popup (clic-droit → Inspecter)**:
   ```
   Chercher "Tab URL:" dans les logs
   Chercher "Données récupérées"
   ```

3. **Service Worker logs**:
   ```
   chrome://extensions/ → RénoAides → Service Worker
   ```

---

## ✅ Après la correction

Quand tout fonctionne:
1. ✅ Content script charge sur LeBonCoin
2. ✅ Bouton injecté visible
3. ✅ Données stockées dans `window.propertyData`
4. ✅ Popup peut communiquer avec content script
5. ✅ Background worker appelé pour les APIs
6. ✅ Résultats affichés dans le popup

---

**Créée: Novembre 2025**  
**Status: Dépannage Error "Could not establish connection"**
