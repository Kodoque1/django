/*
 * Jeu de frames — les modèles et l'ORM.
 *
 * Prépare directement le temps 3 du TP d'instrumentation, où l'étudiant mesure ces
 * mêmes nombres avec `CaptureQueriesContext`. Ici il les prédit ; là-bas il les compte.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>Produit</code> a une clé étrangère <code>categorie</code>, et " +
    "<code>8 produits</code> sont en base.";

  function frames() {
    return [
      {
        id: "paresse", label: "le QuerySet est paresseux", cue: 3,
        hintTitle: "Indice",
        hint: "Un QuerySet <b>décrit</b> une requête. Il ne l'exécute qu'au moment où quelqu'un a besoin des lignes.",
        type: "choice", wide: true,
        prompt: "<pre><code>qs = Produit.objects.filter(stock__gt=0)\n" +
          "qs = qs.order_by(\"prix\")</code></pre>" +
          "Combien de requêtes SQL ont été émises à ce stade ?",
        options: [
          { id: "ok", label: "<b>0</b>" },
          { id: "un", label: "1 — le filtre est exécuté tout de suite" },
          { id: "deux", label: "2 — une par ligne" },
          { id: "tout", label: "1, et elle ramène toute la table" },
        ],
        answer: "ok",
        feedbackFor: {
          un: "Pas encore : <code>filter()</code> renvoie un nouveau QuerySet, c'est-à-dire une <i>description</i>. Rien n'a besoin des lignes pour l'instant, donc rien n'est exécuté.",
          deux: "Chaque appel renvoie un QuerySet sans toucher la base — c'est ce qui permet de le construire par morceaux, dans plusieurs fonctions, sans rien payer.",
          tout: "Ce serait le cas si le filtrage se faisait en Python. Ici il sera traduit en <code>WHERE</code> — mais plus tard, et une seule fois.",
        },
        explain: "Zéro. Un QuerySet est <b>paresseux</b> : tant que personne ne le parcourt, ce n'est qu'une description. <code>print(qs.query)</code> vous montre le SQL <i>sans l'exécuter</i> — c'est le meilleur moyen de vérifier ce que l'ORM a compris de votre code.",
      },
      {
        id: "declencheurs", label: "ce qui déclenche la requête", cue: 2,
        type: "multi", wide: true,
        prompt: "Toujours le même <code>qs</code>. <b>Cochez tout ce qui déclenche l'exécution.</b>",
        options: [
          { id: "boucle", label: "<code>for p in qs:</code>" },
          { id: "list", label: "<code>list(qs)</code>" },
          { id: "len", label: "<code>len(qs)</code>" },
          { id: "filter", label: "<code>qs.filter(prix__lt=50)</code>" },
          { id: "exclude", label: "<code>qs.exclude(stock=0)</code>" },
        ],
        answers: ["boucle", "list", "len"],
        feedbackFor: {
          filter: "<code>filter()</code> ajoute une condition et renvoie un <i>nouveau</i> QuerySet : toujours aucune requête. C'est le chaînage qui rend l'ORM composable.",
          exclude: "Comme <code>filter()</code> : <code>exclude()</code> affine la description, sans l'exécuter.",
          boucle: "Parcourir un QuerySet oblige à en avoir les lignes : c'est le déclencheur le plus courant.",
          list: "<code>list()</code> matérialise le QuerySet — donc l'exécute.",
          len: "<code>len()</code> a besoin de toutes les lignes pour les compter en Python. À noter : <code>qs.count()</code> fait un <code>SELECT COUNT(*)</code> et ne ramène rien.",
        },
        explain: "Déclencheurs : itérer, <code>list()</code>, <code>len()</code>, <code>bool()</code>, une tranche indexée, et <code>repr()</code> — ce dernier explique le classique « ça marche dans le shell et pas dans mon code ».",
      },
      {
        id: "n-plus-un", label: "le N+1", cue: 1,
        hintTitle: "Rappel", hint: DECOR,
        type: "choice", wide: true,
        prompt: "<pre><code>for p in Produit.objects.all():\n    print(p.categorie.nom)</code></pre>" +
          "8 produits en base. Combien de requêtes SQL ?",
        options: [
          { id: "ok", label: "<b>9</b>" },
          { id: "un", label: "1 — l'ORM fait une jointure automatiquement" },
          { id: "huit", label: "8 — une par produit" },
          { id: "deux", label: "2 — une par table" },
        ],
        answer: "ok",
        feedbackFor: {
          un: "L'ORM ne devine pas ce dont vous aurez besoin. Il charge les produits, puis va chercher chaque catégorie <i>au moment où vous y touchez</i>. La jointure existe, mais il faut la demander.",
          huit: "Il en manque une : celle qui a ramené la liste des produits. D'où le nom — <b>N+1</b>, une pour la liste plus une par élément.",
          deux: "C'est le résultat qu'on obtiendra avec <code>prefetch_related</code>. Sans rien, chaque accès à <code>p.categorie</code> déclenche sa propre requête.",
        },
        explain: "Une pour la liste, huit pour les catégories : <b>9</b>. Avec 10 000 produits, 10 001 requêtes — et le code n'a pas changé d'un caractère. C'est la panne de performance la plus fréquente en Django, et elle est invisible en développement sur 8 lignes.",
      },
      {
        id: "select-prefetch", label: "select_related ou prefetch_related", cue: 1,
        hintTitle: "Indice",
        hint: "Une jointure SQL ne peut ramener qu'un seul objet lié par ligne. Une relation « plusieurs » dupliquerait la ligne de départ.",
        type: "slots", columns: 2,
        prompt: "Rangez chaque situation sous l'outil qui convient.",
        slots: [
          { id: "select", label: "<code>select_related</code>", sub: "une jointure · 1 requête" },
          { id: "prefetch", label: "<code>prefetch_related</code>", sub: "une requête par table · recollage en Python" },
        ],
        tokens: [
          { id: "fk", label: "<code>p.categorie</code> — clé étrangère", slot: "select" },
          { id: "o2o", label: "<code>p.fiche</code> — OneToOne", slot: "select" },
          { id: "inverse", label: "<code>p.avis.all()</code> — relation inverse", slot: "prefetch" },
          { id: "m2m", label: "<code>p.tags.all()</code> — ManyToMany", slot: "prefetch" },
        ],
        feedbackFor: {
          "inverse@select": "Impossible en une jointure : un produit qui a trois avis apparaîtrait trois fois dans le résultat. C'est précisément pour ça que <code>prefetch_related</code> fait deux requêtes et recolle en Python.",
          "m2m@select": "Même raison qu'une relation inverse : plusieurs objets liés par objet de départ, donc une jointure dupliquerait les lignes.",
          "fk@prefetch": "Ça marche — 2 requêtes au lieu de 9, le contrat est rempli. Mais sur une clé étrangère directe, <code>select_related</code> fait une jointure et n'en émet qu'<b>une</b>. Autant la prendre.",
          "o2o@prefetch": "Comme pour la clé étrangère : un seul objet lié, donc une jointure suffit.",
          fk: "Vers un « un seul » : <code>select_related</code>.",
          o2o: "Un <code>OneToOne</code> est un « un seul » : <code>select_related</code>.",
          inverse: "Vers un « plusieurs » : <code>prefetch_related</code>.",
          m2m: "Un <code>ManyToMany</code> est un « plusieurs » : <code>prefetch_related</code>.",
        },
        explain: "Ce ne sont pas deux niveaux d'optimisation, mais <b>deux stratégies imposées par la cardinalité</b>. Vers un « un seul », on joint. Vers un « plusieurs », on fait une seconde requête et on recolle — d'où <b>2</b> requêtes, jamais 1. Beaucoup prédisent 1 : c'est le signe qu'on croit à « pareil, en mieux ».",
      },
      {
        id: "ou-filtrer", label: "filtrer où ?", cue: 1,
        type: "choice", wide: true,
        prompt: "Deux façons de n'afficher que les produits en stock, sur une table de <b>12 000 lignes</b> dont 40 en stock." +
          "<pre><code>A = [p for p in Produit.objects.all() if p.stock &gt; 0]\n" +
          "B = Produit.objects.filter(stock__gt=0)</code></pre>" +
          "Les deux donnent le même résultat. Qu'est-ce qui les sépare ?",
        options: [
          { id: "ok", label: "A ramène 12 000 lignes pour en garder 40 ; B en ramène 40" },
          { id: "requetes", label: "A fait 12 000 requêtes, B une seule" },
          { id: "rien", label: "Rien : l'ORM traduit A en <code>WHERE</code> lui aussi" },
          { id: "b-lent", label: "B est plus lent : le filtrage en base coûte plus cher" },
        ],
        answer: "ok",
        feedbackFor: {
          requetes: "Une seule requête dans les deux cas — c'est ce qui rend le piège difficile à voir : le <b>compteur de requêtes ne bouge pas</b>. Ce qui change, c'est le nombre de lignes ramenées.",
          rien: "L'ORM ne relit pas votre code Python. Dans A, la boucle s'exécute dans votre processus, après que la base a tout envoyé.",
          "b-lent": "L'inverse : la base est faite pour filtrer, et elle a des index. Ramener 12 000 lignes sur le réseau pour en jeter 11 960 coûte bien plus cher.",
        },
        explain: "Même résultat, même nombre de requêtes, coût radicalement différent. C'est pourquoi compter les requêtes ne suffit pas toujours : il faut aussi regarder <b>combien de lignes</b> elles ramènent. Et l'écart grandit avec la table.",
      },
      {
        id: "compter", label: "compter les requêtes", cue: 0,
        type: "free",
        prompt: "Pour compter les requêtes SQL d'un bloc de code, un seul outil convient : " +
          "celui qui compte <b>même quand <code>DEBUG=False</code></b>. Lequel ?",
        placeholder: "nom de l'outil…",
        answers: ["CaptureQueriesContext", "capture_queries_context", "CaptureQueries"],
        feedbackFor: {
          "connection.queries": "<code>connection.queries</code> est le piège exact de l'étape : il n'enregistre rien hors <code>DEBUG</code>. Le jour où vous mesurez en préproduction, il répond 0 et vous concluez que tout va bien.",
          "assertNumQueries": "Bonne réponse pour un <b>test</b> — c'est la version durable, celle qui casse la CI six mois plus tard. Mais pour mesurer un bloc dans un notebook ou un shell, c'est <code>CaptureQueriesContext</code>.",
          "debug toolbar": "La toolbar compte les requêtes d'une page entière, dans le navigateur. Ici, on veut compter celles d'un bloc de code Python.",
          _defaut: "L'outil s'appelle <code>CaptureQueriesContext</code> (dans <code>django.test.utils</code>). Il force le curseur de debug le temps du bloc, donc il compte <b>partout</b> — contrairement à <code>connection.queries</code>, vide hors DEBUG.",
        },
        explain: "<code>with CaptureQueriesContext(connection) as cap:</code> … puis <code>len(cap.captured_queries)</code>. Il force le curseur de debug le temps du bloc, donc il compte partout — là où <code>connection.queries</code> reste désespérément vide dès que <code>DEBUG</code> vaut <code>False</code>.",
      },
    ];
  }

  PIFrames.widget("ormFrames", function () {
    return { id: "orm-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
