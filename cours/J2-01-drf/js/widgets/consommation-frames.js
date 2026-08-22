/*
 * Jeu de frames — consommer l'API depuis Python (III.G, côté serveur).
 *
 * Fidélité : temps 4.2 du TP pour les codes (201 sur création, 204 sur
 * suppression). La dernière frame ouvre la question des permissions.
 */
(function () {
  "use strict";

  var DECOR =
    "Un script Python consomme l'API d'un autre service, avec le module " +
    "<code>requests</code> : <code>r = requests.post(url, …)</code>.";

  function frames() {
    return [
      {
        id: "json-vs-data", label: "le corps et son type", cue: 3,
        hintTitle: "Indice",
        hint: "<code>prix</code> est un <code>DecimalField</code>. Le sérialiseur convertit les chaînes — mais encore faut-il que le serveur lise un document JSON.",
        type: "choice", wide: true,
        prompt: DECOR + "<pre><code>souris = {\"nom\": \"Souris\", \"prix\": \"25.00\", \"categorie\": 1}\nr = requests.post(url, data=souris)      # A\nr = requests.post(url, json=souris)      # B</code></pre>" +
          "Une des deux lignes fait répondre <b>400</b> à coup sûr sur une API DRF stricte. Laquelle, et pourquoi ?",
        options: [
          { id: "a", label: "A — <code>data=</code> part en formulaire encodé, pas en JSON" },
          { id: "b", label: "B — <code>json=</code> exige que toutes les valeurs soient des chaînes" },
          { id: "aucune", label: "Aucune : le sérialiseur lit les deux formes indifféremment" },
          { id: "les-deux", label: "Les deux : il faut encoder le JSON soi-même dans <code>data=</code>" },
        ],
        answer: "a",
        feedbackFor: {
          b: "C'est l'inverse : <code>json=</code> sérialise correctement les nombres ET pose l'en-tête <code>Content-Type: application/json</code> en une fois.",
          aucune: "Le sérialiseur sait lire un formulaire — mais chaque valeur y arrive comme texte aplati, sans structure imbriquée fiable. Une API qui échange du JSON doit pouvoir compter sur son type annoncé.",
          "les-deux": "Inutile d'encoder à la main : <code>json=</code> fait exactement ce travail, avec le bon en-tête.",
        },
        explain: "A. Avec <code>data=</code>, le corps part en <code>application/x-www-form-urlencoded</code> : chaque valeur arrive comme texte, et toute structure imbriquée se perd. <code>json=</code> encode le document ET déclare <code>Content-Type: application/json</code>. Le client annonce ce qu'il envoie — c'est le même contrat qu'un en-tête de requête HTTP écrit à la main au Jour 1.",
      },
      {
        id: "lire-la-reponse", label: "lire la réponse", cue: 2,
        hintTitle: "Rappel",
        hint: "<code>r.status_code</code> est un nombre. Le corps, lui, est du texte tant qu'on ne l'a pas interprété.",
        type: "multi", wide: true,
        prompt: "Après <code>r = requests.get(\"https://api.exemple/produits/\")</code>, cochez tout ce qui est juste.",
        options: [
          { id: "json", label: "<code>r.json()</code> renvoie la liste des produits sous forme de listes et dictionnaires Python" },
          { id: "texte", label: "<code>r.text</code> contient le corps brut, avant interprétation" },
          { id: "code", label: "<code>r.status_code == 200</code> garantit que la liste n'est pas vide" },
          { id: "erreur", label: "En cas de 404, <code>r.json()</code> lève une exception — le corps n'est alors pas forcément du JSON" },
        ],
        answers: ["json", "texte", "erreur"],
        feedbackFor: {
          json: "<code>r.json()</code> décode le corps selon JSON : on retrouve dict, liste, nombres, chaînes.",
          texte: "<code>r.text</code> est le corps tel quel — utile justement quand le décodage échoue.",
          code: "200 dit « la requête a réussi ». Une liste vide est un succès parfaitement ordinaire : seul le corps la révèle.",
          erreur: "Un 404 DRF renvoie souvent du JSON (<code>{\"detail\": …}</code>) — mais rien ne l'y oblige, et une page d'erreur HTML arrive aussi. Décoder sans vérifier le code, c'est parier.",
        },
        explain: "Trois justes : <code>r.json()</code>, <code>r.text</code>, et l'exception possible sur un corps non-JSON. Le code d'état se lit AVANT le corps : 200 promet une ressource, jamais son contenu.",
      },
      {
        id: "codes-cote-client", label: "le code, puis le corps", cue: 2,
        hintTitle: "Indice",
        hint: "Chaque verbe réussi répond avec son propre code. Un échec de validation répond 400 avec un dictionnaire indexé par champ.",
        type: "slots", columns: 4,
        prompt: "Cette fois vous ÉCRIVEZ le client. Quatre appels viennent de répondre : quel test sur <code>r</code> fait réagir votre code comme il faut ?",
        slots: [
          { id: "c201", label: "<b>201</b>" },
          { id: "c204", label: "<b>204</b>" },
          { id: "c400", label: "<b>400</b>" },
          { id: "c405", label: "<b>405</b>" },
        ],
        tokens: [
          { id: "post-ok", label: "afficher le nouvel objet — dont on ne connaît pas encore l'identifiant", slot: "c201" },
          { id: "delete-ok", label: "retirer la ligne de l'interface — rien à afficher de la réponse", slot: "c204" },
          { id: "prix-faux", label: "réafficher le formulaire avec une erreur SOUS le champ en cause", slot: "c400" },
          { id: "post-detail", label: "signaler « action non disponible ici » — le serveur a refusé avant de lire le corps", slot: "c405" },
        ],
        feedbackFor: {
          "post-ok@c204": "Une suppression n'a plus rien à montrer ; une création, si — l'objet créé revient, avec son identifiant.",
          "delete-ok@c201": "Rien n'a été créé : la ressource vient de disparaître.",
          "prix-faux@c405": "Le verbe était bon, l'URL aussi : c'est le CONTENU qui a été refusé, et le corps nomme le champ fautif — d'où l'erreur affichée sous le champ.",
          "post-detail@c400": "Le corps n'est pas en cause ici : aucun verbe <code>POST</code> n'est servi sur une URL de détail.",
          "prix-faux@c201": "Une création refuse toujours un corps invalide : rien n'a été écrit en base.",
          "post-detail@c204": "La ressource existe toujours : la requête n'a pas abouti.",
          "post-ok": "Création réussie : <b>201</b>, et le corps porte le nouvel objet.",
          "delete-ok": "Suppression réussie : <b>204</b>, sans contenu.",
          "prix-faux": "Validation refusée : <b>400</b>, champ par champ.",
          "post-detail": "Verbe non servi à cette URL : <b>405</b>.",
        },
        explain: "Quatre codes, quatre diagnostics différents : 201 « créé », 204 « fait et vide », 400 « ton corps est fautif », 405 « ce verbe n'est pas servi à cette adresse ». Un client sérieux teste <code>r.status_code</code> AVANT de décoder le corps.",
      },
      {
        id: "negociation", label: "la forme demandée", cue: 1,
        hintTitle: "Indice",
        hint: "Même URL, deux clients, deux représentations reçues. Ce qui départage tient dans un en-tête de la requête.",
        type: "choice", wide: true,
        prompt: "Depuis un navigateur, l'URL affiche une page HTML interactive. Le même <code>GET</code> via <code>requests</code> renvoie du JSON brut. Pourquoi ?",
        options: [
          { id: "accept", label: "L'en-tête <code>Accept</code> diffère : DRF négocie la représentation selon ce que le client déclare accepter" },
          { id: "cookie", label: "Le navigateur envoie des cookies, qui changent le format de réponse" },
          { id: "agent", label: "DRF reconnaît le <code>User-Agent</code> et sert sa page aux navigateurs connus" },
          { id: "meme", label: "Les deux reçoivent exactement la même réponse" },
        ],
        answer: "accept",
        feedbackFor: {
          cookie: "Les cookies portent l'identité, pas la forme de la réponse.",
          agent: "Ce n'est pas le logiciel client qui est reconnu, mais ce qu'il DEMANDE — explicitement, dans un en-tête normalisé.",
          meme: "Pas la même : l'une est HTML, l'autre JSON. Quelque chose dans la requête a orienté le choix.",
        },
        explain: "La négociation de contenu : DRF compare l'en-tête <code>Accept</code> à ses rendus disponibles. Le navigateur demande du HTML et reçoit la page interactive ; <code>requests</code> accepte tout et reçoit le rendu JSON par défaut. Une même ressource, plusieurs représentations — c'est REST appliqué, pas un réglage de confort.",
      },
      {
        id: "pont-permissions", label: "tout le monde peut supprimer ?", cue: 1,
        hintTitle: "État des lieux",
        hint: "Reprenez les cinq lignes du ViewSet : aucun attribut n'y parle d'identité ni de droits.",
        type: "choice", wide: true,
        prompt: "Le ViewSet branché jusqu'ici répond à <code>DELETE /api/produits/1/</code> envoyé par N'IMPORTE QUI. De quel côté s'écrit la restriction ?",
        options: [
          { id: "permission", label: "Sur le ViewSet, avec <code>permission_classes</code>" },
          { id: "serialiseur", label: "Dans le sérialiseur, avec un champ conditionnel" },
          { id: "routeur", label: "Au routeur, en retirant l'URL du détail" },
          { id: "client", label: "Nulle part côté serveur : c'est au client de ne pas envoyer de DELETE" },
        ],
        answer: "permission",
        feedbackFor: {
          serialiseur: "Le sérialiseur valide des données ; il n'est consulté que si la vue a déjà décidé d'agir. Un DELETE ne passe même pas par lui.",
          routeur: "Retirer l'URL empêche TOUT LE MONDE de modifier ou lire le détail — pas seulement ceux qui n'en ont pas le droit. La restriction doit distinguer les clients, pas supprimer la fonction.",
          client: "Le client est hors de votre contrôle : n'importe quel script peut envoyer ce qu'il veut. Côté serveur, la décision appartient à la vue.",
        },
        explain: "<code>permission_classes</code>. Par défaut, un ViewSet autorise tout le monde — d'où le DELETE anonyme. Les classes de permission répondent à deux questions distinctes : « qui es-tu ? » et « as-tu le droit ? » — et leurs deux refus ne portent PAS le même code.",
      },
    ];
  }

  PIFrames.widget("consommationFrames", function () {
    return { id: "consommation-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
