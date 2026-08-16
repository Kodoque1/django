# D — Le casse

**Module IV · autorisations · `cours/jeux/le-casse/` · ~40 min**

---

## 1. Opération mentale visée

Deux opérations, alternées, et c'est l'alternance qui fait le jeu :

1. **Modéliser la menace** — trouver le chemin que le concepteur n'a pas prévu. Formellement :
   *produire un contre-exemple à une spécification de sécurité*.
2. **Écrire un prédicat** `(utilisateur, action, objet) → booléen`, et le placer au bon endroit.

## 2. Isomorphisme

Une permission DRF **est** un prédicat sur un triplet. L'écrire est l'acte métier. Mais la
compétence qui manque réellement aux étudiants n'est pas syntaxique : c'est de **se demander qui
d'autre pourrait appeler cet endpoint**. Cette question ne se pose pas quand on lit un cours ;
elle se pose quand on vient de voler la commande d'Alice avec trois requêtes.

D'où la phase d'attaque. Ce n'est pas un habillage « hacker » : c'est le seul dispositif qui
transforme « je récite les classes de permission » en « je cherche ce que ma spec ne couvre
pas ».

**Cadre** : API fictive, locale, en mémoire. Les techniques mises en jeu sont des appels HTTP
ordinaires sur des endpoints mal protégés — c'est-à-dire exactement le contenu d'une revue de
code de sécurité, et la compétence « identifier les informations sensibles et les risques
associés » de la fiche IPSSI.

## 3. Boucle centrale

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  PHASE ATTAQUE                                                   │
   │  Vous êtes mallory. Objectif : lire la commande #7 d'alice.      │
   │                                                                  │
   │  ┌──────────────────────────────┐   ┌────────────────────────┐   │
   │  │ CONSOLE  (partagée avec E)   │   │ CE QUE VOUS OBTENEZ    │   │
   │  │ [GET ▾] /commandes/7/        │   │ 200                    │   │
   │  │ en tant que : mallory        │   │ {"id":7,"client":       │   │
   │  │            [ ENVOYER ]       │   │  "alice","total":840}  │   │
   │  └──────────────────────────────┘   └────────────────────────┘   │
   │                                                                  │
   │  ✔ Objectif atteint en 1 requête. La faille est réelle.          │
   └─────────────────────────────────────────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  PHASE DÉFENSE                                                   │
   │  Colmatez. Palette : AllowAny · IsAuthenticated · …              │
   │                                                                  │
   │  SUITE DE NON-RÉGRESSION           (toutes les attaques connues) │
   │  ✔ n1 · lecture anonyme            bloquée                       │
   │  ✔ n2 · écriture par un tiers      bloquée                       │
   │  ✘ n3 · lecture de la commande #7  PASSE ENCORE                  │
   │  ?  ·  attaque nouvelle            (révélée à la validation)     │
   └─────────────────────────────────────────────────────────────────┘
```

**La suite de non-régression est le moteur pédagogique du jeu.** À chaque niveau, *toutes* les
attaques précédentes sont rejouées. Colmater le niveau 4 en rouvrant le niveau 2 est l'erreur la
plus fréquente, et le tableau la rend immédiatement visible — c'est la réinjection de la
pédagogie programmée, rendue structurelle.

L'**attaque nouvelle**, non montrée avant validation, est le troisième axe de fading : le joueur
finit par devoir anticiper au lieu de réagir.

---

## 4. Niveaux

Domaine : une API de commandes. `alice` et `bob` ont chacun des commandes ; `mallory` est un
compte légitime, sans privilège. Endpoints : `/commandes/`, `/commandes/<pk>/`, `/profils/<pk>/`.

### Niveau 1 — `AllowAny` · établir la boucle

L'API est ouverte. L'attaque est triviale (une requête anonyme). Sert à installer la mécanique
et à faire constater que « ça marche » et « c'est protégé » sont deux propriétés indépendantes.

Défense attendue : `IsAuthenticated`.

| Solution fautive plausible | Règle de diagnostic |
|---|---|
| Vérification `if request.user` dans la vue | `garde-dans-la-vue` — « Ça bloque cet endpoint-ci. Les trois autres vues n'ont rien : une garde écrite dans une vue ne protège que cette vue. Les permissions sont déclaratives pour cette raison. » |

### Niveau 2 — `IsAuthenticated` · **authentifié ≠ autorisé**

Mallory se connecte — c'est un compte légitime — et relit la commande d'alice. `IsAuthenticated`
n'y change rien.

C'est **la leçon centrale du module**, et elle ne passe que par l'expérience : l'étudiant vient
de mettre la bonne classe et l'attaque marche toujours.

Défense attendue : une permission d'objet.

| Solution fautive plausible | Règle |
|---|---|
| `IsAdminUser` | `admin-partout` — « Plus personne ne passe, y compris alice sur ses propres commandes. Vous avez fermé l'API, pas protégé les objets. Regardez la suite : trois attaques bloquées, et deux usages légitimes aussi. » |
| `has_permission` qui teste `request.user == obj.proprietaire` | `has-permission-sans-obj` — « `has_permission()` ne reçoit pas d'objet — elle est appelée **avant** que la vue en récupère un. Le test appartient à `has_object_permission()`. » |

### Niveau 3 — lecture seule et fuite d'information

`IsAuthenticatedOrReadOnly` est posé. Mallory ne peut plus écrire… mais lit toujours tout.

Le point : « lecture seule » n'est pas « inoffensif ». Les commandes d'alice contiennent son
adresse et ses montants.

| Solution fautive plausible | Règle |
|---|---|
| Conserver `IsAuthenticatedOrReadOnly` en pensant le problème résolu | `readonly-nest-pas-sur` — « Aucune écriture n'est passée, c'est vrai. Mais mallory vient de lire l'adresse de livraison d'alice. `SAFE_METHODS` veut dire « ne modifie pas le serveur », pas « ne divulgue rien ». » |

### Niveau 4 — **`has_object_permission` n'est pas appelée par `list()`**

Le joueur a maintenant une permission d'objet correcte : `/commandes/7/` renvoie 403. Attaque :
`GET /commandes/` — **la collection entière sort**, commandes d'alice comprises.

Le piège majeur de DRF, et le cœur du jeu. `has_object_permission()` n'est invoquée que par les
actions de détail, parce qu'il n'y a pas d'« objet » sur une liste. Filtrer `get_queryset()` est
un **troisième levier**, distinct des deux crochets de permission.

Défense attendue :

```python
def get_queryset(self):
    return Commande.objects.filter(proprietaire=self.request.user)
```

| Solution fautive plausible | Règle |
|---|---|
| Renforcer encore la permission d'objet | `renforcer-la-mauvaise-piece` — « Votre permission est correcte, et elle n'est jamais appelée sur `list` : DRF n'a pas d'objet à lui passer. Regardez la trace de la requête — l'étape `obj_permission` est absente. » |
| Filtrer en Python après `.all()` | `filtre-liste-en-python` — « La fuite est colmatée, mais vous ramenez toutes les commandes de la base avant d'en jeter 99 %. Le filtre appartient au queryset. » |
| Filtrer le queryset **et** retirer la permission d'objet | `queryset-seul` — « La liste est propre. Mais un `PATCH /commandes/7/` direct… essayez-le. Le queryset filtré rend l'objet introuvable en lecture ; selon la vue, il peut rester atteignable autrement. Les deux leviers sont complémentaires, pas alternatifs. » |

### Niveau 5 — 403 contre 404 · l'oracle

L'API renvoie 403 sur les commandes d'alice et 404 sur les identifiants inexistants. Attaque :
énumérer `/commandes/1/` à `/commandes/50/` et **cartographier ce qui existe** sans rien lire.

Contrat : ne pas divulguer l'existence.

| Solution fautive plausible | Règle |
|---|---|
| Conserver le 403 | `403-revele` — « Vous n'avez rien laissé lire, et mallory sait maintenant que les commandes 3, 7, 12 et 31 existent et ne lui appartiennent pas. La différence entre 403 et 404 **est** l'information. » |
| Renvoyer 404 partout, y compris pour alice | `404-pour-tous` — « Plus d'oracle, mais alice ne trouve plus ses propres commandes. Le 404 doit être relatif au demandeur : c'est ce que produit un queryset filtré, naturellement. » |

### Niveau 6 — portée projet contre portée vue

Un nouvel endpoint `/profils/<pk>/` a été ajouté « rapidement », sans `permission_classes`.
`DEFAULT_PERMISSION_CLASSES` vaut `AllowAny`. Attaque : le nouvel endpoint.

Défense attendue : `DEFAULT_PERMISSION_CLASSES = ["rest_framework.permissions.IsAuthenticated"]`
— **refuser par défaut**, autoriser explicitement.

| Solution fautive plausible | Règle |
|---|---|
| Ajouter `permission_classes` sur `/profils/` uniquement | `colmatage-endpoint-par-endpoint` — « Cet endpoint est protégé. Le prochain ajouté par un collègue pressé ne le sera pas — c'est exactement ce qui vient de se passer. Le défaut projet est la seule protection qui couvre le code pas encore écrit. » |
| Défaut projet strict **sans** ouvrir la vue de connexion | `login-ferme` — « Plus personne ne peut se connecter : la vue d'obtention du jeton exige maintenant d'être authentifié. Refuser par défaut impose d'ouvrir explicitement les rares vues publiques. » |

Ce second cas est l'accident classique du « défaut strict », et il doit arriver.

### Niveau 7 — la permission personnalisée et son piège

Écrire `EstProprietaire`. Palette : `SAFE_METHODS`, comparaisons sur `request.user`, `obj.*`.

| Solution fautive plausible | Règle |
|---|---|
| `return request.user.id == obj.id` | `compare-le-mauvais-id` — « Vous comparez l'identifiant de l'utilisateur à celui de la **commande**. Mallory, utilisateur 7, accède à la commande 7. C'est le genre de coïncidence qui passe tous les tests écrits par la même personne. Le champ est `obj.proprietaire_id`. » |
| Oubli de `SAFE_METHODS` | `pas-de-lecture-partagee` — « La spec demandait que tout le monde puisse lire le catalogue. Votre permission refuse aussi les GET : trois usages légitimes viennent de casser. » |
| `return True` en fin de `has_permission` avec le test dans `has_object_permission` seulement | `rappel-liste` — « Correct pour le détail — et la liste ? Vous avez déjà rencontré ce cas au niveau 4. Vérifiez le queryset. » (réinjection explicite) |

### Niveau 8 — bac à sable

Quatre endpoints, aucune permission. Un cahier des charges en langage métier (« un client voit
ses commandes ; le catalogue est public en lecture ; seul le personnel modifie le catalogue »).
Le joueur construit ; l'audit liste les trous restants et les usages légitimes cassés.

Compteurs : **trous restants** · **attaques de régression réouvertes** · **usages légitimes
cassés**.

---

## 5. Contrats et coût du domaine

| | |
|---|---|
| **Contrat** | toutes les attaques de la suite bloquées **et** tous les usages légitimes préservés |
| **Coût** | trous restants · régressions réouvertes · usages légitimes cassés |

La symétrie est essentielle, comme au jeu C : sans le troisième compteur, `IsAdminUser` partout
serait la stratégie gagnante.

## 6. Surface `django-lite` utilisée

`Permissions` (les deux crochets, portée projet/vue, `SAFE_METHODS`) · `View`/`ViewSet` avec
l'**ordre de dispatch exact** · `Router` · `DB` minimal · authentification simple
(`AnonymousUser`, utilisateur, `is_staff`) · `Codegen`. Réutilise le composeur de requêtes du
jeu E.

## 7. Passage des cinq tests

| Test | Réponse |
|---|---|
| 1. Problème sans habillage ? | Oui : « voici une spec de sécurité, trouve un triplet (utilisateur, action, objet) qu'elle autorise à tort ». C'est de la recherche de contre-exemple. |
| 2. Même opération mentale ? | Phase 2 : écrire le prédicat, l'acte métier littéral. Phase 1 : la question qu'un développeur doit se poser avant de l'écrire. |
| 3. Échec diagnosticable ? | L'échec est une attaque qui passe, avec la trace du dispatch montrant **quelle étape n'a pas été atteinte**. |
| 4. Coût réel ? | Trous et régressions sont le vocabulaire d'un audit de sécurité. |
| 5. Deux solutions plausibles ? | 2 à 3 par niveau, dont plusieurs qui **ferment trop** — la faute symétrique, rarement enseignée. |

## 8. Pont vers le TP

« Copier pour le TP » → `permissions.py` + les `permission_classes` des vues + le fragment
`REST_FRAMEWORK` de `settings.py`. Alimente directement le TP du Jour 4 (« application sécurisée »).

## 9. Vérification spécifique

- La suite de non-régression doit être **cumulative et automatique** : ajouter un niveau ajoute
  ses attaques à tous les niveaux suivants, sans recopie.
- Le banc jsdom vérifie qu'aucune solution de référence ne casse un usage légitime, et que
  chaque attaque nouvelle est bien **inatteignable** avant sa révélation.
- Vérifier que la trace expose l'absence de l'étape `obj_permission` sur `list` : sans cela, le
  message du niveau 4 est une affirmation, pas une observation.
