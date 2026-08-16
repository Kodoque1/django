# Cours interactif — APIs Python / Django RESTful (IPSSI)

Deck [reveal.js](https://revealjs.com/) autonome (HTML/CSS/JS, tout *vendored*, aucune dépendance
réseau), bâti sur le même socle que le cours *Architecture & Données distribuées*
(`../../archi/cours/`) : thème IPSSI clair/sombre, diagrammes Mermaid à rendu paresseux,
widgets montés/démontés à la volée selon la slide visible.

Différence avec le cours d'archi : celui-ci ajoute un **moteur de pédagogie programmée**
(`js/pi-frames.js`). Les widgets d'archi sont des *simulateurs observables* — on manipule, on
regarde. Ici, les widgets sont des **jeux sérieux** : ils posent une question, exigent une
réponse construite, et corrigent immédiatement avec un message propre à l'erreur commise.

## Lancer le deck

```bash
cd /home/kodoque/Documents/ipssi/django
python3 serve.py               # serveur sans cache — port 8000
# puis ouvrir http://localhost:8000/cours/J1-01-architecture-restful/
```

`serve.py` désactive le cache navigateur ; avec `python3 -m http.server` à la place, un F5 normal
peut rejouer d'anciens fichiers JS/HTML — forcer `Ctrl+Shift+R` après chaque modification.

Navigation : flèches clavier / espace, `Échap` pour la vue d'ensemble, `S` pour les notes
orateur (elles contiennent le déroulé conseillé de chaque jeu). Le bouton en haut à droite
bascule le thème clair/sombre.

Dans un jeu : les touches **1-9** sélectionnent une réponse, **Entrée** valide puis passe à la
suivante.

## Arborescence

```
cours/
  index.html                  # accueil de la semaine (hors reveal.js) — les 5 jours, leur état
  css/
    theme-ipssi.css           # thème — copié d'archi, non modifié
    widgets.css               # widgets Tangle & simulateurs — copié d'archi, non modifié
    pi-frames.css             # habillage du moteur de frames (classes pi-*)
    jeux.css                  # scènes des jeux (wi-, ts-, hv-)
  js/
    theme.js                  # bascule clair/sombre — partagée deck ↔ accueil ↔ jeux autonomes
    init.js                   # bootstrap reveal + Mermaid + montage des widgets (d'archi, ⚠ diverge)
    tangle-kit-lite.js        # composants Tangle (d'archi, disponible si besoin)
    pi-frames.js              # moteur de pédagogie programmée
  vendor/                     # reveal.js, Mermaid, Tangle.js (hors-ligne)

  J1-01-architecture-restful/ # module I : les 5 notions + les 5 jeux
    index.html
    js/widgets/
      web-invention.js        # A. Web mondial   — « Les trois inventions du Web »
      url-anatomy.js          # B. URL           — « Anatomie d'une URL »
      tcpip-stack.js          # C. Protocoles    — « Emballer, envoyer, déballer »
      http-verbs.js           # D. Verbes HTTP   — « Le bon verbe »
      status-triage.js        # E. Codes d'état  — « Le triage »
      traversee-reseau.js     # simulation — encapsuler, traverser, décapsuler

  J1-02-architecture-django/  # module II : 2 simulations + 3 séries de frames
    index.html
    js/widgets/
      middlewares-aller-retour.js  # simulation — la requête descend la chaîne et remonte
      routeur-ordre.js        # simulation — les motifs essayés dans l'ordre
      routage-frames.js       # II.F  URL et convertisseurs
      vues-frames.js          # II.E  get / get_object_or_404 / first
      orm-frames.js           # II.C  paresse, N+1, select/prefetch
```

## Le moteur de pédagogie programmée

`js/pi-frames.js` applique six règles, dans cet ordre de priorité :

1. **Aucune révélation sans réponse construite.** Le bouton « Suivant » n'apparaît qu'après
   validation.
2. **Feedback immédiat et spécifique.** Chaque erreur prévue porte son propre message
   (`feedbackFor`). Un message générique est traité comme un bug — le banc d'essai le détecte
   (voir plus bas).
3. **Estompage des indices.** Le champ `cue` (3 → 0) fait passer l'aide de *toujours visible*, à
   *repliée*, à *sur demande* (et son usage est tracé), à *absente*. La difficulté monte par
   retrait d'indice, pas par complexification.
4. **Boucle de reprise.** Toute question ratée — ou réussie avec l'indice — est réinjectée
   3 frames plus loin, avec **un cran d'indice en moins** et reformulée si la frame fournit un
   bloc `retry`. L'étudiant la voit revenir marquée **« 2ᵉ passage »**.
5. **Compteurs informatifs, jamais punitifs.** Pas de vies, pas d'échec bloquant. Au 2ᵉ échec sur
   une même frame, la réponse est montrée : on ne laisse personne s'enliser.
6. **Mode duel.** Bouton bascule dans le bandeau : score, série et chrono agrandis pour une
   manche projetée au vidéoprojecteur.

### Écrire un jeu

```js
PIFrames.widget("monJeu", function () {
  return {
    id: "mon-jeu",            // clé du record en localStorage
    duel: false,              // mode duel actif au montage
    masteryTarget: 0.9,       // seuil annoncé dans le bilan
    frames: [ /* … */ ],
  };
});
```

`PIFrames.widget()` enregistre `window.CourseWidgets.monJeu = { init, destroy }` — le contrat
attendu par `init.js`. Côté HTML :

```html
<section class="widget-slide" data-widget="monJeu">
  <h2>🎮 Titre du jeu</h2>
  <div data-widget-mount></div>
</section>
```

Le `<script>` du jeu doit être chargé **avant** `vendor/reveal/dist/reveal.js`, et
`js/theme.js` **avant** `js/init.js`.

> ⚠️ **`js/init.js` diverge de `archi/cours/js/init.js`**, dont il est par ailleurs une copie :
> la bascule clair/sombre en a été extraite vers `js/theme.js`, pour que l'accueil et les futures
> pages de jeu autonomes la partagent au lieu de la dupliquer (exigé par
> `../design/jeux/00-contrat-de-design.md` §4). Recopier la version d'archi par-dessus casserait
> les deux ; le bloc concerné porte l'avertissement sur place.

### Champs d'une frame

| Champ | Rôle |
|---|---|
| `id`, `label` | identité ; `label` sert au « à revoir en priorité » du bilan |
| `cue` | 3 indice ouvert · 2 indice replié · 1 indice sur demande · 0 sans indice |
| `hint`, `hintTitle` | contenu de l'indice (HTML) |
| `prompt` | l'énoncé (HTML) |
| `type` | `choice` · `multi` · `slots` · `order` · `build` · `free` |
| `feedbackFor` | **le cœur** — un message par erreur prévue (voir les clés par type ci-dessous) |
| `explain` | ce qui s'affiche une fois la bonne réponse donnée |
| `retry` | reformulation utilisée lors de la réinjection |
| `stage`, `stageId` | scène visuelle ; deux frames partageant un `stageId` la conservent (état continu) |
| `onSettle(stage, meta, elFeedback, shared)` | animation de démonstration après validation |

Clés de `feedbackFor` selon le type : `choice`/`multi` → l'`id` de l'option ; `slots` →
`token@slot` (placement précis) puis `token` (repli) ; `order` → `item@position` puis `item` ;
`build` → `jeton@position`, `jeton`, ou `_manque:jeton` ; `free` → la saisie fautive attendue,
ou `_defaut`.

## Vérification après modification

```bash
bash ../outils/verifier-tout.sh
```

Le banc **`outils/banc-jeux.js`** (jsdom) découvre les jeux de **tous** les modules, les joue de
bout en bout et contrôle la complétude des feedbacks : il reproduit les règles de résolution de `feedbackFor` ci-dessus et
refuse tout repli sur `explain` ou sur le message générique du moteur. À sa première exécution,
il a trouvé **16 trous** dans les cinq jeux pourtant relus à la main.

Il ne dispense pas de la passe manuelle — jsdom ne calcule aucun style :

1. Servir le dossier, ouvrir le module, dérouler toutes les slides — chaque diagramme Mermaid
   se rend, y compris après navigation arrière.
2. Jouer les jeux **en se trompant volontairement à chaque frame** : le message affiché
   doit correspondre à l'erreur commise, jamais à un texte générique.
3. Vérifier qu'une question ratée revient plus loin, marquée « 2ᵉ passage », avec un cran
   d'indice en moins.
4. Quitter une slide de jeu puis y revenir : remontage propre, pas de double bandeau.
5. Basculer le mode duel, puis clair/sombre, sur chaque slide de jeu.
6. Console navigateur : aucune erreur, aucun `Widget inconnu` ni `Point de montage introuvable`.

## Suite du programme

L'état d'avancement, la couverture des 32 entrées du programme IPSSI et l'ordre d'implémentation
vivent dans **un seul endroit** : [`../README.md`](../README.md), le document de pilotage. Ne pas
en tenir une seconde copie ici — c'est ainsi que les deux divergent.

En bref : le module I est livré ; les modules II à V restent à écrire, et cinq jeux sérieux les
accompagneront (`../design/jeux/`). Les jeux du Jour 1 se terminent tous par une **frame-pont**
vers ces modules (`path()` et `APPEND_SLASH`, place de Django dans la pile, actions d'un
`ModelViewSet`, codes produits par `Http404` / `is_valid()` / les classes de permission) — de
quoi rattacher explicitement chaque notion réseau à ce qui sera écrit en Python.

Ce que ces jeux affirment est ensuite **mesuré sur un vrai Django** au TP d'instrumentation
(`../tp-instrumentation/`) : c'est la doctrine des trois régimes, exposée dans le document de
pilotage. Une conséquence concrète pour qui écrit un jeu ici : toute affirmation sur le
comportement de Django ou de DRF se tranche sur `../tp-instrumentation/verifier.py`, et **quand
la mesure contredit le support, c'est le support qui change**.
