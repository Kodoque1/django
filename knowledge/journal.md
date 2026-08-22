# Journal des chantiers

## 2026-08-23 — module V écrit et relu (multi-agent) — noyau du cours complet

- Module V Authentification écrit par voie dédiée (`cours/J4-02-authentification/`) :
  6 jeux de frames (mécanisme request.user, session → 403 fidèle à la mesure 4.5,
  jeton → 401 + WWW-Authenticate, DEFAULT_AUTHENTICATION_CLASSES avec la frame
  `pont-drf`, implémentation par jeton, ordre identifier→autoriser).
- Relecture en fan-out (7 axes). Corrections de l'orchestrateur :
  - **HTML** : 14 prompts dont le `?` avait été remplacé par `&nbsp;` ; 3 séquences
    `<code>…***` jamais fermées ; un `</code>` doublé — tous réparés, balises vérifiées
    équilibrées sur les 4 widgets ;
  - révélations de titre (5) : « L'ordre du serveur, l'ordre du diagnostic »,
    « Identifier avant d'autoriser », « Reconnaître un navigateur », « Une identité qui se
    présente à chaque requête », « Quatre câbles » ;
  - calques wiring/prix : « câbles », « brancher » (×3), « le confort du cookie a un prix » (×2) ;
  - incohérence de fond (axe E) : le module faisait dire au 403 « identité connue puis
    refusée » alors que la partie 2 répond 403 à un client SANS identité (mesure 4.5).
    Arbitré : 403 = « je sais qui tu es, et c'est non » pour la permission ; le refus de
    session est décrit sans la formule ;
  - compte/utilisateur harmonisé (request.user porte l'utilisateur) ;
  - trois doublons de régime avec J4-01 recadrés : jeton erroné re-centré sur la table des
    jetons, session sans cookie re-centrée sur le navigateur, frame d'ouverture re-centrée
    sur l'ordre des classes plutôt que sur « qui remplit request.user » (déjà construit par
    la frame-pont du IV).
- Verdict final : quatre bancs verts sur J4-02 ET J4-01.

## 2026-08-22 — module IV écrit et relu (multi-agent)

- Module IV Autorisations écrit par voie dédiée (`cours/J4-01-autorisations/`) : 4 jeux de
  frames (permissions de vue, permissions de projet, les deux refus 401/403 fidèles à la
  mesure 4.5, règles sur mesure + frame-pont vers l'authentification).
- Relecture en fan-out (7 axes). Corrections de l'orchestrateur :
  - HTML cassé réparé : `</pre>` manquant sur la slide jeton (index.html:137), labels
    `Token ***` malformés dans permissions-frames, prompt avorté dans refus-frames ;
  - calques : « grande ouverte », « tracent une frontière » (×2), « coûte une séance »,
    « est un socle » — remplacés par le mécanisme énoncé ;
  - un mot une chose : « erroné/faux/invalide » → « erroné » seul ; « identifié mais
    non autorisé/refusé » → une seule forme ;
  - recouvrement avec le module III : l'`explain` de la frame-pont `pont-permissions`
    ne livre plus les deux codes ni la formule 401/403 (la partie 4 du module IV les fait
    construire) ; l'`explain` de `qui-passe` ne préempte plus le WWW-Authenticate.
- Verdict final : quatre bancs de module verts sur J4-01-autorisations ET re-vérifiés sur
  J2-01-drf après modification de sa frame-pont.

## 2026-08-22 — mise en place Hermes multi-agent

- Environnement complété : venv TP créé (`tp-instrumentation/.venv`, Django 5.2.17), `jsdom`
  en global nvm, venv outils avec `websocket-client` à `/home/kodoque/.venvs/tools`.
- `verifier-tout.sh` : **six bancs verts**. `verifier.py` : **22/22**.
- Workflow `.claude/skills` adapté en skills Hermes `cours-*` (même contenu, déclencheurs
  Hermes) + orchestrateur `cours-orchestrer` (délégation multi-agent, sérialisations
  respectées : README.md, index.html, outils/, CSS/JS socle, CLAUDE.md).
- Dépôt de connaissances local créé : `knowledge/` (ce dossier).

## 2026-08-22 — module III écrit et relu (multi-agent)

- Module III DRF écrit par une voie dédiée (`cours/J2-01-drf/`) : 5 jeux de frames
  (sérialiseurs, ViewSet, vues/N+1, consommation, CORS), aucun gros jeu (arbitrage du 14 août).
- Relecture en fan-out : 7 sous-agents, un par axe A-G. ~15 signalements consolidés, tous
  arbitrés et corrigés par l'orchestrateur :
  - révélations de titre (2 titres de widget-slide réécrits, 1 sous-titre CORS précisé) ;
  - calques (« à chaque coin », « le prix se paie », « jeter les six actions avec »,
    « invité » ×2) ;
  - un mot une chose : « table » SQL vs table verbe→action désambiguïsé ; chaîne de
    middlewares nommée ; PUT « remplacer » vs sémantique DRF assumée dans l'`explain` de
    `table-detail` ;
  - référents manquants (`VueDetaillee` jamais introduit → frame réécrite sur `ModelViewSet`
    hérité ; `s.is_valid(data)` → forme complète ; comptes 5/6 actions harmonisés à 6) ;
  - méta retirée d'un `explain` (« surprend à chaque fois ») et d'une hintTitle ;
  - doublon de régime `codes-cote-client` : la frame refait construire la correspondance
    code↔situation — recadrée côté client (quel test sur `r`, quelle réaction d'interface).
- Verdict final : banc-redaction ✅, banc-revelation ✅, banc-jeux ✅, banc-deck ✅ (bancs TP
  sautés avec module nommé ; repasser en fin de chantier).


- `tp-instrumentation/verifier.py` : 22 étapes ✓, Django 5.2.17. Temps 1 (routage) à 5.
- Aucune correction de contenu nécessaire ; le TP passait déjà, seuls les bancs sautés
  (jsdom, websocket-client, Django 5.x absent) ont été réactivés.
