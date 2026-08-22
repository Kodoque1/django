# Environnement de la machine (constaté le 2026-08-22)

## Python

- `python3` = 3.12.3 système ; PEP 668 actif → **jamais `pip install` nu**, toujours un venv.
- TP Django : venv déjà créé à `tp-instrumentation/.venv` avec Django 5.2.17 + DRF.
  Lancer les bancs TP ainsi :
  ```bash
  cd tp-instrumentation && .venv/bin/python verifier.py
  ```
  Résultat attendu : « ✅ 22 étapes vérifiées — environnement conforme ».

## Outils des bancs

| Besoin | Solution en place |
|---|---|
| `jsdom` (banc-jeux) | installé en global via nvm node v24 (`npm i -g jsdom`) |
| `websocket-client` (banc-deck) | venv outils à `/home/kodoque/.venvs/tools` — exporter avant de vérifier : `export PATH="/home/kodoque/.venvs/tools/bin:$PATH"` |
| Chrome | présent (banc-deck vert) |

## Commande complète

```bash
cd /home/kodoque/Documents/django
export PATH="/home/kodoque/.venvs/tools/bin:$PATH"
bash outils/verifier-tout.sh            # tout le dépôt, six bancs
bash outils/verifier-tout.sh J3-01-drf  # un seul module (saute les bancs TP)
```

État au 2026-08-22 : **six bancs verts, TP 22/22**.

## Pièges connus (voir aussi `outils/README.md`)

- Servir avec `python3 serve.py`, jamais `python3 -m http.server` (cache).
- Un module nommé en argument saute les deux bancs Django : les repasser en fin de chantier.
