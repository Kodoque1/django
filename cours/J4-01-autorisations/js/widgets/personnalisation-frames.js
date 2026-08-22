/*
 * Jeu de frames — autorisations personnalisées (IV.F) et frame-pont vers
 * l'authentification (module V, côté orchestrateur : le texte étudiant ne nomme
 * aucun autre dispositif).
 *
 * Fidélité : temps 4.5 du TP — une BasePermission avec message + has_permission
 * sur is_staff produit un 403 dont le corps porte {"detail": message}.
 */
(function () {
  "use strict";

  function frames() {
    return [
      {
        id: "has-permission", label: "la décision prise avant tout objet", cue: 3,
        hintTitle: "Indice",
        hint: "Sur la liste des produits, il n'y a pas d'objet unique. Quelle méthode peut alors être appelée ?",
        type: "choice", wide: true,
        prompt: "« La liste des produits est interdite aux non-administrateurs. »<br>" +
          "Quelle méthode d'une classe héritant de <code>permissions.BasePermission</code> porte cette décision ?",
        options: [
          { id: "has-permission", label: "<code>has_permission(self, request, view)</code>" },
          { id: "has-object-permission", label: "<code>has_object_permission(self, request, view, obj)</code>" },
          { id: "re-ecrire", label: "aucune — il faut réécrire la vue à la main" },
        ],
        answer: "has-permission",
        feedbackFor: {
          "has-object-permission": "Cette méthode reçoit un objet déjà chargé. Sur une liste, il n'y a pas d'objet : elle n'est jamais appelée.",
          "re-ecrire": "La règle tient en une méthode : DRF prévoit exactement ce point d'entrée, avant l'exécution de la vue.",
        },
        explain: "<code>has_permission</code>. Elle reçoit la requête et la vue, jamais d'objet : c'est le filtre appliqué à toute la vue, liste comprise. Retourner <code>True</code> laisse passer ; retourner <code>False</code> produit le refus.",
      },
      {
        id: "quand-object", label: "le rôle de has_object_permission", cue: 2,
        hintTitle: "Indice",
        hint: "retrieve, update, destroy ont tous un point commun que list n'a pas.",
        type: "choice", wide: true,
        prompt: "<code>has_object_permission</code> — à quel moment DRF l'appelle-t-il ?",
        options: [
          { id: "detail-seulement", label: "uniquement quand la vue charge un objet précis — retrieve, update, destroy" },
          { id: "partout", label: "à chaque requête, liste comprise" },
          { id: "jamais", label: "jamais automatiquement — il faut l'appeler soi-même" },
        ],
        answer: "detail-seulement",
        feedbackFor: {
          partout: "La liste ne charge aucun objet individuel : il n'y a rien à passer en troisième argument.",
          jamais: "Les vues de détail l'appellent elles-mêmes, via <code>get_object()</code> : écrire la classe suffit.",
        },
        explain: "Uniquement quand un objet précis est chargé. D'où la paire : <code>has_permission</code> filtre la vue entière, <code>has_object_permission</code> affine objet par objet.",
      },
      {
        id: "assembler-classe", label: "assembler la classe", cue: 1,
        hintTitle: "Indice",
        hint: "Une définition ouvre le bloc ; ce qu'elle définit s'exécute ensuite, dans l'ordre du code.",
        type: "order", wide: true,
        prompt: "Remettez les trois lignes de <code>Admins</code> dans l'ordre où elles doivent s'écrire.",
        items: [
          { id: "classe", label: "<code>class Admins(permissions.BasePermission):</code>" },
          { id: "def", label: "<code>def has_permission(self, request, view):</code>" },
          { id: "return", label: "<code>return request.user.is_staff</code>" },
        ],
        feedbackFor: {
          classe: "La déclaration de classe ouvre le bloc : les deux autres lignes vivent dans son corps indenté, jamais avant elle.",
          def: "La méthode se définit avant d'être exécutée : un <code>return</code> sans <code>def</code> au-dessus n'appartient à rien.",
          return: "<code>return</code> rend la décision : il vient en dernier, dans le corps de la méthode.",
        },
        explain: "La classe, puis la méthode, puis la décision. Avec l'attribut <code>message = \"réservé aux administrateurs\"</code> dans le corps de la classe, ces quatre lignes suffisent à produire un refus complet.",
      },
      {
        id: "ou-est-le-message", label: "où part le message", cue: 1,
        hintTitle: "Indice",
        hint: "Le refus concerne le client qui attend une réponse. Que lit-il ?",
        type: "choice", wide: true,
        prompt: "L'attribut <code>message = \"réservé aux administrateurs\"</code> est déclaré sur la classe. Où le client le retrouve-t-il ?",
        options: [
          { id: "corps-detail", label: "dans le corps JSON du 403, sous la clé <code>\"detail\"</code>" },
          { id: "en-tete", label: "dans un en-tête de réponse dédié" },
          { id: "console", label: "dans la console du serveur seulement" },
        ],
        answer: "corps-detail",
        feedbackFor: {
          "en-tete": "Le refus voyage dans le corps de la réponse : le client lit du JSON, pas un en-tête spécifique aux permissions.",
          console: "Le message vise le client, pas l'exploitant : il part avec la réponse.",
        },
        explain: "Sous <code>\"detail\"</code> : <code>{\"detail\": \"réservé aux administrateurs\"}</code>. L'attribut <code>message</code> de la classe devient le corps du 403 — le client sait ce qu'on lui refuse, et pourquoi.",
      },
      {
        id: "pont-identite", label: "d'où vient request.user", cue: 0,
        hintTitle: "",
        hint: "",
        type: "choice", wide: true,
        prompt: "Dans chacun de ces refus, une étape précède toujours la permission : savoir QUI demande. Qu'est-ce qui a rempli <code>request.user</code> ?",
        options: [
          { id: "authentification", label: "une classe d'authentification, à partir de l'en-tête <code>Authorization</code>" },
          { id: "permission", label: "la classe de permission elle-même" },
          { id: "routeur", label: "le routeur, en choisissant la vue" },
        ],
        answer: "authentification",
        feedbackFor: {
          permission: "La permission lit <code>request.user</code>, elle ne le fabrique pas : au moment où elle entre en scène, l'identité existe déjà.",
          routeur: "Le routeur associe une URL à une fonction : il ne regarde aucun en-tête d'identité.",
        },
        explain: "Une classe d'authentification : elle lit l'en-tête <code>Authorization</code>, reconnaît le jeton, installe <code>request.user</code> — et c'est ensuite seulement que les permissions posent leurs questions. Toute autorisation repose sur ce résultat : identifier quelqu'un est un mécanisme à part entière, distinct du droit accordé ou refusé.",
      },
    ];
  }

  PIFrames.widget("personnalisationFrames", function () {
    return { id: "iv-autorisations-personnalisees", masteryTarget: 0.9, frames: frames() };
  });
})();
