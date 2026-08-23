/*
 * Jeu de frames — l'implémentation par jeton (V.E) et l'ordre des moments :
 * identifier, puis autoriser.
 *
 * Fidélité : temps 4.5 du TP — le jeton naît d'une ligne liée au compte,
 * s'obtient par un échange de connexion, et voyage dans l'en-tête
 * Authorization avec le schéma « Token ».
 */
(function () {
  "use strict";

  function framesImplementation() {
    return [
      {
        id: "cables-a-poser", label: "les quatre câbles du jeton", cue: 3,
        hintTitle: "Indice",
        hint: "Une table à créer, un compte à doter, une URL d'échange, un en-tête à présenter. Dans quel ordre chaque chose devient possible ?",
        type: "order", wide: true,
        prompt: "Un projet vierge veut identifier ses clients par jeton. Remettez dans l'ordre les étapes qui rendent cela possible.",
        items: [
          { id: "app", label: "ajouter <code>\"rest_framework.authtoken\"</code> à <code>INSTALLED_APPS</code>" },
          { id: "migrate", label: "appliquer <code>python manage.py migrate</code> — la table des jetons existe" },
          { id: "compte", label: "créer le compte, puis le jeton lié à ce compte" },
          { id: "en-tete", label: "présenter <code>Authorization: Token …</code> à chaque requête" },
        ],
        feedbackFor: {
          "app@1": "La table n'existe pas encore : migrate doit d'abord passer — et il ne passerait rien sans l'application déclarée.",
          "migrate@0": "Aucune migration à appliquer tant que l'application du jeton n'est pas déclarée dans <code>INSTALLED_APPS</code>.",
          "compte@0": "Créer un jeton suppose une table qui n'existe pas encore : les deux déclarations précèdent.",
          "compte@1": "La table des jetons n'existe toujours pas : migrate n'a pas encore tourné.",
          "en-tete@0": "Aucune clé n'existe à ce stade : présenter un en-tête suppose un jeton déjà fabriqué.",
          "en-tete@1": "La table existe, mais aucun compte n'a de jeton : il n'y a encore rien à présenter.",
          "en-tete@2": "Le compte existe, son jeton pas encore : la ligne liée manque.",
          "app@2": "L'application est déjà déclarée : la rejouer ne crée rien de nouveau.",
          "migrate@2": "La migration a déjà tourné : la table existe, on peut la remplir.",
          "app@3": "Tout est déjà câblé : au bout, il ne reste que la présentation de la clé.",
          "migrate@3": "La table existe depuis deux étapes.",
          "compte@3": "Le compte et son jeton existent depuis l'étape précédente.",
        },
        explain: "Déclarer l'application, migrer, doter le compte d'un jeton, puis présenter la clé à chaque requête. Les trois premières se font une fois&nbsp;; la quatrième, à chaque appel — c'est elle que <code>TokenAuthentication</code> lit.",
        retry: "Toujours les mêmes quatre étapes, toujours dans l'ordre où chacune devient possible.",
      },
      {
        id: "echanger", label: "obtenir la clé comme un client", cue: 2,
        hintTitle: "Indice",
        hint: "Le client ne peut pas écrire dans la base : il obtient sa clé en prouvant qui il est, une fois.",
        type: "choice", wide: true,
        prompt: "Un client vient de recevoir sa clé en envoyant son nom et son mot de passe à l'URL d'échange. Que contient la réponse?",
        options: [
          { id: "cle-seule", label: "<code>{\"token\": \"9944b0…\"}</code> — la clé, à présenter ensuite dans l'en-tête <code>Authorization</code>" },
          { id: "cookie", label: "un cookie de session, à renvoyer tel quel" },
          { id: "mot-de-passe", label: "un mot de passe neuf, généré à la volée" },
        ],
        answer: "cle-seule",
        feedbackFor: {
          cookie: "Aucun cookie n'est posé : le client peut être un script sans navigateur. La preuve de connexion devient une clé, pas une session.",
          "mot-de-passe": "Le mot de passe ne change pas : c'est la clé du jeton qui est fabriquée et renvoyée.",
        },
        explain: "La clé, et rien qu'elle. L'URL d'échange vérifie le couple nom d'utilisateur, mot de passe, puis renvoie la clé du jeton lié au compte. Le mot de passe a voyagé une fois&nbsp;; ensuite, seule la clé repart, dans <code>Authorization: Token …</code>.",
      },
      {
        id: "en-tete-exact", label: "l'en-tête au mot près", cue: 1,
        hintTitle: "Indice",
        hint: "La classe ne reconnaît que son schéma. Un espace manquant ou un autre mot en tête, et l'en-tête ne désigne plus rien.",
        type: "build", shuffle: false, wide: true,
        prefix: "Authorization:",
        prompt: "Assemblez l'en-tête exact que <code>TokenAuthentication</code> attend.",
        tokens: [
          { id: "basic", label: "Basic" },
          { id: "token", label: "Token" },
          { id: "bearer", label: "Bearer" },
          { id: "cle", label: "9944b09199c6…" },
        ],
        answer: ["token", "cle"],
        feedbackFor: {
          "basic@0": "Le schéma « Basic » transporte un couple nom, mot de passe recodé — pas la clé d'un jeton. La classe qui lit « Token » n'accepte que son mot à elle.",
          "bearer@0": "« Bearer » est un autre schéma, celui des jetons signés d'autres frameworks : DRF n'écrit pas ce mot ici.",
          "cle@0": "La clé seule ne dit pas quel mécanisme la lire : le schéma en tête d'en-tête choisit la classe.",
          "basic@1": "Le schéma « Token » est déjà posé : derrière vient la clé, pas un second schéma.",
          "bearer@1": "Un seul schéma par en-tête : la clé suit le mot « Token ».",
          "token@1": "Le schéma figure déjà en tête : ce qui suit, c'est la preuve elle-même.",
          "_manque:cle": "Il manque la preuve elle-même : le schéma « Token » annonce une clé, et rien ne la suit.",
        },
        explain: "<code>Authorization: Token 9944b09199c6…</code> — le schéma, un espace, la clé. C'est cette écriture exacte que la classe reconnaît&nbsp;; tout autre mot en tête, et l'en-tête ne désigne plus aucun mécanisme.",
      },
    ];
  }

  function framesOrdre() {
    return [
      {
        id: "deux-moments", label: "les deux moments d'une requête", cue: 2,
        hintTitle: "Indice",
        hint: "Avant de répondre « c'est non », il faut savoir à qui on le dit. Dans quel ordre le serveur se pose les deux questions ?",
        type: "order", wide: true,
        prompt: "Une requête arrive sur une vue qui déclare classes d'authentification et de permission. Remettez dans l'ordre ce que le serveur tranche.",
        items: [
          { id: "identifier", label: "identifier — les classes d'authentification remplissent <code>request.user</code>" },
          { id: "autoriser", label: "autoriser — les classes de permission lisent <code>request.user</code> et tranchent" },
          { id: "servir", label: "servir — la vue s'exécute et le sérialiseur répond" },
        ],
        feedbackFor: {
          "autoriser@0": "Autoriser qui ? La permission lit une identité qui n'existe pas encore : la première question posée est celle du nom.",
          "servir@0": "La vue ne s'exécute qu'après les deux refus possibles : rien ne tourne avant que l'identité et le droit soient tranchés.",
          "servir@1": "La permission n'a pas encore parlé : une requête non autorisée n'atteint jamais la vue.",
          "identifier@1": "L'identification a déjà eu lieu — c'est précisément son résultat que la permission s'apprête à lire.",
          "identifier@2": "Revenir en arrière n'existe pas ici : l'identité est fixée avant toute question de droit.",
          "autoriser@2": "Le droit est tranché avant l'exécution : au troisième rang, seule reste la vue.",
        },
        explain: "Identifier, puis autoriser, puis servir. Toute permission lit <code>request.user</code> — rempli juste avant par les classes d'authentification. Une identité fausse rend fausse chaque décision de droit&nbsp;: c'est l'ordre qui relie les deux familles de classes, et le premier endroit où chercher quand un refus étonne.",
        retry: "Toujours le même déroulé : quelle question est tranchée avant l'autre ?",
      },
      {
        id: "diagnostic-identite", label: "par où commencer un diagnostic", cue: 0,
        hintTitle: "",
        hint: "",
        type: "choice", wide: true,
        prompt: "Un client jure avoir envoyé un jeton valide, et reçoit un refus. Sur quoi vérifier d'abord?",
        options: [
          { id: "auth", label: "sur l'authentification — l'en-tête est-il écrit pour que <code>request.user</code> soit rempli ?" },
          { id: "perm", label: "sur les permissions — une classe refuse-t-elle cet utilisateur ?" },
          { id: "vue", label: "sur la vue — le sérialiseur a-t-il un champ manquant ?" },
        ],
        answer: "auth",
        feedbackFor: {
          perm: "Une permission ne refuse que quelqu'un qu'elle a identifié. Si l'identité n'arrive pas, la question du droit n'a jamais été posée : commencer par elle, c'est corriger le mauvais bout.",
          vue: "La vue ne s'exécute qu'après les deux contrôles : aucun champ de sérialiseur ne peut produire ce refus.",
        },
        explain: "Par l'authentification. Les permissions lisent <code>request.user</code> sans jamais le fabriquer&nbsp;: si cette valeur est fausse, chaque règle qui la lit décide sur du vide. Identifier avant d'autoriser — l'ordre du serveur est aussi l'ordre du diagnostic.",
      },
    ];
  }

  PIFrames.widget("implementationFrames", function () {
    return { id: "v-implementation", masteryTarget: 0.9, frames: framesImplementation() };
  });

  PIFrames.widget("ordreFrames", function () {
    return { id: "v-ordre", masteryTarget: 0.9, frames: framesOrdre() };
  });
})();
