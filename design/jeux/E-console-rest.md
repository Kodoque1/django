# E — La console REST

**Refonte partielle du Jour 1 · verbes et idempotence · `cours/jeux/console-rest/` · ~20 min**

---

## 1. Ce qui change dans le J1, et ce qui ne change pas

`J1-01-architecture-restful/js/widgets/http-verbs.js` **reste dans le deck**, frames 1 à 7
comprises. Pour de l'association verbe ↔ intention (`GET` lit, `POST` crée, `PATCH` modifie
partiellement), l'opération mentale est de la **classification sous règle** : la frame de
pédagogie programmée est l'outil correct, et un jeu y serait de la décoration
(`00-contrat-de-design.md` §2).

Ce qui est refondu, c'est **la fin** : les frames « idempotence » et « matrice sûr/idempotent »
demandent de *prédire l'état final après rejeu*. C'est une opération de planification, pas de
classification — et elle mérite un jeu. La slide gagne un lien vers la console autonome.

Les autres jeux du J1 (`web-invention`, `url-anatomy`, `tcpip-stack`, `status-triage`) ne sont
pas touchés.

## 2. Opération mentale visée

**Planifier une suite de transitions d'état sous réseau non fiable.**

L'idempotence n'est pas une propriété à réciter : c'est la contrainte qui décide si un plan tient
quand le réseau se comporte mal. Tant qu'on ne l'a pas éprouvée, « PUT est idempotent » est une
phrase ; après, c'est une raison de choisir PUT.

## 3. Isomorphisme

Le joueur compose de vraies requêtes contre une vraie base, pour atteindre un état cible. Le
réseau applique ses avanies. Le plan tient ou ne tient pas. L'action du joueur — choisir une
séquence de requêtes — **est** l'acte métier : c'est ce que fait un client d'API.

## 4. Boucle centrale

```
   ÉTAT COURANT                        ÉTAT CIBLE
   ┌────┬──────────────┬──────┬───┐    ┌────┬──────────────┬──────┬───┐
   │ id │ nom          │ prix │st.│    │ id │ nom          │ prix │st.│
   ├────┼──────────────┼──────┼───┤    ├────┼──────────────┼──────┼───┤
   │ 12 │ Clavier      │  49  │ 8 │    │ 12 │ Clavier      │  39  │ 8 │
   │ 13 │ Écran 27"    │ 219  │ 3 │    │ 14 │ Souris       │  29  │20 │
   └────┴──────────────┴──────┴───┘    └────┴──────────────┴──────┴───┘

   COMPOSEUR                           JOURNAL
   [PATCH ▾] /produits/[12]/           PATCH /produits/12/  {"prix":39}   200
   corps : prix = [39]                 DELETE /produits/13/               204
              [ ENVOYER ]              ⚡ le réseau a REJOUÉ cette requête
                                       DELETE /produits/13/               404
   requêtes émises : 3
```

Le composeur est structuré (verbe · chemin · corps par champs) — pas de saisie libre, cohérent
avec le choix « blocs → code » des autres jeux. Le journal affiche à droite le Python `requests`
équivalent, copiable.

**Les avanies du réseau** (introduites progressivement) :

| Avanie | Effet |
|---|---|
| **rejeu** | une requête émise part une seconde fois, à un moment quelconque |
| **réponse perdue** | la requête aboutit, mais le client ne reçoit rien — on ne sait pas si elle a atterri |
| **ordre inversé** | deux requêtes en vol arrivent dans l'ordre inverse |

Elles sont **annoncées** (« ce niveau rejoue une requête ») mais pas datées : on ne peut pas les
esquiver, seulement construire un plan qui y survit.

## 5. Niveaux

### Niveau 1 — atteindre l'état, réseau parfait

Trois transformations simples. Aucune avanie. Contrat : état atteint. Coût affiché : requêtes
émises.

Sert à installer le composeur et à faire sentir que plusieurs plans atteignent la cible pour des
coûts différents (un `PUT` complet contre trois `PATCH`).

### Niveau 2 — le coût entre en jeu

Contrat : état atteint **en ≤ 4 requêtes**. Force à choisir entre `PUT` (une requête, tous les
champs) et `PATCH` (un champ à la fois).

| Solution fautive plausible | Règle |
|---|---|
| `PUT` avec un corps partiel | `put-partiel` — « `PUT` demande de **remplacer** la ressource, et votre corps ne la décrit pas entièrement : `categorie` est requis et manque. Le sérialiseur refuse en **400** — rien n'a été écrit. » |
| `PUT` complet sauf un champ à valeur par défaut | `put-champ-a-defaut` — « 200, et pourtant `stock` n'a pas bougé : il a une valeur par défaut dans le modèle, donc `required=False` dans le sérialiseur, donc son absence est tolérée **et l'ancienne valeur survit**. Sur ce champ, votre PUT s'est comporté comme un PATCH. » |

> ⚠️ **Fidélité — ne pas simplifier ce niveau.** La formulation « PUT écrase les champs absents »
> est vraie du **protocole**, fausse de **DRF**, et c'est mesuré :
> `tp-instrumentation/verifier.py` §4.3 obtient 400 sur un champ requis absent et une valeur
> **conservée** sur un champ à défaut modèle. `django-lite` prétendant modéliser Django/DRF
> (contrat de design §5.2), son `PUT` doit reproduire ce comportement-là, pas le remplacement
> littéral. Le widget `http-verbs.js` du Jour 1, lui, simule un magasin de ressources HTTP brut :
> il a le droit d'écraser, et son `explain` dit désormais dans quel registre il parle.

### Niveau 3 — le rejeu

Une requête du plan sera rejouée. Contrat : l'état cible est atteint **et** reste atteint après
le rejeu.

Un plan bâti sur `POST` échoue : le produit est créé deux fois. Un plan bâti sur `PUT` et
`DELETE` survit.

| Solution fautive plausible | Règle |
|---|---|
| Création par `POST` | `post-rejoue` — « Deux lignes « Souris » en base. Rien dans HTTP ne dédoublonne : le serveur ne peut pas distinguer votre renvoi d'une seconde commande volontaire. C'est pourquoi les sites affichent « ne rechargez pas cette page ». » |
| `PATCH {"stock": "+1"}` | `patch-relatif` — « Le stock est à 22 au lieu de 21. Un `PATCH` **relatif** n'est pas idempotent : le rejeu l'applique deux fois. `PATCH {"stock": 21}` l'aurait été. » |

Ce second cas est le contenu réel de la frame « matrice sûr/idempotent » de `http-verbs.js` —
mais provoqué au lieu d'être énoncé.

### Niveau 4 — la réponse perdue

Une requête aboutit sans que la réponse revienne. Le joueur voit un délai dépassé et doit
décider : **renvoyer ou pas ?**

C'est la situation qui donne son intérêt pratique à l'idempotence. Un `PUT` se renvoie sans
risque ; un `POST` non — et on ne peut pas savoir s'il a atterri sans une requête de
vérification supplémentaire (qui coûte).

| Solution fautive plausible | Règle |
|---|---|
| Renvoyer le `POST` | `post-renvoye` — « Doublon. Vous ne pouviez pas savoir : c'est exactement le problème. Avec un verbe idempotent, la question ne se pose pas — d'où l'usage d'une clé d'idempotence sur les `POST` de paiement. » |
| Ne rien renvoyer | `abandon` — « Prudent, et l'état cible n'est pas atteint : peut-être que la requête n'avait pas abouti. Sans idempotence, il faut une requête de vérification — comptez-la. » |

### Niveau 5 — la suppression rejouée

Cible : la ressource 13 n'existe plus. Le `DELETE` est rejoué et renvoie **404** la seconde fois.

Le contrat porte sur **l'état final**, pas sur les codes reçus. C'est la définition exacte de
l'idempotence, et l'endroit où presque tout le monde se trompe.

| Solution fautive plausible | Règle |
|---|---|
| Le joueur signale un échec en voyant le 404 | `404-nest-pas-un-echec` — « L'état final est identique : la ressource est absente, une fois comme dix. L'idempotence porte sur **l'état du serveur**, pas sur le code de retour. Le 404 dit seulement « il n'y a plus rien ici », ce qui est le résultat voulu. » |

### Niveau 6 — bac à sable

État de départ et état cible choisis par le joueur (ou tirés au sort), avanies activables une à
une. L'audit commente le plan : verbes non idempotents utilisés là où un idempotent suffisait,
requêtes redondantes, dépendance à l'ordre d'arrivée.

Compteurs : **requêtes émises** · **divergences d'état après rejeu**.

---

## 6. Contrats et coût du domaine

| | |
|---|---|
| **Contrat** | état cible atteint **et** stable sous les avanies annoncées |
| **Coût** | requêtes émises · divergences d'état après rejeu |

## 7. Surface `django-lite` utilisée

`DB` + une API CRUD figée (pas de vue à construire : ce jeu ne porte pas sur la conception
serveur) · `snapshot()`/`restore()` pour la comparaison à l'état cible · une couche « réseau »
propre au jeu pour les avanies. Le composeur de requêtes est **partagé avec le jeu D**.

## 8. Passage des cinq tests

| Test | Réponse |
|---|---|
| 1. Problème sans habillage ? | Oui : « atteins cet état en ≤ N opérations, sachant qu'une opération sera rejouée ». C'est un problème de planification, énonçable en une phrase. |
| 2. Même opération mentale ? | Choisir une séquence de requêtes est ce que fait un client d'API. |
| 3. Échec diagnosticable ? | L'échec est un écart entre l'état obtenu et l'état cible, avec le journal montrant quelle requête a divergé. |
| 4. Coût réel ? | Nombre de requêtes et divergences d'état : ce que mesure n'importe quel client d'API. |
| 5. Deux solutions plausibles ? | Oui, et c'est le point : le plan `POST` et le plan `PUT` atteignent tous deux la cible sur réseau parfait. Seule l'avanie les sépare. |

## 9. Pont

En amont : les frames 1-7 de `http-verbs.js`, inchangées. En aval : le jeu C (niveau 8,
`partial=True`) et le comportement de `update` / `partial_update` d'un `ModelViewSet`.

## 10. Vérification spécifique

- Les avanies doivent être **déterministes en test** (graine fixée) pour que le banc jsdom puisse
  rejouer un plan et vérifier le diagnostic.
- Vérifier que le contrat porte bien sur l'état final et **jamais** sur les codes de retour : un
  niveau qui échouerait à cause d'un 404 attendu contredirait sa propre leçon.
