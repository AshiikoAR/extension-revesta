# 🔍 Diagnostic - Erreur API Géo "Failed to fetch"

**Date:** 6 novembre 2025  
**Issue:** Erreur `TypeError: Failed to fetch` sur `api.geo.gouv.fr`

---

## 📊 Diagnostic

### Logs observés:
```
background.js:94 📡 Récupération info géo pour 49240
background.js:121 ❌ Erreur API Géo: TypeError: Failed to fetch
```

### Causes possibles:

1. **CORS Bloqué** ❌
   - L'API Géo bloque les requêtes depuis une extension
   - Solution: Utiliser un backend intermédiaire

2. **Timeout réseau** ⚠️
   - La réponse est trop lente
   - Solution: Ajouter un timeout

3. **Permissions réseau** 🔒
   - Host permission manquante ou insuffisante
   - Solution: Vérifier manifest.json

4. **DNS/Résolution** 🌐
   - Impossible de résoudre le domaine
   - Solution: Test réseau manuel

---

## ✅ Solutions implémentées

### 1. Timeout intelligent (5 secondes)
```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

const response = await fetch(url, {
  signal: controller.signal,
  ...
});
clearTimeout(timeout);
```

### 2. Fallback robuste
```javascript
// Si l'API échoue → retourner le code postal qu'on connaît déjà
return {
  nom: 'Localisation inconnue',
  region: 'Région inconnue',
  codePostal: codePostal,  // ← On l'a du content script
  source: 'fallback'
};
```

### 3. Logging détaillé
```javascript
console.error('❌ Erreur API Géo:', error.name, error.message);
// Affiche: AbortError, TypeError, NetworkError, etc.
```

---

## 🧪 Étapes de test

### Test 1: Vérifier que le fallback fonctionne
```
1. Ouvrir annonce LeBonCoin
2. Cliquer RénoAides
3. Regarder console F12
4. Chercher: "source: fallback"
```

### Test 2: Vérifier les performances
```javascript
// En console (F12 → Console):
performance.now() // Heure avant
// Cliquer RénoAides
performance.now() // Heure après
// Doit être < 10 secondes (5s timeout + 5s autres APIs)
```

### Test 3: Simuler timeout
```javascript
// Débugger en console:
navigator.onLine // Doit être: true
```

---

## 🛠️ Solutions à long terme

### Option 1: Backend intermédiaire (RECOMMANDÉ pour production)
```
Extension → Votre Backend → API Géo
```

**Avantages:**
- ✅ Pas de CORS
- ✅ Sécurisé (token hidden)
- ✅ Caching serveur
- ✅ Logs centralisés

**Implémentation Node.js:**
```javascript
// backend.js
app.get('/api/geo/:codePostal', async (req, res) => {
  const { codePostal } = req.params;
  const response = await fetch(`https://api.geo.gouv.fr/communes?codePostal=${codePostal}`);
  const data = await response.json();
  res.json(data);
});
```

Ensuite dans background.js:
```javascript
const url = `https://votre-backend.com/api/geo/${codePostal}`;
const response = await fetch(url);
```

### Option 2: Service Worker proxy
Utiliser le Service Worker comme proxy (plus complexe)

### Option 3: Accès direct (ACTUEL)
Garder le fallback qui fonctionne bien

---

## 📋 État actuel (ACCEPTABLE)

### ✅ Ce qui fonctionne:
- Extension charge et s'initialise
- Content script extrait les données (y compris code postal)
- Popup affiche les aides disponibles
- API Mes Aides Rénov fonctionne avec token
- Fallback API Géo = données minimales

### ⚠️ Ce qui ne fonctionne pas:
- Appel direct API Géo (CORS ou timeout)

### Impact utilisateur:
- **MINIMAL** - Les aides s'affichent quand même!
- Juste: "Localisation inconnue" au lieu de "Nom de la ville"

---

## 🔍 Comment déboguer plus

### En console (F12 → Console):

```javascript
// Tester l'API directement:
fetch('https://api.geo.gouv.fr/communes?codePostal=49240')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e));

// Résultat attendu:
{
  communes: [
    { nom: "Angers", codePostal: "49000", region: "Pays de la Loire", ... }
  ]
}
```

### Vérifier les permissions:

```javascript
// Console extension (Service Worker):
chrome.runtime.getManifest()
// Chercher: "host_permissions": ["https://api.geo.gouv.fr/*"]
```

### Vérifier le network:

```
F12 → Network
Cliquer RénoAides
Chercher: api.geo.gouv.fr
Vérifier: Status (200, 304, 403, 0, etc.)
```

---

## 🎯 Recommandations

### Pour maintenant (MVP - Minimum Viable Product):
✅ **Accepter le fallback**
- L'extension fonctionne sans erreur
- Les aides s'affichent
- Bon pour démo/prototype

### Pour production:
🔧 **Implémenter un backend**
- Éliminer les erreurs CORS
- Sécuriser les tokens API
- Cacher les appels réseau
- Ajouter du caching

### Pour Chrome Web Store:
📦 **Tester à grande échelle**
- Vérifier les quotas API
- Implémenter rate limiting
- Ajouter les logs

---

## 📊 Résumé technique

| Aspect | État |
|--------|------|
| **API Géo Direct** | ❌ Failed to fetch |
| **Fallback API Géo** | ✅ Fonctionne |
| **Extension globale** | ✅ Fonctionnelle |
| **Impact utilisateur** | ✅ Minimal |
| **Solution à moyen terme** | 🔧 Backend requis |

---

## ✨ Changements appliqués

1. ✅ Timeout 5s sur fetch API Géo
2. ✅ AbortController pour contrôle du timeout
3. ✅ Fallback smart avec code postal connu
4. ✅ Logging du type d'erreur (AbortError, TypeError, etc.)
5. ✅ Source tracking (api/fallback/extracted)

---

**Status:** ✅ Extension fonctionnelle avec fallback  
**Prochaine étape:** Tester avec les utilisateurs  
**Long terme:** Implémenter backend pour production  

---

**Author:** Diagnostics v1.0  
**Last Updated:** 6 novembre 2025
