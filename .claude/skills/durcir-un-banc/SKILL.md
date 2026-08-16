---
name: durcir-un-banc
description: Inscrire en motif de banc un défaut du cours Django IPSSI trouvé à l'œil — méta, calque, terme proscrit, feedback manquant, divergence de présentation. Porte le protocole de mesure obligatoire (compter les faux positifs avant d'adopter), le choix du réceptacle (MOTIFS, LEXIQUE, EXEMPTIONS, DIVERGENCES_ADMISES) et l'obligation d'écrire la raison. À utiliser dès qu'une relecture trouve un défaut qu'un banc aurait pu voir.
---

# Durcir un banc

> **Chaque défaut trouvé à l'œil repart en motif.** Sinon le banc entérine l'existant au lieu de
> le contrôler.

C'est le maillon qu'on saute quand on est pressé, et c'est celui qui fait la différence entre une
suite de bancs qui progresse et une suite qui stagne. Trois familles de méta et quatre calques y
sont entrés après coup — jamais l'inverse.

## Le défaut a-t-il une forme repérable ?

**Le test d'entrée.** Une tournure, un mot, une suite de mots : oui → ce skill. Une question de
sens → non, et c'est à noter comme tel.

Quatre défauts relèvent du jugement et n'entreront jamais dans un banc — inutile d'essayer : la
**révélation reformulée**, le **sous-titre qui énonce la réponse**, le **commentaire sur la
difficulté d'une question**, le **calque employé au sens anglais**. Ils restent à `relire`.

## Le protocole de mesure

Non négociable, et c'est là que tout se joue. Un banc qui crie à tort finit par ne plus être lu.

1. **Écrire le motif, le lancer AVANT toute correction.** Il doit signaler exactement les
   occurrences connues. S'il en rate une, il est trop étroit ; s'il en trouve d'autres, les lire
   une par une avant de conclure.
2. **Compter les faux positifs sur tout le corpus** — pas seulement sur le module en cours.
   ```bash
   python3 outils/banc-redaction.py | grep -c '\['     # le compte total
   ```
   Mauvais rapport → **on n'adopte pas**. Deux refus déjà prononcés, à ne pas rejouer :
   le balayage large des anglicismes (**4 faux positifs sur 6** : « définitivement perdue »,
   « pour vous prévenir », « éventuellement vide » sont du français correct) et la règle
   morphologique spaCy « vous sujet + futur » (**3 faux pour 1 vrai**).
3. **Corriger les occurrences**, puis revérifier que le banc repasse au vert.
4. **Écrire la raison dans le code**, et l'élargissement refusé s'il y en a un.
5. **Reporter le cas dans `outils/README.md`** — c'est là que se lit l'histoire des bancs.

Le seuil se choisit aussi par la mesure : celui de `banc-revelation` — six mots consécutifs —
vient d'une comparaison (sac de mots : 25 signalements pour 2 réels ; six mots : 4 pour 3).

## Choisir le réceptacle

| Le défaut est… | Où | Forme |
|---|---|---|
| une **tournure méta** (annonce, renvoi, objectif, injonction) | `banc-redaction.py` → `MOTIFS` | famille nommée + regex, volontairement large |
| un **terme proscrit** parce qu'il autorise un raisonnement faux | `banc-redaction.py` → `LEXIQUE` | `(motif, remplacement, raison)` |
| un **faux positif** du banc | `banc-redaction.py` → `EXEMPTIONS` | chaîne exacte + raison en commentaire |
| une **slide qui pose la question sans y répondre** | `banc-revelation.py` → `EXEMPTIONS` | `(widget, marqueur, raison)` |
| une **erreur plausible sans message** | pas un motif : écrire le `feedbackFor` manquant |
| une **divergence de présentation assumée** entre jeux | `banc-jeux.js` → `DIVERGENCES_ADMISES` | `[jeu, clé, raison]` — la liste vide est l'état normal |
| un **défaut de rendu** (débordement, montage, thème) | `banc-deck.py` | une assertion de plus dans la passe concernée |

### Deux règles de forme

**Un motif du `LEXIQUE` s'écrit en entier, bornes comprises.** Le banc ajoutait autrefois
`\b…s?\b` automatiquement — pratique jusqu'au jour où un terme n'est fautif que dans une tournure
précise. « Reprise : » en tête d'énoncé est proscrit ; « sans reprise » (UDP) et « reprise
automatique » sont le français technique juste. Un motif écrit en entier dit ce qu'il attrape,
sans magie ajoutée derrière.

**Une exemption est une décision, pas un contournement.** Elle porte sa raison. Si la liste
enfle, c'est le motif qu'il faut revoir, pas l'exemption qu'il faut ajouter. Côté
`banc-revelation`, l'exemption n'a **qu'une seule forme admissible** : la slide pose la question,
la frame délivre la réponse. Toute autre raison signifie qu'il faut **déplacer** la slide.

## Écrire la raison, et le refus

Le commentaire dans le code n'est pas de la politesse : c'est ce qui empêche la récidive par
quelqu'un qui « améliore » le motif six mois plus tard. Le cas qui l'a prouvé, dans
`banc-redaction.py` :

```python
# ⚠ « ce cours » nu, sans déterminant composé : « Ce que ce cours enseigne » échappait.
# NE PAS élargir à `\ble cours\b` seul ni à `\bau cours\b` — « au cours de » est une
# locution courante et parfaitement française.
```

Sans ces deux lignes, l'élargissement « évident » se referait, et le banc crierait sur du français
irréprochable.

## Les limites connues, à ne pas redécouvrir

- **Extraire tous les littéraux de chaîne**, jamais les champs un par un. Un énoncé un peu long
  s'écrit en concaténation sur plusieurs lignes, et une regex ancrée sur `prompt:` n'en voit que
  le premier morceau — c'est ce qui a laissé passer « Prédisez » pendant toute une passe.
- **Les textes émis par le moteur** (`cours/js/pi-frames.js` : badge, notes, bilan) sont hors de
  portée de `banc-redaction`, parce qu'ils sont mêlés à la logique. Ce sont eux qui ont laissé
  passer « reprise » et « item ». À relire à la main.
- **`banc-revelation` ne voit que la copie**, jamais la paraphrase. C'est structurel, pas un
  manque à combler.

## À plusieurs agents

`outils/` est **sérialisé** : deux `durcir-un-banc` concurrents se marchent dessus, et le protocole
de mesure exige de toute façon un corpus stable pour compter les faux positifs. Un seul agent à la
fois dans les bancs, et les autres voies attendent le vert.
