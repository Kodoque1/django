# TP — Instrumenter Django : mesurer ce que le framework fait vraiment

**Module de rattachement** : *API en Python — Django RESTful Web Services pour de l'I.A.*
(Mastère Dév, Data & IA — 4ᵉ année, IPSSI)
**Support complémentaire** : le module `cours/J1-01-architecture-restful/index.html` (Web mondial,
URL, suite de protocoles, méthodes HTTP, codes d'état) et ses cinq jeux.
**Créneaux** : la fiche se joue **en cinq temps répartis du Jour 2 au Jour 5** — voir le tableau
ci-dessous. Chaque temps est autonome : on peut en jouer un sans avoir joué les précédents.
**Modalité** : individuel ou binôme, au poste
**Prérequis** : Python (fonctions, classes, `assert`), avoir joué les jeux du Jour 1

| Temps | Quand | Durée | Sujet | Instrument |
|---|---|---|---|---|
| 0 | J1 (fin) ou J2 (début) | 20 min | Monter l'environnement | `verifier.py` |
| 1 | J2 | 55 min | L'URL et le routage | `resolve` / `reverse` / `test.Client` |
| 2 | J2 ou J3 | 45 min | Les middlewares | **votre propre sonde** |
| 3 | J3 | 40 + 20 min | L'ORM et le compte des requêtes | `CaptureQueriesContext`, puis les logs |
| 4 | J4–J5 | 60 + 10 min | DRF : verbe, validation, permission | `test.Client` + `assert` |
| 5 | J3 (en parallèle du projet) | 30 min | Le même travail dans un vrai projet | `django-debug-toolbar` |

---

## Pourquoi ce TP

Le Jour 1 vous a **affirmé** des choses. Que le fragment `#avis` ne quitte jamais le navigateur. Que
`/produits/abc/` renvoie 404 *sans que la vue soit appelée*. Qu'une URL sans slash final provoque une
redirection. Que `POST` n'est pas idempotent, que `PUT` remplace, que 401 et 403 ne disent pas la
même chose. Les jeux vous ont donné un feedback à chaque erreur, et vous avez fini avec un bilan vert.

Un bilan vert ne prouve qu'une chose : **vous avez retenu ce qu'on vous a dit.**

Ce TP fait l'étape suivante, celle qui manque presque toujours. Vous allez reprendre ces affirmations
une par une et les **mettre à l'épreuve sur le produit lui-même**. Pas les relire : les mesurer. Et
comme toute mesure honnête, certaines vont vous surprendre — il y a au moins trois endroits dans
cette fiche où le résultat contredit ce que vous croyez avoir compris. C'est le but.

Trois principes tiennent toute la fiche :

1. **On prédit avant d'exécuter.** Chaque étape commence par une question à laquelle vous répondez
   *par écrit*, avant de lancer la cellule. Une prédiction fausse notée noir sur blanc s'apprend ;
   un résultat lu sans avoir parié ne s'apprend pas. C'est la seule consigne vraiment non
   négociable de ce TP.
2. **Chaque étape se termine par une assertion.** Pas par « ça a l'air bon » : par un `assert` qui
   passe ou qui casse. Le message d'erreur que vous écrivez dans l'`assert` est exactement ce que les
   jeux appelaient un *feedback* — sauf que cette fois, c'est vous qui l'écrivez.
3. **On construit la sonde avant de s'en servir.** Au temps 2 vous n'utiliserez pas un outil de
   mesure : vous en écrirez un, en quinze lignes. On ne comprend un instrument qu'en l'ayant fabriqué.

Une remarque de méthode, héritée du TP Postgres : distinguez **ce qui se transporte** d'une machine à
l'autre et ce qui ne se transporte pas. Ici la base est en SQLite, *en mémoire* : toutes les durées
que vous lirez seront à `0.000 s`. Elles sont sans valeur. Le **nombre de requêtes**, lui, est vrai
partout — sur votre portable comme sur le serveur de production. C'est donc lui qu'on mesure.

## Objectifs pédagogiques

À l'issue du TP, l'étudiant·e doit être capable de :

1. **Démarrer un Django complet sans projet**, et savoir dire ce que `settings.configure()` et
   `django.setup()` font chacun.
2. **Inspecter une route** avec `resolve()` / `reverse()` : nom de route, vue appelée, paramètres et
   leur **type Python** après conversion.
3. **Prouver** qu'un 404 de routage n'atteint jamais la vue, et qu'une URL sans slash final coûte un
   aller-retour supplémentaire — et le corps d'un POST.
4. **Écrire un middleware-sonde** et en déduire l'ordre réel de traversée, aller et retour.
5. **Compter les requêtes SQL** d'un bloc de code ou d'une requête HTTP, fabriquer un N+1 puis le
   corriger, et savoir pourquoi `connection.queries` ne doit jamais servir à compter.
6. **Rattacher un code d'état à sa cause** dans DRF : 201 vs 200, 204, 400 de validation, 401 vs 403,
   405 — en produisant chacun volontairement.
7. **Lire le panneau SQL de django-debug-toolbar** sur un vrai projet et y retrouver le N+1 fabriqué
   au temps 3.

## Lancer l'environnement

```bash
cd tp-instrumentation
python3 -m venv .venv
source .venv/bin/activate        # Windows PowerShell : .venv\Scripts\Activate.ps1
pip install -r requirements.txt

python verifier.py               # doit finir par « environnement conforme »
```

> `verifier.py` rejoue **toutes** les mesures de cette fiche. S'il passe, votre poste est bon. C'est
> aussi le corrigé exécutable : ne l'ouvrez pas avant d'avoir cherché.

Puis, pour travailler — au choix :

```bash
python3 -i amorce.py             # le plus simple : un REPL, tout est déjà chargé
```

```bash
jupyter lab                      # si vous préférez le notebook
```

Dans un notebook, la **première cellule** est toujours celle-ci :

```python
exec(open("amorce.py").read())
semer()
```

> ⚠️ **Le piège du notebook**, et il coûte cher : les cellules gardent leur état, et vous pouvez les
> exécuter dans le désordre. Un résultat obtenu dans un ordre que vous ne savez pas reproduire ne
> vaut rien. Règle du TP : **au moindre doute, *Restart Kernel & Run All*.** Et rappelez `semer()`
> en tête de chaque temps : la base revient exactement à son état de départ, identifiants compris.

### Ce que contient `amorce.py`

Un Django complet **sans projet** : pas de `startproject`, pas de `manage.py`, pas de serveur. Trois
modèles (`Categorie`, `Produit`, `Avis`), une base SQLite en mémoire, huit produits. Trois outils :

| Outil | Rôle |
|---|---|
| `semer()` | remet la base à zéro, avec des identifiants **fixes** (le produit 1 est toujours le même) |
| `recharger_urls()` | **à appeler après chaque modification de `urlpatterns`** — voir ci-dessous |
| `montrer(reponse)` | résume une réponse HTTP en une ligne : code, `Location`, vue, début du corps |

> ⚠️ Django met en cache l'arbre des routes au premier accès. Si vous redéfinissez `urlpatterns`
> sans appeler `recharger_urls()`, **vous testerez l'ancienne table** et vous chercherez l'erreur
> pendant vingt minutes. C'est le premier réflexe à prendre.

Ce que l'amorce ne fait **pas** : aucune URL, aucune vue, aucun sérialiseur. C'est votre travail.

## Ce qu'on manipule ↔ ce qu'on a vu au Jour 1

| Dans le TP | Affirmation du cours à éprouver | D'où elle vient |
|---|---|---|
| `resolve("/produits/12/")` | « l'URL désigne une ressource, le serveur la décode » | Jeu **Anatomie d'une URL** |
| `Resolver404` + compteur d'appels | « `abc` → 404, la vue n'est jamais appelée » | Jeu **Anatomie d'une URL**, frame finale |
| `request.GET` après un `#avis` | « le fragment ne part jamais sur le réseau » | Jeu **Anatomie d'une URL** |
| `%20` / `+` / `%2B` | l'encodage — que le jeu ne faisait qu'**expliquer** | Jeu **Anatomie d'une URL**, encart |
| 301 de `APPEND_SLASH` | « sans slash final, Django redirige » | Jeu **Anatomie d'une URL** + `path()` |
| Middleware `Chrono` écrit par vous | « la requête traverse des couches » | Jeu **Emballer, envoyer, déballer** |
| Middleware `Videur` qui coupe | l'encapsulation a un sens : on peut s'arrêter en route | Jeu **Emballer, envoyer, déballer** |
| `CaptureQueriesContext`, N+1 | *(rien — le Jour 1 ne pouvait pas le montrer)* | nouveau |
| POST × 2 → 2 ressources | « POST n'est pas idempotent » | Jeu **Le bon verbe** |
| PUT partiel | « PUT remplace la ressource entière » | Jeu **Le bon verbe** — **à nuancer, voir 4.3** |
| 201 / 204 / 400 / 401 / 403 / 405 | « chaque code dit une chose précise » | Jeu **Le triage** |
| Panneau SQL de la toolbar | — | nouveau |

---

# Temps 0 — Mise en route (20 min)

Faites tourner `verifier.py`. Puis ouvrez un REPL (ou un notebook, cellule d'amorce déjà jouée)
et interrogez la base :

```python
semer()

Produit.objects.count(), Categorie.objects.count()
Produit.objects.first().nom
Produit.objects.filter(stock=0).values_list("nom", flat=True)
```

> **À noter** : vous venez d'interroger une base de données Django sans `manage.py`, sans projet et
> sans serveur. Regardez `amorce.py` : `settings.configure()` remplit le `settings.py` qu'on n'a pas
> écrit, `django.setup()` charge les apps et le registre des modèles. Tout le reste — `startproject`,
> l'arborescence, `wsgi.py` — c'est de la **commodité**, pas du nécessaire. Le savoir change la façon
> dont on lit un projet Django.

**Question de départ, à noter dans votre compte rendu** : listez les trois affirmations du Jour 1 que
vous vous sentez le moins capable de justifier. On y reviendra à la fin.

---

# Temps 1 — L'URL et le routage (J2, 55 min)

```python
semer()

from django.http import JsonResponse
from django.urls import path, resolve, reverse, Resolver404, NoReverseMatch
from django.test import Client

appels = []                      # notre première sonde : qui appelle la vue, et combien de fois

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
```

### 1.1 — Ce que `resolve()` sait (10 min)

> **Prédisez d'abord.** `resolve("/produits/12/")` renvoie un objet. Écrivez ce que vous pensez y
> trouver. Et surtout : **`pk` sera-t-il l'entier `12` ou la chaîne `"12"` ?**

```python
m = resolve("/produits/12/")
m.route, m.func.__name__, m.url_name, m.view_name
m.kwargs, {k: type(v).__name__ for k, v in m.kwargs.items()}
```

**Vérifiez** :

```python
assert m.kwargs == {"pk": 12}
assert isinstance(m.kwargs["pk"], int), \
    "pk est arrivé en str : avez-vous écrit <pk> au lieu de <int:pk> ?"
```

> **À noter** : une URL est un **texte**. `12` y est forcément une suite de caractères. Le
> convertisseur `<int:…>` est le seul endroit où cette chaîne devient un entier Python — et il fait
> aussi office de filtre. Retirez le `int:` de la route, rejouez (sans oublier `recharger_urls()`),
> et regardez ce que devient le type. C'est la même information que le jeu *Anatomie d'une URL*
> donnait sur `path("produits/<int:pk>/")`, mais cette fois vous l'avez lue dans l'objet.

### 1.2 — Le 404 arrive avant la vue (5 min)

> **Prédisez.** `resolve("/produits/abc/")` : que se passe-t-il ? Et surtout — la fonction
> `produit_detail` sera-t-elle appelée, oui ou non ?

```python
appels.clear()
try:
    resolve("/produits/abc/")
except Resolver404 as e:
    print("Resolver404 :", sorted(e.args[0]))
appels
```

**Vérifiez** :

```python
assert appels == [], \
    "la vue a été appelée : le 404 ne vient donc pas d'elle. Relisez la trace."
```

> **À noter** : `e.args[0]["tried"]` liste **toutes** les routes essayées, dans l'ordre. C'est
> exactement ce que Django affiche sur sa page jaune de debug. Vous savez maintenant d'où elle sort.

### 1.3 — Le fragment ne part jamais (10 min)

> **Prédisez.** On demande `/produits/12/?tri=prix&q=clavier%20sans%20fil#avis`. Écrivez ce que
> contiendra `request.GET` — **exactement**, clés et valeurs.

```python
c = Client()
r = c.get("/produits/12/?tri=prix&q=clavier%20sans%20fil#avis")

montrer(r)
dict(r.wsgi_request.GET)
r.wsgi_request.get_full_path()
r.wsgi_request.META["QUERY_STRING"]
```

**Vérifiez** :

```python
assert dict(r.wsgi_request.GET) == {"tri": ["prix"], "q": ["clavier sans fil"]}
assert "#" not in r.wsgi_request.get_full_path(), \
    "le fragment serait arrivé au serveur — impossible, il n'est jamais envoyé."
```

Deux choses à expliquer dans votre compte rendu, et elles sont différentes :

- pourquoi `#avis` a disparu ;
- pourquoi `%20` est devenu une espace, alors que `#avis` n'a pas simplement été « décodé ».

> **À noter** : `request.GET` est un `QueryDict`, et ses valeurs sont des **listes**. `?t=a&t=b` est
> une URL parfaitement légale. `r.GET["t"]` vous donnerait `"b"` en silence ; `r.GET.getlist("t")`
> vous donne les deux. Beaucoup de bugs de filtres vivent exactement là.

### 1.4 — `%20`, `+`, `%2B` (10 min)

Le jeu du Jour 1 vous avait *expliqué* l'encodage. Ici, on le mesure.

> **Prédisez.** Trois requêtes : `?q=clavier+sans+fil`, `?q=a%2Bb`, `?q=a+b`. Que vaut `q` dans
> chaque cas ?

```python
c.get("/produits/12/?q=clavier+sans+fil").wsgi_request.GET["q"]
c.get("/produits/12/?q=a%2Bb").wsgi_request.GET["q"]
c.get("/produits/12/?q=a+b").wsgi_request.GET["q"]

from urllib.parse import urlencode, quote
urlencode({"q": "clavier sans fil", "prix": "50 €"})
quote("écran 27 pouces")
```

**Vérifiez** :

```python
assert c.get("/produits/12/?q=a%2Bb").wsgi_request.GET["q"] == "a+b", \
    "un '+' littéral doit être encodé %2B, sinon il devient une espace."
assert urlencode({"q": "50 €"}) == "q=50+%E2%82%AC"
assert quote("écran 27") == "%C3%A9cran%2027"
```

> **À noter** : deux règles d'encodage cohabitent dans une même URL. Dans la **query string**, un `+`
> vaut une espace (héritage des formulaires HTML). Dans le **chemin**, non : une espace s'écrit
> `%20`. D'où la seule consigne qui tienne : **on n'assemble jamais une URL à la main.**
> `urlencode()` pour la query string, `quote()` pour le chemin, et `reverse()` pour tout le reste.

### 1.5 — Ce que coûte un slash oublié (10 min)

> **Prédisez.** `GET /produits/12` (sans slash final). Code de retour ? La vue est-elle appelée ?
> Combien d'aller-retours au total pour que l'utilisateur voie sa page ?
> Puis la vraie question : **et si c'était un POST avec un formulaire de 30 champs ?**

```python
appels.clear()
r = c.get("/produits/12")
montrer(r), appels

r = c.get("/produits/12", follow=True)
r.redirect_chain, appels
```

```python
c.post("/produits/12", {"nom": "x"})          # ← lisez le message en entier
```

```python
settings.DEBUG = False                         # simulons la production
montrer(c.post("/produits/12", {"nom": "x"}))
settings.DEBUG = True
```

**Vérifiez** :

```python
assert r.redirect_chain == [("/produits/12/", 301)]
assert appels == [12], "la vue n'est appelée qu'après la redirection : ça fait 2 aller-retours."
```

> **À noter**, et c'est le point le plus important du temps 1 : en `DEBUG=True`, Django **hurle** —
> il lève une `RuntimeError` qui vous explique que le corps d'un POST ne survit pas à une
> redirection. En production, il ne dit plus rien : il renvoie un 301, le navigateur repasse en
> **GET**, et les 30 champs du formulaire disparaissent **en silence**. Un slash oublié dans un
> `<form action="…">` produit un bug qui n'existe pas sur le poste du développeur. C'est le genre de
> chose qu'un jeu peut affirmer et qu'on ne croit vraiment qu'après l'avoir vu.

### 1.6 — Dans l'autre sens (5 min)

```python
reverse("produit-detail", kwargs={"pk": 12})
reverse("categorie-detail", args=["ecran"])
reverse("produit-detail", kwargs={"pk": "abc"})       # ← lisez l'erreur
```

**Vérifiez** :

```python
assert reverse("produit-detail", kwargs={"pk": 12}) == "/produits/12/"
```

Puis, sans toucher au reste, **changez la route** en `path("articles/<int:pk>/", …)`, rappelez
`recharger_urls()`, et rejouez le `reverse()`.

> **À noter** : `reverse()` a suivi. Tout le code qui écrivait `"/produits/%d/" % pk` en dur serait
> cassé. Une route a **deux sens de lecture**, et n'en utiliser qu'un revient à recopier la même
> information à trente endroits. `resolve()` et `reverse()` sont réciproques : c'est le sens du
> `name=` que vous mettiez sans y penser.

### 1.7 — Les convertisseurs sont des filtres (5 min)

```python
resolve("/categories/ecran/").kwargs
resolve("/categories/écran/")                  # ← que se passe-t-il ?
```

> **À noter** : `slug` vaut `[-a-zA-Z0-9_]+`. Pas d'accent, pas d'espace. Un convertisseur n'est pas
> qu'un décodeur : c'est la **première validation** de votre application, et elle s'exécute avant
> toute ligne de votre code. `str` (sans slash), `int`, `slug`, `uuid`, `path` (avec slashs) — et
> vous pouvez écrire les vôtres.

**Livrable du temps 1** : vos prédictions écrites, celles qui étaient fausses **surlignées**, et
trois phrases sur 1.5 (le slash) telles que vous les expliqueriez à quelqu'un dont le formulaire
perd ses données une fois en ligne.

---

# Temps 2 — La requête traverse : écrire sa propre sonde (J2/J3, 45 min)

Jusqu'ici vous avez utilisé des instruments fournis par Django. Maintenant vous en fabriquez un.

```python
import time
from django.http import JsonResponse, HttpResponseForbidden
from django.urls import path
from django.test import Client

trace = []

def liste_produits(request):
    trace.append("VUE")
    return JsonResponse({"n": Produit.objects.count()})

urlpatterns = [path("produits/", liste_produits, name="produit-liste")]
recharger_urls()
```

### 2.1 — L'aller et le retour (15 min)

Un middleware, c'est une classe avec deux méthodes. Écrivez celle-ci **en la tapant**, pas en la
copiant : chaque ligne compte.

```python
class Chrono:
    """Une sonde : elle mesure, elle ne décide rien."""

    def __init__(self, get_response):
        self.get_response = get_response          # appelé UNE fois, au démarrage

    def __call__(self, request):
        trace.append("Chrono →")
        debut = time.perf_counter()
        reponse = self.get_response(request)      # ← tout le reste de Django se passe ICI
        reponse["X-Duree-ms"] = f"{(time.perf_counter() - debut) * 1000:.1f}"
        trace.append("Chrono ←")
        return reponse

    def process_view(self, request, view_func, view_args, view_kwargs):
        trace.append(f"process_view({view_func.__name__})")
        return None                               # None = « continue »
```

> **Prédisez.** Dans quel ordre les quatre marques vont-elles apparaître dans `trace` ?

```python
settings.MIDDLEWARE = ["django.middleware.common.CommonMiddleware", "__main__.Chrono"]

trace.clear()
r = Client().get("/produits/")
trace
r.headers["X-Duree-ms"]
```

**Vérifiez** :

```python
assert trace == ["Chrono →", "process_view(liste_produits)", "VUE", "Chrono ←"]
```

> **À noter** : la ligne `self.get_response(request)` est la charnière. Ce qui est **avant**
> s'exécute à l'aller, ce qui est **après** au retour — et un même objet voit donc passer la requête
> puis la réponse. `process_view` est un troisième point, plus tardif : à ce moment-là le routage a
> déjà eu lieu, et c'est pour ça que vous recevez `view_func` et `view_kwargs`. Retrouvez-y la
> couche du jeu *Emballer, envoyer, déballer* : on emballe à l'aller, on déballe au retour, dans
> l'ordre inverse.
>
> Vous venez de gagner l'en-tête `X-Duree-ms` sur **toutes** les réponses de l'application, en huit
> lignes. C'est la forme minimale de ce que font tous les outils d'observabilité.

### 2.2 — Un middleware qui décide (15 min)

```python
class Videur:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        trace.append("Videur →")
        if request.GET.get("badge") != "ok":
            trace.append("Videur ✋")
            return HttpResponseForbidden("badge exigé")   # on NE rappelle PAS get_response
        return self.get_response(request)
```

> **Prédisez.** Avec `MIDDLEWARE = ["__main__.Chrono", "__main__.Videur"]` et une requête sans
> badge : quel code ? la vue est-elle appelée ? l'en-tête `X-Duree-ms` est-il présent ?

```python
settings.MIDDLEWARE = ["__main__.Chrono", "__main__.Videur"]

trace.clear()
r = Client().get("/produits/")
r.status_code, trace, r.headers.get("X-Duree-ms")

trace.clear()
r = Client().get("/produits/?badge=ok")
r.status_code, trace
```

**Vérifiez** :

```python
trace.clear()
r = Client().get("/produits/")

assert r.status_code == 403
assert "VUE" not in trace, "la vue a été atteinte alors que le Videur devait couper."
assert "X-Duree-ms" in r.headers, "Chrono est au-dessus du Videur : il voit passer le 403 au retour."
```

> **À noter** : ne pas rappeler `get_response` **coupe** la chaîne. Tout ce qui est en dessous — les
> autres middlewares, le routage, la vue — n'existe pas pour cette requête. C'est exactement ainsi
> que fonctionnent l'authentification, le CORS, la limitation de débit, la maintenance. Et c'est
> aussi pourquoi un middleware mal placé peut faire disparaître une fonctionnalité entière sans le
> moindre message d'erreur.

### 2.3 — L'ordre n'est pas un détail de style (10 min)

> **Prédisez.** On échange les deux lignes : `["__main__.Videur", "__main__.Chrono"]`. Requête sans
> badge. Le code change-t-il ? Et l'en-tête `X-Duree-ms` ?

```python
settings.MIDDLEWARE = ["__main__.Videur", "__main__.Chrono"]

trace.clear()
r = Client().get("/produits/")
r.status_code, trace, r.headers.get("X-Duree-ms")
```

**Vérifiez** :

```python
assert "X-Duree-ms" not in r.headers, \
    "Chrono est sous le Videur : il n'a jamais été atteint, la mesure est perdue."
```

> **À noter** : même code de retour, mais **la mesure a disparu**. Votre supervision ne verrait plus
> passer aucune des requêtes refusées — c'est-à-dire précisément celles qu'on veut surveiller. Deux
> lignes échangées dans `settings.py`, aucune erreur, aucun test rouge. Regardez maintenant l'ordre
> par défaut de `MIDDLEWARE` dans un vrai `settings.py` et demandez-vous, pour chaque ligne,
> *pourquoi elle est à cette place et pas trois lignes plus bas*.

### 2.4 — Ranger derrière soi (2 min)

Le `Videur` refuse toute requête sans `?badge=ok`. Si vous le laissez branché, **tout le temps 3 et
tout le temps 4 répondront 403** et vous chercherez longtemps. Remettez une chaîne saine :

```python
settings.MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]

assert Client().get("/produits/").status_code == 200, "le Videur est encore branché."
```

> **À noter** : ce n'est pas une consigne d'intendance, c'est le sujet du temps 2. Un middleware
> agit sur **toutes** les requêtes de l'application, y compris celles auxquelles vous ne pensez pas
> en l'écrivant. C'est ce qui en fait l'outil le plus puissant du cycle Django — et le plus facile à
> se prendre dans les pieds.

**Livrable du temps 2** : votre classe `Chrono`, et un paragraphe expliquant pourquoi `Security`
est en haut de la liste par défaut et `Common` plus bas.

---

# Temps 3 — L'ORM : compter, pas chronométrer (J3, 40 min + 20 min)

```python
semer()
from django.db import connection, reset_queries
from django.test.utils import CaptureQueriesContext
```

### 3.1 — Un QuerySet ne coûte rien (10 min)

> **Prédisez.** Combien de requêtes SQL après les deux premières lignes ? après `list(qs)` ?

```python
with CaptureQueriesContext(connection) as cap:
    qs = Produit.objects.filter(stock__gt=0)
    qs = qs.order_by("prix")
    print("après construction :", len(cap.captured_queries))
    resultats = list(qs)
    print("après list(qs)     :", len(cap.captured_queries))

print(qs.query)          # le SQL, sans l'exécuter
```

**Vérifiez** :

```python
assert len(cap.captured_queries) == 1
```

> **À noter** : un `QuerySet` est **paresseux**. Tant que personne ne le parcourt, ce n'est qu'une
> description. D'où deux conséquences pratiques : on peut le construire par morceaux dans plusieurs
> fonctions sans payer, et `print(qs.query)` est le meilleur moyen de savoir ce que l'ORM a compris
> de votre code. Ce qui déclenche : itérer, `list()`, `len()`, `bool()`, une tranche `[:5]`
> indexée, `repr()` dans un REPL.

### 3.2 — Fabriquer un N+1 (15 min)

> **Prédisez.** La boucle ci-dessous, sur 8 produits : combien de requêtes SQL ? Écrivez le nombre.

```python
with CaptureQueriesContext(connection) as cap:
    for p in Produit.objects.all():
        _ = p.categorie.nom
len(cap.captured_queries)
```

```python
for q in cap.captured_queries[:3]:
    print(q["sql"][:90])
```

Maintenant corrigez, avec **un seul mot** :

```python
with CaptureQueriesContext(connection) as cap:
    for p in Produit.objects.select_related("categorie"):
        _ = p.categorie.nom
len(cap.captured_queries)
```

**Vérifiez** :

```python
assert len(cap.captured_queries) == 1
```

### 3.3 — Le même problème dans l'autre sens (10 min)

> **Prédisez.** Même boucle mais sur `p.avis.all()` (relation **inverse**). Combien de requêtes en
> naïf ? Et avec `prefetch_related("avis")` — **1 ou 2 ?** Réfléchissez avant de lancer.

```python
with CaptureQueriesContext(connection) as cap:
    for p in Produit.objects.all():
        _ = list(p.avis.all())
len(cap.captured_queries)

with CaptureQueriesContext(connection) as cap:
    for p in Produit.objects.prefetch_related("avis"):
        _ = list(p.avis.all())
len(cap.captured_queries)
```

**Vérifiez** :

```python
assert len(cap.captured_queries) == 2, "prefetch_related fait DEUX requêtes, pas une."
```

> **À noter** : ce ne sont pas deux variantes du même outil. `select_related` fait une **jointure
> SQL** — possible seulement vers un « un seul » (clé étrangère, `OneToOne`). `prefetch_related`
> fait **une requête par table** puis recolle en **Python** — indispensable pour un « plusieurs »,
> car une jointure y dupliquerait chaque produit autant de fois qu'il a d'avis. Si vous avez prédit
> 1, votre modèle mental était « c'est pareil en mieux ». Il ne l'est pas.

### 3.4 — Pourquoi on ne compte jamais avec `connection.queries` (5 min)

> **Prédisez.** `len(connection.queries)` après une requête, avec `DEBUG=True` puis `DEBUG=False`.

```python
reset_queries(); list(Produit.objects.all())
print("DEBUG=True  →", len(connection.queries))

settings.DEBUG = False
reset_queries(); list(Produit.objects.all())
print("DEBUG=False →", len(connection.queries))

with CaptureQueriesContext(connection) as cap:
    list(Produit.objects.all())
print("DEBUG=False + CaptureQueriesContext →", len(cap.captured_queries))
settings.DEBUG = True
```

**Vérifiez** :

```python
assert len(cap.captured_queries) == 1
```

> **À noter** : `connection.queries` n'enregistre que si `DEBUG=True`. Le jour où vous mesurez en
> préproduction, il vous répond `0` — et vous concluez que tout va bien. `CaptureQueriesContext`
> force le curseur de debug le temps du bloc : il compte partout. Même famille :
> `assertNumQueries(3)` dans un test, qui casse la CI le jour où quelqu'un ajoute un N+1. C'est la
> version *automatisée* du feedback : le test dit précisément ce qui a changé, sans relecture.
>
> Le même contexte compte aussi le SQL d'une **requête HTTP entière** : `CaptureQueriesContext`
> autour d'un `Client().get("/produits/")` vous dit combien de requêtes a coûté le aller-retour
> complet — c'est ainsi qu'on mesurera la liste DRF au temps 4.

### 3.5 — L'exercice des logs (20 min, chronométré)

Voici l'autre instrument, celui qu'on utilise **quand le notebook n'existe pas** : en production.

```python
import logging, io

tampon = io.StringIO()
handler = logging.StreamHandler(tampon)
journal = logging.getLogger("django.db.backends")
journal.setLevel(logging.DEBUG)
journal.addHandler(handler)

for p in Produit.objects.all()[:3]:
    _ = p.categorie.nom

journal.removeHandler(handler)
lignes = tampon.getvalue().strip().splitlines()
len(lignes), lignes[0][:80], type(lignes[0])
```

Puis, **sans utiliser `CaptureQueriesContext`**, répondez à ces trois questions à partir des seules
lignes de log :

1. Combien de requêtes ont été émises ?
2. Combien sont des doublons (même SQL, paramètres différents) ?
3. Depuis quelle ligne de **votre** code chacune a-t-elle été déclenchée ?

**Vérifiez** :

```python
assert len(lignes) == 4
assert isinstance(lignes[0], str), "on récupère du texte, pas des objets."
```

> **À noter** : la question 1 demande un `grep -c`. La question 2 demande d'écrire un parseur. La
> question 3 est **impossible** : le log ne contient aucune pile d'appel. C'est toute la différence
> entre un log et une sonde — un log est une *projection déjà rendue*, on ne peut que le lire,
> jamais l'interroger.
>
> Ce n'est pas une raison pour les mépriser. En production, il n'y a **que ça** : pas de notebook,
> pas de toolbar, pas de point d'arrêt. Savoir activer `django.db.backends`, reconnaître un N+1 à
> l'œil dans un flot de lignes identiques, et corriger — c'est un réflexe de garde. Simplement, ce
> n'est pas l'outil avec lequel on *apprend*, et ce n'est pas l'outil avec lequel on *mesure*.

**Livrable du temps 3** : un tableau à trois colonnes — *code écrit* / *requêtes SQL* / *correction*
— pour les trois situations de 3.2 et 3.3, et votre réponse argumentée à la question 3 ci-dessus.

---

# Temps 4 — DRF : verbe, validation, permission (J4–J5, 60 min + 10 de bonus)

```python
semer()
import json
from django.urls import path, include
from django.test import Client
from rest_framework import serializers, viewsets, permissions
from rest_framework.routers import DefaultRouter

class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "stock", "categorie"]

class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all().order_by("id")
    serializer_class = ProduitSerializer

def brancher(viewset):
    """Remonte le routeur sur un ViewSet et vide le cache des URL."""
    global urlpatterns
    routeur = DefaultRouter()
    routeur.register("produits", viewset, basename="produit")
    urlpatterns = [path("api/", include(routeur.urls))]
    recharger_urls()
    return routeur

routeur = brancher(ProduitViewSet)
c = Client()

def api(methode, chemin, corps=None):
    f = getattr(c, methode)
    if corps is None:
        return f(chemin)
    return f(chemin, data=json.dumps(corps), content_type="application/json")
```

### 4.1 — La table verbe → action, en clair (10 min)

Le jeu *Le bon verbe* vous a fait deviner cette table. La voici, écrite par DRF lui-même :

```python
for u in routeur.urls:
    print(f"{str(u.pattern):45} {u.name:18} {getattr(u.callback, 'actions', None)}")
```

**Vérifiez** :

```python
assert {str(u.pattern): getattr(u.callback, "actions", None)
        for u in routeur.urls}["^produits/$"] == {"get": "list", "post": "create"}
```

> **À noter** : deux URL seulement, six comportements. Sur la **collection** (`/produits/`), `GET`
> liste et `POST` crée — et il n'y a **ni `PUT` ni `DELETE`**, parce qu'on ne remplace pas « toutes
> les ressources ». Sur l'**élément** (`/produits/1/`), les quatre autres. C'est le sens de
> « RESTful » : l'URL désigne *quoi*, le verbe dit *quelle action*. Un `/api/supprimerProduit?id=1`
> mettrait l'action dans l'URL — c'est la faute que le jeu vous faisait corriger.

### 4.2 — Produire chaque code volontairement (20 min)

> **Prédisez le code de retour des huit lignes ci-dessous, dans l'ordre, avant d'exécuter.**

```python
semer()

api("get",    "/api/produits/")
api("get",    "/api/produits/1/")
api("post",   "/api/produits/", {"nom": "Souris", "prix": "25.00", "stock": 3, "categorie": 1})
api("post",   "/api/produits/", {"nom": "Souris", "prix": "25.00", "stock": 3, "categorie": 1})
api("put",    "/api/produits/1/", {"nom": "Clavier v2", "prix": "99.00", "stock": 5, "categorie": 1})
api("delete", "/api/produits/8/")
api("post",   "/api/produits/1/", {"nom": "x"})
api("get",    "/api/produits/9999/")
```

Après les deux `POST` identiques :

```python
Produit.objects.count()
Produit.objects.filter(nom="Souris").count()
```

**Vérifiez** — le bloc repart de `semer()`, pour que les identifiants soient les mêmes que les
vôtres quoi que vous ayez essayé au-dessus :

```python
semer()
souris = {"nom": "Souris", "prix": "25.00", "stock": 3, "categorie": 1}

premier = api("post", "/api/produits/", souris)
second  = api("post", "/api/produits/", souris)

assert premier.status_code == 201, "une création réussie répond 201, pas 200."
assert premier.json()["id"] != second.json()["id"], \
    "POST n'est pas idempotent : deux appels identiques = deux ressources DISTINCTES."
assert Produit.objects.filter(nom="Souris").count() == 2

assert api("delete", f"/api/produits/{second.json()['id']}/").status_code == 204
assert Produit.objects.filter(nom="Souris").count() == 1
assert api("post", "/api/produits/1/", {"nom": "x"}).status_code == 405
assert api("get", "/api/produits/9999/").status_code == 404
```

> Remarquez qu'on n'écrit **jamais** l'identifiant en dur : on relit celui que le serveur a renvoyé.
> C'est lui qui décide. Sur SQLite, les identifiants ne sont d'ailleurs jamais réutilisés après une
> suppression — supprimez le produit 12, le suivant sera le 13, pas le 12.

> **À noter** : le `405` est le seul code de la liste que le serveur produit **sans regarder vos
> données** — l'URL existe, le verbe n'y est pas branché, fin de l'histoire. Le `204` mérite qu'on
> s'y arrête : ce n'est pas « 200 avec un corps vide », c'est « c'est fait, et il n'y a rien à
> montrer ». Le corps est vide **par contrat**, un client n'a pas à le lire. Et le `201` dit ce que
> `200` ne dit pas : *j'ai créé quelque chose*.

### 4.3 — PUT remplace-t-il vraiment tout ? (15 min)

Le Jour 1 vous a dit : « `PUT` remplace la ressource entière, `PATCH` en modifie un bout ». On
vérifie.

> **Prédisez.** `PUT /api/produits/1/` avec seulement `{"nom": …, "prix": …}` — c'est-à-dire sans
> `stock` ni `categorie`. Trois hypothèses possibles : (a) 400, (b) 200 et `stock` remis à 0,
> (c) 200 et `stock` inchangé. Choisissez **avant** de lancer.

```python
semer()
{n: f.required for n, f in ProduitSerializer().fields.items()}

api("put", "/api/produits/1/", {"nom": "Amputé", "prix": "10.00"})
```

```python
api("put", "/api/produits/1/", {"nom": "Amputé", "prix": "10.00", "categorie": 1})
Produit.objects.get(pk=1).stock
```

```python
api("patch", "/api/produits/1/", {"prix": "79.00"})
Produit.objects.get(pk=1).nom, Produit.objects.get(pk=1).stock
```

**Vérifiez** :

```python
assert Produit.objects.get(pk=1).stock == 12, "le PUT n'a PAS écrasé stock."
```

> **À noter**, et c'est la surprise du temps 4 : **les trois hypothèses sont vraies, selon le champ.**
> `categorie` est requis → son absence donne 400. `stock` a un défaut au niveau du **modèle**, donc
> `required=False` dans le sérialiseur, donc son absence est tolérée **et l'ancienne valeur
> survit** : sur ce champ, `PUT` s'est comporté comme `PATCH`.
>
> Autrement dit : la sémantique « remplace tout » est celle **du protocole HTTP**. Ce que fait votre
> API, c'est le sérialiseur qui le décide — et il le décide à partir de vos modèles, souvent sans
> que vous y ayez pensé. Regardez `{n: f.required …}` : cette ligne est le vrai contrat de votre
> API. Le jeu du Jour 1 disait vrai sur HTTP ; il ne pouvait pas vous montrer ça.

### 4.4 — Le 400 qui explique (5 min)

```python
r = api("post", "/api/produits/", {"nom": "", "prix": "gratuit", "categorie": 999})
r.status_code
r.json()
```

**Vérifiez** :

```python
assert set(r.json()) == {"nom", "prix", "categorie"}
```

> **À noter** : un seul aller-retour, **trois** erreurs listées, chacune rattachée à son champ.
> Comparez avec une API qui répondrait `400 Bad Request` sans corps : le client devrait deviner, ou
> réessayer champ par champ. Le code d'état dit la *catégorie* du problème ; le corps dit *lequel*.
> Les deux sont nécessaires — c'est exactement ce que le jeu *Le triage* appelait « le code n'est
> pas un message d'erreur ».

### 4.5 — 401 ou 403 ? (10 min)

> **Prédisez.** Même permission `IsAuthenticated`, même requête sans identifiant, mais deux classes
> d'authentification différentes. Même code de retour dans les deux cas ?

```python
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication, SessionAuthentication

utilisateur = User.objects.create_user("etu", password="etu")
jeton = Token.objects.create(user=utilisateur)

class ParJeton(ProduitViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

class ParSession(ParJeton):
    authentication_classes = [SessionAuthentication]

brancher(ParJeton)
r = Client().get("/api/produits/")
r.status_code, r.headers.get("WWW-Authenticate")

brancher(ParSession)
Client().get("/api/produits/").status_code
```

```python
brancher(ParJeton)
Client().get("/api/produits/", headers={"authorization": f"Token {jeton.key}"}).status_code
Client().get("/api/produits/", headers={"authorization": "Token faux"}).status_code
```

Puis une permission qui refuse un utilisateur **pourtant identifié** :

```python
class Admins(permissions.BasePermission):
    message = "réservé aux administrateurs"
    def has_permission(self, request, view):
        return request.user.is_staff

class ReserveAdmins(ParJeton):
    permission_classes = [permissions.IsAuthenticated, Admins]

brancher(ReserveAdmins)
r = Client().get("/api/produits/", headers={"authorization": f"Token {jeton.key}"})
r.status_code, r.json()
```

**Vérifiez** :

```python
assert r.status_code == 403, "identifié mais pas autorisé : 403, jamais 401."
```

> **À noter** : la règle du jeu *Le triage* — **401 « je ne sais pas qui tu es », 403 « je sais, et
> c'est non »** — se confirme, avec une précision qu'il ne donnait pas. Un `401` **doit**
> s'accompagner d'un en-tête `WWW-Authenticate` disant *comment* s'identifier. Avec
> `SessionAuthentication`, DRF n'a aucun mécanisme à proposer (on ne renvoie pas un formulaire de
> connexion à un client d'API) : il ne peut donc pas répondre `401`, et bascule sur `403`. Le code
> d'état ne dépend pas que de votre permission : il dépend aussi de ce que le serveur est **capable
> de proposer** au client.

### 4.6 — Ce que coûtent deux lignes de sérialiseur (bonus, 10 min)

> **Prédisez.** On ajoute `categorie` et `avis` en `StringRelatedField` au sérialiseur. La liste
> renvoie 8 produits. Combien de requêtes SQL ?

```python
class ProduitDetailleSerializer(serializers.ModelSerializer):
    categorie = serializers.StringRelatedField()
    avis = serializers.StringRelatedField(many=True)
    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "categorie", "avis"]

class VueDetaillee(ProduitViewSet):
    serializer_class = ProduitDetailleSerializer

brancher(VueDetaillee)
with CaptureQueriesContext(connection) as cap:
    Client().get("/api/produits/")
len(cap.captured_queries)
```

À vous de le ramener à **2**. Un indice, un seul : la correction ne se fait pas dans le sérialiseur.

**Vérifiez** :

```python
assert len(cap.captured_queries) == 2
```

> **À noter** : deux champs déclaratifs, seize requêtes. Aucune boucle visible dans votre code — le
> N+1 est **caché dans la sérialisation**. C'est la panne la plus fréquente des API DRF en
> production, et le temps 3 vous a donné exactement l'instrument qui la révèle.

**Livrable du temps 4** : le tableau de vos huit prédictions de 4.2 face aux huit résultats, et un
paragraphe sur 4.3 — *qui*, du protocole ou du sérialiseur, décide vraiment de ce que fait un PUT.

---

# Temps 5 — Le même travail, sur un vrai projet (J3, 30 min)

Tout ce qui précède se fait sans projet et sans serveur. Pendant que vous **construisez** l'API du
Jour 3, vous voulez la même information sans quitter le navigateur.

Dans le `settings.py` de votre projet :

```python
INSTALLED_APPS = [..., "django.contrib.staticfiles", "debug_toolbar"]

MIDDLEWARE = [
    "debug_toolbar.middleware.DebugToolbarMiddleware",   # le plus haut possible
    ...
]

INTERNAL_IPS = ["127.0.0.1"]        # sans ça, la barre ne s'affiche jamais
```

Dans `urls.py` :

```python
from django.urls import include, path

urlpatterns = [
    ...,
    path("__debug__/", include("debug_toolbar.urls")),
]
```

Puis `python manage.py runserver`, et ouvrez n'importe quelle page.

**Travail demandé** :

1. Ouvrez le panneau **SQL**. Retrouvez-y les trois nombres du temps 3 : le compte, les requêtes
   **similaires** (c'est le N+1, signalé en couleur), et la durée.
2. Cliquez sur une requête, ouvrez sa **pile d'appel**. Comparez avec la question 3 du temps 3,
   celle à laquelle les logs ne pouvaient pas répondre.
3. Reproduisez le N+1 de 4.6 dans votre projet, constatez-le dans la barre, corrigez, reconstatez.
4. Ouvrez le panneau **Temps**, et notez la part du temps passée en SQL.

> **À noter** : `INTERNAL_IPS` est la cause n°1 de « la barre ne s'affiche pas ». La cause n°2 est
> une réponse qui n'est pas du HTML — la toolbar s'injecte dans la page, donc **elle ne montre rien
> d'une réponse JSON**. Pour une API pure, c'est le panneau *Historique* qu'il faut ouvrir, ou bien
> revenir aux instruments du temps 3. Un instrument a toujours un domaine de validité : savoir où
> il s'arrête fait partie du fait de savoir s'en servir.

---

## Synthèse — quel instrument pour quoi

Complétez ce tableau **de mémoire** avant de le comparer au corrigé :

| Je veux savoir… | Instrument | Pourquoi celui-là |
|---|---|---|
| quelle vue répond à cette URL | | |
| si mon code fait un N+1 | | |
| l'ordre réel de mes middlewares | | |
| ce qui s'est passé cette nuit à 3 h en production | | |
| pourquoi cette page met 2 secondes | | |
| si ma correction tient dans six mois | | |

> Reprenez enfin les **trois affirmations** que vous aviez notées au temps 0 comme les moins bien
> comprises. Lesquelles avez-vous mesurées ? Laquelle vous a le plus surpris ?

## Livrables

Un dossier `compte-rendu/` contenant :

1. `predictions.md` — vos prédictions écrites **avant** exécution, avec les fausses signalées.
   C'est la pièce la plus importante : un TP où toutes les prédictions sont justes est un TP où
   elles ont été écrites après coup.
2. `mesures.md` — les tableaux demandés aux temps 1, 3 et 4.
3. `sonde.py` — votre `Chrono` et votre `Videur`.
4. Une capture du panneau SQL de la toolbar, avant et après correction du N+1.

## Barème indicatif (20 points)

| Critère | Points |
|---|---|
| Prédictions écrites avant exécution, y compris (et surtout) les fausses | 5 |
| Chaque étape close par une assertion qui passe | 4 |
| Middleware `Chrono` fonctionnel + explication de l'ordre (temps 2) | 3 |
| N+1 fabriqué, mesuré, corrigé, re-mesuré (temps 3 et 4.6) | 4 |
| Analyse de 4.3 — protocole vs sérialiseur | 2 |
| Tableau de synthèse « quel instrument pour quoi » | 2 |

## En cas de pépin

| Symptôme | Cause | Remède |
|---|---|---|
| `ModuleNotFoundError: rest_framework` | environnement virtuel pas activé | `source .venv/bin/activate` |
| Une modification de `urlpatterns` reste sans effet | cache des routes | `recharger_urls()` |
| `Produit matching query does not exist` | données modifiées par une étape précédente | `semer()` |
| `SynchronousOnlyOperation` | ORM appelé depuis un contexte async du noyau Jupyter | `import os; os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "1"` (la variable est lue à chaque appel, donc n'importe quand avant) |
| « amorce.py a déjà été exécuté dans ce noyau » | la première cellule a été rejouée | `semer()` suffit le plus souvent ; sinon *Restart Kernel* |
| Des nombres de requêtes qui ne tombent pas juste | cellules jouées dans le désordre | *Restart & Run All*, puis `semer()` |
| La toolbar ne s'affiche pas | `INTERNAL_IPS`, ou réponse non-HTML | voir temps 5 |
