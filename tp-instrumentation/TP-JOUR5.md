# TP Jour 5 — Projet complet en groupe (monôme)

> **Durée** : journée complète  |  **Évaluation** : QCM + TP individuel + soutenance
> **Modalité** : monôme (1 étudiant = 1 projet complet)

---

## 0. Objectif final

Livrer une application Django REST complète :
- Modèles cohérents (au moins 3 modèles liés)
- API CRUD complète avec pagination, filtres, recherche
- Authentification par jeton + permissions (lecture/écriture selon rôle)
- Consommation de l'API par un client (script, frontend minimal, ou Postman collection)
- Sécurisation : pas de fuite de données, permissions respectées

---

## 1. Cahier des charges minimal (obligatoire)

| Exigence | Détail |
|----------|--------|
| **Modèles** | ≥ 3 modèles avec relations (FK, ManyToMany) — ex: `Client`, `Commande`, `LigneCommande`, `Produit`, `Categorie` |
| **API** | CRUD complet sur chaque ressource (`ListCreate`, `RetrieveUpdateDestroy`) |
| **Pagination** | `PageNumberPagination`, `PAGE_SIZE = 10` |
| **Filtres** | `SearchFilter` + `OrderingFilter` sur champs pertinents |
| **Auth** | `TokenAuthentication` + `SessionAuthentication` |
| **Permissions** | Au moins 2 rôles (ex: `admin` / `client`) avec permissions distinctes |
| **Client** | Script Python (`requests`) qui démonstre : liste, création, lecture, modif, suppression |
| **Données** | Jeu de données cohérent semé au démarrage (`migrate` + script de seed) |

---

## 2. Sujets suggérés (choisir UN)

| Sujet | Modèles principaux | Rôles |
|-------|-------------------|-------|
| **E-commerce minimal** | `Produit`, `Categorie`, `Commande`, `LigneCommande`, `Client` | `admin` (gère catalogue), `client` (passe commande) |
| **Gestion de bibliothèque** | `Livre`, `Auteur`, `Genre`, `Emprunt`, `Adherent` | `bibliothecaire` (gère catalogue), `adherent` (emprunte) |
| **Suivi de tâches (Kanban)** | `Projet`, `Colonne`, `Tache`, `Commentaire`, `Membre` | `chef` (gère projet), `membre` (crée/déplace tâches) |
| **API météo / IoT** | `Station`, `Mesure`, `TypeCapteur`, `Alerte` | `admin` (config), `station` (pousse mesures) |

---

## 3. Structure attendue du dépôt rendu

```
mon-projet/
├── config/                 # settings, urls principaux
├── core/                   # app principale (modèles, vues, serializers, permissions)
├── manage.py
├── requirements.txt        # Django, DRF, django-debug-toolbar, requests
├── seed.py                 # script de peuplement (idempotent)
├── client.py               # script de démo consommation API
├── README.md               # 1 page : lancement, endpoints, comptes de test
└── .gitignore              # venv, __pycache__, db.sqlite3, *.pyc
```

---

## 4. Étapes recommandées (timeboxing)

| Temps | Activité |
|-------|----------|
| 0:00–0:30 | `django-admin startproject`, config `settings.py`, `INSTALLED_APPS`, `REST_FRAMEWORK` |
| 0:30–1:30 | Modèles + migrations + `seed.py` |
| 1:30–2:30 | Sérialiseurs + Vues (CRUD) + URLs |
| 2:30–3:00 | Pagination + filtres + test manuel (Postman/curl) |
| 3:00–3:30 | `TokenAuthentication` + permissions custom (`IsAdminOrReadOnly`, `IsOwnerOrReadOnly`) |
| 3:30–4:00 | Création users + tokens + test 401/403 |
| 4:00–4:30 | `client.py` qui démonstre tout le cycle |
| 4:30–5:00 | `django-debug-toolbar` sur une page liste → repérer un N+1, le corriger |
| 5:00–5:30 | Nettoyage, `README.md`, `requirements.txt` à jour, commit final |

---

## 5. `requirements.txt` type

```txt
Django>=5.2,<5.3
djangorestframework>=3.16,<4
django-debug-toolbar>=6.0,<8
requests>=2.31,<3
```

---

## 6. `seed.py` type (idempotent, réutilisable)

```python
#!/usr/bin/env python3
"""Peuplement idempotent — relançable sans doublons."""
import os, sys, django
from decimal import Decimal

BASE = os.path.dirname(__file__)
sys.path.insert(0, BASE)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import Categorie, Produit, Client, Commande, LigneCommande

def reset():
    LigneCommande.objects.all().delete()
    Commande.objects.all().delete()
    Produit.objects.all().delete()
    Categorie.objects.all().delete()
    Client.objects.all().delete()

def seed():
    reset()
    cat1 = Categorie.objects.create(nom="Claviers", slug="clavier")
    cat2 = Categorie.objects.create(nom="Écrans", slug="ecran")
    p1 = Produit.objects.create(nom="Mécanique 87t", prix=Decimal("89.90"), stock=12, categorie=cat1)
    p2 = Produit.objects.create(nom="Sans fil", prix=Decimal("45.00"), stock=30, categorie=cat1)
    p3 = Produit.objects.create(nom="27\" 144Hz", prix=Decimal("329.00"), stock=4, categorie=cat2)
    cli = Client.objects.create(nom="Alice", email="alice@test.com")
    cmd = Commande.objects.create(client=cli, statut="en_cours")
    LigneCommande.objects.create(commande=cmd, produit=p1, quantite=1, prix_unitaire=p1.prix)
    LigneCommande.objects.create(commande=cmd, produit=p3, quantite=1, prix_unitaire=p3.prix)
    print(f"OK : {Produit.objects.count()} produits, {Commande.objects.count()} commandes")

if __name__ == "__main__":
    seed()
```

---

## 7. `client.py` type (démo complète)

```python
#!/usr/bin/env python3
"""Client de démo — couvre tout le cycle CRUD + auth."""
import requests, sys

BASE = "http://127.0.0.1:8000/api"
TOKEN_ADMIN = "remplacez_par_vrai_token_admin"
TOKEN_CLIENT = "remplacez_par_vrai_token_client"

def h(token): return {"Authorization": f"Token {token}", "Content-Type": "application/json"}

def test_cycle():
    # 1. Admin crée un produit
    r = requests.post(f"{BASE}/produits/", headers=h(TOKEN_ADMIN), json={
        "nom": "Test Jour 5", "prix": "19.90", "stock": 5, "categorie_id": 1
    })
    assert r.status_code == 201, f"Admin POST failed: {r.text}"
    pid = r.json()["id"]
    print(f"✅ Admin crée produit #{pid}")

    # 2. Client lit (OK)
    r = requests.get(f"{BASE}/produits/{pid}/", headers=h(TOKEN_CLIENT))
    assert r.status_code == 200, f"Client GET failed: {r.text}"
    print("✅ Client lit le produit")

    # 3. Client tente de modifier (403)
    r = requests.patch(f"{BASE}/produits/{pid}/", headers=h(TOKEN_CLIENT), json={"stock": 0})
    assert r.status_code == 403, f"Client PATCH should be 403, got {r.status_code}"
    print("✅ Client bloqué en écriture (403)")

    # 4. Admin supprime
    r = requests.delete(f"{BASE}/produits/{pid}/", headers=h(TOKEN_ADMIN))
    assert r.status_code == 204, f"Admin DELETE failed: {r.text}"
    print("✅ Admin supprime")

    print("\n🎉 TOUS LES TESTS PASSENT — Projet Jour 5 VALIDE")

if __name__ == "__main__":
    test_cycle()
```

---

## 8. Critères d'évaluation (grille)

| Critère | Points | Validé si |
|---------|--------|-----------|
| Modèles & migrations | 15 | `makemigrations`/`migrate` propres, relations cohérentes |
| API CRUD complète | 20 | GET/POST liste, GET/PUT/PATCH/DELETE détail sur ≥3 ressources |
| Pagination & filtres | 10 | `?page=2`, `?search=`, `?ordering=` fonctionnent |
| Authentification (Token) | 15 | 401 sans token, 200 avec token valide, `WWW-Authenticate` présent |
| Permissions (rôles) | 15 | Admin écrit, client lit seulement, 403 bien retourné |
| Client de démo | 10 | `client.py` tourne sans erreur, couvre CRUD + auth |
| Code quality | 10 | Pas de N+1 (debug-toolbar), `select_related`/`prefetch_related`, code lisible |
| README & lancement | 5 | `pip install -r requirements.txt && python manage.py migrate && python seed.py && python manage.py runserver` fonctionne |

**Total : 100 pts** — seuil de validation : 70/100.

---

## 9. Pièges à éviter (checklist anti-régression)

- [ ] `TokenAuthentication` dans `DEFAULT_AUTHENTICATION_CLASSES` (pas seulement `SessionAuthentication`)
- [ ] `IsAuthenticated` (ou custom) dans `DEFAULT_PERMISSION_CLASSES` — pas `AllowAny`
- [ ] `select_related`/`prefetch_related` sur les queryset de liste (sinon N+1 visible dans debug-toolbar)
- [ ] `WWW-Authenticate: Token` dans la réponse 401 (sinon le client ne sait pas comment s'authentifier)
- [ ] `seed.py` idempotent (relançable sans erreur, IDs fixes pour les tests)
- [ ] `requirements.txt` épinglé (pas de `>=` sans borne haute)
- [ ] Pas de `print()` en production, pas de `DEBUG=True` en dépôt rendu

---

## 10. Soutenance (5 min par étudiant)

1. Démonstration live : `client.py` tourne → 2 min
2. Question technique : « Où est le N+1 et comment l'avez-vous corrigé ? » → 1 min
3. Question sécurité : « Pourquoi 401 et pas 403 ici ? » → 1 min
4. Question architecture : « Pourquoi `select_related` sur la FK mais `prefetch_related` sur le reverse ? » → 1 min

---

> **Rappel** : ce TP est **individuel** (monôme). Pas de code partagé, pas de copier-coller entre voisins. Le but est que CHACUN puisse reconstruire l'application de zéro.
