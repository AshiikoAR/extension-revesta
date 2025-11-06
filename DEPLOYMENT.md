# 🚀 Guide de Déploiement

## Étapes de déploiement pour Chrome Web Store (futur)

### 1. Préparation

#### Créer un compte développeur Chrome Web Store
- Aller sur https://developer.chrome.com/docs/webstore/
- Créer un compte Google développeur
- Payer les frais d'enregistrement ($5)

#### Préparer les assets
```
assets/
├── screenshot1.png          # 1280x800 ou 640x400
├── screenshot2.png
├── icon_large.png           # 440x440 (pour le store)
├── icon_promo.png           # 920x680 (bannière)
└── description.txt          # Description pour le store
```

### 2. Tester l'extension

#### Test local
```bash
# 1. Ouvrir chrome://extensions/
# 2. Activer "Mode développeur"
# 3. Charger l'extension non empaquetée
# 4. Tester sur chaque site supporté
# 5. Vérifier console (F12) pour les erreurs
```

#### Tests de compatibilité
- ✅ Chrome (v90+)
- ✅ Edge (v90+)
- ✅ Brave
- ✅ Vivaldi
- ✅ Opera

### 3. Empaqueter l'extension

```bash
# Option 1 : Via Chrome
1. chrome://extensions/
2. Cliquer "Empaqueter l'extension"
3. Sélectionner le dossier source
4. Générer .crx et .pem

# Option 2 : Via ligne de commande
# (À implémenter avec build tools)
```

### 4. Publication sur Chrome Web Store

#### Remplir le formulaire
```
Titre : RénoAides - Assistant Immobilier
Description courte : Découvrez les aides immobilières disponibles
Description longue :
  RénoAides vous aide à trouver TOUTES les aides financières 
  disponibles pour votre achat ou rénovation immobilière.
  
  ✨ Fonctionnalités:
  • Scraping automatique des annonces immobilières
  • Calcul d'aides MaPrimeRénov', PTZ, Éco-PTZ
  • Support LeBonCoin, SeLoger, BienIci
  • Estimation du budget après aides
```

#### Catégories
- Productivité
- Shopping (optionnel)

#### Langues
- Français (principal)
- Anglais (optionnel)

#### Taille de l'extension
- Ne pas dépasser 50MB

### 5. Soumettre pour révision

#### Checklist avant soumission
- [ ] Manifest.json valide
- [ ] Tous les fichiers présents
- [ ] Icônes en bonne résolution
- [ ] Aucune vulnérabilité de sécurité
- [ ] Pas de code malveillant
- [ ] Permissions justifiées
- [ ] Tests passants

#### Temps d'approbation
- Généralement 1-3 jours
- Peut être refusée si :
  - Permissions suspectes
  - Contenu douteux
  - Bug majeur

### 6. Maintenance après publication

#### Mises à jour
```
Processus:
1. Incrémentez la version dans manifest.json
2. Testez localement
3. Regénérez le .crx
4. Uploadez sur le Chrome Web Store
5. Attendez la révision automatique

Note: Les mises à jour se font automatiquement 
pour les utilisateurs
```

#### Support utilisateurs
- Répondre aux avis
- Monitorer les crashs
- Corriger les bugs rapidement

### 7. Versionning

```
Version Format: MAJOR.MINOR.PATCH

v1.0.0 - Version initiale
  ✓ Support LeBonCoin, SeLoger, BienIci
  ✓ MaPrimeRénov' intégré
  ✓ Interface popup fonctionnelle

v1.1.0 - Premières améliorations (Q1 2026)
  + Support Immoweb
  + Export PDF
  + Mode sombre

v1.2.0 - Nouvelles APIs (Q2 2026)
  + Intégration PTZ complète
  + Aides régionales dynamiques
  + Notifications push
```

### 8. Optimisation du store

#### SEO
```
Mots-clés à cibler:
- Extension immobilière
- Aides rénovation
- MaPrimeRénov'
- PTZ immobilier
- Leboncoin aide
- Calcul aide achat
```

#### Avis utilisateurs
```
Stratégie pour obtenir des avis positifs:
1. Demander des avis après usage (popup)
2. Répondre à TOUS les avis
3. Fixer les bugs rapidement
4. Publier des mises à jour régulières
5. Communiquer sur les changements
```

### 9. Promotion

#### Canaux de distribution
- 📧 Reddit (r/france, r/immobilier)
- 📱 Twitter/X (@VieImmobiliere)
- 🔗 Forums immobiliers
- 📰 Blogs immobiliers
- 💼 LinkedIn

#### Content marketing
```
- Blog post : "Les 10 aides à connaître en 2025"
- Vidéo démo sur YouTube
- Case study : "J'ai économisé 40 000€ en rénovation"
- Infographie : "Aides par type de travaux"
```

### 10. Analytics & Monitoring

```javascript
// Implémenter du tracking (optionnel, si consentement)
async function trackEvent(eventName, properties) {
  if (!config.acceptAnalytics) return;
  
  await fetch('https://analytics.example.com/track', {
    method: 'POST',
    body: JSON.stringify({
      event: eventName,
      properties,
      timestamp: new Date().toISOString()
    })
  });
}

// Exemples d'événements à tracker:
// - Extension installed/updated
// - Site visited (anonymisé)
// - Property analyzed
// - Aids found count
// - User interacted with aid link
```

### 11. Politique de confidentialité

```markdown
# Politique de confidentialité - RénoAides

## Données collectées
- Code postal utilisateur (optionnel)
- Revenus (optionnel, jamais envoyé)
- Historique annonces visitées (local uniquement)

## Données partagées
Aucune donnée n'est vendue ni partagée.
Seules les APIs officielles de l'État sont contactées.

## Cookies/Stockage
- Utilisation de chrome.storage (local + sync)
- TTL: 24h pour les données d'aide

## Conformité
- ✅ RGPD compliant
- ✅ CNIL déclaration (optionnel)
```

---

## Ressources utiles pour le déploiement

- [Chrome Web Store Developer Console](https://chromewebstore.google.com/developer/dashboard)
- [Extension Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest v3 Updates](https://developer.chrome.com/blog/manifest-v3-now-available/)
- [Security Guidelines](https://developer.chrome.com/docs/webstore/policy/)

---

**Status: En attente de publication sur Chrome Web Store**

Dernière mise à jour : Novembre 2025
