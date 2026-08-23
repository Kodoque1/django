/*
 * Jeu de frames — la boucle complète, en récapitulation du module.
 *
 * Rien de neuf ici : les cinq notions ont toutes été construites, il s'agit de les remettre
 * bout à bout. C'est pourquoi c'est une frame et non une simulation — l'opération demandée
 * est d'assembler, pas de voir un mécanisme se dérouler (§2 du contrat).
 *
 * ⚠ Recoupement assumé avec la frame « cycle » de web-invention.js, qui fait déjà ordonner
 * quatre étapes. La différence est l'objet, pas l'exercice : celle-là s'arrête au navigateur
 * (nom → adresse → connexion → requête → document) et vient AVANT que le serveur, les verbes
 * et les codes n'existent dans le cours. Celle-ci traverse jusqu'à la vue Django et revient
 * avec un code d'état. D'où le `cue` à 1 et non à 3 : la moitié du chemin est déjà connue.
 *
 * La slide de référence — le diagramme de séquence — vient APRÈS (corollaire de §0).
 */
(function () {
  "use strict";

  var RAPPEL_ACTEURS =
    "<b>DNS</b> traduit un nom en adresse · " +
    "<b>TCP</b> ouvre le tuyau · " +
    "<b>HTTP</b> porte la demande · " +
    "<b>urls.py</b> choisit la vue";

  function frames() {
    return [
      {
        id: "boucle", label: "la boucle complète", cue: 1,
        hintTitle: "Qui fait quoi", hint: RAPPEL_ACTEURS,
        type: "order",
        prompt: "Un client demande <code>https://boutique.ipssi.fr/produits/12/</code>, " +
          "rien n'est en cache.<br>Cliquez les sept échanges <b>dans l'ordre</b>.",
        items: [
          { id: "dns-q", label: "Client → DNS <span class='pi-dim'>boutique.ipssi.fr ?</span>" },
          { id: "dns-r", label: "DNS → Client <span class='pi-dim'>93.184.216.34</span>" },
          { id: "tcp", label: "Client → Serveur <span class='pi-dim'>connexion TCP :443</span>" },
          { id: "get", label: "Client → Serveur <span class='pi-dim'>GET /produits/12/ HTTP/1.1</span>" },
          { id: "route", label: "Serveur → Vue <span class='pi-dim'>routage par urls.py</span>" },
          { id: "vue", label: "Vue → Serveur <span class='pi-dim'>objet + code 200</span>" },
          { id: "rep", label: "Serveur → Client <span class='pi-dim'>200 OK + JSON</span>" },
        ],
        feedbackFor: {
          // Un message par item, quelle que soit la position fausse. Les deux positions qui
          // piègent le plus ont en plus leur message dédié.
          "tcp@0": "Se connecter à quelle adresse ? Vous n'avez qu'un nom pour l'instant.",
          "get@0": "Envoyer la requête dans quel tuyau ? Rien n'est encore ouvert, et l'adresse est inconnue.",
          "get@2": "L'adresse est connue, mais la connexion n'est pas encore ouverte : rien ne peut partir.",
          "route@3": "Le routage a lieu <i>quand la requête arrive</i>. Elle n'est pas encore partie.",
          "dns-q": "La question au DNS ouvre la boucle : sans adresse, aucune connexion n'est possible.",
          "dns-r": "La réponse du DNS vient juste après la question, et avant tout le reste.",
          "tcp": "La connexion s'ouvre une fois l'adresse connue, et avant que la moindre requête ne parte.",
          "get": "La requête part une fois le tuyau ouvert — troisième échange avec le serveur, quatrième en tout.",
          "route": "Le routage est la première chose que fait le serveur <i>après</i> avoir reçu la requête.",
          "vue": "La vue répond au serveur avant que le serveur ne réponde au client : elle ne parle jamais au réseau.",
          "rep": "La réponse au client ferme la boucle : c'est le dernier échange.",
        },
        explain: "Un nom, une adresse, un tuyau, une demande, une vue, un code. Les deux derniers " +
          "échanges sont internes au serveur — le client ne voit jamais <code>urls.py</code>.",
        explainAfterError: "L'ordre tient à une seule règle : chaque échange a besoin du résultat " +
          "du précédent. On ne se connecte pas à un nom, on ne demande pas sans tuyau, on ne route " +
          "pas une requête qui n'est pas arrivée.",
      },

      {
        id: "role-dns", label: "ce que fait le DNS", cue: 1,
        hintTitle: "Qui fait quoi", hint: RAPPEL_ACTEURS,
        type: "choice", wide: true,
        prompt: "Le DNS a répondu <code>93.184.216.34</code>. Que se passe-t-il ensuite ?",
        options: [
          { id: "ok", label: "Le client ouvre une connexion vers <code>93.184.216.34</code>" },
          { id: "relais", label: "Le DNS transmet la requête au serveur" },
          { id: "cache", label: "Le DNS garde la connexion ouverte pour le client" },
          { id: "url", label: "Le client réécrit son URL avec l'adresse à la place du nom" },
        ],
        answer: "ok",
        feedbackFor: {
          relais: "Le DNS est un <b>annuaire</b>, pas un intermédiaire. Il répond une adresse et sort de l'histoire — plus aucun octet de la requête ne passe par lui.",
          cache: "Le DNS n'ouvre aucune connexion : il ne parle jamais au serveur de la boutique. C'est le client qui se connecte, directement.",
          url: "L'URL ne change pas. Le nom sert à trouver l'adresse ; il reste dans l'en-tête <code>Host</code>, qui permet à un même serveur d'héberger plusieurs sites.",
        },
        explain: "Le DNS n'intervient qu'une fois, au tout début, et ne voit jamais la requête. " +
          "Le nom survit pourtant dans l'en-tête <code>Host</code> — sans lui, un serveur qui héberge " +
          "dix sites ne saurait pas lequel on demande.",
      },

      {
        id: "fin-de-boucle", label: "qui corrige", cue: 0,
        type: "choice", wide: true,
        prompt: "La boucle se referme sur <code>404 Not Found</code>. Qui a le travail à faire ensuite ?",
        options: [
          { id: "ok", label: "Le client — sa demande visait quelque chose qui n'existe pas" },
          { id: "serveur", label: "Le serveur — il doit corriger et renvoyer la ressource" },
          { id: "personne", label: "Personne — 404 est une réponse valide, la boucle est finie" },
          { id: "retry", label: "Le client — il rejoue la même requête jusqu'à obtenir 200" },
        ],
        answer: "ok",
        feedbackFor: {
          serveur: "Un 4xx dit que la <b>demande</b> est fautive : le serveur a fait son travail, et refaire la même chose donnerait le même résultat. C'est en 5xx que la faute est de son côté.",
          personne: "Valide comme réponse, oui — mais elle porte une consigne. Un code d'état ne décrit pas seulement ce qui s'est passé, il dit au client quoi faire ensuite.",
          retry: "Rejouer à l'identique donnera 404 à l'identique. Réessayer n'a de sens que sur un 5xx, où la panne peut être passagère.",
        },
        explain: "4xx corrige, 5xx réessaie. C'est ce qui rend la boucle exploitable par un " +
          "programme : le code d'état seul suffit à décider de la suite, sans lire le corps.",
      },
    ];
  }

  PIFrames.widget("boucleComplete", function () {
    return { id: "boucle-complete", masteryTarget: 0.9, frames: frames() };
  });
})();
