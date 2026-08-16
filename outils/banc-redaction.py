#!/usr/bin/env python3
"""
banc-redaction.py — le cours ne parle jamais de lui-même.

    python3 outils/banc-redaction.py            # tous les modules
    python3 outils/banc-redaction.py J2-03-…    # un seul

Signale toute remarque **méta** dans le texte vu par l'étudiant : durée annoncée, « vous
allez… », renvoi vers un autre dispositif, objectifs déclarés, « à retenir ». Un support
enseigne ; il ne se décrit pas, ne s'annonce pas et ne se commente pas.

Ce qui est examiné :
  · les slides des decks, **moins** les `<aside class="notes">` et les commentaires HTML ;
  · côté widgets, `prompt`, `hint`, `hintTitle`, `explain`, `explainAfterError`, `label`
    et toutes les valeurs de `feedbackFor`.

Ce qui ne l'est **jamais**, parce que le méta y est à sa place : les notes orateur (le script
de l'enseignant : minutage, déroulé), `cours/index.html` (le tableau de bord de la semaine),
`README.md`, `CLAUDE.md`, `design/`, `tp-instrumentation/`.
"""

import glob
import html
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Les familles de méta. Volontairement larges : les faux positifs se traitent par
# exemption explicite ci-dessous, ce qui laisse une trace relisible — un motif
# alambiqué pour éviter un cas particulier, lui, devient vite indéchiffrable.
# ---------------------------------------------------------------------------
MOTIFS = [
    ("durée annoncée",
     r"≈\s*\d+\s*(?:min|h)\b|\b\d+\s*(?:à|-)\s*\d+\s*min\b|\b\d+\s*min\b"),
    ("annonce de ce que l'étudiant va faire",
     r"\bvous (?:allez|verrez|découvrirez|apprendrez|mesurerez|compterez|ferez|serez|"
     r"y vérifierez|le (?:mesurerez|verrez|ferez|découvrirez))\b|\bvous venez de (?:voir|relier)\b"),
    ("renvoi à un autre dispositif",
     r"\bau TP\b|\bdu TP\b|\ble TP\b|\btemps \d|"
     r"\b(?:la|les|des|aux) parties? (?:suivante|précédente)s?\b|"
     r"\b(?:le|du|au|ce) module [IVX]+\b|\b(?:les|des|aux|ces) parties? [IVX]+\b|"
     r"\ble jeu suivant\b|\bla simulation\b|"
     r"\bci-dessous\b|\bplus loin\b|\bci-dessus\b|"
     # Un renvoi ne nomme pas toujours le dispositif visé : « elle sera reprise »,
     # « on y revient » et « tout le reste du cours » sont du méta sans le mot « partie ».
     # Le déterminant seul suffit à qualifier « cours » : « du cours » avait échappé aux
     # trois tournures énumérées d'abord.
     # ⚠ « ce cours » nu, sans déterminant composé : « Ce que ce cours enseigne » échappait.
     # NE PAS élargir à `\ble cours\b` seul ni à `\bau cours\b` — « au cours de » est une
     # locution courante et parfaitement française.
     r"\bce cours\b|\b(?:du|le reste du|la suite du) cours\b|"
     r"\ble cours (?:enseigne|travaille|couvre|traite|montre)\b|"
     r"\bsera repris\w*\b|\b(?:on|nous|vous) (?:y )?revien\w+\b"),
    # Un support qui numérote ses propres questions parle de lui-même. Le cas trouvé :
    # « La question 4 n'a pas de réponse unique » — un commentaire sur l'exercice, pas
    # sur la notion.
    ("le cours se cite lui-même",
     r"\bla question \d\b|\bl'exercice (?:précédent|suivant)\b|"
     # Une frame qui s'annonce comme « Dernière : » parle du jeu, pas de la notion.
     r"\b(?:premi[èe]re|derni[èe]re|deuxi[èe]me|troisi[èe]me)\s*[:—–]"),
    ("objectif déclaré",
     r"\bobjectifs?\s+(?:de la journée|pédagogiques?)\b|\bà l'issue\b|\bdoit être capable\b|"
     r"\bde la journée\b"),
    ("injonction pédagogique",
     r"\bà retenir\b|\bretenez\b|\bsouvenez-vous\b|\bgardez en tête\b|\bnotez-les\b|"
     r"\b(?:à )?garder sous la main\b"),
]

# ---------------------------------------------------------------------------
# Exemptions — chaînes exactes, chacune avec sa raison. Une exemption est une
# décision, pas un contournement : si la liste enfle, c'est le motif qu'il faut revoir.
# ---------------------------------------------------------------------------
EXEMPTIONS = [
    # « ce qui suit » décrit ici la syntaxe d'une URL, pas la suite du cours.
    "Tout ce qui suit est facultatif",
    "c'est ce qui suit l'hôte",
    "c'est tout ce qui suit le",
    "Tout ce qui suit le",
    # « retenir » au sens de « choisir », dans la consigne d'un exercice.
    "défendez celle que vous retenez",
    # Feedback adressé à la réponse de l'étudiant : c'est le travail de la frame,
    # pas une remarque sur le dispositif.
    "vous venez de déguiser",
]


# ---------------------------------------------------------------------------
# Lexique — termes proscrits parce qu'ils autorisent un raisonnement faux.
# Ce n'est pas une question de style : un mot mal choisi fait dire des choses
# incohérentes sans qu'on s'en aperçoive.
#
# Chaque entrée porte son motif **complet**, bornes comprises. C'était auparavant
# `\b<terme>s?\b` ajouté automatiquement — pratique jusqu'au jour où un terme n'est fautif
# que dans une tournure précise. « Reprise : » en tête d'énoncé est proscrit ; « sans
# reprise » (UDP) et « reprise automatique » sont le français technique juste. Un motif
# écrit en entier dit ce qu'il attrape, sans magie ajoutée derrière.
# ---------------------------------------------------------------------------
LEXIQUE = [
    # Calques de l'anglais. La liste est VOLONTAIREMENT courte : un balayage large a
    # produit 4 faux positifs sur 6 — « définitivement perdue », « pour vous prévenir »
    # et « éventuellement vide » sont du français correct. Le piège n'est pas le mot
    # anglais, c'est le mot français employé au sens anglais ; ça ne s'automatise qu'à la
    # marge. N'entrent ici que les locutions jamais correctes dans ce cours.
    (r"\bce qu.il faut emporter\b", "ce qu'il faut retenir",
     "calque de « takeaways » : en français on retient, on n'emporte pas"),
    (r"\blibrairies?\b", "bibliothèque", "calque de « library » — une librairie vend des livres"),
    (r"\bsupporter?s?\b", "prendre en charge", "calque de « support »"),
    (r"\bça fait sens\b", "c'est logique · cela se tient", "calque de « makes sense »"),
    (r"\bdigitals?\b", "numérique", "calque de « digital » — en français, digital tient au doigt"),
    (r"\bau final\b", "au bout du compte", "tour familier"),
    (r"\bprédisez\b", "posez directement la question",
     "une question appelle déjà une réponse construite : la consigne n'ajoute rien, et elle "
     "occupe une ligne d'énoncé. Quand « Prédisez. » tient lieu de question, c'est le signe "
     "que la question n'a pas été posée."),
    # Uniquement l'amorce d'énoncé — pas le mot, qui est juste ailleurs (« sans reprise »
    # pour UDP, « reprise automatique » pour un mécanisme de réémission).
    (r"\bReprises?\s*[:—–-]", "rien — le badge « 2ᵉ passage » le dit déjà",
     "« Reprise : » ouvrait cinq énoncés de 2ᵉ passage. Le terme a été abandonné parce qu'il "
     "n'est pas descriptif, et le moteur affiche déjà le badge : l'énoncé qui le redit vole "
     "une ligne à la question."),
    (r"\bétages?\b", "couche",
     "un mot, une chose : « couche » est le terme du modèle TCP/IP, et le cours l'emploie "
     "partout ailleurs. Deux mots pour un même objet obligent l'étudiant à vérifier qu'il "
     "s'agit bien du même — un coût inutile."),
    (r"\bce qu'on ach[èe]te\b", "en contrepartie",
     "l'image du marché vient de l'anglais (« what you buy », « you trade X for Y »). En "
     "français on énonce la contrepartie, on n'achète pas une propriété d'architecture."),
    (r"\boignons?\b", "l'aller et le retour · la chaîne",
     "métaphore importée (§4) : un middleware n'est pas COMME des pelures, c'est un appel de "
     "fonction imbriqué. Et le tour sonnait comme un calque de l'anglais, où « the middleware "
     "onion » est une expression toute faite. Nommer ce qu'on voit : la requête descend, la "
     "réponse remonte."),
    (r"\bbriques?\b", "invention · convention",
     "« brique » désigne une pièce qu'on démonte — d'où « on retire HTTP », qui ne veut "
     "rien dire pour une convention. URL, HTTP et HTML ne se retirent pas : ils peuvent "
     "ne pas exister encore."),
]


def exempte(contexte):
    return any(e.lower() in contexte.lower() for e in EXEMPTIONS)


# ---------------------------------------------------------------------------
def texte_slides(chemin):
    s = open(chemin, encoding="utf-8").read()
    if '<div class="slides">' not in s:
        return ""
    corps = s[s.index('<div class="slides">'):]
    corps = re.sub(r'<aside class="notes">.*?</aside>', " ", corps, flags=re.S)
    corps = re.sub(r"<!--.*?-->", " ", corps, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", corps))


def texte_widget(chemin):
    """
    Tous les littéraux de chaîne du fichier.

    ⚠ Ne PAS cibler les champs un par un (`prompt:\\s*"…"`). Un énoncé un peu long s'écrit
    en concaténation sur plusieurs lignes :

        prompt: "Le réseau relie les machines, mais rien ne permet encore de " +
          "désigner un document.<br>" +
          "Que peut faire un navigateur ?",

    …et une regex ancrée sur `prompt:` ne voit que le PREMIER morceau. C'est exactement ce
    qui a laissé passer « Prédisez » : le mot était sur la troisième ligne. On ratisse donc
    tous les littéraux. Le bruit (noms de classes, identifiants) ne déclenche aucun motif,
    qui sont tous des tournures françaises.
    """
    s = open(chemin, encoding="utf-8").read()
    if "PIFrames.widget" not in s:
        return ""                      # une simulation : pas de texte de frame
    morceaux = re.findall(r'"((?:[^"\\\n]|\\.)*)"', s)
    return html.unescape(re.sub(r"<[^>]+>", " ", " ¶ ".join(morceaux)))


def contexte(texte, m, marge=52):
    a, b = max(0, m.start() - marge), min(len(texte), m.end() + marge)
    return re.sub(r"\s+", " ", texte[a:b]).strip()


def examiner(chemin):
    texte = texte_slides(chemin) if chemin.endswith(".html") else texte_widget(chemin)
    trouvailles = []
    vus = set()

    for terme, remplacement, raison in LEXIQUE:
        for m in re.finditer(terme, texte, re.I):
            ctx = contexte(texte, m)
            if exempte(ctx):
                continue
            cle = ("lexique:" + terme, ctx)
            if cle in vus:
                continue
            vus.add(cle)
            trouvailles.append((f"terme proscrit → {remplacement}", m.group(0), ctx, raison))

    for nom, motif in MOTIFS:
        for m in re.finditer(motif, texte, re.I):
            ctx = contexte(texte, m)
            if exempte(ctx):
                continue
            cle = (nom, ctx)
            if cle in vus:          # le même passage peut apparaître deux fois (retry)
                continue
            vus.add(cle)
            trouvailles.append((nom, m.group(0).strip(), ctx, None))
    return trouvailles


def main():
    demandes = sys.argv[1:]
    fichiers = []
    for motif in ("cours/*/index.html", "cours/*/js/widgets/*.js"):
        for f in sorted(glob.glob(os.path.join(RACINE, motif))):
            module = f.replace(RACINE + os.sep, "").split(os.sep)[1]
            if not demandes or module in demandes:
                fichiers.append(f)

    # Un module demandé qui ne correspond à rien ne doit PAS rendre vert : à plusieurs voies
    # de travail, une faute de frappe dans le nom donnerait un banc qui n'a rien examiné et
    # qui s'en félicite. Le compte de fichiers seul ne suffit pas — personne ne le lit.
    if demandes and not fichiers:
        modules = sorted({f.replace(RACINE + os.sep, "").split(os.sep)[1]
                          for f in glob.glob(os.path.join(RACINE, "cours", "*", "index.html"))})
        print(f"\n❌ banc-redaction : aucun fichier pour « {' · '.join(demandes)} ».")
        print(f"   Modules disponibles : {' · '.join(modules)}\n")
        return 1

    total = 0
    for f in fichiers:
        trouvailles = examiner(f)
        court = f.replace(RACINE + os.sep + "cours" + os.sep, "")
        if not trouvailles:
            continue
        total += len(trouvailles)
        print(f"\n  ✗ {court} — {len(trouvailles)} remarque(s) méta")
        raisons_dites = set()
        for nom, extrait, ctx, raison in trouvailles:
            print(f"      [{nom}] « {extrait} »")
            print(f"          …{ctx}…")
            if raison and raison not in raisons_dites:
                raisons_dites.add(raison)
                print(f"          → {raison}")

    print()
    if total == 0:
        print(f"✅ banc-redaction : aucun méta dans le texte vu par l'étudiant "
              f"({len(fichiers)} fichiers)\n")
        return 0
    print(f"❌ banc-redaction : {total} remarque(s) méta à retirer.")
    print("   Le cours énonce le fait, pose la question, corrige l'erreur — rien d'autre.")
    print("   Le méta a deux lieux : les notes orateur, et les documents de pilotage.\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
