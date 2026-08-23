# TP Jour 4 — Application sécurisée : autorisations + authentification par jeton

> **Durée** : 55 min  |  **Support** : ce fichier + projet Jour 3 + Postman/`curl`

---

## 0. Objectif

Sécuriser l'API catalogue : créer des utilisateurs, protéger les endpoints, distinguer **authentification** (qui es-tu ?) et **autorisation** (as-tu le droit ?), et mettre en place l'authentification par jeton (TokenAuthentication) pour les clients non-navigateurs.

---

## 1. Reprendre le projet Jour 3

```bash
cd jour3-projet   # ou le dossier où est votre projet
source .venv/bin/activate
python manage.py runserver &
```

---

## 2. Utilisateurs & jetons — shell

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

# Utilisateur "admin" (staff)
admin = User.objects.create_user("admin", "admin@test.com", "admin123")
admin.is_staff = True
admin.is_superuser = True
admin.save()
Token.objects.create(user=admin)  # jeton admin

# Utilisateur "client" standard
client = User.objects.create_user("client", "client@test.com", "client123")
Token.objects.create(user=client)  # jeton client

# Voir les jetons
for t in Token.objects.all():
    print(f"{t.user.username}: {t.key}")
exit()
```

---

## 3. Activer TokenAuthentication — `config/settings.py`

```python
REST_FRAMEWORK = {
    # ... pagination, filtres existants ...
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",     # API clients
        "rest_framework.authentication.SessionAuthentication",   # navigateur
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",  # défaut : connecté requis
    ],
}
```

> **Important** : `rest_framework.authtoken` doit être dans `INSTALLED_APPS` (déjà fait si vous avez suivi le TP d'instrumentation).
>
> **L'ordre compte.** Quand un refus d'authentification arrive, DRF construit l'en-tête
> `WWW-Authenticate` à partir du **premier** authentificateur de la liste
> (`authenticators[0].authenticate_header()`). `SessionAuthentication` n'en fournit
> pas : mis en tête, il transforme le 401 attendu en 403. `TokenAuthentication`
> en première position garantit le couple 401 + `WWW-Authenticate: Token`.

---

## 4. Tester l'authentification

### Sans credentials → 401

```bash
curl -i http://127.0.0.1:8000/api/produits/
# HTTP/1.1 401 Unauthorized
# WWW-Authenticate: Token
```

### Avec jeton valide → 200

```bash
# Remplacez par le vrai jeton affiché plus haut
TOKEN="9944b0912e5f4a1c8d3e7f2a1b6c8d9e0f1a2b3c"
curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/produits/
# 200 + liste JSON
```

### Avec jeton invalide → 401

```bash
curl -H "Authorization: Token invalide123" http://127.0.0.1:8000/api/produits/
# 401 + WWW-Authenticate: Token
```

---

## 5. Permissions par vue — `catalogue/views.py`

```python
from rest_framework import generics, permissions
from .models import Produit, Categorie
from .serializers import ProduitSerializer, CategorieSerializer

# Permission custom : lecture pour tout utilisateur AUTHENTIFIÉ, écriture pour admin
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user and request.user.is_staff

class ProduitListCreate(generics.ListCreateAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer
    permission_classes = [IsAdminOrReadOnly]  # <- AJOUT

class ProduitDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.select_related("categorie").all()
    serializer_class = ProduitSerializer
    lookup_field = "pk"
    permission_classes = [IsAdminOrReadOnly]

# Catégories : même règle
class CategorieListCreate(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [IsAdminOrReadOnly]

class CategorieDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    lookup_field = "pk"
    permission_classes = [IsAdminOrReadOnly]
```

> **Piège** : `permission_classes = [IsAdminOrReadOnly]` **remplace** le défaut
> `IsAuthenticated` de `settings.py`. Si `has_permission` rend `True` pour les méthodes
> sûres sans vérifier l'identité, un client anonyme lit la liste — et le 401 attendu
> n'arrive jamais. D'où le `is_authenticated` dans la branche lecture ci-dessus.

---

## 6. Tester les permissions

| Requête | User `client` (jeton client) | User `admin` (jeton admin) |
|---------|-------------------------------|----------------------------|
| `GET /api/produits/` | ✅ 200 | ✅ 200 |
| `POST /api/produits/` | ❌ 403 | ✅ 201 |
| `PUT /api/produits/1/` | ❌ 403 | ✅ 200 |
| `DELETE /api/produits/1/` | ❌ 403 | ✅ 204 |

```bash
# Client tente de créer → 403
curl -X POST -H "Authorization: Token $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","prix":"10.00","stock":5,"categorie_id":1}' \
  http://127.0.0.1:8000/api/produits/
# 403 Forbidden

# Admin crée → 201
curl -X POST -H "Authorization: Token $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nom":"Admin crée","prix":"99.00","stock":1,"categorie_id":1}' \
  http://127.0.0.1:8000/api/produits/
# 201 Created
```

---

## 7. Permission au niveau objet (ownership) — optionnel

Seul le créateur peut modifier/supprimer *ses* produits.

```python
# catalogue/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Suppose que Produit a un champ `cree_par = ForeignKey(User)`
        return obj.cree_par == request.user
```

Puis dans la vue :

```python
permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

---

## 8. Checklist de fin de séance

- [ ] `TokenAuthentication` activée dans `settings.py`
- [ ] Au moins 2 utilisateurs avec jetons créés via shell
- [ ] `GET` sans token → 401 + `WWW-Authenticate: Token`
- [ ] `GET` avec token valide → 200
- [ ] Permission custom `IsAdminOrReadOnly` écrite et appliquée
- [ ] Client (non-staff) : lecture OK, écriture → 403
- [ ] Admin (staff) : lecture + écriture OK

---

## 9. Erreurs fréquentes

| Symptôme | Cause |
|----------|-------|
| `401` même avec bon token | `TokenAuthentication` pas dans `DEFAULT_AUTHENTICATION_CLASSES` |
| `403` au lieu de `401` sans token | `SessionAuthentication` en première position de la liste (il ne fournit pas de `WWW-Authenticate`) — mettre `TokenAuthentication` en premier |
| `403` pour admin sur POST | `is_staff` pas `True` sur l'utilisateur |
| `ImproperlyConfigured: 'rest_framework.authtoken'` | App pas dans `INSTALLED_APPS` |

---

## 10. Rappel — 401 vs 403

| Code | Signification | Quand |
|------|---------------|-------|
| **401** | « Je ne sais pas qui tu es » | Pas de token, token invalide, token expiré |
| **403** | « Je sais qui tu es, et c'est non » | Token valide mais permission refusée |

C'est la distinction clé du Jour 4 — ne les confondez pas.
