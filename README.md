# APIs Python / Django RESTful — pilotage du cours

Cours IPSSI, *Mastère Dév, Data & IA — 4ᵉ année*. Une semaine, cinq jours.
Fiche officielle : `M1-10-API en Python - Django RESTful Web Services pour de l'I.A 2024.pdf`.

Ce document est le **point d'entrée** : il dit où est quoi, ce qui est prêt, et comment les
morceaux s'articulent. Les documents techniques sont ailleurs et restent la référence sur leur
domaine — `cours/README.md` pour le moteur de frames, `design/jeux/00-contrat-de-design.md` pour
les règles des jeux, `outils/README.md` pour la vérification.

```bash
python3 serve.py            # serveur sans cache — jamais python3 -m http.server
```

puis **<http://localhost:8000/cours/>** — l'accueil de la semaine, qui redit le même état sous
forme de cartes cliquables.

## Où est quoi

| Dossier | Contenu | État |
|---|---|---|
| `cours/` | decks reveal.js hors-ligne, moteur `pi-frames.js`, socle de simulations | modules I et II livrés · III→V à écrire |
| `tp-instrumentation/` | le TP « mesurer », 5 temps répartis J2→J5, avec corrigé et vérificateur | **livré, 22 mesures vertes** |
| `design/jeux/` | spécifications : contrat de design, noyau `django-lite`, 5 jeux (A, C, D, E, F′) | **spécifié, rien d'implémenté** |
| `outils/` | les quatre bancs de vérification | livré |

---

## Les trois régimes

C'est la clé de lecture de tout le reste. Une même notion peut apparaître deux fois — la liste
des recouvrements est longue : `APPEND_SLASH`, le N+1, PUT/PATCH, 401 contre 403, filtrer en
Python plutôt qu'en base, le 400 de validation. Ce n'est une redite **que si le régime ne change
pas**.

| Régime | Dispositif | Ce qu'on y fait | Sur quoi |
|---|---|---|---|
| **Construire** | le jeu | câbler, prédire, diagnostiquer une divergence | un modèle fidèle mais **simulé** |
| **Mesurer** | le TP d'instrumentation | falsifier ou confirmer ce que le jeu affirmait | **le vrai Django**, avec `assert` |
| **Livrer** | le projet des Jours 3 et 5 | assumer les conséquences | une application qui tourne |

> **Une notion traitée deux fois doit changer de régime.** Si le jeu et le TP font tous deux
> *construire*, l'un des deux est de trop.

Ordre de rencontre attendu : **jeu → TP → projet**. Un TP joué avant son jeu reste correct, mais
il n'étonne plus — or c'est l'étonnement qui fait la valeur du second passage.

Le cas le plus fécond est celui où **la mesure contredit le jeu**. Il s'est produit une fois, sur
`PUT` : le widget du Jour 1 applique la sémantique du protocole (les champs absents sont
écrasés), là où DRF refuse en 400 un champ requis absent et **conserve** un champ à valeur par
défaut. Les deux sont vrais, dans deux registres. Le jeu dit désormais dans lequel il parle, et
le TP fait faire la découverte (temps 4.3).

**L'oracle** de toute affirmation sur Django ou DRF est `tp-instrumentation/verifier.py` : 22
comportements mesurés sur un vrai Django 5.2. Quand la mesure contredit une spécification, c'est
la spécification qui change.

---

## Couverture du programme

32 entrées au programme de la fiche IPSSI. Légende : ✅ livré · ⏳ spécifié, pas écrit ·
✍️ à spécifier · ▢ démonstration ou procédure · ✕ hors périmètre assumé.

### I. Architecture RESTful

| Entrée | Dispositif | Mesuré au TP | État |
|---|---|---|---|
| A. Web mondial | frames `web-invention.js` | — | ✅ |
| B. URL | frames `url-anatomy.js` | temps 1 (1.1→1.7) | ✅ |
| C. Suite de protocole Internet | frames `tcpip-stack.js` + **simulation** « d'un hôte à l'autre » | — *(couche réseau : `curl -v`)* | ✅ |
| D. Verbes / méthodes HTTP | frames `http-verbs.js` + **jeu E** | 4.2, 4.3 | ✅ / ⏳ |
| E. Codes d'état | frames `status-triage.js` | 4.2, 4.4, 4.5 | ✅ |
| *(hors fiche)* REST | frames `rest-contraintes.js` — les six contraintes en contrefactuel | — | ✅ |

### II. Architecture Application Django

| Entrée | Dispositif | Mesuré au TP | État |
|---|---|---|---|
| A. Django traditionnel | **simulation** « les middlewares, à l'aller et au retour » | temps 2 | ✅ |
| B. Première application | slides de vocabulaire (4 fichiers, signature d'une vue, un modèle) | temps 0 | ✅ |
| C. Modèles | **6 frames** — paresse, N+1, select/prefetch, où filtrer | temps 3 | ✅ |
| D. Administrateur | démonstration en direct (slide + déroulé en notes) | — | ✅ ▢ |
| E. Vues | **6 frames** — get / get_object_or_404 / first, 404 contre 500 | 1.2, 3.6 | ✅ |
| F. URL | **simulation** « le routeur essaie dans l'ordre » + 6 frames | temps 1 | ✅ |
| G. Page Web / gabarits | — | — | ✕ *(cours d'API)* |
| H. Sérialiseurs | **jeu C** | 4.3, 4.4, 4.6 | ⏳ |

### III. Django REST Framework

| Entrée | Dispositif | Mesuré au TP | État |
|---|---|---|---|
| A. Configuration initiale | procédure | temps 0 | ▢ |
| B. Modèles | jeu C | 4.3 | ⏳ |
| C. ViewSet / routeur | frames du module III *(à écrire)* — la table de correspondance reste en récapitulatif du module I, comme vocabulaire | **4.1** | ⏳ |
| D. URL | jeux A et D | temps 1, 4.1 | ⏳ |
| E. Sérialiseurs | **jeu C**, 8 niveaux | 4.3, 4.4 | ⏳ |
| F. Vues | jeu D | **4.6** | ⏳ |
| G. Consommation de l'API | jeu E + F′ ; **jeu G** pour le côté client | temps 4 *(rien côté navigateur)* | ✍️ |
| H. django-cors-headers | frame + démonstration | — | ✍️ |

### IV. Autorisations

| Entrée | Dispositif | Mesuré au TP | État |
|---|---|---|---|
| A. Créer un utilisateur | procédure | 4.5 | ▢ |
| B. Connexion à l'API | procédure ; jeu D niveau 6 | 4.5 | ▢ |
| C. Autoriser tout | **jeu D** niveau 1 | — | ⏳ |
| D. Autorisations de vue | jeu D niveaux 2-5 | **4.5** | ⏳ |
| E. Autorisations de projet | jeu D niveau 6 | — | ⏳ |
| F. Autorisations personnalisées | jeu D niveau 7 | 4.5 | ⏳ |

### V. Authentification

| Entrée | Dispositif | Mesuré au TP | État |
|---|---|---|---|
| A. Authentification de base | **F′** panneau 1 | — | ⏳ |
| B. Authentification de session | F′ panneaux 2-3 | **4.5** (403, pas 401) | ⏳ |
| C. Authentification par jeton | F′ panneaux 1-3 | **4.5** (401 + `WWW-Authenticate`) | ⏳ |
| D. Authentification par défaut | frame `pont-drf` | — | ⏳ |
| E. Implémentation par jeton | frame `implementation` + démo | 4.5 | ⏳ |

Le détail des choix — pourquoi telle notion relève d'une frame et non d'un jeu — est dans
`design/jeux/00-contrat-de-design.md` §2 et `design/jeux/02-couverture-programme.md`.

---

## Timing journée par journée

Sept heures de contact par jour (9 h – 17 h, une heure de déjeuner). Le principe : **le pratique
d'abord** — on monte un premier Django avant de parler des fondamentaux, et chaque bloc de cours
est suivi d'une manipulation. Les activités renvoient aux jeux de frames de la version étudiante
(`version-etudiante/`) ; les temps de TP renvoient à `tp-instrumentation/` et aux fiches
`TP-JOUR*.md`.

### Jour 1 — Un premier Django qui tourne, puis ce qui circule dessous

| Horaire | Durée | Quoi | Support |
|---|---|---|---|
| 9 h 00 | 20 min | **TP 0 — environnement** : venv, `pip install`, `verifier.py` 22/22 | `TP-JOUR1.md` §1–3 |
| 9 h 20 | 40 min | **Rappel Python 3** : pathlib, `with`, compréhensions, dataclasses, Decimal | `TP-JOUR1.md` §4 |
| 10 h 00 | 55 min | **TP — premier projet Django** : `startproject`, modèle `Produit`, sérialiseur, vue, URLs, serveur | `TP-JOUR2.md` §1–8 |
| 10 h 55 | 15 min | *pause* | |
| 11 h 10 | 30 min | **Activités** : Le routage, règle par règle · Le routeur essaie dans l'ordre | version étudiante, J1-02 |
| 11 h 40 | 30 min | **Postman sur son propre projet** : GET/POST, lire le corps *et* le statut | `TP-JOUR2.md` §9 |
| 12 h 10 | 50 min | *déjeuner* | |
| 13 h 00 | 25 min | **Activité** : Anatomie d'une URL | version étudiante, J1-01 |
| 13 h 25 | 55 min | **TP t1 — l'URL et le routage** (resolve, 404, APPEND_SLASH, reverse) | TP instrumentation, temps 1 |
| 14 h 20 | 15 min | *pause* | |
| 14 h 35 | 25 min | **Activités** : Les trois inventions du Web · Emballer, envoyer, déballer | version étudiante, J1-01 |
| 15 h 00 | 45 min | **TP t2 — les middlewares** (écrire sa sonde, l'ordre) | TP instrumentation, temps 2 |
| 15 h 45 | 30 min | **Activités** : D'un hôte à l'autre · Le bon verbe | version étudiante, J1-01 |
| 16 h 15 | 30 min | **Activités** : Le triage · La boucle complète | version étudiante, J1-01 |
| 16 h 45 | 15 min | Bilan du jour, questions | |

Total activités J1 : 8. Le TP « préparation de l'environnement » de la fiche est couvert par le
bloc de 9 h ; le rappel Python aussi.

### Jour 2 — DRF : de l'ORM à l'API consommée

| Horaire | Durée | Quoi | Support |
|---|---|---|---|
| 9 h 00 | 30 min | **Activités** : Les middlewares, à l'aller et au retour · Compter les requêtes avant de les mesurer | version étudiante, J1-02 |
| 9 h 30 | 40 min | **TP t3 — l'ORM** : QuerySet paresseux, fabriquer un N+1, select/prefetch | TP instrumentation, temps 3 |
| 10 h 10 | 20 min | **Activité** : Récupérer un objet — et le bon code d'état | version étudiante, J1-02 |
| 10 h 30 | 15 min | *pause* | |
| 10 h 45 | 30 min | **Activités** : Valider, convertir, refuser · Deux URL : qui répond à quoi ? | version étudiante, J2-01 |
| 11 h 15 | 45 min | **TP — l'API complète** : CRUD, pagination, filtres sur le projet de la veille | `TP-JOUR3.md` §1–4 |
| 12 h 00 | 50 min | *déjeuner* | |
| 12 h 50 | 30 min | **Activités** : Compter avant de mesurer · Cinq frames côté client | version étudiante, J2-01 |
| 13 h 20 | 30 min | **TP — consommer** : `consommer.py` (requests), notebook | `TP-JOUR3.md` §5–6 |
| 13 h 50 | 25 min | **Activité** : Une page, deux origines (CORS) | version étudiante, J2-01 |
| 14 h 15 | 30 min | **TP t5 — django-debug-toolbar** dans le projet | TP instrumentation, temps 5 |
| 14 h 45 | 15 min | *pause* | |
| 15 h 00 | 1 h 30 | **Projet guidé full-stack** : démarrage (modèles, seed, endpoints) | `TP-JOUR3.md` |
| 16 h 30 | 30 min | **Activité** : Retirez la contrainte (REST en contrefactuel) | version étudiante, J1-01 |

Total activités J2 : 8. Le temps 5 se joue *dans* le projet — c'est son intérêt.

### Jour 3 — Projet encadré (journée projet)

| Horaire | Durée | Quoi | Support |
|---|---|---|---|
| 9 h 00 | 15 min | Objectifs du projet, choix du sujet | `TP-JOUR3.md` §0 |
| 9 h 15 | 1 h 45 | **Projet — bloc 1** : modèles, migrations, seed | |
| 11 h 00 | 15 min | *pause* | |
| 11 h 15 | 1 h | **Projet — bloc 2** : sérialiseurs, vues, URLs | |
| 12 h 15 | 50 min | *déjeuner* | |
| 13 h 05 | 30 min | **Activité** : Le bon verbe, revisitée sur SON projet | version étudiante, J1-01 |
| 13 h 35 | 1 h 15 | **Projet — bloc 3** : pagination, filtres, consommation client | |
| 14 h 50 | 15 min | *pause* | |
| 15 h 05 | 30 min | **Activités** : Le triage (revisitée) · Lire un refus | version étudiante, J1-01 · J4-01 |
| 15 h 35 | 1 h 20 | **Projet — bloc 4** : mise en commun, revue croisée entre binômes | |

Total activités J3 : 3 — toutes revisitées sur le projet de l'étudiant (second passage, régime
différent).

### Jour 4 — Sécuriser : autorisations puis authentification

| Horaire | Durée | Quoi | Support |
|---|---|---|---|
| 9 h 00 | 25 min | **Activités** : Qui franchit la vue ? · Vue contre projet : qui décide ? | version étudiante, J4-01 |
| 9 h 25 | 30 min | **TP — utilisateurs et permissions** : `create_user`, `IsAdminOrReadOnly` | `TP-JOUR4.md` §2, §5 |
| 9 h 55 | 25 min | **Activité** : Lire un refus (401 contre 403) | version étudiante, J4-01 |
| 10 h 20 | 30 min | **TP — tester les permissions** : la grille client/admin | `TP-JOUR4.md` §6 |
| 10 h 50 | 15 min | *pause* | |
| 11 h 05 | 25 min | **Activité** : Écrire sa propre règle | version étudiante, J4-01 |
| 11 h 30 | 30 min | **TP — permission objet** (ownership) | `TP-JOUR4.md` §7 |
| 12 h 00 | 50 min | *déjeuner* | |
| 12 h 50 | 25 min | **Activités** : Qui a rempli request.user ? · Le client qui n'envoie rien | version étudiante, J4-02 |
| 13 h 15 | 25 min | **Activité** : Une identité en en-tête | version étudiante, J4-02 |
| 13 h 40 | 40 min | **TP — jetons** : `TokenAuthentication`, 401 + `WWW-Authenticate` | `TP-JOUR4.md` §3–4 |
| 14 h 20 | 15 min | *pause* | |
| 14 h 35 | 25 min | **Activités** : Qui tourne quand la vue n'écrit rien ? · Dans quel ordre les poser ? | version étudiante, J4-02 |
| 15 h 00 | 25 min | **Activité** : Du projet vierge à l'en-tête exact | version étudiante, J4-02 |
| 15 h 25 | 50 min | **TP — sécuriser SON projet** | `TP-JOUR4.md` §8–9 |
| 16 h 15 | 30 min | **QCM en ligne** (évaluation) | |
| 16 h 45 | 15 min | Bilan | |

Total activités J4 : 7.

### Jour 5 — Projet individuel évalué

| Horaire | Durée | Quoi | Support |
|---|---|---|---|
| 9 h 00 | 20 min | Sujet tiré, cahier des charges, structure du dépôt | `TP-JOUR5.md` §1–3 |
| 9 h 20 | 1 h 40 | **Projet — bloc 1** : setup, modèles, migrations, seed | timebox §4 |
| 11 h 00 | 15 min | *pause* | |
| 11 h 15 | 1 h | **Projet — bloc 2** : API CRUD + pagination/filtres | |
| 12 h 15 | 50 min | *déjeuner* | |
| 13 h 05 | 45 min | **Projet — bloc 3** : jetons + permissions | |
| 13 h 50 | 15 min | *pause* | |
| 14 h 05 | 45 min | **Projet — bloc 4** : client.py + debug-toolbar (chasser le N+1) | |
| 14 h 50 | 30 min | **Activités en autonomie** — reprendre celles qui ont échoué la première fois | version étudiante |
| 15 h 20 | 1 h 10 | **Soutenances** (5 min × étudiant) + grille | `TP-JOUR5.md` §8, §10 |
| 16 h 30 | 30 min | QCM final, bilan de semaine | |

---

## Activités de secours — meubler si un bloc déborde

Les gros jeux (A, C, D, E, F′) sont reportés ; voici de quoi tenir une salle sans préparation.
Tout se joue dans la version étudiante ou dans le REPL du TP — rien à préparer.

### Activités éclair (5–15 min, aucun prérequis)

| Activité | Où | Quand la sortir |
|---|---|---|
| **Le triage** — classer des codes d'état | version étudiante, J1-01 | un « c'est quoi un 418 ? » ; avant tout débogage HTTP |
| **Le bon verbe** — PUT/PATCH/POST/DELETE | version étudiante, J1-01 | confusion PUT/PATCH au moment du TP CRUD |
| **Anatomie d'une URL** — les six parties | version étudiante, J1-01 | erreur 404 incomprise, débat sur un fragment `#` |
| **Lire un refus** — 401 ou 403 ? | version étudiante, J4-01 | avant toute séance permissions/authentification |
| **Qui tourne quand la vue n'écrit rien ?** | version étudiante, J4-02 | question du `DEFAULT_AUTHENTICATION_CLASSES` |

### Ateliers REPL (15–30 min, venv du TP requis)

| Atelier | Quoi | Quand |
|---|---|---|
| **Fabriquer un N+1 à la main** | deux lignes de vue, `CaptureQueriesContext` gonfle, corriger | si le temps 3 a été court |
| **Casser APPEND_SLASH** | `APPEND_SLASH = False`, observer le 404, remettre | après le temps 1 |
| **Inverser deux middlewares** | Chrono avant/après CommonMiddleware : la mesure disparaît | après le temps 2 |
| **Le 400 qui explique** | poster un corps invalide, lire le champ par champ | avant le temps 4.4 |
| **Base64 à la main** | `b64encode(b"etu:etu")`, décoder : ce n'est pas du chiffrement | au début de l'authentification |

### Débats guidés (20–30 min, projecteur + tableau)

| Débat | Amorce | Quand |
|---|---|---|
| **Retirez la contrainte** | « Que casse-t-on en retirant l'interface uniforme ? Le cache ? Les couches ? » | fin du module REST, créneau court |
| **Session contre jeton** | « Une app mobile et un navigateur, la même API — que choisissez-vous ? » | transition IV → V |
| **Où filtrer ?** | `filter()` en base ou comprehension Python — compter les requêtes | après le temps 3 |
| **PUT : protocole contre framework** | le cas documenté où la mesure contredit le cours | au moment du PUT dans le projet |

### Si le matériel manque (serveur down, réseau coupé)

- **Version étudiante hors-ligne** : les 28 activités tournent en local — servir avec
  `python3 -m http.server` depuis `version-etudiante/`.
- **verifier.py comme démonstration** : le faire tourner devant la salle et commenter les 22
  lignes vertes une à une — 30 minutes qui révisent toute la semaine.
- **Lecture de verifier.py comme exercice** : 15 minutes pour prédire ce que teste l'étape 4.3,
  puis exécution. C'est le corrigé exécutable de la fiche.


---

## File d'attente

**Arbitrage du 14 août 2026 — dix jours pleins, une seule classe : frames + simulations partout.**
`design/jeux/django-lite.js` et les cinq gros jeux (A, C, D, E, F′) sont **reportés**, leurs
spécifications conservées pour une promotion ultérieure. Le noyau seul représente 3 à 4 jours et
1 500 à 2 500 lignes à vérifier, là où le moteur `pi-frames` et le patron SVG + `rAF` sont déjà
amortis. On couvre tout le programme plutôt que d'aller profond sur un quart.

| Rang | Chantier | État |
|---|---|---|
| 1 | `CLAUDE.md`, doctrine des simulations, socle CSS, banc-deck | ✅ fait |
| 2 | module II — cycle, URL, vues, modèles, admin | ✅ fait |
| 3 | module III — DRF : sérialiseurs, ViewSet, consommation | ✅ fait (`cours/J2-01-drf/`, 5 jeux de frames) |
| 4 | module IV — autorisations | ✅ fait (`cours/J4-01-autorisations/`, 4 jeux de frames) |
| 5 | module V — authentification | ✅ fait (`cours/J4-02-authentification/`, 6 jeux de frames) |
| 6 | documents historiques (module I), version étudiante, cheatsheets | à écrire |
| — | `django-lite.js` + jeux A/C/D/E/F′ | **reporté**, specs conservées |
| — | **jeu G — le débogueur de terrain** | au catalogue, non spécifié |

Ne pas démarrer `django-lite` sans arbitrage explicite : c'est la décision qui consommerait tout
le budget restant.

**Le jeu G** comblerait la seule lacune réelle : le diagnostic **côté client** — CORS, onglet
réseau, remonter d'un symptôme à sa cause. Le TP d'instrumentation couvre déjà le diagnostic côté
serveur. Voir `design/jeux/02-couverture-programme.md` §4.

> **Il n'y a pas de jeu B.** Aucun document n'explique la lettre manquante : elle a été attribuée
> puis abandonnée en phase de design. Ne pas la réutiliser pour un nouveau jeu — les notes de
> conception antérieures deviendraient ambiguës.

---

## Vérification

```bash
bash outils/verifier-tout.sh
```

Quatre bancs : les frames de **tous** les modules sous jsdom (complétude des feedbacks *et*
parcours), les 22 mesures de `verifier.py` sur un vrai Django, la fiche de TP rejouée bloc par
bloc, et **tous les decks dans un vrai Chrome** — rendu, débordement de slide, libellés qui
sortent de leur cadre, et les quatre tests des simulations. Ce qui manque sur le poste est
**sauté** proprement, jamais mis en échec — voir `outils/README.md`.

Aucun banc ne couvre le **rendu**. Après toute modification du deck ou du CSS, passer la liste
manuelle que `verifier-tout.sh` rappelle en fin d'exécution : dérouler les slides, jouer les jeux
en se trompant, basculer clair/sombre et le mode duel, console vierge.

## Deux points de vigilance techniques

- **`cours/js/init.js` diverge de `archi/cours/js/init.js`.** La bascule de thème en a été
  extraite vers `cours/js/theme.js`, pour que l'accueil et les futures pages de jeu autonomes la
  partagent au lieu de la dupliquer. Recopier la version d'archi par-dessus reviendrait à casser
  les deux — le bloc concerné porte un avertissement sur place.
- **Django 3.2.12 est installé en système sur ce poste, et il est en fin de vie depuis avril
  2024.** Tout le TP est épinglé sur Django 5.2 (`tp-instrumentation/requirements.txt`). Monter
  le venv avant la séance, c'est précisément le TP « préparation de l'environnement » du Jour 1.
