---
name: relire
description: Passe de relecture humaine d'un module du cours Django IPSSI — les sept défauts qu'aucun banc ne peut voir : révélation reformulée, sous-titre qui énonce la réponse, image importée de l'anglais, méta non repérable, deux mots pour une même chose, slide dense ou sans référent, dispositif mal choisi. À utiliser après `verifier-cours`, quand on relit un deck ou un widget, ou quand une remarque de relecture arrive sur une slide, une frame ou une simulation. Lecture seule.
allowed-tools: Read, Grep, Glob, Bash
---

# Relire

`verifier-tout.sh` imprime en fin d'exécution la liste de ce qu'il ne couvre pas. Cette liste
n'est pas décorative : c'est l'entrée de ce skill. **Les bancs attrapent la copie ; ils
n'attrapent jamais la reformulation, ni le jugement.**

## Portée

Un module (`cours/J*-*/`) : son `index.html` et ses `js/widgets/*.js`. Ne rien lire d'autre — les
notes orateur, `README.md`, `CLAUDE.md` et `design/` sont hors périmètre par construction, le
méta y est à sa place.

**Cette passe ne modifie rien.** Elle produit une liste ; la correction est un geste séparé, qui
relève de `ecrire-module`.

## Procédure

1. Lancer d'abord `python3 outils/banc-redaction.py <module>` et
   `python3 outils/banc-revelation.py <module>`. Ce qu'ils signalent est déjà traité : ne pas le
   redire. Cette passe ne s'intéresse qu'à ce qui leur échappe.
2. Lire `references/axes.md` et parcourir le module **un axe à la fois**. Mélanger les axes fait
   qu'on les fait tous à moitié.
3. Pour chaque signalement, produire une ligne au format ci-dessous.
4. Boucler (voir plus bas).

## Format de sortie

Une ligne par signalement, rien d'autre — pas de préambule, pas de récapitulatif. C'est ce qui
permet à un appelant de fusionner plusieurs passes sans rouvrir les fichiers.

```
<fichier>:<ligne> · axe <A-G> · « <citation exacte> » · <diagnostic en une phrase> · §<n>
```

Exemples réels :

```
J1-01-architecture-restful/index.html:412 · axe F · « Le style a été élaboré pendant la normalisation de HTTP/1.1 » · « le style » n'a pas d'antécédent : la slide ne dit jamais que REST est un style d'architecture · §3
J1-02-architecture-django/index.html:88 · axe B · « Une liste, lue dans l'ordre, jusqu'au premier qui répond » · le sous-titre énonce ce que la simulation fait précisément découvrir · §3 bis
```

Si un axe ne signale rien, l'écrire en une ligne (`axe C — rien`). Un axe silencieux et un axe
non parcouru ne se distinguent pas autrement.

## Boucler

> **Tout défaut trouvé ici qu'un banc aurait pu voir ouvre un `durcir-un-banc`.**

Le test : le défaut a-t-il une forme repérable — une tournure, un mot, une suite de mots ? Si
oui, il ne doit plus jamais être trouvé à l'œil. Si non — c'est le cas des axes A, B, F et G,
qui relèvent du sens et non de la forme — le noter comme tel et passer.

Sans ce maillon, le banc entérine l'existant au lieu de le contrôler.

## À plusieurs agents

Les sept axes sont **indépendants et en lecture seule**. Deux découpes possibles :

- **un agent par axe**, sur un module — la plus efficace : chaque agent garde une seule question
  en tête, ce qui est précisément ce que la passe demande ;
- **un agent par module**, sur tous les axes — pour une relecture large de fin de chantier.

Ne pas mélanger les deux dans une même volée : les doublons deviennent impossibles à dédupliquer.

Le prompt d'un agent d'axe tient en trois lignes : le chemin du module, la lettre de l'axe, et
« lis `.claude/skills/relire/references/axes.md`, applique l'axe <X>, réponds au format ». Il n'a
besoin de rien d'autre — c'est le test de qualité du fichier de référence.
