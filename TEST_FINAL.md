# 🚀 Guide de Test Final - Extension RénoAides

**Date:** 6 novembre 2025  
**Status:** ✅ Prête au test complet

---

## 📋 Checklist de test

### ✅ Test 1: Extension se charge

```
1. chrome://extensions/
2. Chercher "RénoAides"
3. Vérifier: "Extension mise à jour" ✅
4. Vérifier: Bouton gris (inactif) sur pages non-supportées
```

**Résultat attendu:** Extension visible et active

---

### ✅ Test 2: Content script se charge sur LeBonCoin

```
1. Ouvrir: https://www.leboncoin.fr/ad/ventes_immobilieres/3022132377
2. F12 → Console → Filtre "LeBonCoin"
3. Chercher: "✅ LeBonCoin - Données extraites:"
```

**Résultat attendu:**
```
✅ LeBonCoin - Données extraites: {
  site: 'leboncoin',
  titre: '...',
  prix: 250000,
  codePostal: '49240',
  ...
}
```

---

### ✅ Test 3: Bouton RénoAides devient actif

```
1. Sur la même page LeBonCoin
2. Chercher: Icône RénoAides en haut à droite
3. Vérifier: Icône n'est PAS grisée ✅
```

**Résultat attendu:** Icône en couleur = clickable

---

### ✅ Test 4: Cliquer RénoAides - Popup s'affiche

```
1. Cliquer icône RénoAides
2. Un popup doit apparaître
3. F12 → Console → Filtre "popup"
```

**Résultat attendu:**
```
✅ Site supporté, tentative de récupération des données...
📡 Tentative scripting.executeScript (Manifest v3)...
✅ Données récupérées via scripting.executeScript
```

---

### ✅ Test 5: Popup affiche les données

```
1. Vérifier le popup contient:
   - Titre de l'annonce
   - Prix
   - Localisation/Code Postal
2. Exemple:
   "Maison 250 000€ | 49000 Angers"
```

**Résultat attendu:** Données affichées correctement

---

### ✅ Test 6: APIs appellées en arrière-plan

```
1. Console F12 → Filtre "background"
2. Chercher les logs:
```

**Résultat attendu:**
```
📡 Récupération info géo pour 49240
📡 Récupération aides Mes Aides Rénov pour 49240
📡 Récupération MaprimeRénov pour 49240

✅ Commune trouvée (OU fallback si timeout)
✅ Aides récupérées via Mes Aides Rénov
✅ MaprimeRénov disponible
```

---

### ✅ Test 7: Popup affiche les aides

```
1. Vérifier le popup affiche:
   - "Aides disponibles:"
   - MaPrimeRénov' (5000€)
   - Éco-PTZ (15000€)
   - Autres aides
2. Vérifier: Liens cliquables
```

**Résultat attendu:**
```
Aides disponibles:
• MaPrimeRénov': 5000€ ✓
• Éco-PTZ: 15000€ ✓
• MaPrimeRénov Sérénité: 8000€ ✓

Estimation: 28000€ (11% du prix)
```

---

### ✅ Test 8: Gestion des erreurs API Géo

```
1. Console F12 → Filtre "Erreur"
2. Si vous voyez: "❌ Erreur API Géo: TypeError: Failed to fetch"
   → C'est NORMAL, il y a un fallback
3. Vérifier: "source: fallback" dans les données
```

**Résultat accepté:**
```
❌ Erreur API Géo: TypeError: Failed to fetch
⚠️ Utilisation du fallback
✅ Extension continue de fonctionner
```

---

### ✅ Test 9: Liens d'aide cliquables

```
1. Dans le popup, cliquer les liens:
   - "Mes Aides Rénov"
   - "MaPrimeRénov"
   - "France Réno"
2. Vérifier: Nouveaux onglets s'ouvrent
```

**Résultat attendu:**
```
Onglets ouverts:
- https://mesaidesreno.gouv.fr/ ✓
- https://www.maprimerenov.gouv.fr/ ✓
- https://www.france-reno.gouv.fr/ ✓
```

---

### ✅ Test 10: Pas de site supporté

```
1. Ouvrir: https://www.google.com
2. Chercher: Icône RénoAides
3. Vérifier: Icône grisée/désactivée
4. Cliquer icône → Rien ne devrait se passer
```

**Résultat attendu:** Icône inactive sur les sites non-supportés

---

## 🧪 Tests avancés

### Test A: Performance

```
1. Ouvrir LeBonCoin
2. Appuyer sur F12 → Performance
3. Cliquer RénoAides
4. Mesurer le temps de réponse
```

**Résultat attendu:** < 10 secondes total

---

### Test B: Données manquantes

```
1. Trouver annonce LeBonCoin sans prix
2. Cliquer RénoAides
3. Vérifier: Popup affiche quand même (prix = 0 ou "N/A")
```

**Résultat attendu:** Extension robuste aux données manquantes

---

### Test C: Cache

```
1. Cliquer RénoAides sur même annonce 3x
2. Vérifier: 2e et 3e clics sont plus rapides
3. Console: Chercher "cache_mesaidesreno_49240"
```

**Résultat attendu:** Résultats mis en cache (24h)

---

### Test D: Autres sites réels

```
1. Tester sur SeLoger: https://www.seloger.com/annonces/
2. Tester sur BienIci: https://www.bienici.com/annonce/

Note: Peut requérir des ajustements de sélecteurs CSS
```

**Résultat attendu:** Même workflow que LeBonCoin

---

## 📊 Tableau de résultats

| Test | Attendu | Réel | Status |
|------|---------|------|--------|
| Extension se charge | ✅ | ? | ⏳ |
| Content script | ✅ | ? | ⏳ |
| Icône active | ✅ | ? | ⏳ |
| Popup apparaît | ✅ | ? | ⏳ |
| Données affichées | ✅ | ? | ⏳ |
| APIs appellées | ✅ | ? | ⏳ |
| Aides affichées | ✅ | ? | ⏳ |
| Gestion erreurs | ✅ | ? | ⏳ |
| Liens actifs | ✅ | ? | ⏳ |
| Sites non-supportés | ✅ | ? | ⏳ |

---

## 🐛 Troubleshooting rapide

### Icône grisée sur LeBonCoin?
```
→ chrome://extensions/ → Actualiser RénoAides
→ Actualiser la page LeBonCoin (F5)
```

### Popup ne s'affiche pas?
```
→ F12 → Console → Chercher les erreurs
→ Recharger l'extension
→ Essayer une autre annonce
```

### "Failed to fetch" pour API Géo?
```
→ C'est normal! Il y a un fallback
→ Voir API_GEO_DIAGNOSTIC.md pour plus d'infos
```

### Aucune aide n'apparaît?
```
→ Vérifier token API dans background.js
→ Vérifier permission host dans manifest.json
→ Console: Chercher "Aides récupérées"
```

### Extension se recharge toute seule?
```
→ Il y a une erreur JavaScript
→ F12 → Onglet "Service Worker"
→ Chercher les erreurs rouges
```

---

## 📝 Notes à prendre

Pendant le test, notez:

```
1. Temps de réponse total: ___ secondes
2. Aides affichées: ___ aides
3. Erreurs rencontrées: _______________
4. Sélecteurs CSS à ajuster: _______________
5. Suggestions d'amélioration: _______________
```

---

## 🎯 Critères de succès

**MVP accepté si:**
- ✅ Extension se charge sans erreur
- ✅ Content script extrait les données
- ✅ Popup affiche les aides
- ✅ Pas de crash/freeze
- ✅ Logs clear et utiles

**Bonus si:**
- ✅ API Géo fonctionne (communes trouvées)
- ✅ Tous les liens actifs
- ✅ Cache fonctionne
- ✅ Autres sites (SeLoger, BienIci) testés

---

## 🚀 Procédure finale

1. **Recharger l'extension**
   ```
   chrome://extensions/ → Actualiser RénoAides
   ```

2. **Ouvrir console**
   ```
   F12 → Console
   ```

3. **Tester annonce LeBonCoin**
   ```
   https://www.leboncoin.fr/ad/ventes_immobilieres/3022132377
   ```

4. **Cliquer RénoAides**
   ```
   Icône en haut à droite
   ```

5. **Observer:**
   - Console logs
   - Popup contenu
   - Temps de réponse

6. **Reporter résultats:**
   - ✅ Succès ou
   - ⚠️ Warning ou
   - ❌ Erreur

---

## 📞 Support

### Besoin d'aide?

1. **Vérifier les documentations:**
   - `API_GEO_DIAGNOSTIC.md` - Erreurs API Géo
   - `DEBUG_GUIDE.md` - Guide de debugging
   - `TROUBLESHOOTING.md` - FAQ

2. **Lancer le test automatisé:**
   ```bash
   bash test.sh
   ```

3. **Inspecter les fichiers:**
   - manifest.json - Configuration
   - popup.js - Interface
   - background.js - Logique
   - content-scripts/leboncoin.js - Extraction

---

**Status:** ✅ PRÊTE À TESTER  
**Date:** 6 novembre 2025  
**Author:** Test Guide v1.0

Bonne chance! 🍀🚀
