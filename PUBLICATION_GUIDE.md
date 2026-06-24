# Guide de Publication sur le Chrome Web Store

## ✅ Checklist pré-publication

### Préparation de l'extension

- [x] Manifest.json en MV3
- [x] Icons présentes (16x16, 48x48, 128x128)
- [x] Pas d'erreurs JS/HTML
- [x] Politique de confidentialité
- [x] Description complète
- [x] Ressources web_accessible_resources correctes
- [x] Permissions minimales et justifiées
- [x] Code analysé et validé

### Fichiers requis dans le package

```
extension-revesta/
├── manifest.json                    ✅ MV3 compliant
├── background.js                    ✅ Service Worker
├── popup.html & popup.js            ✅ UI principale
├── options.html & options.js        ✅ Paramètres
├── email.html                       ✅ Template email
├── email-type.html                  ✅ Template email alt
├── content.js                       ✅ Injection globale (optionnel)
├── config.js                        ✅ Config
│
├── content-scripts/
│   ├── leboncoin.js                 ✅ Principal
│   ├── bienici.js                   ⚠️  Non activé (à valider)
│   └── seloger.js                   ⚠️  Non activé (à valider)
│
├── styles/
│   ├── popup.css
│   ├── options.css
│   └── email.css
│
├── images/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── (logos SVG/PNG)
│
├── PRIVACY_POLICY.md                ✅ Politique de confidentialité
├── README.md                        ✅ Documentation
└── package.json                     ✅ Métadonnées
```

## 📋 Processus de publication

### Étape 1 : Créer un compte Google Developer

1. Visitez : https://chrome.google.com/webstore/devconsole
2. Connectez-vous avec votre compte Google
3. Acceptez les conditions  
4. Payez la plateforme **5 USD** (version EUR ≈ 4,50€)

### Étape 2 : Préparer les assets pour le store

**Images requises :**

| Asset | Taille | Format | Description |
|-------|--------|--------|-------------|
| **Screenshot 1** | 1280x800 | PNG/JPG | Écran principal de popup |
| **Screenshot 2** | 1280x800 | PNG/JPG | Résultats des aides |
| **Screenshot 3** | 1280x800 | PNG/JPG | Page paramètres |
| **Icon store** | 440x440 | PNG | Logo pour affichage store |
| **Promo image (opt)** | 920x680 | PNG | Image promo page store |
| **Icône petite (opt)** | 128x128 | PNG | Icône pour résultats |

**Texte requis pour le store :**

```markdown
# Titre court (≤ 45 caractères)
REVESTA - Assistant Immobilier

# Description longue (≤ 4000 caractères)
Découvrez TOUTES les aides immobilières (MaPrimeRénov', éco-PTZ, 
Action Logement, etc.) directement sur les annonces LeBonCoin.

✨ Fonctionnalités principales :
• Extraction automatique des données d'annonces LeBonCoin
• Calcul des subventions via l'API Mes Aides Réno
• Estimation personnalisée selon votre profil
• Compte-rendu détaillé téléchargeable par email

🎯 Cas d'usage :
• Jeunes couples cherchant à acheter et rénover
• Propriétaires rénovateurs
• Acheteurs visant la transition énergétique
• Investisseurs bailleurs

🔒 Sécurité et confidentialité :
• Données stockées localement (jamais vendues)
• RGPD compliant
• Code open-source

Gratuit • Français • Sécurisé
```

**Catégories suggérées :**
- Productivité
- Finance & Immobilier (si disponible)

### Étape 3 : Uploader l'extension

1. Dans la console développeur Chrome Web Store
2. Cliquez **"Nouvelle article"**  
3. Sélectionnez le fichier ZIP : `extension-revesta-v1.0.0.zip`
4. **Ne pas cocher** "Limiter à un pays" (distribution mondiale)
5. Remplissez les informations :
   - Titre, description
   - Catégorie
   - URLs (site officiel, support)
   - Politique de confidentialité
6. Uploadez les screenshots (3 requis minimum)
7. Cliquez **"Soumettre pour révision"**

### Étape 4 : Révision Google (2-7 jours)

Google va vérifier :
✅ Le code s'exécute correctement  
✅ Les permissions sont justifiées  
✅ Pas d'activités malveillantes  
✅ Politique de confidentialité en ligne  
✅ Respect des policies du store  

**Points de vigilance :**
- ⚠️ Éviter les APIs interne sans permission
- ⚠️ Pas de minification suspecte  
- ⚠️ Déclaration complète des APIs utilisées
- ⚠️ Tous les liens externes doivent être HTTPS

### Étape 5 : Publication

Une fois approuvée, l'extension apparaît sur le store sous 24h :
🎉 https://chrome.google.com/webstore/detail/[EXTENSION_ID]

## 🚀 Créer le ZIP pour publication

```bash
# Naviguer au dossier parent
cd /Users/ashiko/Desktop/devs

# Créer le ZIP (exclure .git, node_modules, etc.)
zip -r extension-revesta-v1.0.0.zip extension-revesta \
  -x "extension-revesta/.git/*" \
  -x "extension-revesta/node_modules/*" \
  -x "extension-revesta/.DS_Store" \
  -x "extension-revesta/.*" \
  -x "extension-revesta/*.md"

# Ou incluant la documentation :
zip -r extension-revesta-v1.0.0.zip extension-revesta \
  -x "extension-revesta/.git/*" \
  -x "extension-revesta/node_modules/*"
```

## 🔄 Mises à jour futures

**Pour chaque nouvelle version :**

1. Mettre à jour `manifest.json` → version
2. Tester en mode développement
3. Créer nouveau ZIP
4. Uploader sur la console devconsole
5. Google révise (moins strictement pour les mises à jour)
6. Nouvelle version publiée automatiquement

## 📦 Support et maintenance

**Post-publication :**

- Répondre aux avis utilisateurs
- Monitorer les bugs/demandes
- Publier des mises à jour mensuelles min.
- Maintenir la politique de confidentialité

**Contacts utiles :**

- Chrome Web Store Support: https://support.google.com/chrome_webstore
- Messages utilisateurs: Console devconsole → "Avis"
- Analyse trafic: Console devconsole → Statistiques

---

**Questionnaire de révision (antifraud) :**

Vous serez sollicité pour confirmer :

1. ✅ L'extension recueille-t-elle des données personnelles ?  
   **Réponse** : Oui, code postal + profil (stockage local, visible dans Paramètres)

2. ✅ Les données sont-elles partagées ?  
   **Réponse** : Non, sauf avec APIs publiques Mes Aides Réno & Geo.api.gouv.fr

3. ✅ L'extension a-t-elle une politique de confidentialité ?  
   **Réponse** : Oui, lien vers PRIVACY_POLICY.md

4. ✅ Permission webRequest utilisée ?  
   **Réponse** : Non (retirée depuis MV3)

---

**Bonne chance pour la publication ! 🚀**
