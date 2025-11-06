# 🎯 Guide de Démarrage - RénoAides

## ⚡ Quick Start (5 minutes)

### 1. Installation immédiate
```bash
# Clone le repo
git clone https://github.com/AshiikoAR/extension-revesta.git
cd extension-revesta

# Charger dans Chrome
# 1. Ouvrir chrome://extensions/
# 2. Activer "Mode développeur" (haut-droit)
# 3. Cliquer "Charger l'extension non empaquetée"
# 4. Sélectionner le dossier extension-revesta
```

### 2. Premier test
```
1. Allez sur https://www.leboncoin.fr/ventes_immobilieres/
2. Ouvrez une annonce de maison/appartement
3. Cliquez le bouton "🏠 Voir les aides disponibles"
4. Remplissez votre code postal dans le popup
5. Découvrez les aides disponibles !
```

---

## 📂 Structure détaillée du projet

```
extension-revesta/                          # Racine
│
├── 📄 FICHIERS CONFIGURATION
│   ├── manifest.json                       # Manifest v3 - Configuration principale
│   ├── package.json                        # Dependencies & scripts npm
│   ├── config.js                           # Constantes & configuration
│   └── .gitignore                          # Fichiers ignorés par Git
│
├── 🔧 BACKEND / LOGIC
│   ├── background.js                       # Service Worker (orchestration)
│   │   ├── fetchMesAidesReno()            # Appel API aides rénovation
│   │   ├── fetchMaprimeRenov()            # Appel API MaPrimeRénov'
│   │   ├── fetchGeoInfo()                 # Géolocalisation
│   │   ├── analyzeAids()                  # Analyse principale
│   │   └── chrome.runtime.onMessage()     # Écoute des messages
│   │
│   └── content.js                          # Ancienne version (à nettoyer)
│
├── 🕷️ CONTENT SCRIPTS (SCRAPING)
│   └── content-scripts/
│       ├── leboncoin.js                    # Parser LeBonCoin
│       │   ├── extractLeBonCoinData()
│       │   ├── extractPropertyType()
│       │   └── detectWorkType()
│       │
│       ├── seloger.js                      # Parser SeLoger
│       │   ├── extractSeLogerData()
│       │   └── addExtensionButton()
│       │
│       └── bienici.js                      # Parser BienIci
│           └── extractBienIciData()
│
├── 🎨 INTERFACE UTILISATEUR
│   ├── popup.html                          # Template principal
│   │   ├── Loading spinner
│   │   ├── Property info section
│   │   ├── Aids estimate box
│   │   ├── Aids list
│   │   └── Useful links
│   │
│   ├── popup.js                            # Logic du popup
│   │   ├── analyzeProperty()
│   │   ├── displayResults()
│   │   ├── displayAides()
│   │   └── Event listeners
│   │
│   ├── options.html                        # Page de paramètres
│   │   ├── User profile section
│   │   ├── Project type selection
│   │   ├── Work types checkboxes
│   │   ├── Privacy settings
│   │   └── Delete data button
│   │
│   ├── options.js                          # Logic paramètres
│   │   ├── loadOptions()
│   │   ├── saveOptions()
│   │   └── setupNotification()
│   │
│   └── styles/
│       ├── popup.css                       # Styles popup (500x700px)
│       │   ├── Header gradient
│       │   ├── Loading animation
│       │   ├── Aid cards
│       │   └── Responsive design
│       │
│       └── options.css                     # Styles options
│           ├── Form styling
│           ├── Buttons & inputs
│           ├── Notifications
│           └── Mobile responsive
│
├── 🖼️ ASSETS
│   └── images/
│       ├── icon-16.png                     # Pour toolbar
│       ├── icon-48.png                     # Pour store
│       └── icon-128.png                    # Pour banner
│
├── 📚 DOCUMENTATION
│   ├── README.md                           # Doc principale (ce fichier)
│   ├── API_INTEGRATION.md                  # Guide intégration APIs
│   ├── EXAMPLES.md                         # Exemples d'utilisation
│   ├── DEPLOYMENT.md                       # Guide publication
│   ├── QUICKSTART.md                       # Ce guide
│   └── CONTRIBUTING.md                     # Guide contribution (optionnel)
│
└── 🧪 (À IMPLÉMENTER)
    ├── tests/
    │   ├── unit.test.js
    │   ├── integration.test.js
    │   └── e2e.test.js
    │
    └── build/
        ├── webpack.config.js
        ├── babel.config.js
        └── build.sh
```

---

## 🔄 Flux de données

```
┌────────────────────────────────────────────────────────────────┐
│                    1. UTILISATEUR VISITE UNE ANNONCE          │
└────────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  Content Script (leboncoin.js)      │
        │  ✓ Analyse le DOM                   │
        │  ✓ Extrait titre, prix, etc.       │
        │  ✓ Détecte type de travaux         │
        │  ✓ Crée un bouton "Voir aides"    │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  2. UTILISATEUR CLIQUE LE BOUTON   │
        │  Les données property sont stockées │
        │  dans window.propertyData           │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  Popup s'ouvre (popup.html/js)      │
        │  ✓ Affiche spinner "Loading"       │
        │  ✓ Récupère propertyData           │
        │  ✓ Envoie à Background Worker      │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │  Background Worker (background.js)  │
        │  ✓ Reçoit les données property      │
        │  ✓ Appelle fetchGeoInfo()          │
        │  ✓ Appelle fetchMesAidesReno()     │
        │  ✓ Appelle fetchMaprimeRenov()     │
        │  ✓ Calcule montant total           │
        │  ✓ Retourne résultats au popup     │
        └─────────────────────────────────────┘
                    ↓    ↓    ↓
        ┌───────┬───────┬──────────┐
        ↓       ↓       ↓          ↓
    API Geo  Mes Aides MaPrimeRénov' ...
    .gouv   Rénov'    .gouv.fr
                          ↓
        ┌─────────────────────────────────────┐
        │  3. POPUP AFFICHE LES RÉSULTATS    │
        │  ✓ Property info                    │
        │  ✓ Montant total des aides          │
        │  ✓ Liste des aides avec montants   │
        │  ✓ Liens vers sites officiels      │
        └─────────────────────────────────────┘
```

---

## 🎯 Fichiers à modifier pour chaque fonctionnalité

### Ajouter un nouveau site (ex: Immo Plus)

**Fichiers à modifier:**
1. `manifest.json` - Ajouter le pattern URL
```json
{
  "matches": ["https://www.immoplus.fr/annonces/*"],
  "js": ["content-scripts/immoplus.js"]
}
```

2. Créer `content-scripts/immoplus.js` - Copier seloger.js et adapter les sélecteurs

3. `background.js` - Aucune modification nécessaire (fonctionne avec tous les sites)

### Ajouter une nouvelle aide

**Fichiers à modifier:**
1. `background.js` - Ajouter une fonction `fetchXXX()`
```javascript
async function fetchNewAid(propertyData) {
  // Appeler l'API
  // Parser la réponse
  // Retourner au format standard
  return { nom, montantEstime, conditions }
}
```

2. Modifier `analyzeAids()` pour inclure le nouvel appel

### Modifier l'interface

**Fichiers à modifier:**
- `popup.html` - Structure
- `popup.css` - Design
- `popup.js` - Logique et event listeners

---

## 📋 Checklist de développement

### Phase 1: Setup ✅
- [x] Créer le manifest v3
- [x] Implémenter content scripts
- [x] Setup popup et options
- [x] Intégrer APIs basiques

### Phase 2: Amélioration (À faire)
- [ ] Support Immoweb
- [ ] Export PDF
- [ ] Mode sombre
- [ ] Tests unitaires

### Phase 3: Production (À faire)
- [ ] Optimisation des performances
- [ ] Sécurité renforcée
- [ ] Analytics complètes
- [ ] Publication Chrome Web Store

---

## 🐛 Debugging tips

### Console logs
```javascript
// Dans le content script:
console.log('✅ Données extraites:', window.propertyData);

// Dans le background:
console.error('Erreur API:', error);

// Dans le popup:
console.warn('Pas de résultats trouvés');
```

### Outils de debugging
```
1. Popup: Clic-droit → "Inspecter"
2. Background: chrome://extensions/ → RénoAides → "Service Worker"
3. Content: F12 → Console (page de l'annonce)
```

### Erreurs courantes
```
❌ "Uncaught SyntaxError in popup.js"
   → Vérifier la syntaxe JSON, les guillemets

❌ "Cannot read property 'textContent' of null"
   → Le sélecteur CSS n'existe pas, adapter pour le site

❌ "fetch is not defined"
   → Vérifier le contexte (doit être dans le background ou content script)

❌ Extension ne s'actualise pas
   → F5 sur chrome://extensions/, puis F5 sur la page
```

---

## 🔒 Sécurité & Bonnes pratiques

```javascript
// ✅ BON - Valider les entrées
if (!/^\d{5}$/.test(codePostal)) {
  throw new Error('Code postal invalide');
}

// ❌ MAUVAIS - Pas de validation
const result = await fetch('https://api...' + userInput);

// ✅ BON - Utiliser HTTPS
fetch('https://api.gouv.fr...')

// ❌ MAUVAIS - HTTP non sécurisé
fetch('http://api.gouv.fr...')

// ✅ BON - Gérer les erreurs
try {
  const response = await fetch(...);
} catch (error) {
  console.error('Erreur:', error);
}

// ❌ MAUVAIS - Ignorer les erreurs
const response = await fetch(...);
```

---

## 📞 Support & Ressources

### Problèmes fréquents
- [x] Extension ne charge pas → Vérifier manifest.json
- [x] Button n'apparaît pas → Vérifier les sélecteurs CSS
- [x] Pas d'aides trouvées → Vérifier le code postal
- [x] API timeout → Retry avec backoff

### Liens utiles
- 📚 [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- 🔍 [API.gouv.fr](https://api.gouv.fr/)
- 💬 [Stack Overflow - Extensions](https://stackoverflow.com/questions/tagged/google-chrome-extension)
- 🐛 [GitHub Issues](https://github.com/AshiikoAR/extension-revesta/issues)

---

## 🚀 Prochaines étapes

1. **Tester sur tous les sites** → Leboncoin, SeLoger, BienIci
2. **Valider les APIs** → Voir les vraies réponses
3. **Implémenter le caching** → Éviter les appels répétés
4. **Ajouter des tests** → Jest, Mocha ou Playwright
5. **Préparer le publication** → Chrome Web Store

---

**Happy coding! 🚀**

Besoin d'aide ? Ouvrez une issue sur GitHub !
