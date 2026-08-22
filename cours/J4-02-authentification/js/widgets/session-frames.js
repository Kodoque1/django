/*
 * Jeu de frames — l'authentification de session (V.B).
 *
 * Fidélité stricte à la mesure du TP (temps 4.5, vrai Django 5.2) : même
 * permission, même absence d'identifiant — SessionAuthentication répond 403,
 * jamais 401, parce qu'elle n'a aucun mécanisme à proposer au retour.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>authentication_classes = [SessionAuthentication]</code>, " +
    "<code>permission_classes = [IsAuthenticated]</code>. Même vue pour tous les clients.";

  function frames() {
    return [
      {
        id: "cookie", label: "le navigateur reconnu sans en-tête", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + "<br>Un navigateur s'est connecté par un formulaire. À la requête suivante, il n'envoie aucun en-tête <code>Authorization</code>. Pourtant un nom arrive.",
        type: "choice", wide: true,
        prompt: DECOR + " Un navigateur s'est connecté via le formulaire de connexion Django. " +
          "La requête suivante ne porte aucun en-tête <code>Authorization</code>, et l'utilisateur est quand même reconnu. Par quoi?",
        options: [
          { id: "cookie", label: "par le cookie de session que le navigateur renvoie à chaque requête" },
          { id: "memoire", label: "par une connexion restée ouverte depuis le formulaire" },
          { id: "ip", label: "par l'adresse du client, mémorisée côté serveur" },
        ],
        answer: "cookie",
        feedbackFor: {
          memoire: "Chaque requête HTTP est indépendante : aucune connexion ne reste ouverte entre deux appels. La reconnaissance voyage dans la requête elle-même.",
          ip: "Plusieurs personnes partagent une même adresse, une même personne en change : l'adresse n'identifie personne.",
        },
        explain: "Par le cookie de session. À la connexion, Django a déposé un cookie <code>sessionid</code>&nbsp;; le navigateur le renvoie automatiquement avec chaque requête vers le serveur, et <code>SessionAuthentication</code> traduit ce cookie en utilisateur. Aucun en-tête à écrire&nbsp;: c'est le navigateur qui le fait.",
      },
      {
        id: "anonyme-403", label: "un anonyme sous la session", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + " Un client sans cookie ni en-tête demande la liste. La permission refuse — avec quel code d'état ?",
        type: "choice", wide: true,
        prompt: DECOR + " Le même serveur reçoit cette requête depuis un navigateur qui n'a jamais visité la page de connexion — pas de cookie <code>sessionid</code>. Que répond <code>SessionAuthentication</code>, et quel code la permission produit-elle ?",
        options: [
          { id: "quatre-cent-trois", label: "<b>403</b>" },
          { id: "quatre-cent-un", label: "<b>401</b>" },
          { id: "deux-cents", label: "<b>200</b> — la session dispense d'identité" },
        ],
        answer: "quatre-cent-trois",
        feedbackFor: {
          "quatre-cent-un": "Répondre 401 exige d'accompagner la réponse d'un mécanisme d'identification, nommé dans <code>WWW-Authenticate</code>. Face à un client sans cookie, la session n'a rien à proposer&nbsp;: aucun mécanisme à nommer, donc pas de 401.",
          "deux-cents": "<code>IsAuthenticated</code> est déclarée : un client sans identité ne franchit pas la permission.",
        },
        explain: "<b>403</b>. Aucun identifiant présenté — et pourtant ce n'est pas un 401, pas 401&nbsp;: <code>SessionAuthentication</code> ne sait pas proposer de mécanisme d'identification à un client qui n'a pas de cookie, donc DRF ne peut pas répondre 401.",
        retry: "Toujours la même vue, toujours ce client sans cookie ni en-tête : quel code d'état ?",
      },
      {
        id: "navigateur-seul", label: "à qui convient la session", cue: 2,
        hintTitle: "Indice",
        hint: "Qui sait déposer et renvoyer un cookie sans qu'on lui demande ?",
        type: "choice", wide: true,
        prompt: "Un script Python, une application mobile, un autre service&nbsp;: aucun ne gère le cookie de session spontanément. " +
          "À quel client <code>SessionAuthentication</code> convient-elle sans effort?",
        options: [
          { id: "navigateur", label: "au navigateur — une application web qui parle à sa propre API" },
          { id: "tous", label: "à tous les clients, dès que la clé est distribuée" },
          { id: "aucun", label: "à aucun — cette classe ne sert qu'en page HTML, pas sur une API" },
        ],
        answer: "navigateur",
        feedbackFor: {
          tous: "Distribuer quoi&nbsp;? La session ne transporte aucune clé présentable : hors navigateur, chaque client devrait recoder la gestion du cookie à la main.",
          aucun: "Le cookie de session fonctionne aussi sur une réponse JSON : rien n'empêche une API d'être servie au navigateur qui l'a ouvert.",
        },
        explain: "Au navigateur. Le dépôt et le renvoi du cookie sont automatiques pour lui, et pour lui seul. Dès qu'un client écrit son propre code — script, application mobile, service —, la session devient une gestion de cookie manuelle, là où un en-tête s'écrit en une ligne.",
      },
      {
        id: "csrf", label: "l'écriture refusée autrement", cue: 2,
        hintTitle: "Indice",
        hint: "Un site tiers peut-il faire envoyer par le navigateur d'un utilisateur connecté un POST qu'il n'a pas voulu ? Le cookie partirait tout seul.",
        type: "choice", wide: true,
        prompt: "Sous <code>SessionAuthentication</code>, un navigateur connecté envoie <code>POST /api/produits/</code> " +
          "sans le jeton anti-contrefaçon attendu par Django. Que se passe-t-il?",
        options: [
          { id: "refus-csrf", label: "la requête est refusée — le mécanisme CSRF de Django bloque toute écriture non prouvée venue du navigateur" },
          { id: "passe", label: "elle passe : le cookie suffit à prouver qui parle" },
          { id: "quatre-cent-un", label: "réponse 401 : le navigateur doit se reconnecter" },
        ],
        answer: "refus-csrf",
        feedbackFor: {
          passe: "Le cookie part à l'insu de l'utilisateur dès qu'une page tierce fait écrire son navigateur : il prouve qui parle, pas que ce quelqu'un a voulu écrire. D'où la seconde vérification.",
          "quatre-cent-un": "L'utilisateur est reconnu — son cookie est bon. Le refus ne porte pas sur l'identité mais sur la preuve d'intention d'écrire.",
        },
        explain: "Refus. Sur une requête d'écriture, <code>SessionAuthentication</code> exige en plus la preuve CSRF de Django&nbsp;: le cookie seul pourrait être envoyé à l'insu de l'utilisateur par une page tierce. C'est la seconde vérification qu'exige l'écriture quand le client est reconnu par son cookie — lecture fluide, écriture surveillée.",
      },
    ];
  }

  PIFrames.widget("sessionFrames", function () {
    return { id: "v-session", masteryTarget: 0.9, frames: frames() };
  });
})();
