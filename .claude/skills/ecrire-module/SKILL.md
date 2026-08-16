---
name: ecrire-module
description: Écrire ou étendre un module du cours Django IPSSI (deck reveal.js, frames de pédagogie programmée, simulations). Donne l'ordre des étapes — ouvrir sur le problème, choisir le dispositif, concevoir le visuel — dont les trois premières se font avant d'écrire une ligne de code. À utiliser pour créer un module (III DRF, IV autorisations, V authentification), ajouter une partie, écrire un jeu de frames ou une simulation, ou corriger une slide dans un deck existant.
---

# Écrire un module

Le contrat technique est ailleurs et fait autorité :

| Quoi | Où |
|---|---|
| la doctrine, et l'arbitrage en cas de doute | `CLAUDE.md` |
| le moteur `pi-frames`, les champs d'une frame, les clés de `feedbackFor` | `cours/README.md` |
| l'état d'avancement, la couverture du programme, la file d'attente | `README.md` |
| les règles des jeux | `design/jeux/00-contrat-de-design.md` |

Ce skill porte ce qui n'y est pas : **l'ordre**. Trois des six étapes se font avant d'écrire une
ligne, et c'est là qu'un module se gagne ou se perd.

---

## 1 · Le problème d'abord — §3 bis

> **Si on retirait ce chapitre, qu'est-ce qui casserait ?** La réponse est le sous-titre de
> l'intercalaire.

Une partie s'ouvre sur ce qui ne marche pas sans elle, jamais sur le mécanisme. Un chapitre qui
commence par « voici comment on écrit une route » fait apprendre une syntaxe avant la difficulté
qu'elle lève : l'apprenant retient une procédure, pas une raison, et ne saura pas quand s'en
servir.

Trois formes, **prendre la première qui suffit** :

| Forme | Quand | Coût |
|---|---|---|
| sous-titre + notes de l'intercalaire | le cas normal | nul |
| la première frame du dispositif | la partie ouvre sur un jeu | faible — et c'est la meilleure : le problème y est **construit** |
| une slide de motivation | un artefact réel la porte : du code qui tourne, un incident daté | à justifier |

Le sous-titre nomme **le problème**, pas la solution. C'est la faute qu'on commet sans s'en
apercevoir, et aucun banc ne la voit — c'est l'axe B de `relire`.

## 2 · Le dispositif ensuite — §2

Se tranche **avant** d'écrire. Trop lourd est aussi grave que trop léger : le budget consommé
ailleurs manque là où il aurait compté.

| L'opération demandée | Dispositif |
|---|---|
| se souvenir · classer sous règle · suivre une procédure | **frame** — dix fois moins cher qu'un jeu, et pédagogiquement supérieur ici |
| voir un mécanisme se dérouler **dans le temps** | **simulation** |
| composer · prédire · diagnostiquer · chercher un contre-exemple | **jeu** |
| exécuter une commande, montrer une interface | **démonstration en direct** |

Et le contrôle de recouvrement : une notion déjà traitée ailleurs doit **changer de régime**
(construire → mesurer → livrer). Vérifier dans la table de couverture de `README.md` ce que le TP
mesure déjà.

## 3 · Le visuel avant la mécanique — §4

Il doit être **l'objet lui-même**, jamais une analogie venue d'ailleurs. Si l'objet n'a aucune
forme visible, la question est *qu'est-ce qui change quand ça marche ?* — et c'est ça qu'on
dessine.

Vérifier aussi que le dessin **dit vrai** : une pile dessinée à l'envers a branché le lien
physique sur la couche Application, et l'erreur a vécu jusqu'à ce qu'un œil la voie.

Pour une simulation, les **quatre tests de §5 passent avant d'écrire**, pas après : état de
modèle · axe du temps · calculé et non énuméré · lisible sans texte. Un « non » à l'un des quatre
et ce n'est pas une simulation, c'est une slide avec des onglets.

Patron de référence : `cours/J1-01-architecture-restful/js/widgets/traversee-reseau.js` — modèle
séparé de l'affichage, phases animées, tout chiffre déduit du modèle. Contre-exemple à ne pas
reproduire : un sélecteur de cartes avec cinq textes rédigés d'avance.

## 4 · Les frames

Contrat, types et clés de `feedbackFor` : `cours/README.md`. Les deux règles non négociables :

- **un message par erreur prévue.** Un repli sur `explain` ou sur le message générique du moteur
  est un défaut, pas un filet. `banc-jeux` passe A le détecte — il a trouvé 16 trous dans cinq
  jeux pourtant relus à la main ;
- **la difficulté monte par retrait d'indice** (`cue` 3 → 0), jamais par complexification. Piège
  déjà rencontré : une frame à `cue: 0` dont la réponse était devinable depuis un mot de l'énoncé
  — le créneau le plus dur du jeu portait sa question la plus facile.

`duel` reste à `false` : le mode duel est un geste de l'enseignant pendant la séance, jamais un
réglage écrit dans une config (`banc-jeux` passe C).

## 5 · Le budget de slides — §3

**Au plus deux slides informatives par partie**, hors intercalaire de titre. Une slide informative
**motive** ou **cadre** ; elle n'énonce pas ce qui va être découvert.

Le développement va en **notes orateur** (`<aside class="notes">`) — c'est là, et là seulement,
que le méta est légitime : minutage, déroulé, objectifs, « faire prédire avant de lancer ». Pas
de slide « Objectifs de la journée ».

Un document historique n'est pas une décoration : il devient le `stage` d'une frame, ou il n'a
rien à faire là.

## 6 · Vérifier

`verifier-cours`, puis `relire`. Dans cet ordre : inutile de faire une passe de jugement sur un
texte que les bancs vont faire réécrire.

---

## Les pièges de montage, déjà payés

- **Ordre des scripts** : `theme.js` avant `init.js` ; le script d'un jeu **avant**
  `vendor/reveal/dist/reveal.js`.
- **Contrat du widget** : `window.CourseWidgets.<camelCase> = { init, destroy }`, slide
  `class="widget-slide" data-widget="<camelCase>"` avec un enfant `data-widget-mount`.
- **CSS** : réutiliser le socle `cours/css/simulations.css` (`sim-widget`, `-stage`, `-svg`,
  `-node`, `-packet`, `-edge`, `-controls`, `-readout`, `-log`, `-legend`). N'ajouter un préfixe
  propre que pour ce qui est **vraiment** spécifique.
- **Couleurs** : toujours par variable (`var(--accent)`, `var(--ok)`, `var(--danger)`). C'est ce
  qui rend une simulation correcte en clair comme en sombre sans travail supplémentaire.
- **Hauteur** : le canevas fait 720 px et une slide trop haute est **coupée sans rien signaler**.
  `banc-deck` le mesure ; ne pas attendre la salle pour le découvrir.
- **Servir** : `python3 serve.py`, jamais `python3 -m http.server` — le cache rejoue d'anciens JS.
- **Hors-ligne intégral** : aucune requête réseau depuis une page du cours.
- `cours/js/init.js` **diverge** de celui d'archi (la bascule de thème en a été extraite) : ne pas
  l'écraser.

## Refermer le chantier

Mettre à jour la **table de couverture** et la **file d'attente** de `README.md`. C'est le seul
endroit qui les tient ; une seconde copie diverge toujours.

⚠ Fichier **sérialisé** entre agents (voir `.claude/skills/README.md`) : à plusieurs voies, c'est
l'orchestrateur qui écrit `README.md` et `cours/index.html`, pas les voies.
