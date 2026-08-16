"""
verifier.py — rejoue toutes les mesures du TP et vérifie chaque affirmation.

Deux usages :

1. **Avant la séance**, sur la machine de la salle :

       python3 verifier.py

   Si tout passe, l'environnement est bon. Si quelque chose casse, ça casse ici
   et pas devant vingt-cinq étudiants.

2. **Comme corrigé exécutable** : chaque bloc porte le numéro de l'étape de
   `FICHE-TP.md` et se termine par les mêmes `assert` que l'étudiant doit écrire.

Ce fichier ne doit PAS être distribué aux étudiants avant le TP — il contient
toutes les réponses.
"""

import io
import json
import logging
import time

exec(open(__file__.replace("verifier.py", "amorce.py")).read())  # noqa: S102

from django.contrib.auth.models import User  # noqa: E402
from django.db import connection, reset_queries  # noqa: E402
from django.http import HttpResponseForbidden, JsonResponse  # noqa: E402
from django.test import Client  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402
from django.urls import NoReverseMatch, Resolver404, include, path, resolve, reverse  # noqa: E402
from rest_framework import permissions, serializers, viewsets  # noqa: E402
from rest_framework.authentication import SessionAuthentication, TokenAuthentication  # noqa: E402
from rest_framework.authtoken.models import Token  # noqa: E402
from rest_framework.routers import DefaultRouter  # noqa: E402

# On coupe le bruit des journaux Django (« Not Found: … », et la trace de la
# RuntimeError qu'on provoque exprès en 1.5) : ici on veut nos lignes, pas les siennes.
logging.disable(logging.CRITICAL)

etapes = []


def ok(numero, message):
    etapes.append(numero)
    print(f"  ✓ {numero:<6} {message}")


# ==========================================================================
# TEMPS 1 — l'URL et le routage
# ==========================================================================
print("\nTEMPS 1 — l'URL et le routage")
semer()

appels = []


def produit_detail(request, pk):
    appels.append(pk)
    return JsonResponse({"pk": pk, "type_python": type(pk).__name__})


def categorie_detail(request, slug):
    return JsonResponse({"slug": slug})


urlpatterns = [
    path("produits/<int:pk>/", produit_detail, name="produit-detail"),
    path("categories/<slug:slug>/", categorie_detail, name="categorie-detail"),
]
recharger_urls()

# --- 1.1 ------------------------------------------------------------------
m = resolve("/produits/12/")
assert m.route == "produits/<int:pk>/", m.route
assert m.func is produit_detail
assert m.kwargs == {"pk": 12}, m.kwargs
assert isinstance(m.kwargs["pk"], int), (
    "pk est arrivé en str : le convertisseur <int:…> n'a pas été utilisé. "
    "Avez-vous écrit <pk> au lieu de <int:pk> ?"
)
assert m.view_name == "produit-detail"
ok("1.1", "resolve() donne route, vue, kwargs — et pk est un int, pas une chaîne")

# --- 1.2 ------------------------------------------------------------------
appels.clear()
try:
    resolve("/produits/abc/")
    raise AssertionError("resolve() aurait dû lever Resolver404 sur /produits/abc/")
except Resolver404 as e:
    assert "tried" in e.args[0]
assert appels == [], (
    f"la vue a été appelée {len(appels)} fois alors que l'URL ne correspond à rien : "
    "le 404 n'est pas produit par la vue, il est produit AVANT elle."
)
ok("1.2", "/produits/abc/ → Resolver404, et la vue n'est jamais appelée")

# --- 1.3 ------------------------------------------------------------------
c = Client()
r = c.get("/produits/12/?tri=prix&q=clavier%20sans%20fil#avis")
assert r.status_code == 200
assert dict(r.wsgi_request.GET) == {"tri": ["prix"], "q": ["clavier sans fil"]}, r.wsgi_request.GET
assert "#" not in r.wsgi_request.get_full_path(), (
    "le fragment est arrivé jusqu'au serveur — impossible : il n'est jamais envoyé."
)
assert "avis" not in r.wsgi_request.META.get("QUERY_STRING", "")
ok("1.3", "le fragment #avis n'atteint jamais le serveur ; %20 est décodé en espace")

# --- 1.4 ------------------------------------------------------------------
assert c.get("/produits/12/?q=clavier+sans+fil").wsgi_request.GET["q"] == "clavier sans fil"
assert c.get("/produits/12/?q=a%2Bb").wsgi_request.GET["q"] == "a+b", (
    "un '+' littéral doit être encodé %2B, sinon il devient une espace."
)
from urllib.parse import quote, urlencode  # noqa: E402

assert urlencode({"q": "50 €"}) == "q=50+%E2%82%AC"
assert quote("écran 27") == "%C3%A9cran%2027"
ok("1.4", "dans la query string '+' vaut espace ; dans le chemin, l'espace vaut %20")

# --- 1.5 ------------------------------------------------------------------
appels.clear()
r = c.get("/produits/12")
assert r.status_code == 301, r.status_code
assert r.headers["Location"] == "/produits/12/"
assert appels == [], "la vue ne doit pas être appelée : c'est CommonMiddleware qui répond."
r = c.get("/produits/12", follow=True)
assert r.redirect_chain == [("/produits/12/", 301)]
assert appels == [12], "après la redirection, la vue est appelée une fois — donc 2 aller-retours."
try:
    c.post("/produits/12", {"nom": "x"})
    raise AssertionError("un POST sans slash aurait dû lever RuntimeError en DEBUG")
except RuntimeError as e:
    assert "maintaining POST data" in str(e)
settings.DEBUG = False
r = c.post("/produits/12", {"nom": "x"})
assert r.status_code == 301, (
    "en production Django ne prévient plus : il redirige, le navigateur repasse en GET, "
    "et le corps du POST est perdu en silence."
)
settings.DEBUG = True
ok("1.5", "APPEND_SLASH : 301 + un second aller-retour ; en POST, le corps est perdu")

# --- 1.6 ------------------------------------------------------------------
assert reverse("produit-detail", kwargs={"pk": 12}) == "/produits/12/"
assert reverse("categorie-detail", args=["ecran"]) == "/categories/ecran/"
try:
    reverse("produit-detail", kwargs={"pk": "abc"})
    raise AssertionError("reverse() aurait dû refuser pk='abc'")
except NoReverseMatch:
    pass
ok("1.6", "reverse() fabrique l'URL depuis le nom — et refuse une valeur invalide")

# --- 1.7 ------------------------------------------------------------------
assert resolve("/categories/ecran/").kwargs == {"slug": "ecran"}
try:
    resolve("/categories/écran/")
    raise AssertionError("le convertisseur slug ne devrait pas accepter un accent")
except Resolver404:
    pass
ok("1.7", "le convertisseur slug refuse les accents : [-a-zA-Z0-9_]+")


# ==========================================================================
# TEMPS 2 — la requête traverse : les middlewares
# ==========================================================================
print("\nTEMPS 2 — les middlewares")

trace = []


def liste_produits(request):
    trace.append("VUE")
    return JsonResponse({"n": Produit.objects.count()})


urlpatterns = [path("produits/", liste_produits, name="produit-liste")]
recharger_urls()


class Chrono:
    """La sonde : elle mesure, elle ne décide rien."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        trace.append("Chrono →")
        debut = time.perf_counter()
        reponse = self.get_response(request)
        reponse["X-Duree-ms"] = f"{(time.perf_counter() - debut) * 1000:.1f}"
        trace.append("Chrono ←")
        return reponse

    def process_view(self, request, view_func, view_args, view_kwargs):
        trace.append(f"process_view({view_func.__name__})")
        return None


class Videur:
    """Un middleware qui décide : il peut court-circuiter tout ce qui suit."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        trace.append("Videur →")
        if request.GET.get("badge") != "ok":
            trace.append("Videur ✋")
            return HttpResponseForbidden("badge exigé")
        return self.get_response(request)


# --- 2.1 ------------------------------------------------------------------
settings.MIDDLEWARE = ["django.middleware.common.CommonMiddleware", "__main__.Chrono"]
trace.clear()
r = Client().get("/produits/")
assert trace == ["Chrono →", "process_view(liste_produits)", "VUE", "Chrono ←"], trace
assert float(r.headers["X-Duree-ms"]) >= 0
ok("2.1", "l'oignon : Chrono → puis process_view, puis la vue, puis Chrono ←")

# --- 2.2 ------------------------------------------------------------------
settings.MIDDLEWARE = ["__main__.Chrono", "__main__.Videur"]
trace.clear()
r = Client().get("/produits/")
assert r.status_code == 403
assert "VUE" not in trace, "la vue ne doit pas être atteinte quand le Videur court-circuite"
assert trace == ["Chrono →", "Videur →", "Videur ✋", "Chrono ←"], trace
assert "X-Duree-ms" in r.headers, (
    "Chrono est AU-DESSUS du Videur : il voit passer la réponse 403 au retour."
)
trace.clear()
r = Client().get("/produits/?badge=ok")
assert r.status_code == 200 and "VUE" in trace
ok("2.2", "un middleware qui ne rappelle pas get_response coupe la chaîne")

# --- 2.3 ------------------------------------------------------------------
settings.MIDDLEWARE = ["__main__.Videur", "__main__.Chrono"]
trace.clear()
r = Client().get("/produits/")
assert r.status_code == 403
assert "X-Duree-ms" not in r.headers, (
    "Chrono est SOUS le Videur : il n'a jamais été atteint, la mesure est perdue. "
    "L'ordre de MIDDLEWARE n'est pas un détail de style."
)
ok("2.3", "inverser deux lignes de MIDDLEWARE fait disparaître la mesure")

settings.MIDDLEWARE = ["django.middleware.common.CommonMiddleware", "__main__.Chrono"]


# ==========================================================================
# TEMPS 3 — l'ORM : compter les requêtes
# ==========================================================================
print("\nTEMPS 3 — l'ORM")
semer()

# --- 3.1 ------------------------------------------------------------------
with CaptureQueriesContext(connection) as cap:
    qs = Produit.objects.filter(stock__gt=0).order_by("prix")
    assert len(cap.captured_queries) == 0, (
        "construire un QuerySet ne déclenche aucune requête : il est paresseux."
    )
    resultats = list(qs)
    assert len(cap.captured_queries) == 1
assert 'WHERE "boutique_produit"."stock" >' in str(qs.query), str(qs.query)
ok("3.1", "un QuerySet ne coûte rien tant qu'on ne le parcourt pas")

# --- 3.2 ------------------------------------------------------------------
with CaptureQueriesContext(connection) as naif:
    for p in Produit.objects.all():
        _ = p.categorie.nom
assert len(naif.captured_queries) == 9, len(naif.captured_queries)
with CaptureQueriesContext(connection) as corrige:
    for p in Produit.objects.select_related("categorie"):
        _ = p.categorie.nom
assert len(corrige.captured_queries) == 1, (
    f"select_related devait ramener à 1 requête, il y en a {len(corrige.captured_queries)}."
)
ok("3.2", "N+1 sur une clé étrangère : 9 requêtes → 1 avec select_related")

# --- 3.3 ------------------------------------------------------------------
with CaptureQueriesContext(connection) as naif:
    for p in Produit.objects.all():
        _ = list(p.avis.all())
assert len(naif.captured_queries) == 9
with CaptureQueriesContext(connection) as corrige:
    for p in Produit.objects.prefetch_related("avis"):
        _ = list(p.avis.all())
assert len(corrige.captured_queries) == 2, (
    "prefetch_related fait DEUX requêtes, pas une : une par table, puis Python recolle. "
    "Ce n'est pas une jointure."
)
ok("3.3", "relation inverse : 9 requêtes → 2 avec prefetch_related (et pas 1)")

# --- 3.4 ------------------------------------------------------------------
reset_queries()
list(Produit.objects.all())
assert len(connection.queries) == 1
settings.DEBUG = False
reset_queries()
list(Produit.objects.all())
assert len(connection.queries) == 0, (
    "connection.queries n'enregistre rien hors DEBUG — c'est pourquoi on ne compte "
    "jamais avec lui : le jour où vous mesurez en préprod, il vous répond 0."
)
with CaptureQueriesContext(connection) as cap:
    list(Produit.objects.all())
assert len(cap.captured_queries) == 1, (
    "CaptureQueriesContext force le curseur de debug : il compte même hors DEBUG."
)
settings.DEBUG = True
ok("3.4", "connection.queries est vide si DEBUG=False ; CaptureQueriesContext, non")

# --- 3.5 ------------------------------------------------------------------
tampon = io.StringIO()
handler = logging.StreamHandler(tampon)
journal = logging.getLogger("django.db.backends")
journal.setLevel(logging.DEBUG)
journal.addHandler(handler)
logging.disable(logging.NOTSET)
for p in Produit.objects.all()[:3]:
    _ = p.categorie.nom
logging.disable(logging.CRITICAL)
journal.removeHandler(handler)
lignes = tampon.getvalue().strip().splitlines()
assert len(lignes) == 4, f"attendu 1 + 3 lignes, obtenu {len(lignes)}"
assert lignes[0].startswith("(0."), lignes[0]
assert isinstance(lignes[0], str)
ok("3.5", "le logger django.db.backends donne 4 lignes — des chaînes, pas des objets")

# --- 3.6 ------------------------------------------------------------------
with CaptureQueriesContext(connection) as cap:
    Client().get("/produits/")
assert len(cap.captured_queries) == 1
ok("3.6", "on peut compter le SQL d'une requête HTTP entière")


# ==========================================================================
# TEMPS 4 — DRF : verbe, validation, permission
# ==========================================================================
print("\nTEMPS 4 — DRF")
semer()


class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "stock", "categorie"]


class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all().order_by("id")
    serializer_class = ProduitSerializer


def brancher(viewset):
    """Remonte le routeur sur un ViewSet donné et vide le cache des URL."""
    global urlpatterns
    routeur = DefaultRouter()
    routeur.register("produits", viewset, basename="produit")
    urlpatterns = [path("api/", include(routeur.urls))]
    recharger_urls()
    return routeur


routeur = brancher(ProduitViewSet)

# --- 4.1 ------------------------------------------------------------------
tables = {str(u.pattern): getattr(u.callback, "actions", None) for u in routeur.urls}
assert tables["^produits/$"] == {"get": "list", "post": "create"}, tables["^produits/$"]
assert tables["^produits/(?P<pk>[^/.]+)/$"] == {
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
}
ok("4.1", "le routeur écrit noir sur blanc la table verbe → action")

# --- 4.2 ------------------------------------------------------------------
c = Client()


def api(methode, chemin, corps=None):
    f = getattr(c, methode)
    if corps is None:
        return f(chemin)
    return f(chemin, data=json.dumps(corps), content_type="application/json")


assert api("get", "/api/produits/").status_code == 200
assert api("get", "/api/produits/1/").status_code == 200

souris = {"nom": "Souris", "prix": "25.00", "stock": 3, "categorie": 1}
premier = api("post", "/api/produits/", souris)
second = api("post", "/api/produits/", souris)
assert premier.status_code == 201, (
    f"une création réussie répond 201, pas {premier.status_code} — 200 dirait « voilà », "
    "201 dit « j'ai créé »."
)
assert premier.json()["id"] != second.json()["id"], (
    "POST n'est pas idempotent : deux appels identiques = deux ressources DISTINCTES."
)
assert Produit.objects.filter(nom="Souris").count() == 2

r = api("put", "/api/produits/1/", {"nom": "Clavier v2", "prix": "99.00", "stock": 5,
                                    "categorie": 1})
assert r.status_code == 200
# On relit l'identifiant renvoyé par le serveur : sur SQLite les identifiants ne
# sont jamais réutilisés après une suppression, les écrire en dur est un piège.
assert api("delete", f"/api/produits/{second.json()['id']}/").status_code == 204, (
    "204 = « c'est fait, et je n'ai rien à te montrer » — pas 200 avec un corps vide."
)
assert Produit.objects.filter(nom="Souris").count() == 1
assert api("post", "/api/produits/1/", {"nom": "x"}).status_code == 405
assert api("get", "/api/produits/9999/").status_code == 404
ok("4.2", "GET 200 · POST 201 (×2 = 2 ressources) · DELETE 204 · mauvais verbe 405 · 404")

# --- 4.3 ------------------------------------------------------------------
semer()
requis = {n: f.required for n, f in ProduitSerializer().fields.items()}
assert requis == {"id": False, "nom": True, "prix": True, "stock": False, "categorie": True}, requis
r = api("put", "/api/produits/1/", {"nom": "Amputé", "prix": "10.00"})
assert r.status_code == 400 and "categorie" in r.json(), r.content
r = api("put", "/api/produits/1/", {"nom": "Amputé", "prix": "10.00", "categorie": 1})
assert r.status_code == 200
assert Produit.objects.get(pk=1).stock == 12, (
    "stock a un défaut au niveau du modèle → required=False dans le sérialiseur → "
    "le PUT ne l'a pas écrasé. Le PUT n'a donc PAS remplacé toute la ressource."
)
r = api("patch", "/api/produits/1/", {"prix": "79.00"})
assert r.status_code == 200 and str(Produit.objects.get(pk=1).prix) == "79.00"
ok("4.3", "PUT exige les champs requis (400) ; ce qui a un défaut survit quand même")

# --- 4.4 ------------------------------------------------------------------
r = api("post", "/api/produits/", {"nom": "", "prix": "gratuit", "categorie": 999})
assert r.status_code == 400
erreurs = r.json()
assert set(erreurs) == {"nom", "prix", "categorie"}, erreurs
ok("4.4", "400 : le corps de la réponse dit quel champ et pourquoi, champ par champ")

# --- 4.5 ------------------------------------------------------------------
utilisateur = User.objects.create_user("etu", password="etu")
jeton = Token.objects.create(user=utilisateur)


class ParJeton(ProduitViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]


class ParSession(ParJeton):
    authentication_classes = [SessionAuthentication]


brancher(ParJeton)
r = Client().get("/api/produits/")
assert r.status_code == 401, r.status_code
assert r.headers.get("WWW-Authenticate") == "Token", (
    "401 s'accompagne toujours de WWW-Authenticate : c'est ce qui dit COMMENT s'identifier."
)
brancher(ParSession)
r = Client().get("/api/produits/")
assert r.status_code == 403, (
    "même permission, même absence d'identifiant, et pourtant 403 : SessionAuthentication "
    "ne sait pas proposer de mécanisme d'authentification, donc DRF ne peut pas répondre 401."
)
brancher(ParJeton)
assert Client().get("/api/produits/",
                    headers={"authorization": f"Token {jeton.key}"}).status_code == 200
assert Client().get("/api/produits/",
                    headers={"authorization": "Token faux"}).status_code == 401


class Admins(permissions.BasePermission):
    message = "réservé aux administrateurs"

    def has_permission(self, request, view):
        return request.user.is_staff


class ReserveAdmins(ParJeton):
    permission_classes = [permissions.IsAuthenticated, Admins]


brancher(ReserveAdmins)
r = Client().get("/api/produits/", headers={"authorization": f"Token {jeton.key}"})
assert r.status_code == 403, "identifié mais pas autorisé : 403, jamais 401."
assert "administrateurs" in r.json()["detail"]
ok("4.5", "401 = « je ne sais pas qui tu es » · 403 = « je sais, et c'est non »")

# --- 4.6 ------------------------------------------------------------------
semer()


class ProduitDetailleSerializer(serializers.ModelSerializer):
    categorie = serializers.StringRelatedField()
    avis = serializers.StringRelatedField(many=True)

    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "categorie", "avis"]


class VueDetaillee(ProduitViewSet):
    serializer_class = ProduitDetailleSerializer


brancher(ProduitViewSet)
with CaptureQueriesContext(connection) as plat:
    Client().get("/api/produits/")
brancher(VueDetaillee)
with CaptureQueriesContext(connection) as riche:
    Client().get("/api/produits/")


class VueDetailleeOptimisee(VueDetaillee):
    queryset = Produit.objects.select_related("categorie").prefetch_related("avis").order_by("id")


brancher(VueDetailleeOptimisee)
with CaptureQueriesContext(connection) as optimise:
    Client().get("/api/produits/")
assert len(plat.captured_queries) == 1
assert len(riche.captured_queries) == 17, len(riche.captured_queries)
assert len(optimise.captured_queries) == 2, (
    "le N+1 se règle sur le queryset du ViewSet, pas dans le sérialiseur."
)
ok("4.6", "1 → 17 → 2 requêtes : deux champs de sérialiseur ont coûté 16 requêtes")


print(f"\n✅ {len(etapes)} étapes vérifiées — Django {django.get_version()}, "
      f"environnement conforme.\n")
