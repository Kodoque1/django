# F′ — Le simulateur d'authentification

**Module V · authentification · widget dans la slide · ~15 min**

---

## 1. Pourquoi ce n'est pas un jeu

Décision assumée, et c'est la partie la plus importante de ce document.

Le module V contient exactement **deux insights**, et ils tiennent chacun en une manipulation :

1. `Basic` transmet `base64(login:motdepasse)`. Ce n'est **pas** du chiffrement — c'est un
   encodage réversible d'un clic. Sur HTTP, l'identifiant circule en clair.
2. L'authentification par **session** stocke l'état **côté serveur**. Derrière plusieurs
   serveurs, la session n'est plus là où la requête arrive. Un **jeton** est porté par le client :
   il n'a pas ce problème — et un client non-navigateur n'a de toute façon pas de bocal à
   cookies.

Le reste du chapitre (`DEFAULT_AUTHENTICATION_CLASSES`, `rest_framework.authtoken`,
`obtain_auth_token`) est de la **procédure**.

Fabriquer un jeu là-dessus reviendrait à étirer deux constats en une boucle de gameplay : c'est
précisément le *chocolate-covered broccoli* que le contrat de design interdit. Les cinq tests de
falsification échouent — en particulier le n°5 : il n'y a pas deux solutions plausibles à
« décoder du base64 ».

**Ce qui convient ici** : un simulateur observable — la famille de widgets du cours d'archi
(`archi/cours/*/js/widgets/`) — entouré de frames PI classiques. On manipule, on observe, on
répond en frames.

> Si, à l'usage, le module V se révèle plus riche que prévu (typiquement : rotation et
> expiration des jetons, ou JWT), la question d'un jeu pourra se reposer — avec les cinq tests
> comme critère d'entrée, pas l'envie d'homogénéiser.

## 2. Forme

Widget monté dans le deck du module V, contrat standard `init.js` :

```html
<section class="widget-slide" data-widget="authSimulateur">
  <h2>Authentification — le poste d'écoute</h2>
  <div data-widget-mount></div>
</section>
```

`window.CourseWidgets.authSimulateur = { init, destroy }`. Trois panneaux, commutables. Aucun
score, aucun contrat : c'est un instrument.

## 3. Panneau 1 — l'intercepteur

```
   CLIENT ────────────── [ 👁 ÉCOUTE ] ────────────── SERVEUR
                              │
   ┌──────────────────────────┴───────────────────────────────┐
   │ GET /api/commandes/ HTTP/1.1                              │
   │ Host: api.exemple.fr                                      │
   │ Authorization: Basic YWxpY2U6bW90ZGVwYXNzZTEyMw==         │
   │                                                           │
   │              [ décoder ]  ──▶  alice:motdepasse123        │
   └───────────────────────────────────────────────────────────┘

   transport :  ( • ) HTTP      (   ) HTTPS
```

Le bouton **décoder** applique `atob()` sous les yeux de l'étudiant. Bascule sur HTTPS : le
panneau d'écoute n'affiche plus qu'un bloc chiffré et la mention « l'en-tête est toujours là,
mais le lien est chiffré ».

Message porté : `Basic` n'a **jamais** prétendu protéger quoi que ce soit ; c'est TLS qui le
fait. Un `Basic` sur HTTP est un mot de passe affiché.

Le même panneau montre ensuite un en-tête `Authorization: Token 9944b09…` : le décodage ne donne
rien — mais un jeton intercepté reste rejouable. **Le jeton n'est pas plus secret, il est
seulement révocable et sans mot de passe dedans.** Point souvent mal compris, à énoncer.

## 4. Panneau 2 — la ferme de serveurs

```
                      ┌──▶ srv-1   [ session alice ✔ ]
   client ──▶ LB ─────┼──▶ srv-2   [ ——— ]
                      └──▶ srv-3   [ ——— ]

   serveurs : [ 1 ]──────●───────[ 3 ]
   mécanisme : ( • ) session   (   ) jeton

   requête 1 → srv-1  200
   requête 2 → srv-2  401   ◀ la session n'est pas ici
   requête 3 → srv-1  200
   requête 4 → srv-3  401
```

Curseur 1 → 3 serveurs. En **session**, la mémoire vit sur le serveur qui a authentifié : les
401 apparaissent dès le second serveur, de façon intermittente — le symptôme réel, « ça marche
une fois sur deux », bien plus parlant qu'une panne franche.

En **jeton**, la signature est vérifiable par n'importe quel serveur : 200 partout.

Un bouton « stockage partagé » montre la troisième voie (sessions en base ou en cache commun) —
honnêteté : la session *peut* être mise à l'échelle, au prix d'une dépendance partagée.

## 5. Panneau 3 — le client non-navigateur

Deux clients côte à côte sur la même API :

```
   NAVIGATEUR                          SCRIPT PYTHON
   Cookie: sessionid=abc…  (auto)      requests.get(url)
   → 200                               → 401
                                       requests.get(url, headers={
                                           "Authorization": "Token 9944b09…"})
                                       → 200
```

Le navigateur gère un bocal à cookies et renvoie la session sans qu'on lui demande. Un script
n'a rien de tel. C'est **la** raison pratique pour laquelle une API destinée à des clients variés
s'authentifie par jeton — plus convaincante que l'argument « sans état », souvent récité sans
conséquence concrète.

## 6. Frames PI autour du simulateur

Le simulateur ne fait rien apprendre seul : il fournit l'observation, les frames construisent la
réponse. Six à huit frames, sur le moteur existant, avec le simulateur en `stage` (mécanisme déjà
utilisé par `apiStage` dans `http-verbs.js`).

| Frame | Type | Ce qui est demandé |
|---|---|---|
| `base64` | `choice` | « `YWxpY2U6...` est-il chiffré ? » — erreur prévue : « oui, c'est illisible » |
| `basic-https` | `choice` | ce que HTTPS protège, et ce qu'il ne protège pas |
| `session-ou` | `choice` | où vit l'état d'une session — erreur prévue : « dans le cookie » |
| `401-intermittent` | `free` | diagnostiquer le « ça marche une fois sur deux » |
| `jeton-vole` | `choice` | un jeton intercepté est-il inoffensif ? — erreur prévue : « oui, il est chiffré » |
| `client-script` | `choice` | pourquoi le script reçoit 401 |
| `pont-drf` | `slots` | ranger `SessionAuthentication`, `TokenAuthentication`, `BasicAuthentication` selon client visé et stockage d'état |
| `implementation` | `order` | l'ordre réel : `INSTALLED_APPS` → `migrate` → `obtain_auth_token` → en-tête client |

Chaque erreur prévue porte son message, règle non négociable inchangée.

## 7. Ce que le simulateur ne modélise pas

À dire dans le support plutôt qu'à simuler : expiration et rotation des jetons, JWT et sa
signature, OAuth2, `HttpOnly`/`SameSite`, CSRF. Le lien avec le CSRF mérite une phrase — la
session est vulnérable au CSRF *parce que* le navigateur envoie le cookie tout seul, ce que le
panneau 3 vient de montrer.

## 8. Pont vers le TP

TP du Jour 4, « application sécurisée avec authentification par jeton » :
`rest_framework.authtoken` dans `INSTALLED_APPS`, `migrate`, `obtain_auth_token` routé, en-tête
`Authorization: Token …` côté client. La frame `implementation` en est la répétition.

## 9. Vérification

Mêmes règles que les widgets existants : montage/démontage propre en changeant de slide, aucun
double bandeau, bascule clair/sombre sur chaque panneau, console vierge. Le simulateur n'a pas de
banc jsdom propre ; les frames sont couvertes par le banc des jeux PI.
