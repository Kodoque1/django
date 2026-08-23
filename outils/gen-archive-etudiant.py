#!/usr/bin/env python3
"""
gen-archive-etudiant.py — archive spéciale étudiant, prête à livrer.

Contenu :
  cours/          les decks complets (HTML + JS + CSS vendorisé, hors notes orateur
                  ne sont pas retirées : elles sont dans le HTML mais invisibles
                  sans le mode présentateur)
  version-etudiante/  les decks jeux seuls
  cheatsheets/    syntaxe et vocabulaire
  tp-instrumentation/ la fiche TP, les fiches J1–J5, amorce, verifier, requirements

Exclu volontairement : knowledge/ (pilotage), outils/ (bancs), design/, CLAUDE.md,
README.md (racine), le PDF IPSSI, .git, __pycache__, .venv, *.pyc.

Usage :
    python3 outils/gen-archive-etudiant.py            # → dist/etudiant-<date>.zip
    python3 outils/gen-archive-etudiant.py --out DIR  # autre dossier de sortie
"""
import argparse
import datetime
import zipfile
from pathlib import Path

DEPOT = Path(__file__).resolve().parent.parent

# Répertoires copiés intégralement, avec exclusions internes
INCLUS = [
    "cours",
    "version-etudiante",
    "cheatsheets",
    "tp-instrumentation",
]

# Fichiers de la racine du dépôt à embarquer
FICHIERS_RACINE = [
    # aucun : le README racine est un document de pilotage
]

# Motifs d'exclusion (relatifs, appliqués partout)
EXCLUS_REPERTOIRES = {"__pycache__", ".venv", "venv", ".git", "node_modules", "migrations"}
EXCLUS_SUFFIXES = {".pyc", ".pyo", ".log", ".sqlite3"}
# Le corrigé exécutable ne part pas chez l'étudiant
EXCLUS_FICHIERS = {"CORRIGE.md"}


def est_exclu(chemin: Path) -> bool:
    parties = chemin.parts
    if EXCLUS_REPERTOIRES & set(parties):
        return True
    if chemin.suffix.lower() in EXCLUS_SUFFIXES:
        return True
    if chemin.name in EXCLUS_FICHIERS:
        return True
    return False


def collecter():
    """Retourne la liste (chemin_absolu, chemin_dans_archive)."""
    entrees = []
    for nom in INCLUS:
        racine = DEPOT / nom
        if not racine.exists():
            print(f"  ⚠ absent, ignoré : {nom}/")
            continue
        for f in sorted(racine.rglob("*")):
            if f.is_file() and not est_exclu(f):
                entrees.append((f, f.relative_to(DEPOT)))
    for nom in FICHIERS_RACINE:
        f = DEPOT / nom
        if f.exists():
            entrees.append((f, Path(nom)))
    return entrees


def main():
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--out", default=str(DEPOT / "dist"),
                         help="dossier de sortie (défaut : dist/)")
    args = parseur.parse_args()

    sortie_dir = Path(args.out)
    sortie_dir.mkdir(parents=True, exist_ok=True)

    date = datetime.date.today().isoformat()
    archive_path = sortie_dir / f"etudiant-{date}.zip"

    entrees = collecter()
    if not entrees:
        raise SystemExit("Aucun fichier à archiver — vérifier les répertoires inclus.")

    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for absolu, relatif in entrees:
            z.write(absolu, Path("django-ipssi") / relatif)

    taille = archive_path.stat().st_size
    print(f"✓ {archive_path}")
    print(f"  {len(entrees)} fichiers, {taille / 1024:.0f} Ko")

    # aperçu par répertoire
    comptes = {}
    for _, relatif in entrees:
        cle = relatif.parts[0]
        comptes[cle] = comptes.get(cle, 0) + 1
    for cle, n in sorted(comptes.items()):
        print(f"  · {cle}/ : {n} fichiers")


if __name__ == "__main__":
    main()
