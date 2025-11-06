# Hello World Extension

Une extension Chromium simple et moderne pour débuter avec le développement d'extensions.

## 📋 Description

Cette extension de base démontre les concepts fondamentaux du développement d'extensions Chromium :

- **Manifest v3** : Configuration moderne et sécurisée
- **Popup UI** : Interface utilisateur élégante avec styles modernes
- **Background Service Worker** : Logique en arrière-plan
- **Content Script** : Injection de code dans les pages web
- **Communication** : Échange de messages entre composants

## 🚀 Installation

### Étapes d'installation dans Chrome/Edge/Brave :

1. **Accédez à la page des extensions** :
   - Chrome/Edge : `chrome://extensions/` ou `edge://extensions/`
   - Brave : `brave://extensions/`

2. **Activez le "Mode développeur"** :
   - Basculez le commutateur en haut à droite

3. **Chargez l'extension** :
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier du projet

4. **Commencez à utiliser** :
   - L'icône de l'extension apparaîtra dans la barre d'outils
   - Cliquez dessus pour ouvrir le popup

## 📁 Structure du projet

```
extension-revesta/
├── manifest.json          # Configuration de l'extension
├── popup.html             # Interface popup
├── popup.js               # Logique du popup
├── background.js          # Service worker
├── content.js             # Script d'injection
├── styles/
│   └── popup.css          # Styles du popup
├── images/                # Icônes de l'extension
├── README.md              # Cette documentation
└── .gitignore             # Fichiers à ignorer
```

## 📚 Fichiers principaux

### `manifest.json`
Fichier de configuration de l'extension. Définit les permissions, les icônes, le popup, et les scripts.

### `popup.html` & `popup.js` & `styles/popup.css`
Interface utilisateur affichée au clic sur l'icône de l'extension.

### `background.js`
Service worker qui s'exécute en arrière-plan. Gère les événements globaux de l'extension.

### `content.js`
Script injecté dans les pages web. Permet d'interagir avec le contenu de la page.

## 🎨 Fonctionnalités

- ✅ Affichage du message "Hello World"
- ✅ Bouton interactif avec messages aléatoires
- ✅ Affichage de l'URL actuelle
- ✅ Logging en console
- ✅ Communication entre composants
- ✅ Interface moderne et responsive

## 🔧 Développement

### Modifications du code
1. Modifiez les fichiers JavaScript ou CSS
2. Dans la page des extensions, cliquez sur le bouton "Actualiser" 🔄
3. Testez l'extension dans votre navigateur

### Debugging
- **Popup** : Clic droit sur le popup → Inspecter
- **Background** : Page des extensions → Cliquez sur "Service Worker"
- **Console** : Ouvrez les outils de développement (F12)

## 📝 Prochaines étapes

Pour améliorer cette extension :

- Ajoutez plus de permissions au manifest
- Créez une page d'options (`options.html`)
- Implémentez du stockage local (`chrome.storage`)
- Ajoutez des icônes personnalisées 16x16, 48x48, 128x128
- Développez des fonctionnalités spécifiques
- Utilisez des frameworks comme Vue.js ou React

## 📖 Ressources utiles

- [Documentation officielle Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [API Chrome](https://developer.chrome.com/docs/extensions/reference/)
- [Manifest v3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/best-practices/)

## 📄 Licence

Ce projet est gratuit et peut être utilisé à titre d'exemple ou de base pour vos extensions.

## ⚠️ Notes importantes

- Le Manifest v3 est le standard actuel (Manifest v2 est deprecated)
- Les permissions doivent être déclarées dans le manifest pour des raisons de sécurité
- Les service workers remplacent les background pages (plus performant)
- Les content scripts ont un accès limité pour des raisons de sécurité

---

**Créée avec ❤️ pour les développeurs d'extensions Chromium**
