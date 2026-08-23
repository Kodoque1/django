# TP Jour 2 — Premier projet Django + Modèle + Vue + Test API (Postman)

> **Durée** : 55 min  |  **Support** : ce fichier + `amorce.py` + Postman (ou `curl`/`httpie`)

---

## 0. Objectif

Créer un vrai projet Django (avec `manage.py`), y ajouter un modèle `Produit`, une vue DRF qui le sérialise, et tester l'endpoint `/api/produits/` — sans rien copier-coller : tout taper, tout comprendre.

---

## 1. Créer le projet (depuis un dossier vide)

```bash
mkdir jour2-projet && cd jour2-projet
python3 -m venv .venv
source .venv/bin/activate
pip install django djangorestframework
django-admin startproject config .
# Structure créée :
# config/
#   __init__.py  settings.py  urls.py  wsgi.py  asgi.py
# manage.py
```

---

## 2. Configurer `settings.py` — le minimum DRF

```python
# config/settings.py
INSTALLED_APPS = [
    # ... apps par défaut ...
    "rest_framework",           # AJOUTER
]

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}
```

---

## 3. Créer l'app `catalogue`

```bash
python manage.py startapp catalogue
# catalogue/  models.py  views.py  urls.py (à créer)  apps.py  tests.py ...
```

Dans `catalogue/apps.py` :

```python
class CatalogueConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalogue"
```

Ajouter dans `settings.py` :

```python
INSTALLED_APPS += ["catalogue"]
```

---

## 4. Modèle `Produit` — `catalogue/models.py`

```python
from django.db import models
from decimal import Decimal

class Categorie(models.Model):
    nom = models.CharField(max_length=60)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.nom

class Produit(models.Model):
    nom = models.CharField(max_length=120)
    prix = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name="produits")

    def __str__(self):
        return self.nom
```

Migrations :

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 5. Sérialiseur — `catalogue/serializers.py` (créer le fichier)

```python
from rest_framework import serializers
from .models import Produit, Categorie

class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["id", "nom", "slug"]

class ProduitSerializer(serializers.ModelSerializer):
    categorie = CategorieSerializer(read_only=True)
    categorie_id = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(), source="categorie", write_only=True
    )

    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "stock", "categorie", "categorie_id"]
```

---

## 6. Vue — `catalogue/views.py`

```python
from rest_framework import generics
from .models import Produit
from .serializers import ProduitSerializer

class ProduitListCreate(generics.ListCreateAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer
```

---

## 7. URLs — `catalogue/urls.py` (créer le fichier)

```python
from django.urls import path
from .views import ProduitListCreate

urlpatterns = [
    path("produits/", ProduitListCreate.as_view(), name="produit-list-create"),
]
```

Inclure dans `config/urls.py` :

```python
from django.urls import path, include

urlpatterns = [
    path("api/", include("catalogue.urls")),
]
```

---

## 8. Données de test — shell rapide

```bash
python manage.py shell
```

```python
from catalogue.models import Categorie, Produit
cat = Categorie.objects.create(nom="Claviers", slug="clavier")
Produit.objects.create(nom="Mécanique 87 touches", prix="89.90", stock=12, categorie=cat)
Produit.objects.create(nom="Sans fil compact", prix="45.00", stock=30, categorie=cat)
exit()
```

---

## 9. Lancer le serveur et tester

```bash
python manage.py runserver
# → http://127.0.0.1:8000/api/produits/
```

### Dans Postman (ou `curl`)

| Méthode | URL | Body (JSON) | Attendu |
|---------|-----|-------------|---------|
| GET | `http://127.0.0.1:8000/api/produits/` | — | 200 + liste JSON |
| POST | `http://127.0.0.1:8000/api/produits/` | `{"nom":"Test","prix":"10.00","stock":5,"categorie_id":1}` | 201 + objet créé |
| GET | `http://127.0.0.1:8000/api/produits/1/` | — | 404 (pas de detail view encore) |

---

## 10. Ce qu'il faut retenir (checklist mentale)

- [ ] `django-admin startproject` crée la structure, `startapp` l'app
- [ ] `INSTALLED_APPS` : ajouter `"rest_framework"` et son app
- [ ] Modèle → `makemigrations` → `migrate`
- [ ] Sérialiseur : `ModelSerializer`, champs read/write, relations imbriquées
- [ ] Vue générique : `ListCreateAPIView` = GET liste + POST création
- [ ] URLs : `path()` dans l'app, `include()` dans le projet
- [ ] Postman : tester GET et POST, regarder le corps **et** le status code

---

## 11. Erreurs fréquentes & diagnostic

| Symptôme | Cause probable |
|----------|----------------|
| `ModuleNotFoundError: catalogue` | App pas dans `INSTALLED_APPS` |
| `no such table: catalogue_produit` | `migrate` oublié |
| `404 sur /api/produits/` | URLs pas incluses dans `config/urls.py` |
| `500` sur POST | Sérialiseur invalide (champ manquant, FK mal déclarée) |
| `{"categorie":["This field is required."]}` | `categorie_id` pas `write_only` ou queryset manquant |

---

> **Prolongement** : ajoutez une vue `RetrieveUpdateDestroyAPIView` pour `/api/produits/<pk>/` et testez GET/PUT/DELETE sur une ressource unique.
