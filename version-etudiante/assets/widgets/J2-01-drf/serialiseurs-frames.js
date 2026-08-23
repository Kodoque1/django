/*
 * Jeu de frames — les sérialiseurs (III.E).
 *
 * Le jeu C « Sérialiseurs, 8 niveaux » est reporté : ces frames couvrent l'entrée.
 * Fidélité : temps 4.3 et 4.4 du TP — champs requis issus du modèle, 400 champ par
 * champ, et le champ à défaut qui survit à un PUT complet.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>Produit</code> porte <code>nom</code>, <code>prix</code> (DecimalField), " +
    "<code>stock</code> (<code>default=0</code>) et une clé étrangère <code>categorie</code>. " +
    "<code>ProduitSerializer</code> est un <code>ModelSerializer</code> sur ces quatre champs.";

  function frames() {
    return [
      {
        id: "validated-data", label: "validated_data et les types", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + "<br><code>DecimalField</code> décrit un nombre exact, pas un flottant.",
        type: "choice", wide: true,
        prompt: "<pre><code>r = api(\"post\", \"/api/produits/\",\n         {\"nom\": \"Souris\", \"prix\": \"25.00\", \"categorie\": 1})\n# r.status_code == 201</code></pre>" +
          "Dans la vue, <code>serializer.validated_data[\"prix\"]</code> vaut quoi ?",
        options: [
          { id: "ok", label: "<code>Decimal(\"25.00\")</code>" },
          { id: "str", label: "\"25.00\" — la chaîne, telle qu'envoyée" },
          { id: "float", label: "<code>25.00</code> — un <code>float</code>" },
          { id: "rien", label: "la clé n'existe pas tant que rien n'est sauvegardé" },
        ],
        answer: "ok",
        feedbackFor: {
          str: "Le sérialiseur ne se contente pas de recopier : chaque champ convertit vers le type annoncé par le modèle. Une chaîne qui ne se convertit pas aurait levé une erreur de validation.",
          float: "Un flottant perd des centimes sur des prix — c'est précisément ce que <code>DecimalField</code> empêche : la conversion va vers <code>Decimal</code>, jamais vers un flottant.",
          rien: "<code>validated_data</code> existe dès <code>is_valid()</code>, avant toute écriture en base. La sauvegarde lit ces valeurs, elle ne les fabrique pas.",
        },
        explain: "<code>Decimal(\"25.00\")</code>. La validation et la conversion vont ensemble : <code>is_valid()</code> produit <code>validated_data</code>, où chaque champ porte déjà le type du modèle. C'est cette étape qui manque quand on construit le JSON à la main.",
      },
      {
        id: "requis", label: "champs requis ou non", cue: 2,
        hintTitle: "Rappel",
        hint: DECOR,
        type: "multi", wide: true,
        prompt: "Un <code>POST</code> complet sur <code>/api/produits/</code>. <b>Cochez les champs dont l'absence donne un 400.</b>",
        options: [
          { id: "nom", label: "<code>nom</code>" },
          { id: "prix", label: "<code>prix</code>" },
          { id: "categorie", label: "<code>categorie</code>" },
          { id: "stock", label: "<code>stock</code>" },
          { id: "id", label: "<code>id</code>" },
        ],
        answers: ["nom", "prix", "categorie"],
        feedbackFor: {
          nom: "Sans <code>default</code> ni <code>null=True</code> au niveau du modèle : requis.",
          prix: "<code>DecimalField</code> sans défaut : requis.",
          categorie: "La clé étrangère n'a pas de défaut : requise.",
          stock: "<code>stock</code> a un <code>default=0</code> au niveau du modèle : <code>ModelSerializer</code> en déduit <code>required=False</code>. Son absence ne déclenche jamais de 400.",
          id: "<code>id</code> est en lecture seule : il sort du sérialiseur, il n'y entre jamais.",
        },
        explain: "Requis : <code>nom</code>, <code>prix</code>, <code>categorie</code>. Le modèle décide : un champ avec <code>default</code> devient facultatif, <code>id</code> est lecture seule. Personne n'a écrit ces règles dans le sérialiseur — <code>ModelSerializer</code> les lit sur le modèle.",
        retry: "Toujours sur ce même POST : quels champs, s'ils manquent, font répondre 400 ?",
      },
      {
        id: "put-ampute", label: "PUT incomplet", cue: 2,
        hintTitle: "Indice",
        hint: "Un PUT passe par le même sérialiseur complet qu'un POST. Regardez la frame précédente.",
        type: "choice", wide: true,
        prompt: "<pre><code>r = api(\"put\", \"/api/produits/1/\",\n         {\"nom\": \"Amputé\", \"prix\": \"10.00\"})</code></pre>Quel code ?",
        options: [
          { id: "quatre-cent", label: "<b>400</b> — <code>categorie</code> manque" },
          { id: "deux-cents", label: "200 — le produit existant fournit le reste" },
          { id: "trois-cent-un", label: "301 — redirection vers l'URL complète" },
          { id: "quatre-cent-cinq", label: "405 — un PUT partiel n'existe pas" },
        ],
        answer: "quatre-cent",
        feedbackFor: {
          "deux-cents": "Le sérialiseur ne relit pas la base pour compléter ce qu'on lui donne : <code>validated_data</code> est construit depuis le corps seul, et <code>categorie</code> y manque.",
          "trois-cent-un": "L'URL <code>/api/produits/1/</code> existe telle quelle : rien à rediriger.",
          "quatre-cent-cinq": "Le verbe existe bien sur cette URL — c'est le <em>corps</em> qui est fautif, donc une erreur de validation.",
        },
        explain: "<b>400</b>, et le corps de la réponse nomme le champ : <code>{\"categorie\": [\"Ce champ est obligatoire.\"]}</code>. Sur HTTP pur, un PUT remplace toute la ressource ; ici DRF exige d'abord que le corps soit complet et valide. Pour modifier un seul champ, le verbe dédié est <code>PATCH</code>.",
      },
      {
        id: "erreurs-par-champ", label: "le 400, champ par champ", cue: 1,
        hintTitle: "Indice",
        hint: "Chaque champ validé produit ses propres messages, indépendamment des autres.",
        type: "slots", columns: 3,
        prompt: "<pre><code>api(\"post\", \"/api/produits/\",\n    {\"nom\": \"\", \"prix\": \"gratuit\", \"categorie\": 999})</code></pre>" +
          "Rangez chaque message sous le champ qui le porte dans la réponse 400.",
        slots: [
          { id: "nom", label: "<code>nom</code>" },
          { id: "prix", label: "<code>prix</code>" },
          { id: "categorie", label: "<code>categorie</code>" },
        ],
        tokens: [
          { id: "vide", label: "« Cette chaîne ne doit pas être vide. »", slot: "nom" },
          { id: "nombre", label: "« Un nombre entier valide est requis. »", slot: "prix" },
          { id: "inexistant", label: "« La clé « \\u003cclé\\u003e » n'est pas valide » — l'objet lié n'existe pas", slot: "categorie" },
        ],
        feedbackFor: {
          "vide@prix": "Une chaîne vide se convertit très bien en décimal ? Non — mais le message de <code>prix</code> parle de nombre, pas de chaîne. Ce message-ci est celui du <code>CharField</code>.",
          "nombre@nom": "Un <code>CharField</code> n'exige aucun nombre : son message parle du contenu de la chaîne, pas de sa conversion.",
          "inexistant@nom": "<code>nom</code> est une colonne texte : aucune existence à vérifier ailleurs. La vérification d'existence appartient à la clé étrangère.",
          "vide@categorie": "Le message cité parle d'une chaîne : c'est celui d'un champ texte. Pour <code>categorie</code>, le problème est l'identifiant 999, qui ne désigne rien.",
          "nombre@categorie": "999 est un entier parfaitement valide — ce n'est pas sa forme qui pose problème, c'est ce qu'il désigne.",
          "inexistant@prix": "« gratuit » échoue avant toute vérification d'existence : la conversion en décimal refuse la chaîne.",
          vide: "Une chaîne vide : le domaine du <code>CharField</code>.",
          nombre: "« gratuit » refuse la conversion en décimal.",
          inexistant: "999 ne désigne aucune catégorie : la clé étrangère vérifie l'existence.",
        },
        explain: "Les trois champs échouent chacun chez lui : <code>{\"nom\": [...], \"prix\": [...], \"categorie\": [...]}</code>. Le corps du 400 est un dictionnaire indexé par champ — le client peut afficher chaque erreur sous son champ de formulaire sans parser du texte.",
      },
      {
        id: "survit", label: "le champ à défaut survit", cue: 1,
        hintTitle: "Rappel",
        hint: DECOR + " Le produit 1 a <code>stock=12</code> en base.",
        type: "choice", wide: true,
        prompt: "<pre><code>r = api(\"put\", \"/api/produits/1/\",\n         {\"nom\": \"Amputé\", \"prix\": \"10.00\", \"categorie\": 1})\nassert r.status_code == 200</code></pre>" +
          "Que vaut <code>stock</code> ensuite ?",
        options: [
          { id: "douze", label: "<b>12</b> — la valeur d'avant" },
          { id: "zero", label: "0 — le PUT a remplacé toute la ressource" },
          { id: "nul", label: "<code>null</code> — absent, donc vidé" },
          { id: "erreur", label: "le PUT aurait dû refuser : 400" },
        ],
        answer: "douze",
        feedbackFor: {
          zero: "C'est la sémantique du protocole HTTP — mais pas celle de DRF : <code>stock</code> étant facultatif, il n'entre pas dans <code>validated_data</code>, et rien ne l'écrase.",
          nul: "Écrire <code>null</code> exigerait que le corps le demande explicitement, et que le champ accepte <code>null</code>. Un champ absent n'est simplement pas traité.",
          erreur: "Le corps est valide : tous les champs requis y sont. <code>stock</code> est facultatif, son absence ne déclenche rien.",
        },
        explain: "<b>12</b>. Le PUT n'a PAS remplacé toute la ressource : <code>required=False</code> fait que le champ absent ne figure pas dans <code>validated_data</code>, donc la mise à jour ne le touche pas. C'est la sémantique de DRF, distincte de celle du protocole HTTP.",
        retry: "Même PUT, même produit : après le 200, que vaut le stock laissé hors du corps ?",
      },
      {
        id: "outil-erreurs", label: "lire les erreurs", cue: 0,
        type: "free",
        prompt: "<code>is_valid()</code> vient de renvoyer <code>False</code>. Quelle propriété du sérialiseur contient le dictionnaire des erreurs, champ par champ ?",
        placeholder: "serializer.…",
        answers: [".errors", "errors", "serializer.errors", "s.errors"],
        feedbackFor: {
          "validated_data": "<code>validated_data</code> n'est rempli QUE quand la validation réussit. Quand elle échoue, c'est l'autre attribut qui se remplit.",
          _defaut: "C'est <code>serializer.errors</code> : un dictionnaire <code>{champ: [messages]}</code>, prêt à repartir tel quel dans la réponse 400. C'est lui que DRF met dans le corps quand vous utilisez une vue générique.",
        },
        explain: "<code>serializer.errors</code> — <code>{\"prix\": [\"Un nombre entier valide est requis.\"]}</code>. Deux attributs jumeaux et exclusifs : <code>validated_data</code> si <code>is_valid()</code> dit vrai, <code>errors</code> s'il dit faux.",
      },
    ];
  }

  PIFrames.widget("serialiseursFrames", function () {
    return { id: "serialiseurs-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
