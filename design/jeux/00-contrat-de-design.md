# 00 — Contrat de design des jeux sérieux

Ce document fixe le vocabulaire et les règles communes aux jeux `A`, `C`, `D`, `E` et au
simulateur `F′`. Il est la référence en cas de désaccord pendant l'implémentation : un niveau
qui contredit ce contrat est réécrit, pas négocié.

---

## 1. Le principe : isomorphisme, pas décoration

Un jeu sérieux n'est légitime que si **la mécanique centrale est isomorphe à l'opération
mentale** que la notion exige. La référence est *Robot Odyssey* : câbler une porte logique **est**
concevoir un circuit. Le jeu n'est pas une métaphore du domaine, il en est une instance
exécutable.

Le travers à éviter porte un nom : *chocolate-covered broccoli* — un exercice inchangé sous un
habillage. Ses deux formes ici :

- **Le QCM re-thématisé.** On remplace « choisissez la bonne réponse » par « cliquez le bon
  tampon ». L'opération mentale reste la classification ; seule la peinture a changé.
- **La récompense extrinsèque.** Étoiles, confettis, XP, barres qui se remplissent. Elles
  récompensent le fait d'avoir fini, pas le fait d'avoir compris, et elles déplacent l'attention
  de la tâche vers le score.

### Les cinq tests de falsification

À appliquer **à chaque niveau**, pas au jeu dans son ensemble. Un niveau qui échoue à l'un des
cinq ne part pas en implémentation.

| # | Test | Ce qu'un échec signifie |
|---|---|---|
| 1 | En retirant tout l'habillage et en décrivant le niveau en texte brut, **reste-t-il un problème** ? | L'habillage portait le jeu. Le niveau est vide. |
| 2 | L'action du joueur est-elle **la même opération mentale** que l'opération métier ? | On a construit une métaphore, pas une instance. |
| 3 | L'échec est-il une **divergence de comportement à diagnostiquer** ? | Si l'échec est un « faux » annoncé, c'est un QCM déguisé. |
| 4 | Ce qui est affiché comme coût est-il **un coût que le métier compte vraiment** ? | Un score inventé est une récompense cosmétique. |
| 5 | Le niveau a-t-il **au moins deux solutions plausibles**, dont une mauvaise et instructive ? | Solution unique = assemblage par numéros. |

Le test 5 est le plus souvent raté à l'écriture. Il impose que chaque niveau déclare
explicitement, dans son design, **la ou les solutions fautives plausibles** — celles qu'un
étudiant de 4ᵉ année produirait réellement — et le message qui leur répond.

### Ce qui tient lieu de score

Uniquement des **coûts que le domaine compte déjà** :

| Jeu | Coût du domaine |
|---|---|
| A — L'atelier | requêtes SQL émises · lignes de données perdues par les migrations |
| C — Le banc d'essai | payloads mal traités · contraintes excédentaires |
| D — Le casse | trous restants après audit · attaques de régression réouvertes |
| E — La console | requêtes émises · divergences d'état après rejeu réseau |

Pas de points. Pas d'étoiles. Pas de son de victoire. Le retour d'information est le
comportement du système lui-même.

---

## 2. Ce qui ne mérite pas de jeu — et pourquoi

Décision assumée, à ne pas revisiter sans argument nouveau. Sur ces notions, la frame de
pédagogie programmée est **pédagogiquement supérieure** et coûte dix fois moins cher.

| Notion (fiche IPSSI) | Opération réellement demandée | Reste en |
|---|---|---|
| I.A Web mondial | se souvenir d'un récit en trois briques | récit + frames (`web-invention.js`) |
| I.B Anatomie d'URL | segmenter une chaîne et étiqueter | frames, type `slots` (`url-anatomy.js`) |
| I.C Suite de protocoles | emboîter / dépiler — une intuition unique | frames + une manipulation (`tcpip-stack.js`) |
| I.E Codes d'état | classer sous règle | drill (`status-triage.js`) |
| II.D Administrateur | suivre une procédure | démonstration en direct |
| II.G Page Web / gabarits | hors sujet pour un cours d'API | démonstration |
| III.A Configuration initiale | procédure | démonstration |
| III.H django-cors-headers | une intuition : *c'est le navigateur qui bloque, pas Django* | frame + démonstration |
| III.C Correspondance ViewSet/routeur | lire une table de correspondance | frames (déjà en fin de `http-verbs.js`) |
| IV.A Créer un utilisateur | procédure | démonstration |

**Règle générale** : une notion dont l'opération est *se souvenir*, *classer* ou *suivre une
procédure* relève de la frame. Une notion dont l'opération est *composer*, *prédire*,
*diagnostiquer*, *spécifier* ou *chercher un contre-exemple* peut mériter un jeu. Et une notion
dont l'opération est *voir un mécanisme se dérouler dans le temps* relève de la **simulation**,
traitée au §2 bis.

---

## 2 bis. Les simulations

Une **simulation** n'est pas un jeu : elle ne pose pas de contrat, ne compte rien, ne corrige
personne. C'est une **animation interactive qui montre un mécanisme** — on règle un paramètre,
on regarde la conséquence se produire. Elle sert là où la frame ne peut rien : une propagation,
un empilement, une panne qui se rattrape.

### Le mode d'échec, constaté

Sur le cours d'architecture, plusieurs « simulations » n'étaient que **des sous-slides rangées
dans un menu** : cliquer sélectionnait quel texte pré-écrit afficher. Il a fallu les recadrer —
et la version recadrée fait bouger des paquets entre les nœuds d'un réseau.

| | `J4-09-bases-de-donnees/js/widgets/db-type-selector.js` | `J2-04-architecture-n-tiers/js/widgets/flow-ntiers.js` |
|---|---|---|
| Ce qu'en dit sa docstring | « galerie visuelle : cliquer une carte l'illustre en grand » | « paquet en mouvement », « une seule boucle rAF » |
| `requestAnimationFrame` | **0** | 2 |
| Ce que fait le clic | choisit **quel texte pré-écrit** afficher | change un **paramètre du modèle** |
| Verdict | menu déguisé | simulation |

> **Une simulation calcule ; un menu sélectionne.**

Dans `flow-ntiers`, la trajectoire est interpolée le long d'une topologie —
`packet.setAttribute("cx", a.x + (b.x - a.x) * t)`. Personne n'a écrit « et là il arrive au
répartiteur de charge » : ça se déduit du modèle. Dans `db-type-selector`, cinq cartes donnent
cinq textes rédigés d'avance.

### Les quatre tests de falsification

À appliquer **à chaque simulation, avant de l'écrire**. Un « non » à l'un des quatre : ce n'est
pas une simulation, c'est une slide avec des onglets — et il faut soit la transformer, soit
assumer d'en faire une slide.

| # | Test | Ce qu'un échec signifie |
|---|---|---|
| 1 | Existe-t-il un **état de modèle** qui évolue, distinct de ce qui est affiché (une file, une position, un compteur) ? | Il n'y a rien à simuler : c'est un affichage. |
| 2 | Y a-t-il un **axe du temps** — quelque chose met du temps, et on le voit se produire ? | On montre un résultat, pas un mécanisme. |
| 3 | Le résultat est-il **calculé** ? Si l'auteur a pu écrire tous les cas à la main, c'est un menu. | Le modèle est faux ou absent ; l'étudiant ne peut pas sortir du chemin prévu. |
| 4 | En retirant **tous les libellés**, reste-t-il quelque chose de lisible qui bouge ? | La compréhension passe par le texte : autant écrire une slide. |

Le test 3 est le plus discriminant, et c'est celui que `outils/banc-deck.py` pourra automatiser :
un modèle dont l'état ne change pas entre deux pas de temps ne le passe pas.

### La représentation se conçoit avant la mécanique

Et elle doit être **l'objet lui-même**, pas une image de l'objet. C'est le §1 appliqué au visuel :
le plateau d'`url-anatomy` *est* l'URL, l'emballage de `tcpip-stack` *est* l'encapsulation.
Une analogie venue d'ailleurs — « la requête est un colis qui traverse une usine » — est un
signal d'alarme : il faudra la tordre au troisième niveau. Quand l'objet n'a aucune forme
visible, la bonne question n'est pas *à quoi ça ressemble* mais **qu'est-ce qui change quand ça
marche** — et c'est ça qu'on dessine.

### Forme

Widget standard (`window.CourseWidgets.<nom> = {init, destroy}`), monté dans une slide du deck —
le contrat est identique entre `archi/` et `django/`, une simulation d'archi s'y monte sans
modification. Patron à copier : `flow-ntiers.js`.

Côté style, `cours/css/simulations.css` déclare **une seule fois** les rôles partagés
(`sim-widget / -stage / -svg / -node / -packet / -edge / -controls / -readout / -log /
-legend`). Une simulation les réutilise et n'ajoute un préfixe propre que pour ce qui lui est
spécifique — contrairement à `widgets.css`, hérité d'archi, où chaque widget redéclare les mêmes
cinquante règles sous son propre préfixe.

---

## 3. La pédagogie programmée hors des frames

Les six règles de `pi-frames.js` restent en vigueur. Trois d'entre elles demandent une
traduction pour survivre en bac à sable.

### 3.1 Un message par erreur prévue → l'audit à règles ordonnées

En frame, c'est `feedbackFor[clé]`. En construction libre, il n'y a plus de clé : le joueur a
produit un *monde*, pas une réponse. On le remplace par une liste ordonnée de règles de
diagnostic, évaluées dans l'ordre, **la première qui matche gagne** :

```js
{
  id: "route-str-avant-int",
  quand: function (monde) { /* … inspecte le monde construit … */ return true; },
  message: "Votre route <code>&lt;str:pk&gt;</code> est déclarée avant <code>&lt;int:pk&gt;</code> : " +
           "Django s'arrête au premier motif qui correspond, et « 12 » est aussi une chaîne. " +
           "La seconde route ne sera jamais atteinte.",
  montre: ["urls.py:2"],          // ce que l'interface met en évidence
}
```

Contraintes d'écriture :

- **Ordre = spécificité décroissante.** Les règles précises d'abord, les génériques ensuite.
- **Une règle générique de fin de liste est un aveu d'échec**, pas un filet. Si elle se
  déclenche en test, c'est qu'il manque une règle spécifique : on l'écrit.
- Chaque règle nomme **la pièce fautive** (`montre`), pour que l'interface la surligne. Un
  message qui ne désigne rien laisse l'étudiant chercher.
- Le message dit **pourquoi**, pas seulement **quoi**. « Ce n'est pas la bonne route » est
  interdit ; « Django s'arrête au premier motif qui correspond » est le minimum.

### 3.2 Estompage → retrait de gabarit, jamais complexification

Trois axes de fading, utilisés dans cet ordre :

1. **Le montage.** Niveau 1 : tout est pré-câblé sauf une pièce. Niveau *n* : plateau vide.
2. **La palette.** D'abord les blocs portent un libellé explicatif (« `read_only` — le client ne
   peut pas écrire ce champ »), puis seulement leur nom réel.
3. **Le contre-exemple.** D'abord les cas de test sont visibles avant validation ; ensuite on
   construit à l'aveugle et on ne les découvre qu'au verdict.

Ce qui est **interdit** : monter la difficulté en ajoutant des pièces sans rapport, en réduisant
le temps, ou en empilant des règles métier arbitraires.

### 3.3 On ne laisse personne s'enliser

Le taux de réussite visé reste ~90 %. Sur un contrat non satisfait :

| Échec | Réponse du jeu |
|---|---|
| 1ᵉʳ | l'audit donne son message spécifique |
| 2ᵉ | l'audit **désigne la pièce** fautive et la surligne |
| 3ᵉ | le jeu **montre une solution de référence**, la commente, et propose de rejouer le niveau |

Pas de vies, pas de game over, pas de niveau verrouillé derrière un score.

### 3.4 Réinjection

L'équivalent de la réinjection à +3 frames existe sous deux formes :

- **A, C** : un contrat résolu au 2ᵉ essai réapparaît en clause supplémentaire d'un niveau
  ultérieur (ex. le N+1 du niveau 4 redevient contrat au niveau 7, sans être annoncé).
- **D** : c'est structurel — la **suite de non-régression** rejoue toutes les attaques
  précédentes à chaque niveau.

---

## 4. Structure commune d'un jeu

Le sandwich, en trois temps :

```
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. TUTORIEL          frames PI classiques (pi-frames.js),    │
  │                      dont le `stage` EST le plateau du jeu   │
  ├──────────────────────────────────────────────────────────────┤
  │ 2. NIVEAUX           contrats à satisfaire sur le même monde, │
  │                      fading croissant, audit à chaque essai   │
  ├──────────────────────────────────────────────────────────────┤
  │ 3. BAC À SABLE       construction libre, audit à la demande,  │
  │                      coût du domaine affiché en continu       │
  └──────────────────────────────────────────────────────────────┘
```

Le temps 1 ne réécrit rien : `PIFrames.create()` accepte déjà un `stage` par frame et un objet
`shared` persistant entre frames (voir `apiStage` dans `J1-01-architecture-restful/js/widgets/
http-verbs.js`). Le plateau du jeu est fourni comme `stage`, et `shared` porte le monde
`django-lite`. Le passage du temps 1 au temps 2 conserve le monde.

### Format de page

Page autonome sous `cours/jeux/<slug>/index.html`, hors reveal.js, mais sur le **même socle
visuel** : `css/theme-ipssi.css` (variables `--fg`, `--accent`, bascule `data-theme`),
`css/pi-frames.css`, plus `css/jeux-autonomes.css`. La bascule clair/sombre et la clé
`localStorage "course-theme"` sont reprises de `js/init.js` — extraire la fonction plutôt que la
dupliquer.

Chaque jeu est lié depuis sa slide par un lien explicite (`target="_blank"`), avec le temps
estimé et la notion couverte.

### Public et ergonomie

Solo, sur portable. Souris fine admise, densité d'information admise. Reste obligatoire :

- Le glisser-déposer est **toujours doublé** d'un clic-clic (sélectionner puis poser), comme le
  fait déjà `renderers.slots` dans `pi-frames.js`.
- `Entrée` valide, `Échap` annule la sélection en cours.
- Aucun élément de jeu ne dépend de la couleur seule.

---

## 5. Fidélité du code

**Le Python affiché doit tourner tel quel dans un vrai projet Django.** Conséquences :

1. Le code est **engendré par la structure exécutée** (`Codegen` dans `django-lite.js`), jamais
   écrit à côté. Une structure, deux sorties : le comportement et le texte. Sans cela, les deux
   divergent au troisième correctif.
2. Le moteur ne modélise **que des choses qui existent réellement** dans Django/DRF. Pas de
   raccourci inventé, même pédagogiquement commode.
3. Imports corrects, noms de classes réels, indentation valide, `from rest_framework import
   serializers` en tête. Le fichier engendré est un fichier, pas un extrait.
4. Chaque jeu propose un bouton **« copier pour le TP »**.

Ce qui n'est pas modélisé est déclaré comme tel dans `01-django-lite.md`, sous la forme d'une
limite explicite, jamais d'une approximation silencieuse.

---

## 6. Vérification

Trois automatismes et une passe manuelle. Le banc **existe maintenant** : `outils/`, lancé par
`bash outils/verifier-tout.sh`. Les jeux A/C/D/E y ajoutent leurs propres passes.

### L'oracle de fidélité

Toute affirmation sur le comportement de Django ou de DRF se tranche à un seul endroit :
**`tp-instrumentation/verifier.py`**, qui mesure 22 comportements sur un vrai Django 5.2 (via
`amorce.py`, un Django complet sans projet). C'est le « fichier validé une fois dans un vrai
projet Django » que le point 2 ci-dessous réclamait.

> **Règle** : tout comportement modélisé par `django-lite` a soit son étape correspondante dans
> `verifier.py`, soit une limite déclarée dans `01-django-lite.md` §9. Rien entre les deux — une
> approximation silencieuse est le seul défaut que ce contrat ne pardonne pas, parce qu'elle
> transforme le jeu en source d'erreurs durables.

Quand la mesure contredit la spec, **c'est la spec qui change**. Cas déjà réglé de cette
façon : le `PUT` partiel (voir `E-console-rest.md` niveau 2 et `01-django-lite.md` §4).

### Les quatre contrôles

1. **Atteignabilité des diagnostics.** Pour chaque niveau, le banc joue chaque solution fautive
   déclarée et vérifie qu'elle déclenche **la règle attendue**, pas une autre, et jamais la
   règle générique. Une règle jamais atteinte est du code mort — ou un message manquant.
   *C'est déjà en place pour les frames* : `outils/banc-jeux.js` passe A reproduit les règles de
   résolution de `feedbackFor` et refuse tout repli sur `explain`. Elle a trouvé 16 trous dans
   les cinq jeux du Jour 1 pourtant relus à la main.
2. **Copiabilité.** Le Python engendré par chaque solution de référence est comparé à un fichier
   attendu, rejoué contre l'oracle ci-dessus.
3. **Anti-décoration.** Le banc refuse tout niveau qui déclare moins de deux solutions plausibles
   (test 5 automatisé).
4. **Manuel**, après chaque modification — aucun banc ne couvre le rendu (jsdom ne calcule pas de
   style) :
   ```bash
   cd /home/kodoque/Documents/ipssi/django
   python3 serve.py          # jamais python3 -m http.server : le cache rejoue d'anciens JS
   ```
   puis `http://localhost:8000/cours/jeux/<slug>/`. Jouer chaque niveau **en se trompant
   volontairement**, vérifier que le message correspond à l'erreur commise ; basculer
   clair/sombre ; console navigateur vierge.

---

## 7. Index

| Doc | Contenu |
|---|---|
| `01-django-lite.md` | le noyau partagé : Router, ORM, Migrations, Serializer, Permissions, Codegen |
| `A-atelier-requete.md` | jeu A — cycle requête/réponse Django + migrations (module II) |
| `C-banc-essai.md` | jeu C — sérialiseurs et validation (module III) |
| `D-le-casse.md` | jeu D — autorisations (module IV) |
| `E-console-rest.md` | jeu E — verbes et idempotence (refonte partielle du J1) |
| `F-simulateur-auth.md` | simulateur F′ — authentification (module V), délibérément pas un jeu |
