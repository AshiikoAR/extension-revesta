# 🏠 RénoAides - Extension Immobilière Intelligente

Une extension Chromium qui aide les acheteurs et rénovateurs à découvrir **toutes les aides financières auxquelles ils ont droit** directement depuis les annonces immobilières (LeBonCoin, SeLoger, BienIci, etc.).

## 📋 Fonctionnalités principales

✅ **Scraping automatique** des annonces immobilières  
✅ **Calcul des aides disponibles** via les APIs officielles de l'État  
✅ **Estimation du budget** après aides  
✅ **Support multi-sites** (LeBonCoin, SeLoger, BienIci)  
✅ **Stockage local** des données utilisateur  
✅ **Notifications intelligentes** quand des aides deviennent disponibles  

## 🎯 Cas d'usage

- 👨‍👩‍👧 Jeune couple cherchant à acheter sa première maison → Découvrir le PTZ, l'Éco-PTZ, les aides régionales
- 🔨 Propriétaire en rénovation → MaprimeRénov', Mes Aides Rénov', aides collectivités
- 👵 Sénior en restructuration → Aides spécifiques aux personnes âgées
- 🌱 Transition énergétique → Aides énergies renouvelables

## 🚀 Installation

### 1. Cloner/Télécharger le projet
```bash
git clone https://github.com/AshiikoAR/extension-revesta.git
cd extension-revesta
```

### 2. Charger l'extension dans Chrome/Edge/Brave

**Chrome/Edge :**
1. Allez à `chrome://extensions/` ou `edge://extensions/`
2. Activez **"Mode développeur"** (haut-à-droite)
3. Cliquez **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier du projet

**Brave :**
1. Allez à `brave://extensions/`
2. Suivez les mêmes étapes

### 3. Configurer votre profil
1. Cliquez sur l'icône de l'extension
2. Allez dans **"Paramètres"**
3. Remplissez votre code postal et informations
4. Sauvegardez

## 📁 Structure du projet

```
extension-revesta/
├── manifest.json                    # Configuration de l'extension
├── background.js                    # Service Worker (backend)
├── popup.html & popup.js           # Interface principale
├── options.html & options.js       # Page de paramètres
│
├── content-scripts/                 # Scripts injectés dans les pages
│   ├── leboncoin.js                # Parseur LeBonCoin
│   ├── seloger.js                  # Parseur SeLoger
│   └── bienici.js                  # Parseur BienIci
│
├── styles/
│   ├── popup.css                   # Styles du popup
│   └── options.css                 # Styles des paramètres
│
├── images/                          # Icônes de l'extension
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
│
└── README.md                        # Cette documentation
```

## 🔧 Architecture & Flux de données

```
┌─────────────────────┐
│ Content Scripts     │
│ (LeBonCoin, etc)   │
│ → Extrait données  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Popup (Frontend)    │
│ → UI utilisateur    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Background Worker   │
│ → Orchestration     │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐  ┌──────────┐  ┌──────┐
│API Geo │  │MesAides  │  │Aides │
│.gouv   │  │Rénov'    │  │Région│
└────────┘  └──────────┘  └──────┘
```

## � APIs intégrées

### 1. **Mes Aides Rénov'** (MESR)
- URL: `https://mesaidesreno.gouv.fr/`
- Aides à la rénovation thermique
- Critères: code postal, type travaux, budget

### 2. **MaPrimeRénov'** (ANAH)
- URL: `https://www.maprimerenov.gouv.fr/`
- Rénovation de la qualité énergétique
- Critères: revenus, type logement, travaux

### 3. **API Geo.gouv**
- URL: `https://api.geo.gouv.fr/`
- Localisation et informations régionales
- Gratuit et sans authentification

### 4. **Autres aides** (à implémenter)
- PTZ (Prêt à Taux Zéro)
- Éco-PTZ (Prêt Écologique)
- Aides régionales et locales
- Programme Mon Accompagné Rénov'

## 🔐 Permissions & Sécurité

L'extension demande les permissions suivantes :

```json
"permissions": [
  "activeTab",      // Lire l'onglet actif
  "scripting",      // Injecter des scripts
  "storage"         // Stocker les données utilisateur
]
```

✅ **Aucune donnée** n'est envoyée à des serveurs tierces (sauf APIs officielles de l'État)  
✅ **Stockage local** uniquement (chrome.storage)  
✅ **HTTPS** obligatoire pour tous les appels externes  

## 📖 Guide développeur

### Ajouter un nouveau site

1. **Créer le content script** → `content-scripts/nouveau-site.js`

```javascript
function extractData() {
  return {
    site: 'nouveau-site',
    titre: /* selector */,
    prix: /* parseFloat */,
    codePostal: /* extract */,
    // ... autres champs
  };
}
```

2. **Ajouter au manifest.json**

```json
{
  "matches": ["https://nouveau-site.com/annonces/*"],
  "js": ["content-scripts/nouveau-site.js"]
}
```

3. **Tester** : Rechargez l'extension (F5)

### Ajouter une nouvelle aide

1. **Modifier** `background.js` → fonction `analyzeAids()`
2. **Appeler la nouvelle API**
3. **Parser la réponse**
4. **Retourner au format standard**

```javascript
async function fetchNewAid(propertyData) {
  const response = await fetch('https://...');
  return {
    nom: 'Nom de l\'aide',
    description: '...',
    montantEstime: 5000,
    conditions: 'Code postal <= ...'
  };
}
```

### Structure des données d'annonce

```javascript
window.propertyData = {
  site: 'leboncoin',          // Source
  titre: 'Maison 80m²',       // Titre annonce
  prix: 350000,               // € (nombre)
  localisation: 'Paris 75001', // Texte
  codePostal: '75001',        // 5 chiffres
  surface: 80,                // m² (nombre)
  pieces: 3,                  // Nombre
  typeLogement: 'maison',     // 'maison'|'appartement'|'terrain'|'autre'
  typeWork: 'renovation',     // Type travaux detectés
  description: '...',         // Texte complet
  url: 'https://...',         // Lien annonce
  dateExtraction: '2025-11-06T12:34:56Z'
};
```

## 🧪 Tests

### Test manuel sur LeBonCoin
1. Allez sur une annonce LeBonCoin immobilière
2. Vous verrez le bouton 🏠 "Voir les aides disponibles" en bas-droit
3. Cliquez → Le popup s'ouvre avec les aides disponibles

### Outils de debugging
- **Popup** : Clic-droit → Inspecter
- **Background** : `chrome://extensions/` → RénoAides → "Service Worker"
- **Content Script** : Outils dev (F12) → Console

## � Dépannage

### Le bouton n'apparaît pas
- ✓ Vérifiez que vous êtes sur LeBonCoin/SeLoger/BienIci
- ✓ Rechargez la page
- ✓ Rechargez l'extension (F5 sur la page des extensions)

### Pas d'aides trouvées
- ✓ Vérifiez votre code postal
- ✓ Vérifiez votre connexion internet
- ✓ Ouvrez la console (F12) pour les erreurs

### Le popup ne s'ouvre pas
- ✓ Vérifiez les permissions dans les logs
- ✓ Rechargez l'extension
- ✓ Essayez un autre navigateur

## � Ressources utiles

### Documentation officielle
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest v3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### Aides à la rénovation
- [Mes Aides Rénov'](https://mesaidesreno.gouv.fr/)
- [MaPrimeRénov'](https://www.maprimerenov.gouv.fr/)
- [France Rénov'](https://www.france-reno.gouv.fr/)
- [ANAH](https://www.anah.fr/)

### APIs gouvernementales
- [API.gouv.fr](https://api.gouv.fr/)
- [Data.gouv.fr](https://www.data.gouv.fr/)

## 🗓️ Roadmap

- [ ] Support Immoweb, Ventes-Annonces
- [ ] Comparaison de plusieurs propriétés
- [ ] Export PDF des aides
- [ ] Intégration ChatGPT pour conseils personnalisés
- [ ] Mode sombre
- [ ] Multilingue (EN, DE, ES)
- [ ] Publication sur Chrome Web Store

## 📝 Licence

Ce projet est à usage libre pour fins éducatives et personnelles.

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commitez (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📧 Contact & Support

- GitHub Issues : [Issues](https://github.com/AshiikoAR/extension-revesta/issues)
- Discussions : [Discussions](https://github.com/AshiikoAR/extension-revesta/discussions)

---

**Créée avec ❤️ pour aider les Français à trouver les aides immobilières**

v1.0.0 • Novembre 2025
