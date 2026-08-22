/*
 * Jeu de frames — ViewSet et routeur (III.C / III.D).
 *
 * Fidélité : temps 4.1 et 4.2 du TP — la table verbe → action écrite par
 * DefaultRouter, le 405 sur un mauvais verbe, le 404 produit PAR la vue
 * (contrairement au 404 de routage du module II), le DELETE qui répond 204.
 */
(function () {
  "use strict";

  var DECOR =
    "<pre><code>routeur = DefaultRouter()\n" +
    "routeur.register(\"produits\", ProduitViewSet, basename=\"produit\")\n" +
    "urlpatterns = [path(\"api/\", include(routeur.urls))]</code></pre>";

  function frames() {
    return [
      {
        id: "url-liste", label: "les URL générées", cue: 3,
        hintTitle: "Indice",
        hint: "Le préfixe passé à <code>register()</code> se concatène au préfixe du <code>include()</code>.",
        type: "choice", wide: true,
        prompt: DECOR + "<br>Quelle URL sert la <b>liste</b> des produits ?",
        options: [
          { id: "ok", label: "<code>/api/produits/</code>" },
          { id: "sans-api", label: "<code>/produits/</code> — le routeur ignore le <code>include()</code>" },
          { id: "detail", label: "<code>/api/produits/&lt;pk&gt;/</code> — liste et détail partagent l'URL" },
          { id: "viewset", label: "<code>/api/produit-viewset/</code> — d'après le nom de la classe" },
        ],
        answer: "ok",
        feedbackFor: {
          "sans-api": "<code>include()</code> préfixe tout ce que le routeur a écrit : les deux préfixes s'additionnent.",
          detail: "Le détail exige un identifiant : le routeur écrit deux motifs distincts, l'un sans identifiant, l'autre avec.",
          viewset: "Le routeur ne lit pas le nom de la classe : seul compte le préfixe donné à <code>register()</code>.",
        },
        explain: "<code>/api/produits/</code>, plus <code>/api/produits/&lt;pk&gt;/</code> pour le détail. Deux lignes de configuration ont produit les deux URL qu'on écrivait à la main dans <code>urlpatterns</code>.",
      },
      {
        id: "table-detail", label: "verbe → action, sur le détail", cue: 2,
        hintTitle: "Rappel",
        hint: "<code>ModelViewSet</code> fournit six actions. Le routeur associe chaque verbe HTTP à l'une d'elles.",
        type: "slots", columns: 4,
        prompt: "Sur <code>/api/produits/1/</code>, rangez chaque verbe sous l'action qu'il déclenche.",
        slots: [
          { id: "retrieve", label: "<code>retrieve</code>", sub: "lire un objet" },
          { id: "update", label: "<code>update</code>", sub: "remplacer" },
          { id: "partial", label: "<code>partial_update</code>", sub: "modifier en partie" },
          { id: "destroy", label: "<code>destroy</code>", sub: "supprimer" },
        ],
        tokens: [
          { id: "get", label: "<code>GET</code>", slot: "retrieve" },
          { id: "put", label: "<code>PUT</code>", slot: "update" },
          { id: "patch", label: "<code>PATCH</code>", slot: "partial" },
          { id: "delete", label: "<code>DELETE</code>", slot: "destroy" },
        ],
        feedbackFor: {
          "get@update": "<code>PUT</code> ne lit rien : la lecture d'un objet est le travail de <code>GET</code>.",
          "put@retrieve": "<code>GET</code> ne modifie jamais une ressource. Le remplacement complet est l'affaire de <code>PUT</code>.",
          "patch@update": "<code>PATCH</code> n'exige pas un corps complet — c'est précisément ce qui le sépare de <code>PUT</code>.",
          "delete@partial": "<code>PATCH</code> modifie ; il ne supprime pas.",
          get: "Lire un objet existant : <code>retrieve</code>.",
          put: "Remplacer (avec un corps complet exigé) : <code>update</code>.",
          patch: "Modifier sans exiger le corps complet : <code>partial_update</code>.",
          delete: "Supprimer : <code>destroy</code>.",
        },
        explain: "Sur le détail : <code>GET→retrieve</code>, <code>PUT→update</code>, <code>PATCH→partial_update</code>, <code>DELETE→destroy</code>. Sur la liste : <code>GET→list</code>, <code>POST→create</code>. Cette table n'est pas une convention à apprendre : <code>routeur.urls</code> l'écrit noir sur blanc dans l'attribut <code>actions</code> de chaque motif. Un mot de vocabulaire : « update » dit que le verbe exige le corps complet — mais ce que DRF fait des champs facultatifs absents de ce corps n'est pas écrit ici.",
      },
      {
        id: "liste-ou-detail", label: "POST sur le détail", cue: 2,
        hintTitle: "Indice",
        hint: "La table précédente : quelle action répondrait sur <code>/api/produits/1/</code> à un <code>POST</code> ?",
        type: "choice", wide: true,
        prompt: "<code>api(\"post\", \"/api/produits/1/\", {\"nom\": \"x\"})</code><br>L'URL existe, le corps est bien formé. Quel code ?",
        options: [
          { id: "quatre-cent-cinq", label: "<b>405</b> — ce verbe n'est pas servi ici" },
          { id: "deux-cents", label: "200 — le produit 1 est mis à jour" },
          { id: "quatre-cents", label: "400 — le corps est incomplet" },
          { id: "quatre-cent-quatre", label: "404 — on ne crée pas ce qui existe déjà" },
        ],
        answer: "quatre-cent-cinq",
        feedbackFor: {
          "deux-cents": "Mettre à jour, c'est le travail de <code>PUT</code> ou <code>PATCH</code>. La table des actions ne comporte aucun <code>POST</code> côté détail.",
          "quatre-cents": "Le corps n'est même pas lu : aucune action ne correspond à ce verbe sur cette URL.",
          "quatre-cent-quatre": "L'URL correspond bien à un motif du routeur — le problème n'est pas l'adresse, c'est le verbe.",
        },
        explain: "<b>405 Method Not Allowed</b>. La réponse porte un en-tête <code>Allow</code> qui énumère ce qui est servi. Un mauvais verbe n'est ni un corps fautif (400) ni une adresse fausse (404) : l'adresse est juste, le verbe n'y est pas servi.",
      },
      {
        id: "introuvable", label: "le 404 vient de la vue", cue: 1,
        hintTitle: "Contrepoint",
        hint: "Une URL sans motif correspondant échoue AVANT toute vue. Ici, quel motif correspond ?",
        type: "choice", wide: true,
        prompt: "<code>api(\"get\", \"/api/produits/9999/\")</code> — aucun produit 9999 en base. Où naît le 404 ?",
        options: [
          { id: "vue", label: "DANS la vue : <code>get_object()</code> lève <code>Http404</code>" },
          { id: "routeur", label: "AU routeur : aucun motif ne correspond à cette URL" },
          { id: "serialiseur", label: "au sérialiseur : l'objet manquant est une erreur de validation" },
          { id: "middleware", label: "dans un middleware, avant la vue" },
        ],
        answer: "vue",
        feedbackFor: {
          routeur: "Le motif du détail accepte tout ce qui n'est pas slash : « 9999 » correspond très bien. Le routeur trouve sa vue et l'appelle — c'est ensuite que ça échoue.",
          serialiseur: "Pour lire, le sérialiseur reçoit déjà un objet : s'il n'en a pas reçu, la chaîne s'est arrêtée avant lui.",
          middleware: "Aucun middleware ne connaît votre base : il ne peut pas savoir que 9999 n'existe pas.",
        },
        explain: "Dans la vue. L'URL correspond, la vue tourne, <code>get_object()</code> cherche et lève <code>Http404</code> — le mécanisme même de <code>get_object_or_404</code>. Deux 404 d'origines différentes : celui-là coûte une exécution de vue et une requête en base, celui du routeur non.",
      },
      {
        id: "delete-code", label: "DELETE réussi", cue: 1,
        type: "choice", wide: true,
        prompt: "<code>r = api(\"delete\", \"/api/produits/2/\")</code>, le produit 2 existait. Quel code ?",
        options: [
          { id: "deux-cent-quatre", label: "<b>204</b> — fait, et rien à montrer" },
          { id: "deux-cents", label: "200 — avec le produit supprimé dans le corps" },
          { id: "trois-cents", label: "301 — vers la liste" },
          { id: "quatre-cent-dix", label: "410 — la ressource n'existe plus" },
        ],
        answer: "deux-cent-quatre",
        feedbackFor: {
          "deux-cents": "Il n'y a plus rien à représenter : renvoyer l'objet supprimé obligerait à le garder en mémoire pour rien. Le code dédié à « réussi et vide » existe.",
          "trois-cents": "Aucune redirection : la requête a abouti là où elle était envoyée.",
          "quatre-cent-dix": "410 dit « disparue, définitivement » — or la suppression a RÉUSSI. C'est un succès, pas un constat d'échec.",
        },
        explain: "<b>204 No Content</b> — succès, corps vide. À distinguer du <code>POST</code> qui répond <b>201 Created</b> avec le nouvel objet : chaque verbe réussi a son code, et le client les lit plutôt que d'analyser le corps.",
      },
      {
        id: "cinq-lignes", label: "qui a écrit tout ça ?", cue: 0,
        type: "free",
        prompt: "Deux URL, six actions, les codes d'état, le sérialiseur branché : quelle classe fournit tout cela quand on en hérite ?",
        placeholder: "nom de la classe…",
        answers: ["ModelViewSet", "model viewset", "viewsets.ModelViewSet"],
        feedbackFor: {
          "APIView": "<code>APIView</code> est le socle, mais il ne fournit aucune action : vous écririez <code>get</code>, <code>post</code>, <code>put</code>… à la main.",
          "ViewSet": "Un <code>ViewSet</code> nu donne les actions, mais pas leur contenu : sans modèle branché, lister ou créer reste à écrire.",
          _defaut: "C'est <code>ModelViewSet</code> : deux attributs — <code>queryset</code> et <code>serializer_class</code> — et les six actions sont opérationnelles. Ce qui tenait en trente lignes de vues tient en cinq.",
        },
        explain: "<code>ModelViewSet</code>. Il hérite de tout : lecture, création, modification, suppression, validation, codes d'état. Le défaut autorise tout, y compris supprimer.",
      },
    ];
  }

  PIFrames.widget("viewsetFrames", function () {
    return { id: "viewset-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
