# C — Le banc d'essai

**Module III · sérialiseurs et validation · `cours/jeux/banc-essai/` · ~35 min**

---

## 1. Opération mentale visée

**Écrire une spécification, et la voir attaquée par des contre-exemples.**

Un sérialiseur DRF n'est pas une liste de champs : c'est une **spécification exécutable de ce
qui a le droit d'entrer**. La compétence réelle n'est pas de savoir que `max_length` existe —
c'est de deviner ce qu'un client mal intentionné ou maladroit enverra, et de fermer avant.

## 2. Isomorphisme

L'action du joueur est **littéralement** l'acte métier : il rédige le sérialiseur. La machine
juge les payloads. Le retour d'information est l'écart entre ce que sa spec accepte et ce qu'elle
aurait dû accepter — exactement la boucle de Robot Odyssey : construis le robot, le niveau le
teste, observe la divergence, corrige le circuit.

### Le piège qu'on refuse

La tentation était de faire cliquer le joueur sur ACCEPTÉ / REFUSÉ payload par payload, façon
guichet. C'est **du chocolate-covered broccoli** : l'opération devient de la classification sous
règle donnée, c'est-à-dire un QCM avec un tampon dessiné dessus. Le joueur ne conçoit plus rien,
il applique un règlement que quelqu'un d'autre a écrit.

**Le joueur ne juge jamais un payload à la main.** Il écrit la règle ; la machine juge.

### Le piège de la stratégie dégénérée

Si seuls les payloads *invalides passés à tort* étaient comptés, la stratégie optimale serait de
tout refuser. On compte donc **symétriquement** :

| Faute | Nom | Coût |
|---|---|---|
| Un payload invalide **passe** | trou | 1 |
| Un payload valide est **refusé** | rejet abusif | 1 |

Une spec trop stricte est aussi fausse qu'une spec trop laxiste. C'est ce qui rend le niveau
non-trivial et satisfait le test de falsification n°5.

---

## 3. Boucle centrale

```
   PALETTE                    VOTRE SÉRIALISEUR (Python engendré)
   ┌───────────────┐          ┌──────────────────────────────────────┐
   │ required      │          │ class ProduitSerializer(             │
   │ max_length    │  ───▶    │         serializers.ModelSerializer): │
   │ min_value     │          │     class Meta:                       │
   │ read_only     │          │         model = Produit               │
   │ allow_blank   │          │         fields = ["id", "nom", "prix"]│
   │ validate_…    │          │         read_only_fields = ["id"]     │
   └───────────────┘          └──────────────────────────────────────┘
                                          │
                              [ LANCER LE BANC ]
                                          ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ payload                     attendu    obtenu    verdict        │
   │ {"nom":"Clavier","prix":49}  200        200       ok            │
   │ {"nom":"","prix":49}         400        200      ◀ TROU         │
   │ {"nom":"Écran","prix":-5}    400        400       ok            │
   │ {"nom":"Souris","prix":"29"} 200        400      ◀ REJET ABUSIF │
   └────────────────────────────────────────────────────────────────┘
   trous : 1 · rejets abusifs : 1
```

Chaque ligne fautive est cliquable : elle déplie le dict `errors` réel de DRF, et le message de
la règle de diagnostic correspondante.

---

## 4. Niveaux

Fading sur trois axes, dans cet ordre : **palette pré-remplie → palette nue**, puis **payloads
visibles avant validation → payloads cachés**, puis **modèle donné → modèle à lire**.

### Niveau 1 — `required` · la présence

Modèle `Produit(nom, prix)`. Palette pré-remplie sauf un bloc. Payloads visibles.

Contrat : les 6 payloads correctement traités.
Payloads clés : `{}` · `{"nom": "Clavier"}` (prix manquant) · `{"nom": "Clavier", "prix": 49}`.

| Solution fautive plausible | Règle de diagnostic |
|---|---|
| Aucun `required` posé | `manque-required` — « DRF met `required=True` par défaut sur un champ déclaré, mais votre champ est absent de `fields` : il n'est ni validé ni lu. » |
| `required=False` sur `prix` | `required-false-prix` — « Le payload `{"nom": "Clavier"}` est passé. Un produit sans prix vient d'entrer en base. » |

### Niveau 2 — `max_length` · validation Django ≠ contrainte SQL

Contrat : refuser un `nom` de 300 caractères.

Le point pédagogique : le modèle a `max_length=100`, mais **c'est le sérialiseur qui refuse
proprement en 400**. Sans lui, `ModelSerializer` hérite bien de la contrainte — mais un
`Serializer` simple, non. Le niveau propose les deux et fait constater la différence.

| Solution fautive plausible | Règle |
|---|---|
| `Serializer` simple sans `max_length` | `maxlength-absent` — « Vous n'avez pas hérité du modèle : `serializers.Serializer` ne connaît pas `Produit`. La chaîne de 300 caractères est passée, et c'est la base qui la tronquera ou lèvera. » |
| `max_length=10` (trop strict) | `maxlength-trop-strict` — « `"Clavier mécanique"` fait 17 caractères et vient d'être refusé. Une spec trop stricte rejette du légitime : c'est une faute au même titre. » |

### Niveau 3 — `read_only` sur `id` · **la faille**

Le payload piège : `{"nom": "Souris", "prix": 29, "id": 99}`.

Si `id` est en écriture, DRF **ne dit rien** et l'objet est créé avec l'id imposé par le client.
Le banc montre la ligne créée en base, `id = 99`. C'est une faille, pas une coquille : le client
choisit l'identifiant, écrase potentiellement une ressource existante, casse la séquence.

| Solution fautive plausible | Règle |
|---|---|
| `id` dans `fields` sans `read_only_fields` | `id-en-ecriture` — « Regardez la table : la ligne créée porte l'id 99, choisi par le client. Aucune erreur n'a été levée — c'est le propre de cette faille, elle est silencieuse. » |
| `id` retiré de `fields` | `id-absent-de-fields` — « Plus de faille, mais la réponse ne contient plus d'identifiant : le client ne sait pas quelle ressource il vient de créer. `read_only` sert exactement à ça : lisible, non écrivable. » |

Ce second cas est important — il produit un montage qui *satisfait le contrat de sécurité* et
casse autre chose. Deux solutions plausibles, une seule bonne.

### Niveau 4 — `min_value` et coercition

Payloads : `-5` · `"−5"` (chaîne) · `"29"` (chaîne numérique valide) · `"vingt-neuf"` · `0`.

Le point : `IntegerField` **accepte `"29"`** (coercition) et refuse `"vingt-neuf"`. Beaucoup
croient qu'un type suffit à tout filtrer.

| Solution fautive plausible | Règle |
|---|---|
| Pas de `min_value` | `prix-negatif-passe` — « `-5` est un entier valide. Le type ne dit rien du domaine de valeurs : c'est `min_value` qui le dit. » |
| `min_value=1` | `prix-zero-refuse` — « Un produit gratuit est-il illégal ? `0` vient d'être refusé. Vérifiez que la borne est bien celle du métier. » |
| `CharField` pour `prix` | `prix-en-chaine` — « `"vingt-neuf"` est passé : c'est une chaîne valide. Le type porte la première contrainte. » |

### Niveau 5 — `validate_<champ>()` · la règle métier

Règle : le stock doit être un multiple du conditionnement (12). Aucun argument de champ ne
l'exprime — il faut une méthode.

Palette : le bloc `validate_<champ>` s'ouvre sur un mini-éditeur de condition (comparateur +
valeur), toujours pas de saisie Python libre.

| Solution fautive plausible | Règle |
|---|---|
| Règle mise dans `min_value` | `metier-en-borne` — « `min_value=12` accepte 13, 14, 15… La contrainte n'est pas une borne, c'est une divisibilité. » |
| `validate_stock` sans `return value` | `validate-sans-return` — « Votre méthode ne renvoie rien : DRF stocke `None` dans les données validées. Le payload passe et le stock devient nul. » |

Le second cas est **l'erreur la plus fréquente en vrai** et mérite son propre niveau de retour.

### Niveau 6 — `validate()` objet · l'ordre de validation

Règle : `prix_promo` doit être strictement inférieur à `prix`.

Le piège, écrit noir sur blanc : la placer dans `validate_prix_promo()`, qui ne reçoit que sa
propre valeur. Le moteur doit produire l'échec réel (l'autre champ n'est pas accessible), pas
l'accommoder.

| Solution fautive plausible | Règle |
|---|---|
| Règle dans `validate_prix_promo` | `coherence-en-validate-champ` — « `validate_prix_promo()` ne reçoit que `prix_promo`. À cette étape, `prix` n'est pas encore dans le périmètre : une cohérence entre deux champs se vérifie dans `validate()`, après. » |
| `validate()` qui ne relève pas `non_field_errors` | `validate-mauvaise-cle` — « Votre erreur est rangée sous `prix_promo`. DRF range les erreurs de `validate()` sous `non_field_errors` — le client qui affiche les erreurs champ par champ ne la verra jamais. » |

Le tableau des étapes de validation (`01-django-lite.md` §4) est l'indice de ce niveau, et il
s'estompe au niveau 8.

### Niveau 7 — imbrication et `source`

Le client envoie `{"produit": {"nom": …}, "quantite": 2}` ; le modèle a `produit_id`. Blocs :
sérialiseur imbriqué, `source`, `PrimaryKeyRelatedField`.

| Solution fautive plausible | Règle |
|---|---|
| Sérialiseur imbriqué sans `create()` | `nested-sans-create` — « DRF refuse d'écrire un sérialiseur imbriqué qu'il ne sait pas construire : `The .create() method does not support writable nested fields by default.` Trois issues : `PrimaryKeyRelatedField`, `source`, ou écrire `create()`. » |
| `source="produit"` sur un champ nommé `produit` | `source-redondant` — « `source` répète le nom du champ : DRF lève `Redundant source argument`. Il ne sert que quand les deux noms diffèrent. » |

### Niveau 8 — `partial=True` · le PATCH

Même sérialiseur, deux modes. Le banc rejoue **les payloads du niveau 1** en PATCH : ceux qui
échouaient passent, et réciproquement.

Contrat : le sérialiseur doit être correct **dans les deux modes**.

| Solution fautive plausible | Règle |
|---|---|
| `required=False` partout pour « faire marcher le PATCH » | `required-sacrifie` — « Le PATCH passe, mais la création aussi : un POST sans `nom` crée maintenant un produit anonyme. `partial=True` est passé à l'instanciation, pas écrit dans les champs. » |
| Règle de `validate()` inadaptée au partiel | `validate-partiel` — « En PATCH, `prix` n'est pas dans le payload : votre comparaison porte sur `None`. En mode partiel, une règle inter-champs doit d'abord vérifier la présence des deux. » |

**Pont explicite** vers `http-verbs.js` (frame « PUT contre PATCH ») et vers le jeu E.

### Bac à sable

Un modèle est donné (`Commande`), aucun sérialiseur. L'adversaire génère des payloads : les 20
du corpus, plus des variantes aléatoires (types permutés, champs en trop, chaînes vides,
valeurs limites). L'audit tourne à la demande et liste les trous restants.

Compteurs affichés en continu : **trous** · **rejets abusifs** · **champs surspécifiés**.

---

## 5. Contrats et coût du domaine

| | |
|---|---|
| **Contrat** (binaire, par niveau) | tous les payloads du corpus correctement traités |
| **Coût** | trous · rejets abusifs |

Aucun point, aucune étoile. Le compteur de trous **est** l'information : il descend quand la spec
se resserre, remonte quand elle se relâche.

## 6. Surface `django-lite` utilisée

`Serializer` (intégral, y compris l'ordre des cinq étapes de validation) · `DB` minimal, pour
montrer la ligne réellement créée aux niveaux 3 et 5 · `Codegen`. **Pas** de `Router`, **pas** de
`Permissions`. C'est le plus petit périmètre du lot : ce jeu se construit en premier et valide le
socle.

## 7. Passage des cinq tests

| Test | Réponse |
|---|---|
| 1. Problème sans habillage ? | Oui : « écris une spec de validation qui accepte exactement ces cas ». Il n'y a pas d'habillage. |
| 2. Même opération mentale ? | Le joueur rédige le sérialiseur. C'est l'acte métier lui-même. |
| 3. Échec diagnosticable ? | L'échec est un payload qui n'a pas eu le sort attendu, avec le `errors` réel de DRF à côté. |
| 4. Coût réel ? | Trous et rejets abusifs sont exactement ce qu'une revue de code compte. |
| 5. Deux solutions plausibles ? | Chaque niveau en déclare au moins deux, tabulées ci-dessus. |

## 8. Pont vers le TP

Le sérialiseur du bac à sable est **le** sérialiseur du TP de l'après-midi. Bouton « copier pour
le TP » → un fichier `serializers.py` complet, imports compris, qui tourne tel quel.

## 9. Vérification spécifique

- Le corpus de 20 payloads est un fichier séparé, relu comme un jeu de tests : chaque payload
  déclare son verdict attendu et la règle qu'il doit déclencher s'il échoue.
- Le banc jsdom vérifie qu'aucune règle n'est inatteignable et qu'aucun message générique ne
  sort — y compris en bac à sable, sur les payloads aléatoires.
- Test de copiabilité sur les 8 solutions de référence.
