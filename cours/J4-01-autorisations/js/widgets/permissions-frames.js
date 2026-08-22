/*
 * Jeu de frames — les classes de permission de vue et de projet (IV.C, IV.D, IV.E).
 *
 * Les jeux D niveau 1-6 sont reportés : ces frames couvrent l'entrée. Fidélité :
 * temps 4.5 du TP — sans déclaration, tout passe (AllowAny) ; IsAuthenticated
 * + TokenAuthentication sur un client anonyme répond 401 ; le réglage
 * DEFAULT_PERMISSION_CLASSES est écrasé par toute déclaration de vue.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>ProduitViewSet</code> sert <code>/api/produits/</code> et son détail. " +
    "<code>authentication_classes = [TokenAuthentication]</code> : l'identité ne peut " +
    "arriver que par un en-tête <code>Authorization: Token …</code>.";

  function framesVue() {
    return [
      {
        id: "sans-declaration", label: "aucune classe déclarée", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + "<br>Refuser exige qu'une règle demande quelque chose. Qui la demande ici ?",
        type: "choice", wide: true,
        prompt: "<pre><code>class ProduitViewSet(viewsets.ModelViewSet):\n    queryset = Produit.objects.all()\n    serializer_class = ProduitSerializer\n    # aucune ligne permission_classes</code></pre>" +
          "Un client anonyme envoie <code>GET /api/produits/</code>. Quel code d'état ?",
        options: [
          { id: "deux-cents", label: "<b>200</b> — la liste revient" },
          { id: "quatre-cent-un", label: "<b>401</b> — personne ne s'est présenté" },
          { id: "quatre-cent-trois", label: "<b>403</b> — accès refusé" },
          { id: "connexion", label: "une page de connexion HTML" },
        ],
        answer: "deux-cents",
        feedbackFor: {
          "quatre-cent-un": "Refuser suppose qu'une règle exige quelque chose. Ici aucune classe de permission n'est déclarée : personne ne pose la question de l'identité, donc personne ne refuse.",
          "quatre-cent-trois": "403 dit « identité connue, droit refusé ». Le serveur n'a même pas demandé qui parlait : ce code n'a pas de sens ici.",
          connexion: "Une API renvoie des codes et du JSON, pas une page HTML : la redirection vers un formulaire de connexion appartient au navigateur, pas à DRF.",
        },
        explain: "<b>200</b>, avec la liste. Faute de déclaration, c'est <code>AllowAny</code> — la classe par défaut de DRF — qui répond à la question des permissions : chaque requête passe, en lecture comme en écriture.",
      },
      {
        id: "is-authenticated", label: "IsAuthenticated contre un anonyme", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + "<br>Le client n'a envoyé aucun en-tête : le serveur connaît-il quelqu'un ?",
        type: "choice", wide: true,
        prompt: "<pre><code>class ProduitViewSet(viewsets.ModelViewSet):\n    ...\n    permission_classes = [permissions.IsAuthenticated]</code></pre>" +
          "Le même client anonyme rejoue <code>GET /api/produits/</code>. Quel code d'état ?",
        options: [
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "quatre-cent-trois", label: "<b>403</b>" },
          { id: "deux-cents", label: "<b>200</b> — la règle ne concerne que les écritures" },
          { id: "quatre-cents", label: "<b>400</b> — requête incomplète" },
        ],
        answer: "quatre-cent-un",
        feedbackFor: {
          "quatre-cent-trois": "403 suppose une identité reconnue puis refusée. Aucun jeton n'a été présenté : le serveur ignore encore qui parle.",
          "deux-cents": "La classe exige une identité pour toute la vue — lecture incluse. Un client sans identité ne franchit pas.",
          "quatre-cents": "La requête est bien formée ; rien n'est à valider. Le refus ne vient pas du corps.",
        },
        explain: "<b>401</b>, accompagné de l'en-tête <code>WWW-Authenticate: Token</code>. La permission a trouvé un client sans identité, et <code>TokenAuthentication</code> sait dire comment s'en donner une : « je ne sais pas qui tu es ».",
      },
      {
        id: "qui-passe", label: "qui franchit IsAuthenticated", cue: 2,
        hintTitle: "Rappel",
        hint: DECOR + "<br><code>IsAuthenticated</code> vérifie une seule chose : <code>request.user</code> est-il identifié ?",
        type: "multi", wide: true,
        prompt: "Toujours <code>permission_classes = [IsAuthenticated]</code>. <b>Cochez les requêtes qui obtiennent une réponse 200.</b>",
        options: [
          { id: "anonyme", label: "<code>GET</code> sans en-tête <code>Authorization</code>" },
          { id: "jeton-valide", label: "<code>GET</code> avec un en-tête <code>Authorization: Token …</code> dont la clé existe dans la table" },
          { id: "jeton-faux", label: "<code>GET</code> avec <code>Authorization: Token faux</code>" },
          { id: "post-jeton", label: "<code>POST</code> avec un en-tête <code>Authorization: Token …</code> dont la clé existe dans la table" },
        ],
        answers: ["jeton-valide", "post-jeton"],
        feedbackFor: {
          anonyme: "Sans en-tête, aucune identité n'arrive : la classe refuse avant d'appeler la vue.",
          "jeton-faux": "« faux » ne désigne aucun utilisateur enregistré : personne n'est reconnu, et la réponse est 401.",
          "post-jeton": "La permission sépare identifié et anonyme, pas lecture et écriture : un utilisateur reconnu a aussi le droit d'écrire. Cette requête passe.",
          "jeton-valide": "Un jeton reconnu produit un <code>request.user</code> identifié : la seule condition exigée est remplie.",
        },
        explain: "Deux requêtes passent — les deux portent un jeton reconnu. <code>IsAuthenticated</code> ne teste qu'une seule chose : identifié contre anonyme. Elle ne distingue ni les verbes ni les objets.",
        retry: "Toujours avec <code>IsAuthenticated</code> : lesquelles de ces quatre requêtes obtiennent 200 ?",
      },
      {
        id: "allow-any", label: "AllowAny écrit explicitement", cue: 2,
        hintTitle: "Indice",
        hint: "Comparez ce que fait chaque vue pour un client anonyme — pas ce que leur code suggère.",
        type: "choice", wide: true,
        prompt: "Deux vues jumelles : l'une omet <code>permission_classes</code>, l'autre écrit " +
          "<code>permission_classes = [permissions.AllowAny]</code>.<br>Pour un client anonyme, quelle différence de comportement ?",
        options: [
          { id: "aucune", label: "aucune — même réponse à chaque requête" },
          { id: "ecriture", label: "la vue explicite refuse les écritures seulement" },
          { id: "jeton", label: "la vue explicite exige un jeton" },
        ],
        answer: "aucune",
        feedbackFor: {
          ecriture: "<code>AllowAny</code> n'examine rien : lecture et écriture passent, exactement comme en l'absence de déclaration.",
          jeton: "Aucune classe nommée « Any » ne demande un jeton : le nom dit ce qu'elle fait — elle laisse passer tout le monde.",
        },
        explain: "Aucune. <code>AllowAny</code> est la classe appliquée par défaut : l'écrire ne change rien au comportement, seulement à l'intention affichée dans le code.",
      },
      {
        id: "portee-viewset", label: "la règle couvre liste et détail", cue: 1,
        hintTitle: "Indice",
        hint: "L'attribut <code>permission_classes</code> est écrit sur le ViewSet, pas sur une action.",
        type: "choice", wide: true,
        prompt: "<code>permission_classes = [IsAuthenticated]</code> sur <code>ProduitViewSet</code>. " +
          "Un client identifié par un jeton valide envoie <code>GET /api/produits/3/</code> — le produit 3 existe. Quel code ?",
        options: [
          { id: "deux-cents", label: "<b>200</b> — le détail du produit" },
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "quatre-cent-trois", label: "<b>403</b>" },
          { id: "quatre-cent-quatre", label: "<b>404</b>" },
        ],
        answer: "deux-cents",
        feedbackFor: {
          "quatre-cent-un": "Le jeton présenté est reconnu : l'identité existe, la condition est remplie.",
          "quatre-cent-trois": "Aucune classe déclarée ne refuse un utilisateur identifié : rien ne produit ce code ici.",
          "quatre-cent-quatre": "Le produit 3 existe : la vue s'exécute et trouve son objet.",
        },
        explain: "<b>200</b>. L'attribut porte sur le ViewSet entier : la même règle garde la liste et chaque détail. Pour traiter autrement une action, il faudrait une classe qui regarde le verbe ou l'action — c'est l'objet des classes personnalisées.",
      },
    ];
  }

  function framesProjet() {
    return [
      {
        id: "default-permissions", label: "le réglage du projet", cue: 3,
        hintTitle: "Indice",
        hint: "Chaque vue lit ses classes de permission quelque part. D'où vient la valeur quand la vue n'écrit rien ?",
        type: "choice", wide: true,
        prompt: "<pre><code># settings.py\nREST_FRAMEWORK = {\n    \"DEFAULT_PERMISSION_CLASSES\": [\n        \"rest_framework.permissions.IsAuthenticated\",\n    ],\n}</code></pre>" +
          "Une vue créée ensuite n'écrit aucune ligne <code>permission_classes</code>. " +
          "Un client anonyme la demande. Quel code d'état ?",
        options: [
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "deux-cents", label: "<b>200</b> — la vue n'a rien déclaré" },
          { id: "erreur", label: "le serveur refuse de démarrer" },
        ],
        answer: "quatre-cent-un",
        feedbackFor: {
          "deux-cents": "Ne rien déclarer ne veut pas dire être exempté : la valeur cherchée par la vue existe, elle vient du projet.",
          erreur: "Le serveur démarre : une vue sans déclaration n'est pas une erreur, la valeur cherchée a une réponse.",
        },
        explain: "<b>401</b>. Une vue lit <code>permission_classes</code> ; quand elle n'en déclare aucune, elle tombe sur <code>DEFAULT_PERMISSION_CLASSES</code>. Une vue neuve hérite donc du régime du projet sans écrire une ligne.",
      },
      {
        id: "vue-gagne", label: "la vue écrase le projet", cue: 2,
        hintTitle: "Indice",
        hint: "La vue déclare <code>AllowAny</code> : la question a-t-elle encore besoin du réglage global ?",
        type: "choice", wide: true,
        prompt: "Avec le même <code>DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]</code>, une vue écrit " +
          "<code>permission_classes = [permissions.AllowAny]</code>.<br>Un client anonyme la demande. Quel code ?",
        options: [
          { id: "deux-cents", label: "<b>200</b>" },
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "somme", label: "401 sur les écritures, 200 sur les lectures — les deux règles s'additionnent" },
        ],
        answer: "deux-cents",
        feedbackFor: {
          "quatre-cent-un": "La déclaration de la vue remplace le réglage du projet, elle ne s'y cumule pas : c'est <code>AllowAny</code> qui décide, et il ne refuse personne.",
          somme: "Il n'y a jamais addition : la vue qui déclare ses classes n'a plus à consulter la valeur par défaut.",
        },
        explain: "<b>200</b>. La vue gagne toujours : une liste <code>permission_classes</code> écrite sur la vue écrase <code>DEFAULT_PERMISSION_CLASSES</code>. Le réglage global ne s'applique qu'aux vues qui n'écrivent pas leur propre liste.",
      },
      {
        id: "priorite", label: "qui décide, cas par cas", cue: 1,
        hintTitle: "Indice",
        hint: "Une seule question : cette vue a-t-elle écrit sa propre liste ?",
        type: "slots", columns: 2, wide: true,
        prompt: "Rangez chaque source de décision sous la vue à laquelle elle s'applique.",
        slots: [
          { id: "muette", label: "vue sans <code>permission_classes</code>" },
          { id: "declarante", label: "vue avec <code>permission_classes</code>" },
        ],
        tokens: [
          { id: "reglage", label: "le réglage <code>DEFAULT_PERMISSION_CLASSES</code>", slot: "muette" },
          { id: "propre", label: "la liste écrite sur la vue", slot: "declarante" },
        ],
        feedbackFor: {
          "reglage@declarante": "Cette vue a déjà déclaré ses classes : elle n'a pas besoin d'aller chercher un réglage qu'elle ne consulte plus.",
          "propre@muette": "Cette vue n'écrit rien : il n'existe aucune liste propre à lire chez elle.",
          reglage: "Valeur consultée uniquement quand la vue n'a rien déclaré.",
          propre: "Liste lue directement sur la vue, avant tout réglage.",
        },
        explain: "Vue muette → réglage du projet ; vue déclarante → sa propre liste. Un ordre de priorité unique, rejoué à chaque requête.",
        retry: "Toujours le même rangement : qui tranche pour une vue muette, qui tranche pour une vue déclarante ?",
      },
      {
        id: "fermer-par-defaut", label: "fermer le projet, rouvrir une vue", cue: 0,
        hintTitle: "",
        hint: "",
        type: "choice", wide: true,
        prompt: "Un projet veut fermer toutes ses vues, sauf le catalogue public. Quelle combinaison ?",
        options: [
          { id: "globale-plus-exception", label: "<code>DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]</code>, et <code>AllowAny</code> sur la vue du catalogue" },
          { id: "vue-par-vue", label: "<code>IsAuthenticated</code> recopié sur chaque vue, une par une" },
          { id: "globale-seule", label: "<code>DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]</code>, et rien d'autre" },
        ],
        answer: "globale-plus-exception",
        feedbackFor: {
          "vue-par-vue": "Cela fonctionne aujourd'hui, mais chaque vue ajoutée demain naîtra sans déclaration — donc ouverte, puisque la valeur par défaut de DRF autorise tout. L'oubli coûte plus cher que la ligne globale.",
          "globale-seule": "Le catalogue se retrouve fermé lui aussi : le client anonyme reçoit 401 sur la seule vue censée l'accueillir.",
        },
        explain: "La première. Le réglage ferme par défaut — y compris pour les vues qui naîtront plus tard —, et la déclaration <code>AllowAny</code> rouvre exactement la vue choisie. Les deux niveaux jouent ensemble.",
      },
    ];
  }

  PIFrames.widget("permissionsVueFrames", function () {
    return { id: "iv-autorisations-vue", masteryTarget: 0.9, frames: framesVue() };
  });

  PIFrames.widget("permissionsProjetFrames", function () {
    return { id: "iv-autorisations-projet", masteryTarget: 0.9, frames: framesProjet() };
  });
})();
