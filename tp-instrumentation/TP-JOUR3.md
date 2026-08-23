# TP Jour 3 — Projet guidé : application full-stack Django (API + consommation)

> **Durée** : 55 min  |  **Support** : ce fichier + projet du Jour 2 + `httpie`/`curl`/Postman

---

## 0. Objectif

Étendre le projet Jour 2 en vraie API REST : endpoints complets (CRUD), relations, pagination, filtres, et **consommer** l'API depuis un client Python (scripts, tests, ou notebook).

---

## 1. Reprendre le projet Jour 2

```bash
cd jour2-projet
source .venv/bin/activate
# Vérifier que tout tourne encore
python manage.py runserver &
# Test rapide
curl -s http://127.0.0.1:8000/api/produits/ | jq .
```

---

## 2. Compléter le CRUD — `catalogue/views.py`

```python
from rest_framework import generics, mixins
from .models import Produit, Categorie
from .serializers import ProduitSerializer, CategorieSerializer

# --- Produits ---
class ProduitListCreate(generics.ListCreateAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer

class ProduitDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer
    lookup_field = "pk"

# --- Catégories ---
class CategorieListCreate(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

class CategorieDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    lookup_field = "pk"
```

---

## 3. URLs complètes — `catalogue/urls.py`

```python
from django.urls import path
from .views import (
    ProduitListCreate, ProduitDetail,
    CategorieListCreate, CategorieDetail,
)

urlpatterns = [
    path("produits/", ProduitListCreate.as_view(), name="produit-list-create"),
    path("produits/<int:pk>/", ProduitDetail.as_view(), name="produit-detail"),
    path("categories/", CategorieListCreate.as_view(), name="categorie-list-create"),
    path("categories/<int:pk>/", CategorieDetail.as_view(), name="categorie-detail"),
]
```

---

## 4. Pagination & filtres (DRF natif) — `config/settings.py`

```python
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": [
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}
```

Dans `ProduitListCreate` :

```python
class ProduitListCreate(generics.ListCreateAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer
    search_fields = ["nom", "categorie__nom"]
    ordering_fields = ["prix", "stock", "nom"]
    ordering = ["nom"]
```

Test : `GET /api/produits/?search=clavier&ordering=-prix&page=1`

---

## 5. Consommer l'API — client Python (`consommer.py` à la racine)

```python
#!/usr/bin/env python3
"""Client minimal pour l'API catalogue."""
import sys
import json
from decimal import Decimal

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

BASE = "http://127.0.0.1:8000/api"

def get_all(endpoint, params=None):
    r = requests.get(f"{BASE}/{endpoint}/", params=params)
    r.raise_for_status()
    return r.json()

def post(endpoint, data):
    r = requests.post(f"{BASE}/{endpoint}/", json=data)
    r.raise_for_status()
    return r.json()

def put(endpoint, pk, data):
    r = requests.put(f"{BASE}/{endpoint}/{pk}/", json=data)
    r.raise_for_status()
    return r.json()

def delete(endpoint, pk):
    r = requests.delete(f"{BASE}/{endpoint}/{pk}/")
    r.raise_for_status()
    return r.status_code

if __name__ == "__main__":
    # 1. Lister
    print("=== Produits ===")
    data = get_all("produits")
    for p in data.get("results", data):
        print(f"  {p['id']:2d} | {p['nom']:30s} | {p['prix']:>8s} | stock {p['stock']}")

    # 2. Créer
    print("\n=== Créer un produit ===")
    nouveau = post("produits", {
        "nom": "Clavier test", "prix": "99.00", "stock": 3, "categorie_id": 1
    })
    print(f"Créé : {nouveau['id']} — {nouveau['nom']}")

    # 3. Modifier
    print("\n=== Modifier le stock ===")
    maj = put("produits", nouveau["id"], {"stock": 0})
    print(f"Stock mis à jour : {maj['stock']}")

    # 4. Supprimer
    print("\n=== Supprimer ===")
    code = delete("produits", nouveau["id"])
    print(f"Supprimé (status {code})")
```

Lancer :

```bash
pip install requests
python consommer.py
```

---

## 6. Consommer depuis un notebook (optionnel)

```bash
pip install jupyterlab
jupyter lab
```

Première cellule :

```python
import requests
BASE = "http://127.0.0.1:8000/api"
r = requests.get(f"{BASE}/produits/")
r.json()
```

---

## 7. Checklist de fin de séance

- [ ] CRUD complet : GET/POST liste, GET/PUT/DELETE détail
- [ ] Pagination fonctionne (`?page=2`)
- [ ] Filtres `search` et `ordering` fonctionnent
- [ ] Client Python `consommer.py` tourne sans erreur
- [ ] Vous savez expliquer la différence entre `ListCreateAPIView` et `RetrieveUpdateDestroyAPIView`

---

## 8. Erreurs fréquentes

| Symptôme | Cause |
|----------|-------|
| `AttributeError: 'QuerySet' object has no attribute 'select_related'` | Oublié `()` après `all` ou queryset mal chaîné |
| `404 sur /api/produits/2/` | `lookup_field = "pk"` mais URL attend `id` (par défaut OK) |
| `pagination` absente dans la réponse | `DEFAULT_PAGINATION_CLASS` pas dans `settings.py` |
| `requests` : `Connection refused` | Serveur `runserver` pas lancé ou mauvais port |

---

> **Prolongement** : ajoutez un endpoint `/api/produits/stats/` qui renvoie `{total, en_stock, rupture, valeur_stock}` via une vue `APIView` custom.
