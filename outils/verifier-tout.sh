#!/usr/bin/env bash
# verifier-tout.sh — le point d'entrée unique de vérification du cours Django.
#
#     bash outils/verifier-tout.sh                  # tout le dépôt
#     bash outils/verifier-tout.sh J3-01-drf        # un seul module
#
# Un module nommé est transmis aux quatre bancs qui jugent le deck. Les deux bancs Django
# (verifier.py, banc-fiche) sont alors SAUTÉS : ils mesurent le TP d'instrumentation, qui ne
# dépend d'aucun deck — les faire tourner à chaque itération d'une voie de travail coûterait
# une minute pour zéro information. Ils restent à repasser une fois, en fin de chantier.
#
# Enchaîne les six bancs :
#   1. banc-redaction.py   aucune remarque méta dans le texte vu par l'étudiant
#   2. banc-revelation.py  aucune slide ne livre ce qu'une frame fait construire (§0)
#   3. banc-jeux.js        les jeux (jsdom) — feedbacks complets + parcours
#   4. verifier.py         les 22 mesures du TP sur un vrai Django
#   5. banc-fiche.py       la fiche de TP rejouée bloc par bloc
#   6. banc-deck.py        les decks dans un vrai Chrome — rendu, débordements, remontage
#
# 4 et 5 exigent Django 5.x, 6 exige google-chrome et websocket-client. Ce qui manque
# est SAUTÉ avec un message, jamais mis en échec.

set -uo pipefail
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

vert=$'\033[32m'; rouge=$'\033[31m'; jaune=$'\033[33m'; gras=$'\033[1m'; nul=$'\033[0m'
echecs=0
sautes=0

# Les modules demandés. Vide = tout le dépôt.
MODULES=("$@")
if [ ${#MODULES[@]} -gt 0 ]; then
  printf '%spérimètre : %s%s\n' "$gras" "${MODULES[*]}" "$nul"
fi

titre() { printf '\n%s──────────────────────────────────────────────────────────\n %s\n──────────────────────────────────────────────────────────%s\n' "$gras" "$1" "$nul"; }

# ------------------------------------------------------------- 1. la rédaction
titre "1/6 · banc-redaction — le cours ne parle pas de lui-même"
# ${MODULES[@]+"${MODULES[@]}"} : la forme qui survit à `set -u` avec un tableau vide.
python3 outils/banc-redaction.py ${MODULES[@]+"${MODULES[@]}"} || echecs=$((echecs + 1))

# ------------------------------------------------------------- 2. la révélation
titre "2/6 · banc-revelation — aucune révélation avant la réponse construite"
python3 outils/banc-revelation.py ${MODULES[@]+"${MODULES[@]}"} || echecs=$((echecs + 1))

# ---------------------------------------------------------------- 2. les jeux
titre "3/6 · banc-jeux — les jeux (jsdom)"
if ! command -v node >/dev/null 2>&1; then
  printf '%s⊘ node absent — banc-jeux sauté%s\n' "$jaune" "$nul"
  sautes=$((sautes + 1))
else
  # jsdom peut être installé globalement : node ne le résout alors qu'avec NODE_PATH.
  if ! node -e "require('jsdom')" >/dev/null 2>&1; then
    export NODE_PATH="${NODE_PATH:-$(npm root -g 2>/dev/null)}"
  fi
  if node -e "require('jsdom')" >/dev/null 2>&1; then
    node outils/banc-jeux.js ${MODULES[@]+"${MODULES[@]}"} || echecs=$((echecs + 1))
  else
    printf '%s⊘ jsdom introuvable (npm install -g jsdom) — banc-jeux sauté%s\n' "$jaune" "$nul"
    sautes=$((sautes + 1))
  fi
fi

# ------------------------------------------------- l'interpréteur du TP
# Les deux bancs Django mesurent le TP d'instrumentation, jamais un deck : demander un module
# ne les concerne pas. Les sauter rend la boucle d'une voie de travail utilisable — sinon on
# paie une minute de Django à chaque itération pour une information inchangée.
PY=""
if [ ${#MODULES[@]} -eq 0 ]; then
  for candidat in tp-instrumentation/.venv/bin/python tp-instrumentation/.venv/Scripts/python.exe python3; do
    if command -v "$candidat" >/dev/null 2>&1 || [ -x "$candidat" ]; then
      if "$candidat" -c 'import django,sys; sys.exit(0 if django.VERSION[0] >= 5 else 1)' 2>/dev/null; then
        PY="$candidat"
        break
      fi
    fi
  done
fi

if [ ${#MODULES[@]} -gt 0 ]; then
  titre "4/6 et 5/6 · TP d'instrumentation"
  printf '%s⊘ un module est demandé — les deux bancs Django ne jugent aucun deck, sautés.%s\n' "$jaune" "$nul"
  printf '  Les repasser une fois en fin de chantier : bash outils/verifier-tout.sh\n'
  sautes=$((sautes + 2))
elif [ -z "$PY" ]; then
  titre "4/6 et 5/6 · TP d'instrumentation"
  printf '%s⊘ Django 5.x introuvable — les deux bancs Python sont sautés.%s\n' "$jaune" "$nul"
  printf '  Pour les activer :\n'
  printf '    cd tp-instrumentation && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt\n'
  printf '  (sur Debian/Ubuntu, « python3 -m venv » exige le paquet python3-venv)\n'
  sautes=$((sautes + 2))
else
  titre "4/6 · verifier.py — les 22 mesures sur un vrai Django"
  "$PY" tp-instrumentation/verifier.py || echecs=$((echecs + 1))

  titre "5/6 · banc-fiche — la fiche de TP rejouée bloc par bloc"
  "$PY" outils/banc-fiche.py || echecs=$((echecs + 1))
fi

# ---------------------------------------------------------------- 5. les decks
titre "6/6 · banc-deck — les decks dans un vrai Chrome"
if ! command -v google-chrome >/dev/null 2>&1; then
  printf '%s⊘ google-chrome absent — banc-deck sauté%s\n' "$jaune" "$nul"
  sautes=$((sautes + 1))
elif ! python3 -c "import websocket" >/dev/null 2>&1; then
  printf '%s⊘ websocket-client absent (pip install websocket-client) — banc-deck sauté%s\n' "$jaune" "$nul"
  sautes=$((sautes + 1))
else
  python3 outils/banc-deck.py ${MODULES[@]+"${MODULES[@]}"} || echecs=$((echecs + 1))
fi

# ---------------------------------------------------------------- verdict
printf '\n'
if [ "$echecs" -eq 0 ] && [ "$sautes" -eq 0 ]; then
  printf '%s✅ tout est vert.%s\n\n' "$vert" "$nul"
elif [ "$echecs" -eq 0 ]; then
  printf '%s✅ aucun échec — mais %d banc(s) sauté(s), voir ci-dessus.%s\n\n' "$jaune" "$sautes" "$nul"
else
  printf '%s❌ %d banc(s) en échec.%s\n\n' "$rouge" "$echecs" "$nul"
fi

# Ce qu'aucun banc ne couvre — à faire à la main après toute modification du deck.
cat <<'RAPPEL'
Vérification manuelle (aucun banc ne la remplace) :

  python3 serve.py     puis http://localhost:8000/cours/

  banc-deck couvre déjà : parcours complet, rendu Mermaid, débordement des jeux sous la
  slide, remontage après aller-retour, bascule de thème, console vierge. Restent à l'œil :

  · jouer les jeux en se trompant volontairement — le message colle-t-il à l'erreur commise ?
  · une slide qui PARAPHRASE ce qu'une frame fait construire — banc-revelation ne voit
    que la copie littérale (six mots de suite), jamais la reformulation
  · le mode duel : lisibilité au vidéoprojecteur, au fond de la salle
  · la mise en page des slides denses (tableaux, deux colonnes) dans les deux thèmes
  · le confort de lecture : taille de police, contraste, longueur des lignes

RAPPEL

exit "$echecs"
