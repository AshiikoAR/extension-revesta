# Politique de Confidentialité - REVESTA

## Vue d'ensemble
REVESTA est une extension Chrome qui aide les utilisateurs à découvrir les aides financières pour l'achat et la rénovation immobilière. Cette politique de confidentialité décrit comment nous collectons, utilisons et protégeons vos données.

## Données collectées

### 1. Données de profil utilisateur
Vous fournissez volontairement :
- **Code postal** → utilisé pour géolocaliser les aides disponibles
- **Revenus annuels** → pour déterminer l'éligibilité aux aides
- **Composition du ménage** → pour les calculs d'aide personnalisés
- **Statut professionnel** → propriétaire occupant, investisseur bailleur, etc.

Ces données sont **stockées localement** sur votre ordinateur via `chrome.storage.local` et **jamais transmises sans votre consentement**.

### 2. Données d'annonces immobilières
Lorsque vous visitez une annonce LeBonCoin, l'extension extrait automatiquement :
- Prix d'achat
- Surface
- Code postal
- Type de bien
- Nombre de pièces
- Année de construction
- Mode de chauffage

Ces données sont ensuite utilisées pour :
✅ Communiquer avec l'API Mes Aides Réno (beta.gouv.fr) pour calculer les aides  
✅ Générer un compte-rendu personnalisé  
✅ Afficher les résultats dans le popup de l'extension

### 3. Communications API externes
L'extension communique avec les APIs publiques suivantes :
- **API Mes Aides Réno** (beta.gouv.fr) → Calcul des aides financières
- **API Geo (geo.api.gouv.fr)** → Conversion code postal → code INSEE
- **Backend REVESTA** → Stockage optionnel des simulations (avec consentement)

## Données NON collectées

❌ Nous **ne collectons jamais** :
- Historique de navigation
- Adresse email ou données personnelles identifiantes
- Données de sites visitaires (sauf annonces LeBonCoin)
- Identifiants publicitaires ou cookies de tracking
- Données biométriques

## Sécurité

✅ **Protocole HTTPS** : Toutes les communications API utilisent HTTPS  
✅ **Stockage local** : Vos données de profil restent sur votre appareil  
✅ **Pas de serveur centralisé** : Pas de base de données personnelle  
✅ **Code source ouvert** : [GitHub - Audit possible](https://github.com/AshiikoAR/extension-revesta)

## Partage de données

Vos données ne sont **jamais partagées** avec :
- Des tiers publicitaires
- Des courtiers ou assureurs
- Des agences immobilières
- D'autres services sans votre consentement explicite

Les seuls appels API externes sont :
1. Mes Aides Réno (beta.gouv.fr) — Service public français
2. Geo API (geo.api.gouv.fr) — Service public français
3. Backend REVESTA (si génération de compte-rendu)

## Compte-rendu par email

Lorsque vous générez un compte-rendu :
- Les données du bien + votre profil sont compilées en HTML
- Un lien de téléchargement ou d'envoi par email est généré
- **Vous contrôlez entièrement** si vous l'envoyez ou le téléchargez
- Aucun archivage côté serveur sans action explicite

## Droits RGPD (Utilisateurs UE)

Conformément au **Règlement Général sur la Protection des Données (RGPD)**, vous disposez de :

✅ **Droit d'accès** → Voir quelles données sont stockées  
✅ **Droit de rectification** → Modifier vos informations  
✅ **Droit à l'oubli** → Supprimer vos données (clic sur "Réinitialiser" dans Paramètres)  
✅ **Droit à la portabilité** → Récupérer vos données  
✅ **Droit d'opposition** → Refuser le traitement

Pour exercer ces droits, contactez : **contact@revesta.fr**

## Désinstallation

En désinstallant l'extension :
- ✅ Toutes les données locales sont supprimées
- ✅ Aucune donnée n'est conservée sur les serveurs
- ✅ Les cookies d'extension sont effacés

## Modifications de cette politique

REVESTA se réserve le droit de mettre à jour cette politique. Les changements seront :
- Publiés dans les notes de version
- Notifiés via le Chrome Web Store
- Effectifs après présentation à l'utilisateur

Date de dernière modification : **18 mars 2026**  
Version : **1.0.0**

---

**Questions ?** Contactez : **contact@revesta.fr** ou créez une issue sur [GitHub](https://github.com/AshiikoAR/extension-revesta)
