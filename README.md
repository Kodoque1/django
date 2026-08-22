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

## Calendrier consolidé

| Jour | Programme | Deck | Jeux | TP d'instrumentation | TP de la fiche |
|---|---|---|---|---|---|
| **1** | I + II | ✅ module I · ✅ module II (2 simulations + 18 frames) | ✅ les 5 jeux (50 min) · ⏳ **A niveaux 1-5** (30 min) · ⏳ E (20 min) | — | préparation de l'environnement · rappel Python 3 |
| **2** | III | ⏳ module III | ⏳ **A niveaux 6-7** (20 min) · ⏳ C (35 min) | ✅ temps 1 + 2 (1 h 40) | premier projet Django · Postman |
| **3** | — | — | — | ✅ temps 3 (1 h) · temps 5 (30 min, *pendant* le projet) | application complète full stack |
| **4** | IV + V | ⏳ modules IV et V | ⏳ D (40 min) · ⏳ F′ (15 min) | ✅ temps 4 (1 h 10) | application sécurisée · QCM + TP individuel |
| **5** | — | — | — | — | projet en monôme |

**Deux arbitrages tranchés ici.**

1. **Le jeu A est scindé** : niveaux 1-5 (routage, vues, ORM) au Jour 1, niveaux 6-7 (migrations)
   au Jour 2. Le Jour 1 porte déjà cinq jeux, un TP d'environnement et un rappel Python ; A dure
   50 minutes d'un bloc. La coupure est gratuite — le monde `django-lite` est sérialisable
   (`snapshot()`), donc la table peuplée au Jour 1 est retrouvée au Jour 2 — et elle *améliore*
   le jeu : l'irréversibilité d'une migration frappe davantage sur des données qu'on a vues vivre
   la veille. Au Jour 2, les migrations précèdent naturellement III.B « Modèles ».
2. **Le Jour 3 est la journée la plus chargée** : TP projet + temps 3 (1 h) + temps 5 (30 min).
   Le temps 5 (django-debug-toolbar) se joue **dans** le projet, pas en bloc — c'est son intérêt.
   Si l'horaire déborde, sacrifier le temps 5 avant le temps 3 : la toolbar se rattrape seule, le
   comptage de requêtes non.

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
