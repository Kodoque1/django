/*
 * Jeu de frames — 401 contre 403 (IV.D, volet diagnostic).
 *
 * Fidélité stricte à la mesure du TP (temps 4.5, vrai Django 5.2) :
 *   · IsAuthenticated + TokenAuthentication, client anonyme → 401 + WWW-Authenticate: Token ;
 *   · même permission avec SessionAuthentication → 403 (aucun mécanisme à proposer) ;
 *   · jeton erroné → 401 ;
 *   · identifié mais refusé par une classe personnalisée → 403, message dans le corps.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>permission_classes = [IsAuthenticated]</code>. Deux serveurs jumeaux : sur le premier, " +
    "<code>authentication_classes = [TokenAuthentication]</code> ; sur le second, " +
    "<code>authentication_classes = [SessionAuthentication]</code>. Même requête anonyme envoyée aux deux.";

  function frames() {
    return [
      {
        id: "deux-serveurs", label: "le code change avec l'authentification", cue: 3,
        hintTitle: "Indice",
        hint: "Répondre 401 suppose de pouvoir dire COMMENT s'identifier. Que peut proposer chaque classe à un client qui n'a rien envoyé ?",
        type: "choice", wide: true,
        prompt: DECOR + "<br>Le premier répond <b>401</b>. Que répond le second ?",
        options: [
          { id: "quatre-cent-trois", label: "<b>403</b>" },
          { id: "quatre-cent-un", label: "<b>401</b> — la permission est la même" },
          { id: "deux-cents", label: "<b>200</b> — la session dispense d'identité" },
        ],
        answer: "quatre-cent-trois",
        feedbackFor: {
          "quatre-cent-un": "Pour répondre 401, DRF doit nommer un mécanisme d'identification dans l'en-tête <code>WWW-Authenticate</code>. <code>SessionAuthentication</code> n'a rien à proposer à un client qui n'a envoyé aucun en-tête : aucun mécanisme à nommer, donc pas de 401.",
          "deux-cents": "La permission <code>IsAuthenticated</code> est la même des deux côtés : un client sans identité ne passe nulle part.",
        },
        explain: "<b>403</b>. Même permission, même absence d'identifiant — et pourtant 403 : <code>SessionAuthentication</code> ne sait pas proposer de mécanisme d'identification, donc DRF ne peut pas répondre 401. Le code change avec le moyen d'authentification, pas avec la permission.",
      },
      {
        id: "www-authenticate", label: "l'en-tête du 401", cue: 2,
        hintTitle: "Indice",
        hint: "Un 401 bien élevé dit plus que « non » : il dit comment revenir. Où cette indication voyage-t-elle ?",
        type: "choice", wide: true,
        prompt: "Sur le serveur à <code>TokenAuthentication</code>, la réponse 401 porte un en-tête de plus que le corps seul. Lequel ?",
        options: [
          { id: "www-authenticate", label: "<code>WWW-Authenticate: Token</code>" },
          { id: "allow", label: "<code>Allow: GET, POST, …</code>" },
          { id: "retry-after", label: "<code>Retry-After</code>" },
        ],
        answer: "www-authenticate",
        feedbackFor: {
          allow: "<code>Allow</code> liste les verbes servis par l'URL : il accompagne un 405, pas un refus d'identité.",
          "retry-after": "Cet en-tête temporise un trop grand nombre de requêtes : rien à voir avec l'identité.",
        },
        explain: "<code>WWW-Authenticate: Token</code>. Le 401 ne dit pas seulement « je ne sais pas qui tu es » : cet en-tête dit comment te faire connaître — ici, renvoyer une requête portant <code>Authorization: Token …</code>.",
      },
      {
        id: "jeton-faux", label: "un jeton erroné", cue: 2,
        hintTitle: "Indice",
        hint: "« faux » désigne-t-il un utilisateur connu ? 403 exige une identité reconnue puis refusée.",
        type: "choice", wide: true,
        prompt: "Serveur à <code>TokenAuthentication</code>, <code>IsAuthenticated</code>. Un client envoie " +
          "<pre><code>Authorization: Token faux</code></pre>Quel code d'état ?",
        options: [
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "quatre-cent-trois", label: "<b>403</b> — un jeton a bien été présenté" },
          { id: "cinq-cents", label: "<b>500</b> — un jeton erroné plante l'authentification" },
        ],
        answer: "quatre-cent-un",
        feedbackFor: {
          "quatre-cent-trois": "403 exige une identité connue puis refusée. « faux » ne désigne personne : aucune identité n'a jamais existé à refuser.",
          "cinq-cents": "Un jeton inconnu est un cas prévu, pas un accident : la réponse reste un code côté client.",
        },
        explain: "<b>401</b>. Un jeton erroné ne produit pas de <code>request.user</code> : pour la permission, tout se passe comme si rien n'était arrivé. Le diagnostic reste « je ne sais pas qui tu es ».",
      },
      {
        id: "identifie-refuse", label: "identifié mais non autorisé", cue: 1,
        hintTitle: "Indice",
        hint: "Le jeton est bon : le serveur sait qui parle. Reste une seconde question, posée par la deuxième classe.",
        type: "choice", wide: true,
        prompt: "<pre><code>class Admins(permissions.BasePermission):\n    message = \"réservé aux administrateurs\"\n\n    def has_permission(self, request, view):\n        return request.user.is_staff\n\npermission_classes = [IsAuthenticated, Admins]</code></pre>" +
          "Un utilisateur simple — jeton valide, <code>is_staff</code> à <code>False</code> — demande la liste. Quel code ?",
        options: [
          { id: "quatre-cent-trois", label: "<b>403</b>" },
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "deux-cents", label: "<b>200</b> — être identifié suffit" },
        ],
        answer: "quatre-cent-trois",
        feedbackFor: {
          "quatre-cent-un": "L'utilisateur est reconnu — le jeton est bon. On ne répond pas « je ne sais pas qui tu es » à quelqu'un dont on vient de lire l'identité.",
          "deux-cents": "<code>IsAuthenticated</code> accepte, mais toutes les classes déclarées doivent accepter : la seconde refuse, et elle tranche.",
        },
        explain: "<b>403</b>, et le corps porte la raison : <code>{\"detail\": \"réservé aux administrateurs\"}</code>. Identifié mais non autorisé — le second refus, distinct du premier.",
      },
      {
        id: "deux-diagnostics", label: "les deux phrases des deux codes", cue: 1,
        hintTitle: "Rappel",
        hint: "L'un des deux codes s'accompagne de <code>WWW-Authenticate</code> : lequel a besoin qu'on lui apprenne un nom ?",
        type: "slots", columns: 2, wide: true,
        prompt: "Rangez chaque phrase sous le code qui la dit.",
        slots: [
          { id: "quarante-et-un", label: "<b>401</b>" },
          { id: "quarante-trois", label: "<b>403</b>" },
        ],
        tokens: [
          { id: "qui-es-tu", label: "« je ne sais pas qui tu es »", slot: "quarante-et-un" },
          { id: "cest-non", label: "« je sais qui tu es, et c'est non »", slot: "quarante-trois" },
        ],
        feedbackFor: {
          "qui-es-tu@quarante-trois": "Le 403 arrive après reconnaissance : celui qui le reçoit vient d'être identifié. Sa phrase ne peut pas être celle-là.",
          "cest-non@quarante-et-un": "Le 401 part avant toute reconnaissance — aucun nom n'a été lu. Il ne peut pas dire « je sais ».",
          "qui-es-tu": "Aucune identité lue, et <code>WWW-Authenticate</code> au retour pour dire comment revenir.",
          "cest-non": "Une identité lue, un droit refusé : le corps nomme la raison.",
        },
        explain: "401 : identité absente — l'en-tête <code>WWW-Authenticate</code> indique comment se faire connaître. 403 : identité présente, droit refusé. Deux échecs, deux corrections différentes.",
        retry: "Toujours le même rangement : quelle phrase va avec quel code ?",
      },
      {
        id: "corriger-le-bon-bout", label: "quel bout corriger", cue: 0,
        hintTitle: "",
        hint: "",
        type: "choice", wide: true,
        prompt: "Un collègue reçoit 403 alors que son jeton est valide. Sur quoi porte la correction ?",
        options: [
          { id: "la-permission", label: "sur les classes de permission — demander ou accorder le droit manquant" },
          { id: "l-en-tete", label: "sur l'en-tête <code>WWW-Authenticate</code>, à ajouter à sa requête" },
          { id: "le-verbe", label: "sur le verbe HTTP employé" },
        ],
        answer: "la-permission",
        feedbackFor: {
          "l-en-tete": "Cet en-tête part du serveur dans un 401 ; le client ne l'écrit pas, et il ne porterait de toute façon pas le droit manquant.",
          "le-verbe": "Un verbe non servi donne 405, accompagné de l'en-tête <code>Allow</code> — pas 403.",
        },
        explain: "Sur la permission. Le serveur sait déjà qui il est — le 403 en est la preuve — mais aucune classe déclarée ne lui accorde ce qu'il demande. Corriger l'identité ne changerait rien : c'est le droit qui manque.",
      },
    ];
  }

  PIFrames.widget("refusFrames", function () {
    return { id: "iv-refus-401-403", masteryTarget: 0.9, frames: frames() };
  });
})();
