# `knowledge/` — dépôt de connaissances local du cours Django IPSSI

Ce dossier est la **mémoire de travail** du projet pour les agents Hermes. Il ne duplique
jamais la doctrine : chaque fait n'y figure qu'une fois, à sa place d'origine, et ce dossier
**pointe** vers elle.

## Où vit quoi (sources faisant autorité — ne pas copier ici)

| Sujet | Source |
|---|---|
| Doctrine pédagogique et arbitrage | `CLAUDE.md` |
| Moteur pi-frames, contrat des frames | `cours/README.md` |
| Pilotage, couverture, file d'attente | `README.md` |
| Contrat de design des jeux | `design/jeux/00-contrat-de-design.md` |
| Histoire des bancs, pièges de mesure | `outils/README.md` |
| Procédures (les quatre gestes) | `.claude/skills/` (miroir Hermes : `~/.hermes/skills/cours-*`) |

## Contenu propre à ce dossier

- `journal.md` — journal chronologique des chantiers : qu'est-ce qui a été vérifié, mesuré,
  décidé, par quel agent. Append-only, une entrée par séance de travail.
- `environnement.md` — faits stables de la machine (venv, chemins, versions) que tout agent
  doit connaître avant de lancer les bancs.

## Règles

1. **Append-only** pour `journal.md` ; corriger une erreur en ajoutant une entrée, jamais en
   réécrivant l'historique.
2. Un fait qui devient **procédure** repart dans un skill ; un fait qui devient **doctrine**
   repart dans `CLAUDE.md`. Ce dossier ne les absorbe pas.
3. À plusieurs agents : seul l'orchestrateur écrit ici, comme pour `README.md`.
