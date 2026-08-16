/*
 * Jeu de frames — le routage Django.
 *
 * Vient APRÈS la simulation du routeur : on y a observé le mécanisme, on construit
 * maintenant les règles. Aucune slide n'a donné ces réponses (contrat pédagogique §0).
 *
 * Chaque erreur prévue porte son message. Le banc `outils/banc-jeux.js` refuse tout repli
 * sur `explain`.
 */
(function () {
  "use strict";

  var RAPPEL_CONV =
    "<code>int</code> chiffres, et convertit en entier · " +
    "<code>str</code> tout sauf « / » · " +
    "<code>slug</code> lettres, chiffres, tirets, souligné · " +
    "<code>uuid</code> · <code>path</code> tout, slash compris";

  function frames() {
    return [
      {
        id: "type-pk", label: "le type de pk", cue: 3,
        hintTitle: "Les convertisseurs", hint: RAPPEL_CONV,
        type: "choice", wide: true,
        prompt: "La route est <code>path(\"produits/&lt;int:pk&gt;/\", detail)</code>. " +
          "On demande <code>/produits/12/</code>.<br>Que reçoit exactement la vue ?",
        options: [
          { id: "ok", label: "<code>pk=12</code> — un entier Python" },
          { id: "str", label: "<code>pk=\"12\"</code> — une chaîne" },
          { id: "req", label: "Rien : la vue lit le chemin dans <code>request.path</code>" },
          { id: "liste", label: "<code>pk=[\"12\"]</code> — une liste, comme <code>request.GET</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          str: "Presque : une URL est bien un texte, donc « 12 » y est une chaîne. Mais c'est exactement le travail du convertisseur <code>int:</code> — il convertit avant d'appeler la vue. Sans lui, vous auriez raison.",
          req: "<code>request.path</code> existe, mais Django fait mieux : il extrait les morceaux nommés du motif et les passe en arguments. C'est tout l'intérêt de déclarer <code>&lt;int:pk&gt;</code> plutôt que d'analyser l'URL à la main.",
          liste: "Ce sont les paramètres de la <i>query string</i> (<code>request.GET</code>) qui sont des listes, parce que <code>?t=a&amp;t=b</code> est légal. Un morceau de chemin n'apparaît qu'une fois : c'est une valeur simple.",
        },
        explain: "Le convertisseur fait deux choses d'un coup : il <b>filtre</b> (seuls les chiffres correspondent) et il <b>convertit</b> (<code>pk</code> arrive en <code>int</code>). C'est la première validation de votre application, et elle s'exécute avant votre première ligne de code.",
      },
      {
        id: "abc", label: "un motif qui ne correspond pas", cue: 2,
        hintTitle: "Indice", hint: "<code>int</code> n'accepte que des chiffres. Que fait Django quand aucun motif ne correspond ?",
        type: "choice", wide: true,
        prompt: "Même route. On demande <code>/produits/abc/</code>.<br>Que se passe-t-il ?",
        options: [
          { id: "ok", label: "404 — et la vue n'est <b>jamais</b> appelée" },
          { id: "vue", label: "La vue est appelée avec <code>pk=\"abc\"</code>, et plante en 500" },
          { id: "none", label: "La vue est appelée avec <code>pk=None</code>" },
          { id: "400", label: "400 — la requête est malformée" },
        ],
        answer: "ok",
        feedbackFor: {
          vue: "C'est ce qui arriverait <i>sans</i> convertisseur typé. Avec <code>&lt;int:pk&gt;</code>, le motif ne correspond pas du tout : Django n'a aucune vue à appeler, il s'arrête avant. La trace ne comporte aucune ligne « vue » : la fonction n'a pas tourné.",
          none: "Django n'invente pas de valeur par défaut. Soit le motif correspond et la vue reçoit la valeur, soit il ne correspond pas et la vue n'est pas appelée du tout.",
          400: "400 dit « votre requête est mal formée » — c'est le code d'une validation de <i>contenu</i>. Ici l'adresse demandée n'existe simplement pas dans la table des routes : c'est 404.",
        },
        explain: "Le 404 de routage est produit <b>avant</b> tout code métier. C'est aussi pourquoi il ne coûte rien : aucune requête en base, aucune vue exécutée.",
      },
      {
        id: "ordre", label: "l'ordre des motifs", cue: 1,
        hintTitle: "Rappel", hint: "La résolution s'arrête au <b>premier</b> motif qui correspond.",
        type: "choice", wide: true,
        prompt: "<pre><code>urlpatterns = [\n" +
          "    path(\"produits/&lt;slug:slug&gt;/\", par_slug),\n" +
          "    path(\"produits/&lt;int:pk&gt;/\",    detail),\n]</code></pre>" +
          "On demande <code>/produits/12/</code>. Quelle vue répond ?",
        options: [
          { id: "ok", label: "<code>par_slug</code> — et <code>detail</code> ne sera jamais atteinte" },
          { id: "detail", label: "<code>detail</code> — Django choisit le motif le plus précis" },
          { id: "erreur", label: "Django lève une erreur de configuration : deux motifs se recouvrent" },
          { id: "deux", label: "Les deux, dans l'ordre" },
        ],
        answer: "ok",
        feedbackFor: {
          detail: "Django ne classe pas les motifs par précision : il les essaie <b>dans l'ordre de la liste</b> et s'arrête au premier qui mord. Or « 12 » est un slug parfaitement valide (chiffres autorisés). Le second motif est inatteignable.",
          erreur: "Aucune erreur, et c'est bien le problème : le recouvrement est légal. Rien ne vous préviendra — ni au démarrage, ni à l'exécution. Seul un test le révèle.",
          deux: "Une requête, une vue. La résolution s'arrête au premier motif qui correspond ; il n'y a pas de chaînage.",
        },
        explain: "<code>urlpatterns</code> est une <b>liste ordonnée</b>. Règle pratique : du plus spécifique au plus général. Ici il suffit d'inverser les deux lignes — et <code>/produits/clavier-mecanique/</code> continue de fonctionner, puisque ce n'est pas un entier.",
        retry: {
          prompt: "<code>path(\"produits/&lt;str:x&gt;/\")</code> est placé <b>avant</b> " +
            "<code>path(\"produits/&lt;int:pk&gt;/\")</code>. Combien d'URL atteindront <code>detail</code> ?",
          options: [
            { id: "ok", label: "Aucune" },
            { id: "detail", label: "Celles dont le segment est un nombre" },
            { id: "erreur", label: "Django détectera le conflit au démarrage" },
            { id: "deux", label: "Toutes, après un passage par la première vue" },
          ],
          answer: "ok",
          explain: "<code>str</code> accepte tout sauf « / » : il avale absolument tout ce que <code>int</code> aurait pu prendre.",
        },
      },
      {
        id: "slash", label: "le slash final", cue: 1,
        hintTitle: "Indice", hint: "<code>APPEND_SLASH</code> vaut <code>True</code> par défaut, et vit dans <code>CommonMiddleware</code>.",
        type: "choice", wide: true,
        prompt: "Seule route : <code>path(\"produits/&lt;int:pk&gt;/\", detail)</code>. " +
          "Un formulaire envoie <b>POST</b> <code>/produits/12</code> — sans slash final.<br>" +
          "En production (<code>DEBUG=False</code>), que reçoit la vue ?",
        options: [
          { id: "ok", label: "Rien d'utile : 301, le navigateur repasse en <b>GET</b>, le corps est perdu" },
          { id: "post", label: "Le POST complet : Django redirige en conservant le corps" },
            { id: "404", label: "404 — le motif exige le slash" },
          { id: "erreur", label: "Une erreur 500 : Django refuse de rediriger un POST" },
        ],
        answer: "ok",
        feedbackFor: {
          post: "Une redirection HTTP ne transporte pas le corps de la requête. Le navigateur refait une requête <b>GET</b> vers la nouvelle adresse, et les champs du formulaire disparaissent — sans le moindre message d'erreur.",
          404: "Ce serait le cas avec <code>APPEND_SLASH = False</code>. Par défaut, <code>CommonMiddleware</code> essaie le chemin + « / », le trouve, et renvoie un 301.",
          erreur: "En <code>DEBUG=True</code>, Django lève effectivement une <code>RuntimeError</code> pour vous prévenir. En production, il se tait et redirige : c'est le pire des deux mondes, un bug qui n'existe pas sur le poste du développeur.",
        },
        explain: "Un slash oublié dans un <code>action=\"…\"</code> produit une perte de données <b>silencieuse en production</b>. En développement, Django lève une <code>RuntimeError</code> pour vous prévenir ; en production, il redirige sans rien dire.",
      },
      {
        id: "reverse", label: "reverse", cue: 1,
        hintTitle: "Indice", hint: "<code>name=</code> donne un nom à la route ; <code>reverse()</code> fabrique l'URL à partir de ce nom.",
        type: "build",
        prompt: "La route est <code>path(\"produits/&lt;int:pk&gt;/\", detail, name=\"produit-detail\")</code>.<br>" +
          "Assemblez l'appel qui fabrique l'URL du produit 12.",
        prefix: "url = ",
        tokens: [
          { id: "reverse", label: "reverse(" },
          { id: "nom", label: '"produit-detail"' },
          { id: "kwargs", label: ", kwargs={\"pk\": 12}" },
          { id: "fin", label: ")" },
          { id: "dur", label: 'f"/produits/{pk}/"' },
          { id: "resolve", label: "resolve(" },
        ],
        answer: ["reverse", "nom", "kwargs", "fin"],
        feedbackFor: {
          "resolve@0": "<code>resolve()</code> va dans l'autre sens : d'une URL vers la vue. Ici on part du nom pour fabriquer l'URL — c'est <code>reverse()</code>.",
          "dur@0": "Ça marche… jusqu'au jour où la route change. Tout l'intérêt de <code>name=</code> est de n'écrire l'URL qu'à un seul endroit : <code>urls.py</code>.",
          resolve: "<code>resolve()</code> fait URL → vue. <code>reverse()</code> fait nom → URL. Les deux sont réciproques.",
          dur: "Une URL écrite en dur est une copie de plus à maintenir. Après trois mois, un renommage devient une chasse au <code>grep</code>.",
          reverse: "<code>reverse(</code> ouvre l'appel : c'est le tout premier morceau, rien ne peut le précéder.",
          nom: "Le nom de la route vient juste après l'ouverture de l'appel — c'est le premier argument, et le seul obligatoire.",
          kwargs: "Les paramètres viennent <i>après</i> le nom de la route, séparés par une virgule : <code>reverse(\"nom\", kwargs={…})</code>.",
          fin: "La parenthèse fermante se pose en dernier, une fois l'appel complet. Fermée trop tôt, il manque les paramètres.",
          "_manque:kwargs": "Il manque les paramètres : la route attend un <code>pk</code>, et <code>reverse()</code> refusera de deviner. Sans eux, vous obtenez <code>NoReverseMatch</code>.",
          "_manque:nom": "Il manque le nom de la route : <code>reverse()</code> ne peut rien fabriquer sans savoir de quelle route on parle.",
        },
        explain: "<code>reverse(\"produit-detail\", kwargs={\"pk\": 12})</code> → <code>/produits/12/</code>. Renommez la route en <code>articles/&lt;int:pk&gt;/</code> : l'appel continue de fonctionner, et renvoie la nouvelle adresse. C'est le seul intérêt de <code>name=</code>, et il est décisif.",
      },
      {
        id: "outils", label: "resolve et reverse", cue: 0,
        type: "slots", columns: 3,
        prompt: "Rangez chaque outil Python selon ce qu'il répond.",
        slots: [
          { id: "quelle", label: "Quelle vue répond<br>à cette URL ?" },
          { id: "quelle-url", label: "Quelle URL pour<br>cette vue ?" },
          { id: "combien", label: "Combien d'aller-retours<br>a-t-il fallu ?" },
        ],
        tokens: [
          { id: "resolve", label: "<code>resolve(\"/produits/12/\")</code>", slot: "quelle" },
          { id: "reverse", label: "<code>reverse(\"produit-detail\", …)</code>", slot: "quelle-url" },
          { id: "client", label: "<code>Client().get(…, follow=True)</code>", slot: "combien" },
        ],
        feedbackFor: {
          "resolve@quelle-url": "<code>resolve()</code> part d'une URL. Pour partir du <i>nom</i> et obtenir l'URL, c'est <code>reverse()</code>.",
          "reverse@quelle": "<code>reverse()</code> fabrique une URL, il n'en analyse aucune.",
          "client@quelle": "Le client de test envoie une vraie requête et renvoie une réponse — c'est le seul des trois qui traverse toute la chaîne, middlewares compris.",
          resolve: "<code>resolve()</code> : URL → vue, avec les <code>kwargs</code> déjà convertis.",
          reverse: "<code>reverse()</code> : nom de route → URL.",
          client: "<code>Client()</code> : envoie la requête et vous rend la réponse, avec <code>redirect_chain</code> si vous suivez les redirections.",
        },
        explain: "Ces trois lignes suffisent à inspecter tout le routage d'un projet, sans lancer de serveur : <code>resolve()</code> pour savoir qui répond, <code>reverse()</code> pour fabriquer une URL, et le client de test pour traverser la chaîne entière — middlewares et redirections compris.",
      },
    ];
  }

  PIFrames.widget("routageFrames", function () {
    return { id: "routage-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
