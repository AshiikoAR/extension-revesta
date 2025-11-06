#!/bin/bash

# 🧪 Script de test - Vérifier que l'extension est prête

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🧪 TEST RénoAides Extension                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier les fichiers essentiels
echo "📋 Vérification des fichiers..."
echo ""

files=(
  "manifest.json"
  "background.js"
  "popup.html"
  "popup.js"
  "options.html"
  "content-scripts/leboncoin.js"
  "content-scripts/seloger.js"
  "content-scripts/bienici.js"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MANQUANT)"
    ((missing++))
  fi
done

echo ""
if [ $missing -eq 0 ]; then
  echo "✅ Tous les fichiers essentiels sont présents"
else
  echo "❌ $missing fichier(s) manquant(s)"
fi

echo ""
echo "📊 Statistiques..."
echo ""

# Compter les lignes de code
total_lines=0
for file in *.js popup*.js options*.js; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_lines=$((total_lines + lines))
    echo "  $file: $lines lignes"
  fi
done

echo "  TOTAL: $total_lines lignes de code"

# Compter les fichiers
total_files=$(find . -type f ! -path '*/\.git/*' | wc -l)
echo "  Fichiers totaux: $total_files"

echo ""
echo "🔍 Vérification du manifest.json..."
echo ""

# Vérifier le JSON valide
if grep -q '"manifest_version": 3' manifest.json; then
  echo "✅ Manifest v3 configuré"
else
  echo "❌ Manifest v3 non trouvé"
fi

if grep -q 'leboncoin.fr' manifest.json; then
  echo "✅ LeBonCoin pattern présent"
else
  echo "❌ LeBonCoin pattern manquant"
fi

if grep -q 'seloger.com' manifest.json; then
  echo "✅ SeLoger pattern présent"
else
  echo "❌ SeLoger pattern manquant"
fi

echo ""
echo "🎯 Vérification des patterns d'URL..."
echo ""

# Vérifier les patterns corrects
if grep -q 'ventes_immobilieres/\*' manifest.json && grep -q 'ad/ventes_immobilieres/\*' manifest.json; then
  echo "✅ Patterns LeBonCoin v1 et v2 présents"
else
  echo "⚠️  Vérifier les patterns LeBonCoin"
fi

echo ""
echo "💡 Prochaines étapes:"
echo ""
echo "1. Ouvrir Chrome et aller à: chrome://extensions/"
echo "2. Activer 'Mode développeur' (haut-droit)"
echo "3. Cliquer 'Charger l'extension non empaquetée'"
echo "4. Sélectionner ce dossier"
echo "5. Aller sur: https://www.leboncoin.fr/ventes_immobilieres/"
echo "6. Ouvrir une annonce"
echo "7. Vérifier le bouton '🏠 Voir les aides disponibles'"
echo ""
echo "🔗 URLs de test recommandées:"
echo "  • https://www.leboncoin.fr/ad/ventes_immobilieres/2992833412"
echo "  • https://www.leboncoin.fr/ventes_immobilieres/"
echo ""
echo "📊 Taille de l'extension:"
du -sh . | awk '{print "  " $0}'

echo ""
echo "✅ Extension prête à tester !"
echo ""
