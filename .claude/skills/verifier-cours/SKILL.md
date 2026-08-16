---
name: verifier-cours
description: Lancer les six bancs de vérification du cours Django IPSSI et lire leur sortie — banc-redaction, banc-revelation, banc-jeux, verifier.py, banc-fiche, banc-deck. Dit ce qui est sauté et pourquoi, comment interpréter un rouge, les pièges de mesure déjà rencontrés, et ce qui reste à l'œil. À utiliser après toute modification d'un deck, d'un widget, d'une fiche de TP ou du CSS.
---

# Vérifier

```bash
bash outils/verifier-tout.sh                  # tout le dépôt
bash outils/verifier-tout.sh J3-01-drf        # un seul module
```

Ce que chaque banc attrape et pourquoi il existe : `outils/README.md`. Ce skill porte ce que la
commande ne dit pas.

## Faire échouer d'abord

Sur du texte fraîchement écrit, `banc-redaction`, `banc-revelation` et `banc-jeux` **échouent** —
c'est normal, et c'est le moment de corriger. Un banc vert du premier coup sur un module neuf est
suspect : vérifier qu'il a bien examiné les fichiers (le compte est imprimé dans le verdict) avant
de se réjouir.

Même discipline pour un motif qu'on vient d'ajouter à un banc : il doit **signaler les occurrences
connues avant** qu'on les corrige. Voir `durcir-un-banc`.

## Lire la sortie

**Ce qui est sauté n'est pas ce qui est vert.** `verifier-tout.sh` saute proprement plutôt que
d'échouer, et le dit dans le verdict final :

| Banc | Sauté si | Pour l'activer |
|---|---|---|
| `banc-jeux` | `node` ou `jsdom` absent | `npm install -g jsdom` (le script gère `NODE_PATH`) |
| `verifier.py`, `banc-fiche` | Django 5.x absent | `cd tp-instrumentation && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` |
| `banc-deck` | `google-chrome` ou `websocket-client` absent | `pip install websocket-client` |

Django 3.2 est installé en système sur ce poste et il est en fin de vie : le TP est épinglé sur
5.2. Un `⊘ Django 5.x introuvable` signifie que **deux bancs n'ont rien vérifié**.

Un module nommé en argument saute les deux bancs Django : ils mesurent le TP, pas le deck. Les
repasser une fois en fin de chantier.

## Diagnostiquer un rouge

1. **Vérifier le chemin imprimé.** À plusieurs agents, une ligne rouge peut venir du module d'une
   autre voie. Ne pas « corriger » sans regarder.
2. **`banc-redaction`** cite la tournure et son contexte. Si c'est un faux positif, il se traite
   par **exemption explicite** dans le banc — jamais en tordant la formulation. Si la liste
   d'exemptions enfle, c'est le motif qu'il faut revoir.
3. **`banc-revelation`** dit quelle suite de six mots est recopiée. Deux issues seulement :
   déplacer la slide **après** le dispositif, ou réécrire. Une exemption ne se pose que si la
   slide **pose la question sans y répondre**.
4. **`banc-jeux` passe A** signale une erreur plausible sans message. C'est un vrai trou : écrire
   le `feedbackFor` qui manque, ne pas élargir `explain`.
5. **`banc-deck`** est le seul à calculer des styles. Un débordement de hauteur se corrige en
   réduisant ce qui est accessoire — un tableau, une colonne — jamais en supprimant le fait que
   la slide portait.

## Les deux pièges de la mesure de hauteur

Rencontrés tous les deux, documentés dans `outils/README.md`, et faciles à réintroduire :

- **La marge n'est pas à soustraire.** reveal l'absorbe dans l'échelle qu'il calcule : `dispo`
  est `Reveal.getConfig().height` nu. La soustraire fait apparaître un écart **constant de
  86 px** sur toute slide dimensionnée pour remplir la hauteur — les widgets — et le banc accuse
  alors des slides parfaitement lisibles.
- **Mesurer relativement à sa propre section**, jamais à `window` : en pleine transition la slide
  est encore translatée, et la comparaison donne des faux positifs. Prendre la section `.present`
  la plus profonde, et laisser retomber la transition.

## Ce qu'aucun banc ne couvre

`verifier-tout.sh` imprime la liste en fin d'exécution. Elle n'est pas décorative : **c'est
l'entrée de `relire`**, et elle demande de servir le deck.

```bash
python3 serve.py        # jamais python3 -m http.server — le cache rejoue d'anciens JS
```

Restent à l'œil, et à personne d'autre : le message de feedback colle-t-il vraiment à l'erreur
commise (jouer en se trompant volontairement) · la révélation **reformulée** · le sous-titre
d'intercalaire qui énonce la réponse · les calques employés au sens anglais · la lisibilité du
mode duel au fond de la salle · les slides denses dans les deux thèmes.

> **Pourquoi pas spaCy / NLTK.** La question a été tranchée par la mesure : la seule règle
> morphologique prometteuse donne **1 vrai positif pour 3 faux** sur le corpus réel. Le méta se
> définit par ce dont la phrase parle, pas par sa grammaire, et la désambiguïsation de sens n'est
> pas dans spaCy. Ne pas rouvrir sans refaire la mesure.
