/*
 * Jeu de frames — l'authentification par jeton (V.C) et l'authentification
 * par défaut (V.D, frame pont-drf).
 *
 * Fidélité stricte à la mesure du TP (temps 4.5, vrai Django 5.2) :
 * TokenAuthentication + client anonyme → 401 avec WWW-Authenticate: Token ;
 * jeton erroné → 401 ; une vue muette tombe sur DEFAULT_AUTHENTICATION_CLASSES.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>authentication_classes = [TokenAuthentication]</code>, " +
    "<code>permission_classes = [IsAuthenticated]</code>.";

  function framesJeton() {
    return [
      {
        id: "anonyme-401", label: "un anonyme sous le jeton", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + " Un client sans en-tête demande la liste. La permission refuse — et la classe sait, elle, proposer un mécanisme d'identification.",
        type: "choice", wide: true,
        prompt: DECOR + " Un client sans en-tête envoie <code>GET /api/produits/</code>. Quel code d'état, et avec quoi?",
        options: [
          { id: "quarante-un-www", label: "<b>401</b>, accompagné de l'en-tête <code>WWW-Authenticate: Token</code>" },
          { id: "quarante-trois", label: "<b>403</b>" },
          { id: "quarante-un-seul", label: "<b>401</b>, sans rien de plus" },
        ],
        answer: "quarante-un-www",
        feedbackFor: {
          "quarante-trois": "403 dit « je sais qui tu es, et c'est non » : ici aucune identité n'a été lue. Et contrairement à la session, cette classe a un mécanisme à proposer — elle ne se tait pas.",
          "quarante-un-seul": "Le code seul dirait « non » sans dire comment revenir : <code>TokenAuthentication</code> nomme son mécanisme dans <code>WWW-Authenticate</code>, et c'est ce qui rend le 401 exploitable par un client.",
        },
        explain: "<b>401</b>, accompagné de <code>WWW-Authenticate: Token</code>. Le 401 dit « je ne sais pas qui tu es »&nbsp;; l'en-tête ajoute comment te faire connaître — renvoyer la requête portant <code>WWW-Authenticate: Token</code>. ",
      },
      {
        id: "jeton-faux", label: "un jeton erroné", cue: 2,
        hintTitle: "Indice",
        hint: "« faux » désigne-t-il un utilisateur enregistré ? Que reste-t-il à refuser quand personne n'a été reconnu ?",
        type: "choice", wide: true,
        prompt: DECOR + " La clé présentée ne figure pas dans la table des jetons. Un client envoie&nbsp;<pre><code>Authorization: Token faux</code></pre>Que fait <code>TokenAuthentication</code>, et que répond le serveur ?",
        options: [
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "quatre-cent-trois", label: "<b>403</b> — un élément d'identité a bien été présenté" },
          { id: "cinq-cents", label: "<b>500</b> — une clé inconnue plante la recherche" },
        ],
        answer: "quatre-cent-un",
        feedbackFor: {
          "quatre-cent-trois": "ce 403-là répond à une écriture refusée par une permission — le diagnostic regarde le droit, pas la clé. « faux » ne correspond à aucune ligne de la table&nbsp;: personne n'a jamais existé à refuser.",
          "cinq-cents": "Une clé inconnue est un cas prévu, pas un accident interne : la réponse reste côté client.",
        },
        explain: "<b>401</b>, encore accompagné de <code>WWW-Authenticate: Token</code>. Un jeton erroné ne produit pas de <code>request.user</code>&nbsp;: pour la permission, tout se passe comme si rien n'était arrivé. Le diagnostic reste « je ne sais pas qui tu es ».",
        retry: "Toujours <code>TokenAuthentication</code>, toujours <code>Authorization: Token faux</code> : quel code ?",
      },
      {
        id: "ou-est-la-table", label: "où la classe retrouve l'utilisateur", cue: 2,
        hintTitle: "Indice",
        hint: "La clé du jeton est une ligne dans une table. Que porte cette ligne, à part la clé ?",
        type: "choice", wide: true,
        prompt: "La classe lit <code>Authorization: Token 9944b0…</code>, puis trouve la clé dans la table des jetons. Comment passe-t-elle de cette ligne à <code>request.user</code>?",
        options: [
          { id: "liaison", label: "chaque ligne de jeton pointe vers un utilisateur — c'est lui qui remplit <code>request.user</code>" },
          { id: "dans-la-cle", label: "la clé contient le nom de l'utilisateur, décodé à la lecture" },
          { id: "reconnexion", label: "elle rejoue une connexion complète avec nom et mot de passe" },
        ],
        answer: "liaison",
        feedbackFor: {
          "dans-la-cle": "La clé est une suite aléatoire, elle ne transporte rien de lisible : le lien vers l'utilisateur est une colonne de la table, pas un contenu caché dans la clé.",
          reconnexion: "Le mot de passe n'est plus jamais sollicité après la création du jeton : c'est précisément son intérêt.",
        },
        explain: "Par la liaison. Un jeton est une ligne liée à un compte&nbsp;: la classe cherche la clé, suit le lien, et place l'utilisateur dans <code>request.user</code> — et la ligne du jeton dans <code>request.auth</code>. Présenter la clé suffit&nbsp;: aucun mot de passe ne voyage plus après l'échange initial.",
      },
    ];
  }

  function framesDefaut() {
    return [
      {
        id: "pont-drf", label: "la liste des classes par défaut", cue: 3,
        hintTitle: "Indice",
        hint: "La vue n'écrit rien. Pourtant des classes essaient bel et bien — sinon <code>request.user</code> serait vide avant toute permission. D'où vient leur liste ?",
        type: "choice", wide: true,
        prompt: "Une vue n'écrit aucune ligne <code>authentication_classes</code>. Une requête y arrive quand même avec un <code>request.user</code> rempli. Qui a fourni les classes essayées?",
        options: [
          { id: "defaut-projet", label: "le réglage <code>DEFAULT_AUTHENTICATION_CLASSES</code> du projet — qui vaut session puis Basic tant que rien ne le change" },
          { id: "aucune-classe", label: "personne : sans déclaration, aucune classe ne tourne" },
          { id: "toutes", label: "toutes les classes existantes, essayées les unes après les autres" },
        ],
        answer: "defaut-projet",
        feedbackFor: {
          "aucune-classe": "Des classes ont tourné — l'attribut est rempli. Le silence de la vue ne supprime pas la liste&nbsp;: il la fait chercher ailleurs, dans le réglage du projet.",
          toutes: "DRF n'inventorie pas ce qui existe : il lit une liste nommée — celle de la vue si elle écrit, sinon celle du réglage du projet.",
        },
        explain: "Le réglage <code>DEFAULT_AUTHENTICATION_CLASSES</code>. Une vue muette hérite de cette liste, qui vaut par défaut <code>[SessionAuthentication, BasicAuthentication]</code>&nbsp;— deux moyens pensés pour le navigateur, aucun pour un client qui écrit son propre code. C'est le lien manquant entre ce qui précède et chaque vue déjà écrite&nbsp;: identifier, lui aussi, a un réglage de projet.",
      },
      {
        id: "fermer-au-jeton", label: "faire parler le projet en jetons", cue: 1,
        hintTitle: "Indice",
        hint: "Même mécanique que pour les permissions : une valeur écrite au niveau du projet sert aux vues qui n'écrivent pas.",
        type: "choice", wide: true,
        prompt: "<pre><code># settings.py\nREST_FRAMEWORK = {\n    \"DEFAULT_AUTHENTICATION_CLASSES\": [\n        \"rest_framework.authentication.TokenAuthentication\",\n    ],\n}</code></pre>" +
          "Une vue créée ensuite n'écrit aucune ligne <code>authentication_classes</code>. " +
          "Un script Python l'appelle sans en-tête. Quel refus?",
        options: [
          { id: "quatre-cent-un", label: "<b>401</b> avec <code>WWW-Authenticate: Token</code>" },
          { id: "quatre-cent-trois", label: "<b>403</b> — comme sous la session" },
          { id: "deux-cents", label: "<b>200</b> — la vue n'a rien déclaré" },
        ],
        answer: "quatre-cent-un",
        feedbackFor: {
          "quatre-cent-trois": "Les classes essayées ne sont plus celles de la session mais celle du réglage&nbsp;: <code>TokenAuthentication</code> propose un mécanisme, donc le refus s'accompagne de <code>WWW-Authenticate</code>.",
          "deux-cents": "Ne rien déclarer ne dispense pas de la liste : la vue muette lit celle du projet, et elle exige désormais un jeton.",
        },
        explain: "<b>401</b> avec <code>WWW-Authenticate: Token</code>. Écrire le réglage une seule fois donne à chaque vue muette du projet la même source d'identité — un jeton présentable par n'importe quel client. Les scripts, applications mobiles et services disposent alors du même accès que le navigateur.",
      },
    ];
  }

  PIFrames.widget("jetonFrames", function () {
    return { id: "v-jeton", masteryTarget: 0.9, frames: framesJeton() };
  });

  PIFrames.widget("defautFrames", function () {
    return { id: "v-defaut", masteryTarget: 0.9, frames: framesDefaut() };
  });
})();
