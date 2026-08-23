# TP Jour 1 — Préparation de l’environnement & Rappel Python 3

> **Durée** : 20 min  |  **Support** : ce fichier + `verifier.py`

---

## 0. Objectif

Avoir un poste prêt pour la suite : Python 3.10+, venv, Django 5.2, DRF, outils de debug. Et rafraîchir les bases Python qui serviront tout le module (compréhensions, `with`, `pathlib`, `dataclasses`, `typing`).

---

## 1. Vérifier la version Python

```bash
python3 -V
# → doit afficher 3.10 ou plus (Django 5.2 l'exige)
```

Si c'est 3.9 ou moins : installer 3.12 (debian/ubuntu : `sudo apt install python3.12 python3.12-venv` ; macOS : `brew install python@3.12` ; Windows : télécharger l'installateur).

---

## 2. Créer et activer l’environnement virtuel

```bash
cd ~/votre-dossier-tp        # ou où vous voulez travailler
python3 -m venv .venv
source .venv/bin/activate    # Windows PowerShell : .venv\Scripts\Activate.ps1
# Le prompt change : (.venv) user@machine:~/...
```

---

## 3. Installer les dépendances du TP d’instrumentation

```bash
# Depuis la racine du dépôt cloné
pip install -r tp-instrumentation/requirements.txt
```

Vérification immédiate :

```bash
python tp-instrumentation/verifier.py
# → doit finir par « ✅ 22 étapes vérifiées — Django 5.2.17, environnement conforme. »
```

---

## 4. Rappel Python — les motifs qu’on utilisera tout le temps

Ouvrez un REPL (`python3`) et testez chaque motif. Ne passez pas au suivant sans l'avoir fait tourner.

### 4.1 `pathlib` — chemins propres, multi-plateforme

```python
from pathlib import Path

racine = Path(__file__).parent if '__file__' in globals() else Path.cwd()
data = racine / "data" / "produits.json"
data.parent.mkdir(parents=True, exist_ok=True)
data.write_text('[]')
print(data.read_text())
```

### 4.2 `with` — ressources qui se ferment toutes seules

```python
# Fichier
with open("test.txt", "w") as f:
    f.write("hello")
# f est fermé ici, même en cas d'exception

# Contexte Django (plus tard)
# with connection.cursor() as cursor: ...
```

### 4.3 Compréhensions & `dict`/`set` — filtrer, transformer, dédoublonner

```python
produits = [
    {"nom": "Clavier", "prix": 89.90, "stock": 12},
    {"nom": "Écran", "prix": 329.00, "stock": 4},
    {"nom": "Souris", "prix": 19.90, "stock": 0},
]

# Noms des produits en stock
noms_en_stock = [p["nom"] for p in produits if p["stock"] > 0]
# ['Clavier', 'Écran']

# Dictionnaire nom -> prix (pour lookup O(1))
prix_par_nom = {p["nom"]: p["prix"] for p in produits}

# Valeurs uniques de stock
stocks_uniques = {p["stock"] for p in produits}
```

### 4.4 `dataclasses` — objets de données sans boilerplate

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass
class Produit:
    nom: str
    prix: Decimal
    stock: int = 0

    def en_stock(self) -> bool:
        return self.stock > 0

p = Produit("Clavier", Decimal("89.90"), 12)
print(p.en_stock())  # True
```

### 4.5 `typing` — annotations utiles pour l'auto-complétion

```python
from typing import Iterable

def noms_en_stock(produits: Iterable[Produit]) -> list[str]:
    return [p.nom for p in produits if p.en_stock()]
```

### 4.6 `Decimal` — l'argent ne s'écrit pas en `float`

```python
from decimal import Decimal

# ❌ float : 0.1 + 0.2 = 0.30000000000000004
# ✅ Decimal : exact
prix = Decimal("89.90") + Decimal("19.90")
print(prix)  # 109.80
```

---

## 5. Lancer le REPL du TP d'instrumentation

```bash
cd tp-instrumentation
python3 -i amorce.py
# → vous êtes dans le REPL, tout est chargé (modèles, semer(), recharger_urls(), montrer())
```

Testez :

```python
>>> from django.urls import resolve
>>> resolve("/api/produits/")
# → doit afficher la route, la vue, kwargs (si vous avez déjà écrit urlpatterns)
```

---

## 6. Checklist de fin de séance

- [ ] `python3 -V` ≥ 3.10
- [ ] `.venv` créé et activé
- [ ] `pip install -r requirements.txt` OK
- [ ] `python verifier.py` → 22/22 vert
- [ ] REPL `amorce.py` démarre sans erreur
- [ ] Les 6 motifs Python (4.1–4.6) ont été testés dans le REPL

---

> **Note** : ce TP ne produit pas de livrable à rendre. C'est la fondation — si une brique manque, tout le reste branle. Prenez le temps.
