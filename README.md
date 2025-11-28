# 🏠 Revesta - Extension Immobilière Intelligente

Une extension Chrome qui aide les acheteurs à découvrir **toutes les subventions et aides financières à la rénovation énergétique** directement depuis les annonces immobilières LeBonCoin.

## 📋 Fonctionnalités principales

✅ **Extraction automatique** des données d'annonces LeBonCoin  
✅ **Calcul des subventions** via l'API Mes Aides Réno (beta.gouv.fr)  
✅ **Estimation personnalisée** basée sur votre profil (revenus, ménage, statut)  
✅ **Détection automatique** du DPE (Diagnostic de Performance Énergétique)  
✅ **Affichage des prêts** à taux zéro avec taux et durée  
✅ **Compte-rendu par email** avec template HTML professionnel  
✅ **Interface moderne** avec animations et design Revesta  

## 🎯 Cas d'usage

- 👨‍👩‍👧 **Jeune couple** cherchant à acheter et rénover → Découvrir MaPrimeRénov', éco-PTZ
- 🔨 **Propriétaire rénovateur** → Subventions parcours accompagné, Mon Accompagnateur Rénov'
- 🌱 **Transition énergétique** → Prêts à 0%, aides selon DPE actuel et visé
- 💰 **Investisseur bailleur** → Aides spécifiques propriétaires bailleurs

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
├── manifest.json                    # Configuration Manifest V3
├── background.js                    # Service Worker - Appels API
├── popup.html & popup.js           # Interface principale
├── options.html & options.js       # Page de paramètres utilisateur
├── email-template.html             # Template email compte-rendu
│
├── content-scripts/                 # Scripts injectés
│   └── leboncoin.js                # Extraction données LeBonCoin + bouton flottant
│
├── styles/
│   ├── popup.css                   # Design moderne avec gradients
│   └── options.css                 # Styles paramètres
│
└── images/
    ├── revesta_logo.svg            # Logo Revesta
    ├── icon-16.png                 # Icône extension
    ├── icon-48.png
    └── icon-128.png
```

## 🔧 Architecture & Flux de données

```
┌─────────────────────────────┐
│ LeBonCoin Page              │
│ (ventes_immobilieres only)  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Content Script              │
│ - Extraction titre/prix/DPE │
│ - Bouton flottant           │
│ - URL validation            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Popup Interface             │
│ - Analyse propriété         │
│ - Calcul subventions        │
│ - Animation compteurs       │
│ - Formulaire email          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Background Service Worker   │
│ - Conversion CP → INSEE     │
│ - Appel Mes Aides Réno API  │
│ - Parse réponse eligibilite │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┬──────────────┐
    ▼             ▼              ▼
┌────────┐  ┌──────────────┐  ┌─────────┐
│geo.api │  │mesaidesreno  │  │Storage  │
│.gouv.fr│  │.beta.gouv.fr │  │(config) │
└────────┘  └──────────────┘  └─────────┘
```

**Workflow principal :**
1. Utilisateur visite annonce LeBonCoin ventes_immobilieres
2. Content script extrait données + affiche bouton
3. Clic bouton → Popup récupère données
4. Popup affiche analyse directe (sans étape intermédiaire)
5. Clic "Calculer" → Background appelle API
6. Résultats affichés avec animations (montant, pourcentage)
7. Clic "Récupérer compte-rendu" → Formulaire email

## � APIs intégrées

### 1. **Mes Aides Réno** (API v1)
- **URL** : `https://mesaidesreno.beta.gouv.fr/api/v1`
- **Endpoint** : `?fields=eligibilite`
- **Token** : Requis (stocké dans background.js)
- **Paramètres** : 17+ champs (code_insee, type_logement, revenus, statut, DPE, etc.)
- **Réponse** : Liste d'aides avec `status`, `rawValue`, `type` (subvention/prêt)
- **Aides retournées** :
  - MaPrimeRénov' parcours accompagné
  - Éco-prêt à taux zéro (éco PTZ)
  - Prêt avance rénovation 0%
  - Mon Accompagnateur Rénov' Subvention

### 2. **API Geo Gouvernement**
- **URL** : `https://geo.api.gouv.fr/communes`
- **Usage** : Conversion code postal → code INSEE
- **Paramètres** : `?codePostal=XXXXX&fields=code,nom,codesPostaux`
- **Matching** : Intelligent avec nom de ville
- **Gratuit** : Aucune authentification requise

### 3. **Chrome Storage Sync**
- **Usage** : Stockage configuration utilisateur
- **Données** : 17+ paramètres (revenus, ménage, statut, DPE, contact)
- **Sync** : Synchronisé entre appareils

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
  site: 'leboncoin',              // Source
  titre: 'Maison 4 pièces 80m²',  // Titre nettoyé (sans prix/surface)
  prix: 350000,                   // € (nombre)
  localisation: 'Paris',          // Ville
  codePostal: '75001',            // 5 chiffres
  ville: 'Paris',                 // Nom de la ville
  surface: 80,                    // m² (nombre)
  pieces: 4,                      // Nombre
  typeLogement: 'maison',         // 'maison'|'appartement'|'terrain'
  dpe: 6,                         // DPE actuel (1=A à 7=G)
  url: 'https://...',             // Lien annonce
  dateExtraction: '2025-11-28T...'
};
```

**Extraction intelligente :**
- Titre nettoyé avec regex (supprime prix et surface)
- Support formatage français (espaces comme séparateurs de milliers)
- DPE extrait depuis energy-criteria
- Code postal via 6 méthodes fallback
- Type logement avec délai 500ms + priorité keywords

## 🧪 Tests

### Test sur LeBonCoin
1. Visitez une annonce **ventes_immobilieres** : `https://www.leboncoin.fr/ad/ventes_immobilieres/[ID]`
2. Le bouton "🏠 Voir les aides disponibles" apparaît en bas à droite
3. Clic → Popup s'ouvre avec analyse directe
4. Clic "📊 Analyser les aides disponibles" → API call + résultats animés
5. Les subventions et prêts sont différenciés

### Validation URL
- ✅ Bouton apparaît uniquement sur `/ad/ventes_immobilieres/\d+`
- ✅ Bouton disparaît sur autres pages (navigation SPA)
- ✅ Popup affiche "empty state" si pas sur annonce valide

### Debugging
- **Popup** : Clic-droit sur popup → Inspecter
- **Background** : chrome://extensions/ → Revesta → Service Worker
- **Content Script** : Console (F12) → Logs préfixés 🏠/📊/✅/❌

### Logs clés
```javascript
console.log('🏠 Données extraites:', propertyData);
console.log('📊 DPE extrait de l\'annonce:', dpe);
console.log('✅ Code INSEE trouvé:', codeInsee);
console.log('❌ Erreur Mes Aides Réno:', error);
```

## ⚠️ Dépannage

### Le bouton n'apparaît pas
- ✓ Vérifiez que l'URL est bien `https://www.leboncoin.fr/ad/ventes_immobilieres/[ID]`
- ✓ Autres catégories (locations, colocations) ne sont pas supportées
- ✓ Rechargez la page (F5)
- ✓ Rechargez l'extension dans chrome://extensions/

### Aucune subvention trouvée
- ✓ Message "Aïe... Pas de subventions pour ce bien ! 😬"
- ✓ Vérifiez votre code postal dans les paramètres
- ✓ Vérifiez vos revenus (peut impacter l'éligibilité)
- ✓ Certains codes postaux ne sont pas encore supportés par l'API

### Le pourcentage affiche 0%
- ✓ Normal si uniquement des prêts sont disponibles (prêts exclus du calcul)
- ✓ Seules les **subventions** sont comptabilisées dans le total
- ✓ Les prêts (éco-PTZ, etc.) restent affichés dans la liste

### Le popup ne s'ouvre pas
- ✓ Vérifiez que vous êtes sur une annonce valide
- ✓ Ouvrez la console (F12) pour voir les erreurs
- ✓ Vérifiez les permissions dans chrome://extensions/

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

### Fonctionnalités actuelles (v1.0)
- ✅ Extraction données LeBonCoin (ventes_immobilieres uniquement)
- ✅ Calcul subventions via Mes Aides Réno API
- ✅ Détection automatique DPE
- ✅ Interface moderne avec animations
- ✅ Distinction subventions/prêts dans le calcul
- ✅ Formulaire email pré-rempli
- ✅ Template HTML email professionnel

### Prochaines versions
- [ ] **v1.1** : Envoi réel d'emails (service backend)
- [ ] **v1.2** : Export PDF du compte-rendu
- [ ] **v1.3** : Historique des propriétés analysées
- [ ] **v2.0** : Support SeLoger, PAP, Logic-Immo
- [ ] **v2.1** : Comparaison de plusieurs propriétés
- [ ] **v3.0** : Mode sombre
- [ ] **v3.1** : Multilingue (EN, ES)
- [ ] Publication Chrome Web Store

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

**Créée avec ❤️ pour aider les Français à découvrir les aides à la rénovation énergétique**

**v1.0.0** • Novembre 2025 • Revesta Extension
