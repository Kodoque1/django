#!/usr/bin/env python3
"""
banc-revelation.py — aucune révélation avant que l'apprenant ait construit une réponse.

    python3 outils/banc-revelation.py            # tous les modules
    python3 outils/banc-revelation.py J2-03-…    # un seul

C'est la règle qui prime sur toutes les autres (CLAUDE.md §0), et la faute la plus facile à
commettre : **une slide ne dit jamais ce que la frame suivante fait construire.**

Comment il s'y prend
--------------------
La position de chaque `data-widget="X"` découpe le deck. Le texte des slides qui **précèdent**
est normalisé puis découpé en **suites de six mots** ; on cherche celles qui se retrouvent dans
un `explain` ou un `hint` du widget. Six mots consécutifs identiques ne sont pas une coïncidence
de vocabulaire — deux textes sur les couches TCP/IP partagent « couche », « requête »,
« serveur » sans que l'un révèle l'autre. C'est une copie.

Le seuil vient d'une mesure, pas d'une intuition : à six mots, 4 signalements sur les deux
premiers modules, dont 3 réels. En sac de mots (recouvrement de vocabulaire), le même corpus en
produisait 25 pour 2 réels — inexploitable.

Ce qu'il ne voit pas
--------------------
Une révélation **reformulée**. Si la slide écrit « chaque couche ignore ses voisines éloignées »
et la frame « chaque couche ne connaît que sa voisine », aucune suite de six mots ne coïncide et
le banc reste vert. Il attrape la copie, pas la paraphrase — c'est une aide à la relecture, pas
un substitut.
"""

import glob
import html
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LONGUEUR = 6          # mots consécutifs

# ---------------------------------------------------------------------------
# Exemptions — une slide entière, écartée pour UN widget, avec sa raison.
#
# ⚠ Une exemption dit qu'un recouvrement est VOULU. Elle ne se pose que dans un seul cas : la
#   slide **pose la question sans y répondre**, et la frame délivre la réponse. C'est le patron
#   correct — sans cette note, quelqu'un finira par « corriger » une slide motivante bien
#   construite. Toute autre raison est le signe qu'il faut déplacer la slide, pas l'exempter.
#
# Le marqueur est une chaîne distinctive de la slide visée ; la section qui la contient sort du
# texte « avant » pour ce widget-là seulement.
# ---------------------------------------------------------------------------
EXEMPTIONS = [
    ("httpVerbs", "un robot a vidé des bases",
     "La slide raconte l'affaire du Web Accelerator et s'arrête sur « Alors qui est en "
     "tort ? » — sans y répondre. C'est le jeu qui fait construire la réponse (la sûreté "
     "est un contrat, pas une politesse). Le récit est partagé, la conclusion non."),
]


def normaliser(t):
    t = re.sub(r"<[^>]+>", " ", html.unescape(t)).lower()
    t = re.sub(r"[^a-zàâçéèêëîïôûùüÿœ0-9]+", " ", t)
    return t.split()


def suites(mots):
    return {tuple(mots[i:i + LONGUEUR]) for i in range(max(0, len(mots) - LONGUEUR + 1))}


def texte_avant(src, debut, fin, widget):
    """
    Les slides du deck situées avant `fin`, notes orateur retirées, et **moins** les slides
    exemptées pour ce widget.
    """
    t = src[debut:fin]
    t = re.sub(r'<aside class="notes">.*?</aside>', " ", t, flags=re.S)
    t = re.sub(r"<!--.*?-->", " ", t, flags=re.S)

    ecartes = [mq for w, mq, _ in EXEMPTIONS if w == widget]
    if not ecartes:
        return t
    # Découper en sections pour n'en retirer que la bonne : une exemption vise une slide,
    # pas un mot qui traînerait ailleurs dans le deck.
    return " ".join(sec for sec in re.split(r"(?=<section)", t)
                    if not any(mq in sec for mq in ecartes))


def source_widget(dossier, nom):
    """Le fichier qui enregistre le widget `nom`, qu'il passe par PIFrames ou non."""
    for f in sorted(glob.glob(os.path.join(dossier, "js", "widgets", "*.js"))):
        s = open(f, encoding="utf-8").read()
        if re.search(r'PIFrames\.widget\(\s*"' + nom + r'"', s) or \
           re.search(r"CourseWidgets\." + nom + r"\b", s):
            return f, s
    return None, None


def litteraux(bloc):
    """
    Les littéraux de chaîne d'un bloc.

    Même piège que dans banc-redaction : un `explain` un peu long s'écrit en concaténation sur
    plusieurs lignes, et s'arrêter au premier morceau laisse passer la moitié du texte.
    """
    return " ".join(re.findall(r'"((?:[^"\\\n]|\\.)*)"', bloc))


def examiner(deck):
    src = open(deck, encoding="utf-8").read()
    if '<div class="slides">' not in src:
        return []
    debut = src.index('<div class="slides">')
    dossier = os.path.dirname(deck)
    trouvailles = []

    for m in re.finditer(r'data-widget="(\w+)"', src):
        nom = m.group(1)
        fichier, s = source_widget(dossier, nom)
        if not s:
            continue
        # Les simulations sont examinées elles aussi. Elles n'ont ni `explain` ni `hint`, donc
        # les champs ci-dessous n'y trouvent rien : c'est une assurance pour les modules à
        # venir, pas un gain immédiat. Mesuré avant de l'écrire : 0 correspondance, 0 faux
        # positif sur les trois simulations existantes.
        avant = suites(normaliser(texte_avant(src, debut, m.start(), nom)))

        for champ in ("explain", "explainAfterError", "hint"):
            motif = champ + r':\s*((?:"(?:[^"\\\n]|\\.)*"\s*\+?\s*)+)'
            for bloc in re.findall(motif, s):
                communes = suites(normaliser(litteraux(bloc))) & avant
                if communes:
                    trouvailles.append((nom, os.path.basename(fichier), champ,
                                        len(communes), sorted(communes)[0]))
    return trouvailles


def main():
    demandes = sys.argv[1:]
    decks = []
    for f in sorted(glob.glob(os.path.join(RACINE, "cours", "*", "index.html"))):
        module = f.replace(RACINE + os.sep, "").split(os.sep)[1]
        if not demandes or module in demandes:
            decks.append(f)

    # Même garde que dans banc-redaction : un module demandé qui ne correspond à rien est une
    # erreur, pas un succès. Un banc vert qui n'a rien examiné est pire que pas de banc.
    if demandes and not decks:
        modules = sorted({f.replace(RACINE + os.sep, "").split(os.sep)[1]
                          for f in glob.glob(os.path.join(RACINE, "cours", "*", "index.html"))})
        print(f"\n❌ banc-revelation : aucun deck pour « {' · '.join(demandes)} ».")
        print(f"   Modules disponibles : {' · '.join(modules)}\n")
        return 1

    total = 0
    for deck in decks:
        trouvailles = examiner(deck)
        court = deck.replace(RACINE + os.sep + "cours" + os.sep, "")
        if not trouvailles:
            continue
        total += len(trouvailles)
        print(f"\n  ✗ {court}")
        for nom, fichier, champ, n, exemple in trouvailles:
            print(f"      « {nom} » ({fichier}) — {champ} recopie {n} suite(s) de "
                  f"{LONGUEUR} mots d'une slide qui le précède")
            print(f"          …{' '.join(exemple)}…")

    print()
    if total == 0:
        print(f"✅ banc-revelation : aucune slide ne livre ce qu'une frame fait construire "
              f"({len(decks)} deck(s))\n")
        return 0
    print(f"❌ banc-revelation : {total} recouvrement(s).")
    print("   Une slide ne dit jamais ce que la frame suivante fait construire.")
    print("   La matière de référence vient APRÈS le dispositif qui la fait découvrir.\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
