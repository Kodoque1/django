# Journal des chantiers

## 2026-08-22 — mise en place Hermes multi-agent

- Environnement complété : venv TP créé (`tp-instrumentation/.venv`, Django 5.2.17), `jsdom`
  en global nvm, venv outils avec `websocket-client` à `/home/kodoque/.venvs/tools`.
- `verifier-tout.sh` : **six bancs verts**. `verifier.py` : **22/22**.
- Workflow `.claude/skills` adapté en skills Hermes `cours-*` (même contenu, déclencheurs
  Hermes) + orchestrateur `cours-orchestrer` (délégation multi-agent, sérialisations
  respectées : README.md, index.html, outils/, CSS/JS socle, CLAUDE.md).
- Dépôt de connaissances local créé : `knowledge/` (ce dossier).

## 2026-08-22 — TP vérifié

- `tp-instrumentation/verifier.py` : 22 étapes ✓, Django 5.2.17. Temps 1 (routage) à 5.
- Aucune correction de contenu nécessaire ; le TP passait déjà, seuls les bancs sautés
  (jsdom, websocket-client, Django 5.x absent) ont été réactivés.
