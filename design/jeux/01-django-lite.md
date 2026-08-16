# 01 — `django-lite.js`, le noyau partagé

Un mini-Django honnête en JavaScript. Les quatre jeux tapent dessus ; aucun ne script ses
réponses. Quand un étudiant sort du chemin prévu, il obtient le comportement réel du modèle, pas
une réponse préenregistrée — c'est le test de falsification n°3 du contrat de design.

**Style** : ES5, `"use strict"`, IIFE, aucune dépendance, aucune étape de compilation — comme
`pi-frames.js` et `tangle-kit-lite.js`. Exposé en `window.DjangoLite`.

**Fichiers**

```
cours/js/django-lite.js     le noyau (ce document)
cours/js/blocs.js           palette → structure → code Python affiché
cours/js/audit.js           règles de diagnostic ordonnées
```

---

## 0. Le monde

Tout état vit dans un objet `World` unique, sérialisable, que les jeux passent à leurs frames via
le `shared` de `PIFrames.create()`.

```js
var monde = DjangoLite.createWorld({
  models:     { … },   // définitions de modèles
  data:       { … },   // lignes initiales par table
  urlpatterns: [ … ],  // liste ORDONNÉE
  views:      { … },
  serializers:{ … },
  permissions:{ … },
  settings:   { APPEND_SLASH: true, DEFAULT_PERMISSION_CLASSES: [], … },
});

monde.request({ method: "GET", path: "/produits/12/", user: "alice", body: null });
// → { status: 200, body: {…}, trace: [...], sql: [...] }
```

`monde.snapshot()` / `monde.restore(s)` : clonage profond, utilisé pour rejouer un niveau ou
comparer un état de base à un état cible (jeu E) sans réinstancier le monde.

Chaque appel à `request()` produit une **trace** : la liste ordonnée des étapes traversées, avec
ce qui entre et ce qui sort de chacune. C'est la matière première de l'affichage du jeu A et de
tous les diagnostics.

```js
trace = [
  { etape: "resolve",     entree: "/produits/12/", sortie: { view: "detail", kwargs: { pk: 12 } },
    note: "3ᵉ motif essayé" },
  { etape: "authenticate",sortie: { user: "alice" } },
  { etape: "permission",  regle: "IsAuthenticated", sortie: true },
  { etape: "queryset",    sortie: { count: 1 }, sql: ["SELECT … WHERE id = 12"] },
  { etape: "obj_permission", regle: "IsOwner", sortie: false },
  { etape: "response",    sortie: { status: 403 } },
]
```

---

## 1. `Router`

Ce qui doit être **vrai**, parce que trois niveaux du jeu A en dépendent :

- `urlpatterns` est une **liste ordonnée**, et la résolution s'arrête au **premier motif qui
  correspond**. Un `<str:pk>` placé avant un `<int:pk>` masque définitivement le second : « 12 »
  est aussi une chaîne.
- Convertisseurs : `int` (`[0-9]+`), `str` (tout sauf `/`), `slug` (`[-a-zA-Z0-9_]+`), `uuid`.
  `int` produit un nombre, `str` une chaîne — la différence se voit dans les `kwargs`.
- `APPEND_SLASH` : si aucun motif ne correspond, que la requête n'a pas de slash final et que le
  chemin + `/` correspond, Django renvoie **301** vers la version avec slash — et **uniquement
  pour les requêtes sans corps**. Un `POST /produits` sans slash **perd son corps** dans la
  redirection : c'est un bug réel de début de projet, il doit être reproduit.
- Aucun motif : **404**, avec dans la trace la liste des motifs essayés.

```js
DjangoLite.path("produits/<int:pk>/", "ProduitDetail", { name: "produit-detail" })
```

**Codegen** →

```python
urlpatterns = [
    path("produits/<int:pk>/", ProduitDetail.as_view(), name="produit-detail"),
]
```

**Limite déclarée** : pas de `re_path`, pas de `include()` imbriqué au-delà d'un niveau, pas de
convertisseur personnalisé.

---

## 2. `DB` et l'ORM minimal

Tables en mémoire. Chaque table est une liste d'objets plats ; les clés étrangères sont stockées
en `<champ>_id`.

### Le journal SQL est la fonctionnalité principale

Chaque accès réel à la base **ajoute une ligne** à `monde.sql`. C'est ce qui rend le N+1
diagnosticable au lieu d'être récité :

```js
Produit.objects.all()                       // 0 requête — queryset paresseux
Produit.objects.all().forEach(…)            // 1 requête à l'évaluation
p.vendeur                                   // 1 requête PAR accès, si non préchargé
Produit.objects.all().select_related("vendeur")  // 1 requête, jointure
```

Un `select_related()` qui ne change pas le compte est un bug du moteur, pas une approximation
acceptable.

### API

| Méthode | Comportement fidèle attendu |
|---|---|
| `.all()` | queryset paresseux |
| `.filter(k, v)` | paresseux, chaînable ; le filtrage se fait **en SQL**, une requête |
| `.exclude(k, v)` | idem |
| `.get(k, v)` | **lève** `DoesNotExist` (→ 500 non attrapé) ou `MultipleObjectsReturned` |
| `.first()` | `null` si vide — la différence avec `.get()` est un niveau entier |
| `.create(obj)` | insère, attribue l'`id` |
| `.count()` | `SELECT COUNT(*)`, 1 requête, n'évalue pas le queryset |
| `.select_related(f)` | jointure, 1 requête |
| `.prefetch_related(f)` | 2 requêtes, quel que soit le nombre de lignes |
| `get_object_or_404(qs, pk)` | attrape `DoesNotExist` → `Http404` → 404 |

**Le piège à reproduire fidèlement** : filtrer en Python (`.all()` puis boucle `if`) donne le
même résultat visible que `.filter()`, mais une requête qui ramène toute la table. Les deux
solutions satisfont le contrat fonctionnel ; seul le coût du domaine les sépare. C'est le test
de falsification n°5 en action.

---

## 3. `Migrations`

Opérations appliquées **dans l'ordre, à de vraies lignes, sans annulation**.

| Opération | Effet fidèle |
|---|---|
| `AddField(model, name, field)` | si `null=False` **sans** `default` et que la table est peuplée → **échec**, exactement comme le prompt de `makemigrations` |
| `RemoveField(model, name)` | la colonne et ses données disparaissent. Définitivement. |
| `RenameField(model, old, new)` | la colonne change de nom, **les données restent** |
| `AlterField(model, name, field)` | passer `null=True` → `null=False` **échoue** s'il reste des `NULL` |
| `RunPython(fn)` | remplissage de données entre deux opérations de schéma |

Le compteur `monde.lignesPerdues` s'incrémente à chaque donnée détruite par une opération. C'est
le coût du domaine des niveaux 6-7 du jeu A.

**Codegen** →

```python
class Migration(migrations.Migration):
    dependencies = [("boutique", "0002_produit_stock")]
    operations = [
        migrations.AddField(
            model_name="produit",
            name="vendeur",
            field=models.ForeignKey(null=True, on_delete=models.CASCADE, to="boutique.vendeur"),
        ),
        migrations.RunPython(remplir_vendeur),
        migrations.AlterField(…),
    ]
```

**Limite déclarée** : pas de dépendances inter-applications, pas de migrations inverses
(`reverse_code`) — l'irréversibilité est le sujet, pas un défaut.

---

## 4. `Serializer`

Le cœur du jeu C. Le dictionnaire d'erreurs doit avoir **exactement la forme de DRF**, y compris
les messages en français de `rest_framework`, sans quoi la promesse de fidélité tombe.

### Champs et arguments modélisés

`CharField(required, allow_blank, max_length, min_length, read_only, write_only, source,
default)` · `IntegerField(min_value, max_value, …)` · `DecimalField` · `BooleanField` ·
`DateField` · `EmailField` · `PrimaryKeyRelatedField` · `SerializerMethodField` · sérialiseur
imbriqué (`many=True` compris).

### Ordre de validation, à respecter strictement

```
1. champs manquants           → "Ce champ est obligatoire."
2. type / coercition          → "Un nombre entier valide est requis."
3. contraintes de champ       → max_length, min_value, choices
4. validate_<champ>()         → ne voit QUE son champ
5. validate()                 → voit tous les champs validés — c'est la différence
```

Cet ordre **est** le contenu pédagogique du niveau 6 du jeu C : une règle de cohérence entre deux
champs écrite dans `validate_prix_promo()` ne peut pas fonctionner, parce qu'à l'étape 4 l'autre
champ n'est pas dans le périmètre. Le moteur doit produire cet échec, pas le contourner.

### Points de fidélité non négociables

- `read_only=True` : le champ est **ignoré silencieusement** en entrée. Pas d'erreur, pas de
  message — c'est précisément ce qui en fait une faille quand on l'oublie (niveau 3 du jeu C).
- `partial=True` (PATCH) : **toutes** les règles `required` tombent, les autres restent.
- **Un `PUT` n'écrase pas un champ `required=False` absent du corps.** C'est le point le plus
  contre-intuitif du lot, et il est mesuré (`tp-instrumentation/verifier.py` §4.3) : un champ
  requis absent donne **400**, un champ à valeur par défaut absent laisse l'ancienne valeur
  **intacte**. « PUT remplace tout » est vrai du protocole HTTP, faux de DRF — c'est le
  sérialiseur qui décide, à partir de vos modèles. Modéliser le remplacement littéral serait
  plus simple et **contredirait le §5.2 du contrat de design**.
- Coercition : `"49"` est accepté par un `IntegerField`, `"quarante-neuf"` non. `""` sur un
  `CharField(required=True)` passe la vérification de présence et échoue sur `allow_blank`.
- `is_valid()` retourne un booléen et remplit `.errors` ; `.errors` est un dict
  `{ champ: [messages] }`, avec `non_field_errors` pour `validate()`.

**Codegen** →

```python
from rest_framework import serializers

class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = ["id", "nom", "prix", "stock"]
        read_only_fields = ["id"]

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Le stock ne peut pas être négatif.")
        return value
```

---

## 5. `Permissions` et `View` / `ViewSet`

### L'ordre du dispatch — c'est le contenu du jeu D

```
requête
  → resolve                 (Router)
  → authenticate            → 401 OU 403 selon l'authentificateur — voir ci-dessous
  → has_permission()        → 403  [permission de VUE, une fois par requête]
  → get_queryset()          → le FILTRE, levier distinct des permissions
  → [detail seulement] get_object() → has_object_permission() → 403/404
  → serializer
  → réponse
```

**Le fait décisif, à reproduire sans concession** : `has_object_permission()` n'est **jamais**
appelée par l'action `list()`. Un joueur qui écrit une permission d'objet impeccable et ne
filtre pas `get_queryset()` voit la collection entière fuiter, alors que l'accès direct à un
objet est correctement refusé. Aucun autre dispositif pédagogique ne fait sentir cette
distinction.

### Classes fournies

`AllowAny` · `IsAuthenticated` · `IsAuthenticatedOrReadOnly` · `IsAdminUser` · permission
personnalisée `{ has_permission(req, vue), has_object_permission(req, vue, obj) }` ·
`SAFE_METHODS = ["GET", "HEAD", "OPTIONS"]`.

Portée : `DEFAULT_PERMISSION_CLASSES` dans `settings` (niveau projet) **contre**
`permission_classes` sur la vue. Une vue ajoutée sans `permission_classes` hérite du réglage
projet — et si celui-ci est `AllowAny`, elle est ouverte. C'est le niveau 6 du jeu D.

### 401 contre 403 — ce n'est pas la permission qui décide

Point mesuré (`verifier.py` §4.5), et contre-intuitif : à permission identique
(`IsAuthenticated`) et sans aucun identifiant fourni, DRF répond **401** avec
`TokenAuthentication` et **403** avec `SessionAuthentication`. La raison : un `401` doit
s'accompagner d'un en-tête `WWW-Authenticate` disant *comment* s'identifier, et
`SessionAuthentication` n'a rien à proposer (on ne renvoie pas un formulaire de connexion à un
client d'API). DRF interroge le **premier authentificateur** de la liste ; s'il ne fournit pas
d'en-tête, il bascule sur 403.

Autrement dit : le code d'état dépend aussi de ce que le serveur est **capable de proposer** au
client. `django-lite` doit modéliser l'en-tête `WWW-Authenticate` par authentificateur, sinon le
jeu D et le TP se contrediront sur le point central du module IV.

### 403 contre 404

DRF renvoie **403** quand la permission d'objet refuse, ce qui **révèle l'existence** de l'objet.
Un `get_queryset()` filtré renvoie **404** — la ressource n'existe pas *pour ce demandeur*. Les
deux sont des choix défendables et le jeu doit permettre d'observer la fuite d'information.

### `ViewSet`

Correspondance verbe → action, telle que le routeur DRF la câble :

| Requête | Action |
|---|---|
| `GET /produits/` | `list` |
| `POST /produits/` | `create` |
| `GET /produits/12/` | `retrieve` |
| `PUT /produits/12/` | `update` |
| `PATCH /produits/12/` | `partial_update` |
| `DELETE /produits/12/` | `destroy` |

**Codegen** →

```python
from rest_framework import permissions, viewsets

class EstProprietaire(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.proprietaire_id == request.user.id


class CommandeViewSet(viewsets.ModelViewSet):
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def get_queryset(self):
        return Commande.objects.filter(proprietaire=self.request.user)
```

---

## 6. `Codegen` — un principe

> **Le Python affiché est engendré par la structure exécutée. Jamais écrit à côté.**

Une structure, deux sorties : le comportement (via le moteur) et le texte (via `Codegen`). Sans
cette contrainte, les deux divergent dès le troisième correctif, et la promesse « ce code tourne
dans ton TP » devient fausse sans que personne s'en aperçoive.

`DjangoLite.codegen(structure)` → chaîne. Un fichier complet, imports compris, indentation
valide, prêt à coller. Chaque jeu expose un bouton **« copier pour le TP »**.

Le test de copiabilité (contrat de design §6.2) compare cette sortie, pour chaque solution de
référence, à un fichier vérifié une fois dans un vrai projet Django.

---

## 7. `blocs.js` — palette → structure → code

L'étudiant n'écrit pas de Python au clavier : il assemble depuis une palette, et le Python
apparaît à côté, mis à jour à chaque geste. Motivation : une faute de frappe sur `min_valu`
n'enseigne rien sur la validation et consomme 40 % du temps.

```js
Blocs.monter(el, {
  palette: [
    { id: "required",   libelle: "required",   aide: "le champ doit être présent" },
    { id: "max_length", libelle: "max_length",  aide: "longueur maximale", valeur: "nombre" },
    …
  ],
  cible: structure,          // mutée par les gestes
  onChange: function (s) { … },   // le jeu ré-engendre le code et relance le moteur
  fading: 1,                 // 2 : aides visibles · 1 : noms seuls · 0 : palette réduite
});
```

L'axe `fading` de la palette est le deuxième des trois axes d'estompage du contrat de design.

Obligations d'ergonomie : glisser-déposer **doublé** d'un clic-clic ; `Entrée` valide ; `Échap`
annule la sélection ; le panneau de code est en lecture seule mais sélectionnable.

---

## 8. `audit.js` — règles de diagnostic ordonnées

```js
var audit = Audit.creer([
  { id: "…", quand: function (monde) { return …; }, message: "…", montre: ["urls.py:2"] },
  …
]);

audit.diagnostiquer(monde);   // → { id, message, montre } | null
```

Évaluation **dans l'ordre**, première règle qui matche gagne — donc les règles vont du plus
spécifique au plus générique. Une règle générique en fin de liste qui se déclenche pendant les
tests **est un défaut à corriger** en écrivant la règle spécifique manquante, jamais un filet
acceptable (contrat de design §3.1).

`audit.couverture()` liste les règles jamais atteintes par le banc d'essai : soit du code mort,
soit un cas de test manquant.

---

## 9. Limites déclarées

L'oracle est `tp-instrumentation/verifier.py` (contrat de design §6) : **tout comportement
modélisé ici a son étape de mesure là-bas, ou figure dans la liste ci-dessous.** Rien entre les
deux. Ces limites sont assumées, et à énoncer dans le jeu quand elles affleurent :

- Pas de moteur de gabarits (hors sujet pour un cours d'API).
- Pas de middleware, sauf ce qui est nécessaire à `APPEND_SLASH` et à l'authentification.
- Pas de transactions ni de concurrence.
- Pas de vraie base : le « SQL » du journal est une chaîne représentative, pas du SQL exécuté.
- Authentification : `AnonymousUser`, utilisateur simple, `is_staff` — pas de groupes ni de
  permissions Django natives (`auth.Permission`).
- Pagination, filtres et throttling : hors périmètre.

---

## 10. Ordre d'implémentation

`Router` → `DB`/ORM + journal SQL → `View`/`ViewSet` → `Serializer` → `Permissions` →
`Migrations` → `Codegen`. Le jeu C (banc d'essai) n'a besoin que de `Serializer` + `Codegen` :
c'est par lui qu'on commence, il valide le socle sur le plus petit périmètre.
