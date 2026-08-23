/*
 * Jeu de frames — d'où vient request.user (V.A, volet mécanisme).
 *
 * Toute permission lit request.user ; ces frames font construire qui l'écrit :
 * les classes d'authentification déclarées sur la vue, essayées dans l'ordre,
 * dont BasicAuthentication. Fidélité : temps 4.5 du TP — sans reconnaissance,
 * request.user reste l'utilisateur anonyme, et c'est la permission qui refuse.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>permission_classes = [IsAuthenticated]</code>. La permission lit " +
    "<code>request.user</code> — mais une requête arrive au serveur sans que rien," +
    "&nbsp;à ce stade, lui ait encore donné de nom.";

  function frames() {
    return [
      {
        id: "qui-remplit", label: "qui écrit request.user", cue: 3,
        hintTitle: "Indice",
        hint: DECOR + "<br>La permission ne lit qu'un attribut déjà rempli. Quel code a tourné avant elle ?",
        type: "choice", wide: true,
        prompt: DECOR + "<br>Une même vue peut déclarer plusieurs de ces classes. Quand un client se présente, dans quel ordre sont-elles consultées, et que fait la suivante quand l'une reconnaît le client&nbsp;?",
        options: [
          { id: "classe-auth", label: "une classe d'authentification, déclarée sur la vue ou dans le réglage du projet" },
          { id: "permission", label: "la permission elle-même, en lisant l'en-tête <code>Authorization</code>" },
          { id: "personne", label: "personne — l'attribut existe toujours vide" },
          { id: "client", label: "le client, en signant sa requête" },
        ],
        answer: "classe-auth",
        feedbackFor: {
          permission: "La permission ne consulte que le résultat : elle lit <code>request.user</code>, elle ne va jamais relire l'en-tête. Un autre code l'a rempli.",
          personne: "L'attribut a toujours une valeur — jamais vide : faute de mieux, il porte l'utilisateur anonyme. Quelque chose l'écrit.",
          client: "Le client présente des éléments d'identité, il n'écrit rien côté serveur : c'est du code serveur qui transforme ces éléments en utilisateur.",
        },
        explain: "Une classe d'authentification. Chaque vue porte une liste <code>authentication_classes</code>&nbsp;: DRF les fait essayer avant tout contrôle de permission, et la première qui reconnaît le client remplit <code>request.user</code> — et <code>request.auth</code>, qui garde la preuve utilisée.",
      },
      {
        id: "ordre-essai", label: "les classes essayées dans l'ordre", cue: 2,
        hintTitle: "Indice",
        hint: "<code>authentication_classes = [SessionAuthentication, TokenAuthentication]</code>. La requête porte un jeton valide, aucun cookie. Déroulez ce qui se passe.",
        type: "order", wide: true,
        prompt: "<code>authentication_classes = [SessionAuthentication, TokenAuthentication]</code>. " +
          "La requête porte un jeton valide et aucun cookie. Remettez les étapes dans l'ordre.",
        items: [
          { id: "session", label: "<code>SessionAuthentication</code> cherche un cookie de session — il n'y en a pas" },
          { id: "token", label: "<code>TokenAuthentication</code> lit l'en-tête <code>Authorization</code>" },
          { id: "reconnu", label: "la clé correspond à une ligne de la table des jetons — l'utilisateur est reconnu" },
          { id: "fini", label: "les classes suivantes, s'il y en avait, ne sont plus consultées" },
        ],
        feedbackFor: {
          session: "La liste commence toujours par sa première classe — ici la session, consultée avant tout le reste.",
          token: "L'en-tête n'est lu qu'à son tour dans la liste : avant lui, seule la première classe a parlé.",
          "session@0": "C'est bien le début : les classes sont essayées dans l'ordre de la liste, et la première de cette liste est la session.",
          "token@0": "La première classe de la liste est <code>SessionAuthentication</code> : elle est consultée avant l'en-tête, quitte à n'y trouver rien.",
          "reconnu@0": "Aucune classe n'a encore été consultée : commencer par la reconnaissance suppose la lecture déjà faite.",
          "fini@0": "Rien n'est terminé à la première étape : la liste vient seulement d'être entamée.",
          "reconnu@1": "À cette place, la seconde classe vient d'être consultée : elle n'a pas encore eu le temps de lire quoi que ce soit.",
          "fini@1": "La reconnaissance n'a pas encore eu lieu : on ne peut pas arrêter la liste sur un échec de lecture.",
          "token@1": "La session a déjà été consultée et n'a rien trouvé : la classe suivante de la liste prend le relais.",
          "session@2": "La session a déjà échoué en tête de liste : on ne la rejoue pas.",
          "fini@2": "Un utilisateur vient d'être reconnu : c'est ce résultat qui met fin à la liste, pas un nouvel échec.",
          "token@3": "L'en-tête a déjà été lu et la clé reconnue : relire serait refaire le travail.",
          "session@3": "La session est passée depuis trois étapes : elle n'est jamais rejouée.",
          "reconnu@3": "La reconnaissance a déjà eu lieu à l'étape précédente.",
        },
        explain: "Dans l'ordre de la liste, chacune essaie&nbsp;; dès qu'une classe reconnaît le client, <code>request.user</code> est rempli et les suivantes ne sont plus consultées. L'ordre de la liste est donc un ordre de priorité entre moyens d'identification.",
        retry: "Même liste, même requête : remettez les quatre étapes dans l'ordre où elles se produisent.",
      },
      {
        id: "basic-en-tete", label: "l'en-tête de BasicAuthentication", cue: 3,
        hintTitle: "Indice",
        hint: "Chaque classe définit le schéma qu'elle accepte dans l'en-tête <code>Authorization</code>. Quel schéma porte le nom de « Basic »&nbsp;?",
        type: "choice", wide: true,
        prompt: "<code>authentication_classes = [BasicAuthentication]</code>. " +
          "Un client envoie&nbsp;<pre><code>Authorization: Basic dGV1OmV0dQ==</code></pre>Que fait la classe?",
        options: [
          { id: "decode", label: "elle décode le second mot en un couple nom d'utilisateur, mot de passe — et le vérifie" },
          { id: "jeton", label: "elle cherche le second mot dans la table des jetons" },
          { id: "ignore", label: "elle ignore l'en-tête : ce schéma appartient à une autre classe" },
        ],
        answer: "decode",
        feedbackFor: {
          jeton: "La table des jetons appartient à <code>TokenAuthentication</code>. Le schéma « Basic » transporte autre chose&nbsp;: un nom et un mot de passe.",
          ignore: "Le schéma en tête d'en-tête est justement celui que <code>BasicAuthentication</code> accepte : elle le prend en charge.",
        },
        explain: "Elle décode <code>dGV1OmV0dQ==</code> en <code>etu:etu</code>, vérifie le couple contre la table des comptes, et remplit <code>request.user</code> si le mot de passe est bon. Chaque classe connaît son schéma d'en-tête&nbsp;: « Basic » ici, « Token » pour les jetons.",
      },
      {
        id: "basic-pas-secret", label: "ce que cache l'écriture étrange", cue: 2,
        hintTitle: "Indice",
        hint: "Recoder la même chaîne donne toujours la même chaîne. Est-ce une transformation qui garde un secret ?",
        type: "choice", wide: true,
        prompt: "Le second mot de l'en-tête, <code>dGV1OmV0dQ==</code>, est illisible d'un coup d'œil. Un concurrent qui intercepte cette requête peut-il lire le mot de passe?",
        options: [
          { id: "oui", label: "oui — l'écriture est un simple recodage, inversible par n'importe qui" },
          { id: "non", label: "non — le contenu est chiffré, il reste illisible sans clé" },
        ],
        answer: "oui",
        feedbackFor: {
          non: "Chiffrer demande une clé et un algorithme de chiffrement. Ici, un décodeur universel suffit : rien n'est gardé secret.",
        },
        explain: "Oui. Base64 n'est pas du chiffrement&nbsp;: c'est un recodage inversible, sans clé, prévu pour transporter des octets quelconques dans un en-tête. N'importe qui peut décoder <code>dGV1OmV0dQ==</code> et retrouver le couple. Le mot de passe repart donc à chaque requête — c'est la marque de cette classe.",
      },
      {
        id: "aucune-classe", label: "quand aucune ne reconnaît", cue: 1,
        hintTitle: "Indice",
        hint: "Fin de liste, aucun utilisateur reconnu. Le serveur plante-t-il pour autant ?",
        type: "choice", wide: true,
        prompt: "<code>authentication_classes = [SessionAuthentication, TokenAuthentication]</code>. " +
          "La requête n'a ni cookie ni en-tête. Que devient <code>request.user</code>, et que répond le serveur?",
        options: [
          { id: "anonyme", label: "l'utilisateur anonyme — et le traitement continue, jusqu'à la permission" },
          { id: "erreur", label: "une erreur d'authentification, levée dès la fin de la liste" },
          { id: "vide", label: "un attribut vide, qui fait planter la permission à la lecture" },
        ],
        answer: "anonyme",
        feedbackFor: {
          erreur: "Aucune exception n'est levée en fin de liste : l'échec des classes d'authentification n'est pas une réponse, il laisse la requête continuer.",
          vide: "L'attribut n'est jamais vide : une valeur par défaut l'attend, et la permission peut la lire sans planter.",
        },
        explain: "L'utilisateur anonyme, et le traitement continue. Faute de reconnaissance, <code>request.user</code> porte l'anonyme — c'est ensuite la permission qui tranche, et le refus éventuel dépend d'elle. Identifier et autoriser sont deux moments distincts.",
      },
    ];
  }

  PIFrames.widget("authentificationFrames", function () {
    return { id: "v-mecanisme", masteryTarget: 0.9, frames: frames() };
  });
})();
