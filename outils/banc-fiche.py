#!/usr/bin/env python3
"""
banc-fiche.py — rejoue TOUS les blocs de code de `tp-instrumentation/FICHE-TP.md`.

    python3 outils/banc-fiche.py

Les blocs ```python de la fiche sont concaténés dans un seul script, joué comme un
**vrai script** — c'est-à-dire exactement ce que fait un étudiant qui recopie la fiche
de haut en bas dans son noyau.

Pourquoi un sous-processus plutôt qu'un `exec()` ici : l'amorce déclare son app Django
avec `name = "__main__"`, donc Django importe le *vrai* module `__main__` pour y chercher
la classe `Boutique`. Exécuter les blocs dans un espace de noms synthétique échoue avec
un `ImportError` trompeur. Le banc doit reproduire les conditions réelles, sinon il
valide autre chose que ce qu'on distribue.

Ce banc n'est pas un luxe : c'est lui qui a débusqué le middleware `Videur` resté branché
entre deux temps (403 sur tout le temps 4) et les identifiants écrits en dur que SQLite ne
réutilise jamais après une suppression. Une relecture ne voit pas ces choses-là.
"""

import os
import re
import subprocess
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TP = os.path.join(RACINE, "tp-instrumentation")
FICHE = os.path.join(TP, "FICHE-TP.md")
GENERE = os.path.join(TP, ".fiche-jouee.py")  # jetable, ignoré par git

# Blocs dont la fiche demande explicitement de LIRE l'erreur : ils doivent lever.
DOIVENT_LEVER = [
    'c.post("/produits/12", {"nom": "x"})          # ← lisez le message en entier',
    'reverse("produit-detail", kwargs={"pk": "abc"})       # ← lisez l\'erreur',
    'resolve("/categories/écran/")                  # ← que se passe-t-il ?',
]

# Blocs destinés au settings.py / urls.py d'un vrai projet Django (temps 5).
IGNORES = (
    "INSTALLED_APPS = [...",
    "from django.urls import include, path\n\nurlpatterns",
)

# Exercice délibérément laissé à l'étudiant (4.6) : la correction n'est pas dans la
# fiche, par construction. C'est `verifier.py` §4.6 qui prouve qu'elle donne bien 2.
EXERCICES = ("assert len(cap.captured_queries) == 2\n",)


def construire():
    blocs = re.findall(r"```python\n(.*?)```", open(FICHE, encoding="utf-8").read(), re.S)
    sortie = [
        "import logging, sys",
        # Surtout PAS de logging.disable global : l'étape 3.5 mesure justement les logs.
        "logging.getLogger('django.request').setLevel(logging.CRITICAL)",
        "",
    ]
    joues = 0
    for i, bloc in enumerate(blocs, 1):
        if any(bloc.strip().startswith(x) for x in IGNORES):
            sortie.append(f"# bloc {i} — ignoré (configuration d'un vrai projet)")
            continue
        if bloc in EXERCICES:
            sortie.append(f"# bloc {i} — exercice laissé à l'étudiant (cf. verifier.py §4.6)")
            continue
        joues += 1
        sortie.append(f'print("### bloc {i}", file=sys.stderr)')
        if any(m in bloc for m in DOIVENT_LEVER):
            sortie.append("try:")
            sortie.extend("    " + l for l in bloc.rstrip().splitlines())
            sortie.append(f'    raise SystemExit("bloc {i} aurait dû lever une exception")')
            sortie.append("except Exception as _e:")
            sortie.append(f'    print("### bloc {i} a bien levé", type(_e).__name__, file=sys.stderr)')
        else:
            sortie.append(bloc.rstrip())
        sortie.append("")
    sortie.append('print("### FIN", file=sys.stderr)')

    with open(GENERE, "w", encoding="utf-8") as f:
        f.write("\n".join(sortie))
    return len(blocs), joues


def python_du_tp():
    """L'interpréteur du venv du TP s'il existe, sinon celui qui nous exécute."""
    for chemin in (
        os.path.join(TP, ".venv", "bin", "python"),
        os.path.join(TP, ".venv", "Scripts", "python.exe"),
    ):
        if os.path.exists(chemin):
            return chemin
    return sys.executable


def main():
    if not os.path.exists(FICHE):
        print(f"✗ {FICHE} introuvable")
        return 2

    total, joues = construire()
    python = python_du_tp()
    print(f"banc-fiche — {total} blocs dans la fiche, {joues} joués")
    print(f"             interpréteur : {python}\n")

    r = subprocess.run([python, GENERE], cwd=TP, capture_output=True, text=True)
    marqueurs = [l for l in r.stderr.splitlines() if l.startswith("### ")]

    if r.returncode == 0 and marqueurs and marqueurs[-1] == "### FIN":
        os.remove(GENERE)
        print("✅ banc-fiche : la fiche se joue de bout en bout\n")
        return 0

    dernier = marqueurs[-1] if marqueurs else "aucun bloc joué"
    print(f"❌ banc-fiche : arrêt après « {dernier} »")
    print(f"   script rejouable : {GENERE}\n")
    detail = "\n".join(l for l in r.stderr.splitlines() if not l.startswith("### "))
    print(detail[-2500:] or r.stdout[-2500:])
    return 1


if __name__ == "__main__":
    sys.exit(main())
