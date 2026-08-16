# A — L'atelier de la requête

**Module II · cycle requête/réponse Django et migrations · `cours/jeux/atelier-requete/` · ~50 min**

---

## 1. Opération mentale visée

**Composer une chaîne causale, prédire son comportement, diagnostiquer une divergence.**

Le cycle MVT n'est pas une liste de quatre mots à réciter dans l'ordre. La compétence réelle
est : *j'obtiens un 500 alors que j'attendais un 404 — où, dans la chaîne, ça a dérapé ?* C'est du
débogage causal, et ça ne s'apprend qu'en câblant soi-même une chaîne qui se comporte mal.

Les niveaux 6 et 7 ajoutent une seconde opération, distincte : **planifier sous
irréversibilité**. Une migration est un coup joué sur des données réelles qu'on ne récupère pas.

## 2. Isomorphisme

Classe *Robot Odyssey*. Le joueur pose et relie les pièces réelles de Django (`path`, vue,
queryset, sérialiseur), injecte une requête, et la regarde traverser l'atelier en portant sa
charge. Ce qu'il manipule **est** ce qu'il écrira dans `urls.py` et `views.py` — le panneau de
code le montre en direct.

**Ce qui fait que ce n'est pas de l'assemblage par numéros** (test n°5) : la chaîne a de vrais
degrés de liberté, et plusieurs câblages produisent une réponse 200 correcte pour des coûts et
des comportements aux limites très différents.

| Degré de liberté | Les deux options plausibles |
|---|---|
| Ordre des `urlpatterns` | premier matché gagne — `<str:pk>` avant `<int:pk>` masque le second |
| Slash final | avec, sans, `APPEND_SLASH` — un POST sans slash **perd son corps** |
| Où vit la logique | boucle Python sur `.all()` **ou** `.filter()` en base : même résultat, coût différent |
| Récupérer un objet | `.get()` nu (→ 500) **ou** `get_object_or_404` (→ 404) **ou** `.first()` (→ `None` à gérer) |
| Traverser une clé étrangère | dans la boucle (N+1) **ou** `select_related()` |

---

## 3. Le plateau

```
   INJECTEUR                    L'ATELIER                          SORTIE
   ┌──────────────┐
   │ GET          │      ┌───────────┐    ┌──────────┐    ┌───────────┐
   │ /produits/12/│─────▶│  urls.py  │───▶│   vue    │───▶│ queryset  │──▶ (base)
   │ user: alice  │      │  ROUTEUR  │    │          │    │    ORM    │
   └──────────────┘      └───────────┘    └──────────┘    └───────────┘
                              │                 │               │
                          404 │                 │ 500           ▼
                              ▼                 ▼         ┌───────────┐
                          [ REBUT ]        [ REBUT ]      │sérialiseur│──▶ 200
                                                          └───────────┘

   JOURNAL SQL                            CODE ENGENDRÉ
   ┌────────────────────────────┐         ┌──────────────────────────────────┐
   │ 1  SELECT … FROM produit   │         │ urlpatterns = [                  │
   │ 2  SELECT … WHERE id = 3   │         │     path("produits/<int:pk>/",   │
   │ 3  SELECT … WHERE id = 7   │  ◀ N+1  │          ProduitDetail.as_view()),│
   │ …                          │         │ ]                                │
   └────────────────────────────┘         └──────────────────────────────────┘
   requêtes : 13
```

La requête est **animée** le long de la chaîne, et à chaque étape on peut ouvrir ce qu'elle
porte (chemin, `kwargs` résolus, queryset, données sérialisées). La trace de `django-lite`
(`01-django-lite.md` §0) alimente directement cet affichage.

Le rebut n'est pas décoratif : il affiche **quel motif a été essayé et pourquoi il a échoué**.

---

## 4. Niveaux

Fading : ce qui reste pré-câblé diminue à chaque niveau.

### Niveau 1 — la chaîne rompue

Tout est câblé sauf le `path`. `/produits/12/` tombe au rebut en 404. Le joueur pose la route.

Sert à établir la boucle : injecter, observer, réparer, réinjecter. Contrat : 200.

| Solution fautive plausible | Règle de diagnostic |
|---|---|
| `path("produits/", …)` sans le segment identifiant | `route-sans-pk` — « Le motif ne prévoit qu'un segment. `/produits/12/` en a deux : Django a comparé, n'a pas trouvé, et a rendu 404. Le motif de la liste et celui du détail sont deux routes distinctes. » |
| `path("produits/<int:pk>", …)` sans slash final | `route-sans-slash` — « Aucun motif ne correspond, mais `produits/12/` en aurait un : `APPEND_SLASH` renvoie un **301** vers l'URL avec slash. En GET c'est invisible ; testez le même montage en POST au niveau 3, le corps disparaît. » |

### Niveau 2 — la route masquée

Deux routes sont déjà posées, dans le mauvais ordre :

```python
urlpatterns = [
    path("produits/<str:slug>/", ProduitParSlug.as_view()),
    path("produits/<int:pk>/",   ProduitDetail.as_view()),   # jamais atteinte
]
```

`/produits/12/` arrive dans `ProduitParSlug`. Contrat : `/produits/12/` → `ProduitDetail`
**et** `/produits/clavier-mecanique/` → `ProduitParSlug`.

Le joueur doit diagnostiquer **pourquoi**, pas seulement réordonner au hasard. La trace montre
les motifs essayés dans l'ordre et celui qui a mordu.

| Solution fautive plausible | Règle |
|---|---|
| Ordre inchangé, on modifie la vue | `masquage-non-resolu` — « Votre correction est dans la vue, mais la requête n'y arrive jamais : elle s'est arrêtée au premier motif. Regardez la trace — `<str:slug>` a été essayé en premier et « 12 » est une chaîne valide. » |
| Les deux routes inversées **et** `<str:pk>` gardé pour les deux | `str-pour-tout` — « Ça marche pour les deux URL, mais votre vue reçoit maintenant `"12"`, une chaîne. Le `.filter(id="12")` fonctionnera par coercition — jusqu'au jour où il ne fonctionnera plus. » |

### Niveau 3 — 500 contre 404

`/produits/99/` renvoie une erreur serveur : la vue fait `Produit.objects.get(pk=pk)` sans
protection. Contrat : `/produits/99/` → **404**, `/produits/12/` → **200**.

| Solution fautive plausible | Règle |
|---|---|
| `try/except` attrapant tout | `except-large` — « Vous attrapez aussi `MultipleObjectsReturned` et les erreurs de base : un vrai bug rendra désormais 404 et personne ne le verra. `get_object_or_404` n'attrape que `DoesNotExist`. » |
| `.filter(pk=pk).first()` sans gérer `None` | `first-sans-garde` — « `.first()` renvoie `None` sans lever : la ligne suivante lève `AttributeError` et vous obtenez de nouveau un 500, avec un message plus obscur qu'avant. » |
| `.filter()` et retour d'une liste vide en 200 | `200-vide` — « Techniquement une réponse, mais un client qui demande le produit 99 reçoit « tout va bien, voici rien ». Le code d'état porte l'information : c'est 404. » |

### Niveau 4 — le compteur SQL apparaît

La liste des produits affiche le nom du vendeur. La vue boucle et accède à `p.vendeur.nom`.
Le journal SQL affiche **13 requêtes pour 12 produits**.

Contrat : 200 **et ≤ 2 requêtes**.

C'est le premier niveau où le contrat fonctionnel est **déjà satisfait** au départ : seule la
contrainte de coût force le travail. Test n°4 en action — le coût affiché est celui que le métier
compte.

| Solution fautive plausible | Règle |
|---|---|
| `prefetch_related("vendeur")` sur une clé étrangère simple | `prefetch-sur-fk` — « 2 requêtes au lieu de 13, le contrat passe. Mais `prefetch_related` fait une seconde requête et recolle en Python : sur une clé étrangère directe, `select_related` fait une jointure et une seule requête. » |
| Préchargement en dictionnaire à la main | `precharge-manuel` — « Le compte est bon et le code fonctionne — c'est ce que `select_related()` fait pour vous, en une méthode, sans risque d'oubli au prochain champ ajouté. » |

Le second cas est une **bonne réponse au contrat** avec un message qui n'accuse pas : le jeu
reconnaît la solution et montre l'outil.

### Niveau 5 — la règle métier, en base ou en Python

« N'exposer que les produits en stock. » Deux montages satisfont le contrat fonctionnel :

```python
# A — en Python
produits = [p for p in Produit.objects.all() if p.stock > 0]   # 1 requête, toute la table
# B — en base
produits = Produit.objects.filter(stock__gt=0)                  # 1 requête, filtrée
```

Même nombre de requêtes ! Le jeu ajoute donc au journal SQL le **nombre de lignes ramenées**, et
le contrat porte dessus. La table du niveau contient 12 000 lignes dont 40 en stock.

| Solution fautive plausible | Règle |
|---|---|
| Filtre en Python | `filtre-en-python` — « Une seule requête, mais elle ramène 12 000 lignes pour en garder 40. Le filtre s'exécute dans votre processus, pas dans la base — et il ramènera 120 000 lignes l'an prochain. » |
| `.filter(stock=1)` | `filtre-trop-etroit` — « 3 produits affichés au lieu de 40 : `stock=1` n'est pas `stock > 0`. Le lookup est `stock__gt=0`. » |

### Niveau 6 — la migration qui doit préserver les données

Bascule de plateau. Le client exige que chaque produit ait un vendeur, obligatoire. **La table
est celle que le joueur a peuplée aux niveaux précédents** — ses lignes, avec les noms qu'il a
vus passer.

Pièces disponibles : `AddField`, `AlterField`, `RunPython`, `RemoveField`, `RenameField`.
Elles se posent dans une **liste ordonnée**, et **`Appliquer` est irréversible**.

Séquence correcte :

```python
operations = [
    migrations.AddField("produit", "vendeur", models.ForeignKey(null=True, …)),
    migrations.RunPython(remplir_vendeur),
    migrations.AlterField("produit", "vendeur", models.ForeignKey(null=False, …)),
]
```

Contrat : le champ est `null=False` **et** `lignesPerdues == 0`.

| Solution fautive plausible | Règle |
|---|---|
| `AddField(null=False)` d'emblée | `addfield-non-null` — « La table contient déjà 12 lignes : que met-on dans leur colonne `vendeur` ? Django pose exactement cette question dans `makemigrations`, et refuse tant que vous n'avez pas répondu. » |
| `RunPython` avant `AddField` | `runpython-trop-tot` — « Votre fonction de remplissage écrit dans une colonne qui n'existe pas encore. Les opérations s'exécutent dans l'ordre de la liste. » |
| `AddField(null=True)` puis `AlterField(null=False)` **sans** remplissage | `alterfield-sur-nulls` — « 12 lignes ont `vendeur = NULL` et la contrainte les refuse : la migration échoue à mi-parcours, base dans un état intermédiaire. Le remplissage n'est pas une politesse, c'est une étape. » |
| `default=1` sur `AddField` | `default-en-dur` — « Ça passe, et vos 12 produits appartiennent maintenant au vendeur 1. Regardez la table : « Écran 27 pouces » est attribué à un vendeur qui ne l'a jamais vendu. La donnée est fausse, pas manquante — c'est pire. » |

Ce dernier cas est le plus instructif du jeu : le contrat est satisfait, `lignesPerdues == 0`, et
la donnée est corrompue. L'audit le relève **même quand le niveau est validé**.

### Niveau 7 — le renommage

`prix` doit devenir `prix_ht`. Deux montages, un seul préserve les données.

| Solution fautive plausible | Règle |
|---|---|
| `RemoveField("prix")` + `AddField("prix_ht")` | `renommage-destructeur` — « La colonne `prix_ht` existe, vide. Vos 12 prix sont perdus, et rien ne les ramène — il n'y a pas d'annulation. `RenameField` fait la même chose en gardant les valeurs. » (le compteur `lignesPerdues` passe à 12, le niveau se rejoue sur une base restaurée) |
| `AddField("prix_ht")` + `RunPython` de copie + `RemoveField("prix")` | `renommage-en-trois-temps` — « Les données sont préservées : c'est correct, et c'est même la stratégie obligatoire quand du code tourne encore sur l'ancien nom en production. Pour un renommage simple, `RenameField` fait la même chose en une opération. » |

Encore une fois : la seconde n'est pas fausse. Le message le dit.

### Niveau 8 — bac à sable

Atelier vide, un modèle, une table peuplée. Le joueur construit l'API qu'il veut. L'audit tourne
à la demande et applique la liste complète des règles ci-dessus, plus les règles transverses
(route non atteignable, vue sans queryset, sérialiseur absent).

Compteurs en continu : **requêtes SQL** · **lignes ramenées** · **lignes perdues**.

---

## 5. Contrats et coût du domaine

| | |
|---|---|
| **Contrats** | code d'état attendu par URL · seuils de requêtes et de lignes ramenées · `lignesPerdues == 0` |
| **Coût** | requêtes SQL émises · lignes ramenées · lignes de données perdues |

## 6. Surface `django-lite` utilisée

`Router` (intégral : ordre, convertisseurs, `APPEND_SLASH`) · `DB`/ORM **avec le journal SQL et
le compte de lignes ramenées** · `View` · `Migrations` (intégral) · `Serializer` (minimal, en
sortie seulement) · `Codegen`. C'est le jeu qui dimensionne le noyau : à écrire en second, après
que le jeu C a validé `Serializer` + `Codegen`.

## 7. Passage des cinq tests

| Test | Réponse |
|---|---|
| 1. Problème sans habillage ? | Oui : « obtiens ces codes d'état sur ces URL, en ≤ N requêtes, sans perdre de ligne ». |
| 2. Même opération mentale ? | Câbler `path`/vue/queryset **est** écrire `urls.py` et `views.py` — le panneau de code le prouve en direct. |
| 3. Échec diagnosticable ? | L'échec est un comportement observé (404 au lieu de 200, 13 requêtes au lieu de 2), avec la trace complète pour remonter. |
| 4. Coût réel ? | Requêtes SQL et lignes perdues sont exactement ce qu'on surveille en production. |
| 5. Deux solutions plausibles ? | Chaque niveau en déclare 2 à 4, dont plusieurs **correctes mais coûteuses** — c'est le cas le plus formateur. |

## 8. Pont vers le TP

Bouton « copier pour le TP » : trois fichiers (`urls.py`, `views.py`, `migrations/00XX_*.py`),
complets et exécutables. Le TP « Créer un premier projet Django » du Jour 1 reprend ce montage.

## 9. Vérification spécifique

- Chaque niveau déclare ses solutions fautives ; le banc jsdom les rejoue et vérifie que la
  **règle attendue** se déclenche, pas une autre.
- Vérifier en particulier que le journal SQL **change réellement** avec `select_related()` : si
  le compte est calculé plutôt qu'observé, tout le niveau 4 est une décoration.
- Vérifier l'irréversibilité : après `RemoveField`, aucun chemin ne doit permettre de retrouver
  les données autrement qu'en rejouant le niveau sur une base restaurée.
