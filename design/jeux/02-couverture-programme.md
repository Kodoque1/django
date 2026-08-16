# 02 — Couverture du programme

Mise en regard des cinq dispositifs (`A`, `C`, `D`, `E`, `F′`) avec les **32 entrées du
PROGRAMME** de la fiche de cours IPSSI *« APIs Python / Django RESTful Web Services »*, et avec
le DÉROULÉ jour par jour.

**Légende**

| | |
|---|---|
| ● | **cœur d'un jeu** — la notion est ce que le jeu fait travailler |
| ◐ | **traversée par un jeu** — manipulée, mais ce n'est pas l'objet du niveau |
| ○ | **frames PI** — le dispositif correct pour cette opération (cf. `00-contrat-de-design.md` §2) |
| ▢ | **démonstration / cours** — procédure, rien à construire |
| ✕ | **hors périmètre** des dispositifs interactifs |

---

## 1. Matrice de couverture

### I. Architecture RESTful — *déjà implémenté, refonte partielle*

| Entrée fiche | Couverture | Dispositif | Mesuré au TP |
|---|---|---|---|
| A. Web mondial | ○ | `web-invention.js` — récit en trois briques, inchangé | — |
| B. URL | ○ | `url-anatomy.js` — étiquetage, type `slots`, inchangé | **temps 1** (1.1→1.7) : `resolve`, fragment, `%20`/`+`, `APPEND_SLASH`, `reverse` |
| C. Suite de protocole Internet | ○ | `tcpip-stack.js` — inchangé | — *(couche réseau : `curl -v`, pas le notebook)* |
| D. Verbes / méthodes HTTP | ○ + ● | `http-verbs.js` frames 1-7 **inchangées** (classification) + **jeu E** pour la planification sous rejeu | **4.2** (verbe → code), **4.3** (PUT partiel — nuance le jeu) |
| E. Codes d'état | ○ ◐ | `status-triage.js` inchangé ; traversé par **A** (404/500/200) et **D** (403/404) | **4.2** 201/204/405/404, **4.4** 400, **4.5** 401/403 |
| *(ajout hors fiche)* REST | ○ | `rest-contraintes.js` — six frames contrefactuelles, une par contrainte de Fielding. Le module portait ce nom sans jamais le définir. | — |

### II. Architecture Application Django — *jeu A*

| Entrée fiche | Couverture | Dispositif | Mesuré au TP |
|---|---|---|---|
| A. Django traditionnel | ● | **A** — le cycle requête→réponse est le plateau | **temps 2** : le middleware à l'aller et au retour, écrit par l'étudiant |
| B. Première application | ◐ | **A** — la structure (`urls.py`, `views.py`, `models.py`) est le vocabulaire du plateau | temps 0 : un Django complet **sans projet** |
| C. Modèles | ● | **A** niveaux 6-7 (migrations sur données réelles) — voir §4, lacune n°2 | **temps 3** : paresse du QuerySet, N+1, `select_related`/`prefetch_related` |
| D. Administrateur | ▢ | démonstration en direct | — |
| E. Vues | ● | **A** niveaux 3-5 | 1.2 (la vue n'est pas appelée), 3.6 (SQL d'une requête HTTP) |
| F. URL | ● | **A** niveaux 1-2 (ordre des patterns, convertisseurs, `APPEND_SLASH`) | **temps 1** intégralement |
| G. Page Web / gabarits | ✕ | hors sujet pour un cours d'API | — |
| H. Sérialiseurs | ◐ → ● | traversé par **A** (sortie) ; travaillé pour de bon par **C** | 4.3, 4.4, **4.6** (le N+1 caché dans la sérialisation) |

### III. Django REST Framework — *jeu C*

| Entrée fiche | Couverture | Dispositif | Mesuré au TP |
|---|---|---|---|
| A. Configuration initiale | ▢ | procédure | temps 0 (`settings.configure()`) |
| B. Modèles | ◐ | **C** — il faut lire le modèle pour écrire le sérialiseur | 4.3 : `{champ: required}` est le vrai contrat de l'API |
| C. Django REST Framework (ViewSet/routeur) | ○ | frames du module III. *(La frame « pont DRF » qui cochait cette case depuis `http-verbs.js` a été retirée : elle faisait classer des actions de `ModelViewSet` avant que l'étudiant ait vu un seul ViewSet, et doublait le module III dans le même régime.)* Reste le tableau de correspondance en récapitulatif du module I, comme vocabulaire. | **4.1** : la table verbe → action, écrite par DRF lui-même |
| D. URL | ◐ | **A** (routage) + **D** (routeur DRF) | temps 1 · 4.1 |
| E. Sérialiseurs | ● | **C** — les 8 niveaux | 4.3 (PUT/PATCH et `required`), **4.4** (le 400 champ par champ) |
| F. Vues | ◐ | **D** — `ModelViewSet`, `get_queryset`, `permission_classes` | **4.6** : le N+1 se règle sur le `queryset`, pas dans le sérialiseur |
| G. Consommation de l'API | ◐ | **E** (le composeur *est* un client, journal en `requests`) + **F′** panneau 3 — voir §4, lacune n°1 | tout le temps 4 via `test.Client` — mais **rien côté navigateur** |
| H. django-cors-headers | ○ | frame + démo : *c'est le navigateur qui bloque, pas Django* | — *(non couvert : voir §4, lacune n°1)* |

### IV. Autorisations — *jeu D*

| Entrée fiche | Couverture | Dispositif | Mesuré au TP |
|---|---|---|---|
| A. Créer un nouvel utilisateur | ▢ | procédure | 4.5 (`create_user` + `Token`) |
| B. Ajouter une connexion à l'API | ▢ ◐ | procédure ; **D** niveau 6 la rencontre (le défaut strict ferme la vue de connexion) | 4.5 : bon jeton → 200, mauvais → 401 |
| C. Autoriser tout | ● | **D** niveau 1 (`AllowAny`) | — |
| D. Autorisations au niveau de la vue | ● | **D** niveaux 2-5 | **4.5** : `IsAuthenticated` + permission personnalisée → 403 |
| E. Autorisations au niveau du projet | ● | **D** niveau 6 (`DEFAULT_PERMISSION_CLASSES`) | — |
| F. Autorisations personnalisées | ● | **D** niveau 7 | 4.5 (`BasePermission`, `message`) |

### V. Authentification de l'utilisateur — *simulateur F′*

| Entrée fiche | Couverture | Dispositif | Mesuré au TP |
|---|---|---|---|
| A. Authentification de base | ● | **F′** panneau 1 (interception, base64) | — |
| B. Authentification de session | ● | **F′** panneaux 2-3 (ferme de serveurs, bocal à cookies) | **4.5** : `SessionAuthentication` → 403 et non 401 |
| C. Authentification par jeton | ● | **F′** panneaux 1-3 | **4.5** : `TokenAuthentication` → 401 + `WWW-Authenticate` |
| D. Authentification par défaut | ○ | frame `pont-drf` (`DEFAULT_AUTHENTICATION_CLASSES`) | — |
| E. Implémentation par jeton | ○ ▢ | frame `implementation` (type `order`) + démonstration | 4.5 (`authtoken`, en-tête `Authorization`) |

---

## 2. Décompte

| Traitement | Entrées | Part |
|---|---|---|
| ● cœur d'un jeu | 13 | 41 % |
| ◐ traversée par un jeu | 8 | 25 % |
| ○ frames PI | 9 | 28 % |
| ▢ démonstration | 5 | 16 % |
| ✕ hors périmètre | 1 | 3 % |

(les totaux dépassent 100 % : plusieurs entrées reçoivent deux traitements)

**Aucune entrée du programme n'est laissée sans dispositif**, à l'exception de II.G (page web /
gabarits), écartée parce qu'un cours d'API n'en a pas l'usage.

---

## 3. Calage sur le DÉROULÉ

| Jour | Programme (fiche) | Dispositifs | Temps interactif |
|---|---|---|---|
| **1** | I. RESTful · II. Django · TP environnement · rappel Python | 5 jeux J1 existants · **E** (20 min) · **A** (50 min) | ~2 h |
| **2** | III. DRF · TP premier projet + Postman | **C** (35 min) | ~35 min |
| **3** | TP projet guidé full stack | — (les jeux ont servi de brouillon, cf. « copier pour le TP ») | 0 |
| **4** | IV. Autorisations · V. Authentification · TP sécurisé · **QCM + TP individuel** | **D** (40 min) · **F′** (15 min) | ~55 min |
| **5** | Projet par monôme | — | 0 |

Total : **~2 h 40 de jeu** + ~50 min de frames J1 existantes, sur une semaine de ~35 h.

### Le problème d'ordonnancement à trancher

Le DÉROULÉ met **I et II le même jour**. Or `A` est le plus gros jeu du lot (50 min) et il tombe
sur la journée la plus chargée, déjà pourvue de cinq jeux J1, d'un TP d'environnement et d'un
rappel Python. Trois issues, par ordre de préférence :

1. **Scinder A** : niveaux 1-5 (routage, vues, ORM) au Jour 1 ; niveaux 6-7 (**migrations**) au
   Jour 2, où ils précèdent naturellement III.B « Modèles ». Le monde `django-lite` est
   sérialisable (`snapshot()`), donc la table peuplée au Jour 1 est retrouvée au Jour 2 — ce qui
   *renforce* l'enjeu d'irréversibilité au lieu de l'affaiblir.
2. Jouer `E` au Jour 2 en réveil, puisqu'il pointe vers `partial_update`.
3. Ne rien changer et accepter que le Jour 1 soit dense.

Je recommande la 1 : elle est gratuite et elle améliore le jeu.

---

## 4. Les deux lacunes réelles

Distinctes des exclusions volontaires du §2 de `00-contrat-de-design.md`. Ce sont des notions
qui **mériteraient** un dispositif interactif et n'en ont pas.

### Lacune n°1 — III.G « Consommation de l'API » (le côté client)

Ce que le programme demande : consommer l'API depuis un front, et déboguer quand ça ne marche
pas. C'est **un tiers du Jour 2 et l'essentiel du TP du Jour 3**.

Couverture actuelle : partielle et indirecte (le composeur de `E`, le panneau 3 de `F′`).

L'opération mentale est réelle et absente du lot : **diagnostiquer depuis un symptôme**. On voit
une console navigateur, un onglet réseau, un code d'état — et il faut remonter à la cause. C'est
la seule opération du programme qui n'est ni *composer*, ni *spécifier*, ni *chercher un
contre-exemple*.

Candidat écarté en phase de design (« le débogueur de terrain ») : une série de pannes réelles
— erreur CORS alors que le serveur a répondu 200, 400 avec un dict d'erreurs à lire, slash final
qui perd le corps d'un POST, jeton dans le mauvais en-tête — dont il faut trouver **qui** bloque
et **où**. Les cinq tests de falsification passent : le problème existe sans habillage, l'action
du joueur est celle d'un développeur devant une panne, l'échec est une divergence, le coût est le
nombre de requêtes de diagnostic émises, et chaque panne a plusieurs causes plausibles.

**Tranché : au catalogue, spec plus tard.** Le jeu « G — le débogueur de terrain » est retenu
comme 6ᵉ dispositif candidat, à spécifier **après** C, A et D. Deux raisons de ne pas le
spécifier tout de suite : cinq jeux attendent déjà d'être écrits, et le TP d'instrumentation a
entre-temps couvert une partie du diagnostic — mais **côté serveur seulement** (slash final et
corps de POST perdu en 1.5, ordre des middlewares en 2.3, lecture d'un flot de logs en 3.5,
dict d'erreurs d'un 400 en 4.4, 401 contre 403 en 4.5).

Ce qui reste réellement découvert, et qu'aucun autre dispositif ne prend : **CORS**, l'onglet
réseau du navigateur, et le mouvement *symptôme → cause* vu depuis un client. C'est le périmètre
exact du futur jeu G ; d'ici là, III.H reste une frame + une démonstration.

### Lacune n°2 — II.C « Modèles » comme *conception* de schéma

`A` fait travailler les modèles **en aval** : on migre un schéma existant. Choisir les champs,
les types et les cardinalités **à partir d'un besoin métier** est une autre opération — de la
conception — et elle n'est couverte nulle part.

Deux raisons de ne pas la combler ici : elle est déjà l'objet du cours d'architecture
(`archi/`, modélisation et bases de données), et le projet du Jour 5 la fait pratiquer pour de
vrai. Je la signale plutôt que de la traiter.

---

## 5. Les trois régimes — jeu, TP, projet

Le lecteur qui compare la colonne « Dispositif » et la colonne « Mesuré au TP » verra six
notions traitées **deux fois** : `APPEND_SLASH`, le N+1, PUT/PATCH, 401/403, filtrer en Python
plutôt qu'en base, et le 400 de validation. Ce n'est pas une redite, à condition que le régime
change entre les deux.

| Régime | Dispositif | Ce qu'on y fait | Sur quoi |
|---|---|---|---|
| **Construire** | le jeu | câbler, prédire, diagnostiquer une divergence | un modèle fidèle mais **simulé** (`django-lite`) |
| **Mesurer** | le TP | falsifier ou confirmer ce que le jeu affirmait | **le vrai Django**, avec `assert` |
| **Livrer** | le projet J3 / J5 | assumer les conséquences | une application qui tourne |

La règle qui en découle, et qui vaut pour toute notion ajoutée plus tard :

> **Une notion traitée deux fois doit changer de régime.** Si le jeu et le TP font tous deux
> *construire*, l'un des deux est de trop. Si le jeu affirme et que le TP mesure, la seconde
> rencontre vaut plus que la première — c'est le moment où l'étudiant découvre que sa croyance
> était juste, ou ne l'était pas.

Le cas de PUT/PATCH illustre le troisième cas de figure, le plus fécond : **la mesure a
contredit le jeu**. Le widget du Jour 1 applique la sémantique du protocole (les champs absents
sont écrasés) ; DRF, lui, refuse en 400 un champ requis absent et conserve un champ à valeur par
défaut. Les deux sont vrais, dans deux registres — et c'est précisément ce que le TP fait
découvrir (temps 4.3). Le jeu dit désormais dans quel registre il parle.

**Ordre de rencontre attendu** : jeu → TP → projet. Un TP joué avant son jeu perd sa charge de
falsification ; il reste correct, mais il n'étonne plus.

## 6. Ce que les jeux ne prétendent pas remplacer

- **Le QCM d'évaluation du Jour 4.** Les jeux n'ont pas de note et n'exportent rien. Ils sont
  formatifs, pas certificatifs (contrat de design §1 : aucune récompense extrinsèque).
- **Les TP de la fiche.** Chaque jeu en est le **brouillon** : bouton « copier pour le TP »
  produisant du code exécutable (`00-contrat-de-design.md` §5).
- **Le TP d'instrumentation** (`tp-instrumentation/`), qui est le régime « mesurer » ci-dessus
  et se joue en cinq temps répartis J2→J5.

| Jeu | TP de la fiche qu'il alimente |
|---|---|
| A | *Créer un premier projet Django avec une page d'accueil · Création d'un modèle vue* |
| C | *Création de l'API et consommation* |
| D + F′ | *Création d'une application sécurisée et authentification avec jeton* |
| E | *Test de l'API avec Postman* |

- **Le rappel Python 3 et la préparation de l'environnement** (Jour 1), et le **projet du Jour 5** :
  hors périmètre, assumé.
