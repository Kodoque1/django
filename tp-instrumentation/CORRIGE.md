# Corrigé — TP « Instrumenter Django »

**Document enseignant. À ne pas distribuer avant la séance.**

Le code complet et exécutable est dans **`verifier.py`** : chaque bloc y porte le numéro de l'étape
de la fiche et se termine par les mêmes assertions. Lancez-le avant chaque séance —

```bash
python verifier.py        # → « 22 étapes vérifiées — environnement conforme »
```

Ce fichier-ci ne répète pas le code. Il donne, pour chaque étape : **la réponse attendue**, les
**prédictions fausses à prévoir** avec le message correctif à donner *à celle-là précisément*, et le
coup de pouce à sortir quand quelqu'un s'enlise.

> Rappel de méthode, qui vaut pour tout le TP : ne corrigez **jamais** une prédiction avant qu'elle
> soit écrite. Un étudiant qui a écrit « 1 requête » puis lu « 9 » a appris quelque chose ; le même
> à qui on a dit « attention, ça fait 9 » n'a rien appris. La valeur pédagogique de ce TP est
> entièrement dans l'écart entre la prédiction et la mesure. Si vous ne deviez tenir qu'une consigne
> de surveillance : passez dans les rangs pendant la phase de prédiction, pas pendant l'exécution.

---

## Temps 0 — Mise en route

**Attendu** : 8 produits, 3 catégories, 17 avis. `Produit.objects.filter(stock=0)` → *Écran portable
15 pouces*, seul produit en rupture.

**Ce qu'on veut faire remarquer** : il n'y a ni projet, ni `manage.py`, ni serveur. `startproject`
n'est pas Django, c'est une commodité. Beaucoup d'étudiants croient l'inverse et n'osent rien
essayer hors d'un projet complet.

**Si `verifier.py` échoue** — dans l'ordre :

| Message | Cause | Remède |
|---|---|---|
| `ModuleNotFoundError: django` | venv pas activé | `source .venv/bin/activate` |
| `Django==3.2…` affiché en fin de script | Django système pris à la place | recréer le venv, `pip install -r requirements.txt` |
| `SyntaxError` sur `match`/`f"{x=}"` | Python < 3.10 | Django 5.2 exige 3.10 minimum |

---

## Temps 1 — L'URL et le routage

### 1.1 — `resolve()`

**Attendu** : `route='produits/<int:pk>/'`, `func=produit_detail`, `url_name='produit-detail'`,
`kwargs={'pk': 12}` et **`type(pk) is int`**.

| Prédiction fausse | Message correctif à donner |
|---|---|
| « `pk` sera `"12"` » | Regardez le type : `int`. Une URL est un texte, donc `12` y est bien une chaîne — mais `<int:pk>` la **convertit** avant d'appeler la vue. C'est la seule ligne de votre code où cette conversion a lieu. |
| « `resolve` renvoie l'URL » | `resolve` va dans l'autre sens : URL → vue. C'est `reverse` qui fait URL ← nom. Vous les verrez côte à côte en 1.6. |
| « ça appelle la vue » | Non, et c'est le sujet de 1.2 : `resolve` ne fait que le routage. `appels` est resté vide. |

**Extension si le groupe est rapide** : retirer `int:` de la route, rejouer. `pk` redevient `'12'` et
`/produits/abc/` **cesse** de faire 404 — la vue reçoit `'abc'` et plante en 500. Le convertisseur
était donc aussi une validation.

### 1.2 — Le 404 avant la vue

**Attendu** : `Resolver404`, `appels == []`. `e.args[0]["tried"]` liste les deux routes essayées.

| Prédiction fausse | Message correctif |
|---|---|
| « la vue est appelée puis renvoie 404 » | `appels` est vide : la fonction n'a jamais tourné. Un 404 de routage ne coûte **rien** à votre code métier — c'est aussi pour ça qu'il est sans danger. |
| « ça renvoie `None` » | `resolve` lève. Django transforme ensuite cette exception en réponse 404 dans le gestionnaire ; à ce niveau, c'est une exception Python. |

### 1.3 — Le fragment

**Attendu** : `{'tri': ['prix'], 'q': ['clavier sans fil']}`, pas de `#` dans `get_full_path()`.

Les deux explications demandées sont **de nature différente**, et c'est tout l'intérêt de la
question :

- `#avis` a disparu parce que **le navigateur ne l'envoie pas** : le fragment est traité côté
  client, il ne fait pas partie de la requête HTTP. Rien à voir avec Django.
- `%20` est devenu une espace parce que **Django a décodé** la query string. Là, c'est bien le
  serveur qui travaille.

| Prédiction fausse | Message correctif |
|---|---|
| « `request.GET['fragment']` vaudra `avis` » | Le fragment n'est pas un paramètre. Regardez `QUERY_STRING` dans `META` : il n'y est pas non plus. Il n'a jamais traversé le réseau. |
| « Django l'a filtré » | Django n'a rien filtré : il n'a jamais rien reçu. Vérifiable au `curl -v` du TP réseau. |
| valeurs prédites en `str` et non en `list` | `request.GET` est un `QueryDict` : `?t=a&t=b` est légal, donc les valeurs sont des listes. `getlist()` les donne toutes, `["t"]` ne donne que la dernière — silencieusement. |

### 1.4 — Encodage

**Attendu** : `clavier+sans+fil` → `"clavier sans fil"` · `a%2Bb` → `"a+b"` · `a+b` → `"a b"` ·
`urlencode({"q": "50 €"})` → `q=50+%E2%82%AC` · `quote("écran 27")` → `%C3%A9cran%2027`.

| Prédiction fausse | Message correctif |
|---|---|
| « `a+b` donnera `a+b` » | Dans une query string, `+` **vaut une espace** — héritage des formulaires HTML. Pour un `+` littéral, il faut `%2B`. |
| « `%20` et `+` c'est pareil partout » | Pas dans le **chemin** : là, `+` reste un `+` et l'espace s'écrit `%20`. Deux règles dans la même URL. D'où `urlencode()` pour la query, `quote()` pour le chemin. |
| « il faut échapper soi-même » | Non — c'est la conclusion de l'étape : on n'assemble **jamais** une URL à la main. |

### 1.5 — Le slash

**Attendu** : `301` vers `/produits/12/`, `appels == []` puis `[12]` après redirection ; **deux
aller-retours**. En POST + `DEBUG=True` : `RuntimeError`. En POST + `DEBUG=False` : `301` silencieux,
le navigateur repasse en GET, **le corps est perdu**.

C'est l'étape la plus importante du temps 1. Prenez le temps.

| Prédiction fausse | Message correctif |
|---|---|
| « 404 » | Non : `CommonMiddleware` et `APPEND_SLASH` rattrapent. C'est justement ce qui rend le bug invisible. |
| « la vue est appelée quand même » | `appels` est vide au premier appel : la réponse vient du middleware, avant tout routage réussi. |
| « ça ne change rien, juste un peu plus lent » | Sur un GET, oui. Sur un POST, vous perdez le corps de la requête. Faites-leur relire le message de la `RuntimeError` en entier — Django l'a écrit pour ça. |
| « en prod ça lèvera l'erreur aussi » | Non, et c'est le pire des deux mondes : en dev ça crie, en prod ça se tait. Un bug qui n'existe pas sur le poste du développeur. |

**Question orale à poser** : *où avez-vous déjà écrit une URL sans slash final ?* Réponse attendue :
dans un `action=` de formulaire, dans un `fetch()`, dans une collection Postman.

### 1.6 / 1.7 — `reverse` et les convertisseurs

**Attendu** : `/produits/12/`, `/categories/ecran/`, `NoReverseMatch` sur `pk="abc"`. Après avoir
renommé la route en `articles/<int:pk>/`, `reverse()` renvoie `/articles/12/` **sans qu'on touche au
reste**. `slug` refuse `écran` (motif `[-a-zA-Z0-9_]+`).

Le point à faire passer : `name=` n'est pas décoratif. Sans lui, l'URL est recopiée dans les
templates, les vues, les tests, le JS — et un renommage devient une chasse au `grep`.

---

## Temps 2 — Les middlewares

### 2.1 — L'aller et le retour

**Attendu** : `['Chrono →', 'process_view(liste_produits)', 'VUE', 'Chrono ←']`.

| Prédiction fausse | Message correctif |
|---|---|
| `process_view` avant `Chrono →` | `__call__` s'exécute d'abord : `process_view` n'est appelé qu'**après le routage**, ce qui explique qu'il reçoive `view_func` et `view_kwargs`. |
| « `Chrono ←` puis `VUE` » | Regardez la ligne `self.get_response(request)` : c'est un appel bloquant. Tout Django se passe *dedans*. Ce qui est écrit après ne s'exécute qu'au retour. |
| « `__init__` à chaque requête » | Une seule fois, au démarrage du serveur. Un middleware est instancié une fois et réutilisé — n'y stockez donc **jamais** d'état lié à une requête : il fuirait d'un utilisateur à l'autre. |

Ce dernier point mérite d'être dit à voix haute au groupe entier : c'est une faille de sécurité
classique, pas une subtilité de style.

### 2.2 / 2.3 — Court-circuit et ordre

**Attendu** : sans badge, 403, `VUE` absent. Avec `Chrono` **au-dessus**, `X-Duree-ms` est présent
(il voit passer le 403 au retour) ; avec `Chrono` **en dessous**, l'en-tête disparaît.

| Prédiction fausse | Message correctif |
|---|---|
| « l'ordre ne change que la performance » | Le code de retour est le même, mais la **mesure a disparu**. Votre supervision ne verrait plus aucune requête refusée — précisément celles qu'on surveille. |
| « le 403 vient de la vue » | La vue n'a pas tourné : `trace` ne contient pas `VUE`. |
| « `return None` fait continuer » | Vrai pour `process_view`. Pour `__call__`, ce qui fait continuer c'est **d'appeler `get_response`**. Ne pas l'appeler, c'est répondre à la place de toute la suite. |

**2.4 est obligatoire.** Un `Videur` oublié fait échouer les temps 3 et 4 avec des 403 inexplicables.
Si trois personnes lèvent la main avec « mon API répond 403 », dites-le au groupe entier plutôt qu'un
par un.

**Réponse au livrable** : `SecurityMiddleware` est en haut parce qu'il doit agir sur **toutes** les
réponses, y compris celles que les autres middlewares court-circuitent (redirection HTTPS, en-têtes
de sécurité). `CommonMiddleware` est plus bas parce que son travail (`APPEND_SLASH`) suppose que la
requête est déjà passée par la session et l'authentification.

---

## Temps 3 — L'ORM

### 3.1 — Paresse

**Attendu** : 0 requête à la construction, 1 après `list(qs)`.

| Prédiction fausse | Message correctif |
|---|---|
| « 1 puis 2 » | `filter()` ne va pas en base : il **décrit**. Chaque `.filter()`/`.order_by()` renvoie un nouveau QuerySet, toujours non exécuté. |
| « `print(qs.query)` exécute » | Non : il **compile** vers du SQL et l'affiche. C'est le meilleur outil pour vérifier ce que l'ORM a compris de votre code. |

Déclencheurs à faire lister par le groupe : itération, `list()`, `len()`, `bool()`, tranche indexée,
`repr()` dans un REPL. Ce dernier explique pourquoi « ça marche dans le shell et pas dans le code ».

### 3.2 / 3.3 — Le N+1

**Attendu** : `9` puis `1` (clé étrangère, `select_related`) — `9` puis **`2`** (relation inverse,
`prefetch_related`).

| Prédiction fausse | Message correctif |
|---|---|
| « 1 requête, l'ORM optimise » | 9. Django ne devine pas ce dont vous aurez besoin : chaque `p.categorie` est un aller-retour. C'est la panne la plus fréquente en production Django. |
| « 8 » | 9 : une pour la liste des produits, **plus** une par produit. D'où le nom N+1. |
| **« `prefetch_related` → 1 »** | **2**, et c'est la surprise de l'étape. `select_related` fait une jointure SQL (possible seulement vers un « un seul »). `prefetch_related` fait une requête **par table** et recolle en Python — obligatoire pour un « plusieurs », car une jointure dupliquerait chaque produit autant de fois qu'il a d'avis. |

Si quelqu'un a prédit 1 pour `prefetch_related`, son modèle mental est « c'est pareil, en mieux ».
C'est la confusion à casser : ce sont **deux stratégies différentes**, imposées par la cardinalité,
pas deux niveaux d'optimisation.

### 3.4 — `connection.queries`

**Attendu** : 1 en `DEBUG=True`, **0** en `DEBUG=False`, 1 avec `CaptureQueriesContext` dans les deux
cas.

Message à faire écrire dans le compte rendu : *« le jour où je mesure en préproduction,
`connection.queries` me répondra 0 et je conclurai que tout va bien. »* C'est le piège, et il est
sérieux.

Enchaînez sur `assertNumQueries(3)` : la même mesure, mais **dans la CI**. C'est la version durable
du feedback — le jour où quelqu'un ajoute un N+1, le test le dit, six mois plus tard, sans vous.

### 3.5 — L'exercice des logs

**Attendu** : 4 lignes (1 + 3), des `str`, format `(0.000) SELECT …`.

Réponses aux trois questions :

1. **Faisable** : `grep -c`.
2. **Faisable mais pénible** : il faut écrire un parseur pour normaliser les paramètres et regrouper.
3. **Impossible** : le log ne contient aucune pile d'appel. Rien ne relie une requête SQL à la ligne
   de code qui l'a déclenchée.

C'est la conclusion à faire formuler par les étudiants eux-mêmes, pas à annoncer :

> Un log est une **projection déjà rendue**. On peut le lire, on ne peut pas l'interroger. Une sonde
> manipule des **objets** ; un log manipule du **texte**.

Et immédiatement le contrepoint, sinon le message est faux : en production il n'y a **que ça**. Pas
de notebook, pas de toolbar, pas de point d'arrêt. Savoir activer `django.db.backends`, reconnaître
un N+1 à l'œil dans un flot de lignes identiques et corriger, c'est un réflexe de garde. Le log
n'est simplement ni l'outil avec lequel on *apprend*, ni celui avec lequel on *mesure*.

**Chronométrez vraiment les 20 minutes.** Cet exercice est conçu pour être un peu frustrant ; laissé
libre, il déborde et perd son effet.

---

## Temps 4 — DRF

### 4.1 — Verbe → action

**Attendu** : collection → `{'get': 'list', 'post': 'create'}` ; élément →
`{'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}`.

Le point à souligner : **ni `PUT` ni `DELETE` sur la collection**. On ne remplace pas « toutes les
ressources ». Deux URL, six comportements — c'est ça, « RESTful ».

### 4.2 — Les codes

| Appel | Code | Ce qu'on veut entendre |
|---|---|---|
| `GET /api/produits/` | 200 | — |
| `GET /api/produits/1/` | 200 | — |
| `POST /api/produits/` | **201** | pas 200 : « j'ai créé » ≠ « voilà » |
| idem, une 2ᵉ fois | **201**, id différent | POST n'est pas idempotent |
| `PUT /api/produits/1/` | 200 | voir 4.3 |
| `DELETE /api/produits/8/` | **204** | pas « 200 avec un corps vide » : le corps est vide **par contrat** |
| `POST /api/produits/1/` | **405** | seul code produit sans regarder les données |
| `GET /api/produits/9999/` | 404 | l'URL est valide, la ressource n'existe pas |

| Prédiction fausse | Message correctif |
|---|---|
| « le 2ᵉ POST → 200, ou 409 » | 201 et un **nouvel identifiant**. Rien n'empêche deux ressources identiques : c'est la définition de « non idempotent ». Un 409 supposerait une contrainte d'unicité, que ce modèle n'a pas. |
| « `POST /api/produits/1/` → 404 » | 405 : l'URL **existe**, c'est le verbe qui n'y est pas branché. 404 dirait « cette ressource n'existe pas », ce qui serait faux. |
| « DELETE → 200 » | 204. Le client n'a rien à lire, et ne doit pas essayer. |

### 4.3 — PUT partiel — l'étape à ne pas rater

**Attendu** : sans `categorie` → **400**. Sans `stock` mais avec `categorie` → **200 et
`stock` inchangé (12)**. `PATCH {"prix": …}` → 200, tout le reste intact.

`{n: f.required …}` donne : `{'id': False, 'nom': True, 'prix': True, 'stock': False,
'categorie': True}`.

**Les trois hypothèses de la fiche sont vraies — selon le champ.** C'est le résultat qu'on veut, et
il contredit ce que le jeu du Jour 1 laissait croire.

| Prédiction fausse | Message correctif |
|---|---|
| « (b) `stock` remis à 0 » | Non : `stock` a un défaut **au niveau du modèle**, donc `required=False` dans le sérialiseur, donc son absence est tolérée et l'ancienne valeur survit. Sur ce champ, PUT s'est comporté comme PATCH. |
| « (a) 400 dans tous les cas » | Seulement si un champ **requis** manque. `categorie` est requis, `stock` ne l'est pas. |
| « DRF me protège, donc PUT est sûr » | À moitié. Il protège sur les champs requis, pas sur les autres — et c'est vos **modèles** qui décident lesquels le sont, souvent sans que vous y ayez pensé. |

**La phrase à faire écrire** : *la sémantique « remplace tout » appartient au protocole HTTP ; ce que
fait réellement votre API, c'est le sérialiseur qui le décide.* La ligne `{n: f.required …}` est le
vrai contrat de l'API — plus fiable que n'importe quelle documentation.

### 4.4 — Le 400

**Attendu** : 400, et un corps listant les **trois** champs fautifs : `nom` (vide), `prix` (pas un
nombre), `categorie` (n'existe pas).

Point à faire : le code d'état donne la **catégorie** du problème, le corps dit **lequel**. Une API
qui répond `400` sans corps oblige le client à deviner champ par champ.

### 4.5 — 401 vs 403

**Attendu** :

| Situation | Code |
|---|---|
| `TokenAuthentication`, sans identifiant | **401** + `WWW-Authenticate: Token` |
| `SessionAuthentication`, sans identifiant | **403**, pas d'en-tête |
| bon jeton | 200 |
| mauvais jeton | 401 |
| bon jeton, permission `is_staff` | **403** + le `message` de la permission |

| Prédiction fausse | Message correctif |
|---|---|
| « 401 dans les deux cas » | Un `401` **doit** s'accompagner d'un `WWW-Authenticate` disant *comment* s'identifier. Avec `SessionAuthentication`, DRF n'a rien à proposer (on ne renvoie pas un formulaire de connexion à un client d'API) : il bascule sur 403. |
| « 403 = pas connecté » | L'inverse. **401 = « je ne sais pas qui tu es » ; 403 = « je sais, et c'est non ».** Le dernier cas le montre : utilisateur parfaitement authentifié, et pourtant 403. |
| « le code ne dépend que de la permission » | Il dépend aussi de ce que le serveur est **capable de proposer** au client. C'est la nuance que le jeu *Le triage* ne pouvait pas donner. |

### 4.6 — Le N+1 caché dans la sérialisation

**Attendu** : `1` → `17` → `2`.

`17` = 1 (liste) + 8 (`categorie`) + 8 (`avis`). La correction ne se fait **pas** dans le
sérialiseur mais sur le `queryset` du ViewSet :

```python
queryset = Produit.objects.select_related("categorie").prefetch_related("avis").order_by("id")
```

| Prédiction fausse | Message correctif |
|---|---|
| « 1, c'est déclaratif » | 17. Deux champs déclaratifs, seize requêtes — et **aucune boucle visible** dans votre code. C'est la panne la plus fréquente des API DRF en production. |
| tentative de correction dans le sérialiseur | Le sérialiseur ne choisit pas comment les objets sont chargés ; il les reçoit. C'est le `queryset` du ViewSet qui décide. |
| « 2 requêtes, c'est encore trop » | Non : `select_related` joint (0 requête de plus), `prefetch_related` en ajoute exactement une par relation « plusieurs ». 2 est l'optimum ici. |

---

## Temps 5 — django-debug-toolbar

**Réponses attendues** :

1. Panneau **SQL** : le compte total, le nombre de requêtes **similaires** (surlignées — c'est
   exactement le N+1 du temps 3), la durée cumulée.
2. La **pile d'appel** de chaque requête répond à la question 3 du temps 3, celle que les logs
   laissaient sans réponse. C'est *la* raison d'utiliser la toolbar plutôt que les logs en
   développement.
3. Même mouvement qu'en 4.6, mais dans un vrai projet.
4. Panneau **Temps** : sur une page qui fait un N+1, la part SQL domine — ce qui explique pourquoi
   une correction d'une ligne peut diviser un temps de réponse par dix.

**Les deux pannes garanties**, dans l'ordre de fréquence :

1. `INTERNAL_IPS` absent ou mal renseigné → la barre ne s'affiche jamais, sans erreur.
2. Réponse **non-HTML** : la toolbar s'injecte dans la page. Sur une API JSON pure, elle ne montre
   rien — il faut le panneau *Historique*, ou revenir aux instruments du temps 3.

Le point 2 vaut mieux qu'un dépannage : c'est la leçon de la séance. **Tout instrument a un domaine
de validité, et savoir où il s'arrête fait partie du fait de savoir s'en servir.**

---

## Tableau de synthèse — corrigé

| Je veux savoir… | Instrument | Pourquoi celui-là |
|---|---|---|
| quelle vue répond à cette URL | `resolve()` | rend un **objet** : route, vue, kwargs typés |
| si mon code fait un N+1 | `CaptureQueriesContext` | compte, quel que soit `DEBUG` |
| l'ordre réel de mes middlewares | une sonde maison de 8 lignes | rien d'autre ne montre le retour |
| ce qui s'est passé cette nuit à 3 h en production | les **logs** | seule chose qui subsiste après coup |
| pourquoi cette page met 2 secondes | **django-debug-toolbar** | panneaux SQL + Temps, avec la pile d'appel |
| si ma correction tient dans six mois | `assertNumQueries` dans la CI | la seule mesure qui survit à son auteur |

Ligne à faire remarquer : **il n'y a pas d'instrument universel**. Le notebook est imbattable sur les
objets Python, inutile sur le réseau (d'où `curl`/Postman au TP du Jour 2), et absent en production
(d'où les logs). Un développeur senior ne connaît pas un outil de plus : il sait lequel prendre.

---

## Grille de correction

| Critère | Points | Ce qu'on regarde vraiment |
|---|---|---|
| Prédictions écrites avant exécution | 5 | **la présence de prédictions fausses.** Un compte rendu où tout est juste a été écrit après coup : plafonner à 2. |
| Chaque étape close par une assertion | 4 | des `assert` avec un **message** utile, pas des `assert x == 9` nus |
| `Chrono` + explication de l'ordre | 3 | l'explication compte plus que le code |
| N+1 fabriqué, mesuré, corrigé, re-mesuré | 4 | les **quatre** temps ; « j'ai ajouté `select_related` » sans mesure vaut 1 |
| Analyse de 4.3 | 2 | a-t-il compris que c'est le sérialiseur, pas HTTP ? |
| Tableau de synthèse | 2 | la ligne « production » est la plus discriminante |

**Signal d'alerte** : un compte rendu sans aucune prédiction fausse. Le dire sans agressivité, mais
le dire — c'est le seul endroit du TP où on peut tricher, et c'est aussi le seul où il y avait
quelque chose à apprendre.

## Minutage réel constaté

| Temps | Prévu | À surveiller |
|---|---|---|
| 0 | 20 min | l'installation déborde toujours ; faites-la lancer avant la pause |
| 1 | 55 min | 1.5 (le slash) mérite 15 min à lui seul, ne pas le bâcler |
| 2 | 45 min | 2.1 est le plus long à taper ; ne pas laisser copier-coller |
| 3 | 40 + 20 | 3.5 **chronométré**, sinon il mange le temps 4 |
| 4 | 60 + 10 | 4.6 saute en premier si vous êtes en retard |
| 5 | 30 min | à faire pendant le projet du Jour 3, pas en bloc |

Si vous devez couper : **gardez 1.5, 3.2/3.3 et 4.3.** Ce sont les trois étapes où la mesure
contredit ce que les étudiants croyaient savoir — le reste confirme, ce qui est utile mais moins.
