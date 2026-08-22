# Journal des chantiers

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
