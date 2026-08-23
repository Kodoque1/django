/*
 * Jeu de frames — les vues.
 *
 * Le point de la partie : trois façons de récupérer un objet, trois codes d'état
 * différents. Aucune slide ne les donne — la slide de référence vient après.
 */
(function () {
  "use strict";

  var RAPPEL =
    "<code>get()</code> lève si rien ne correspond · " +
    "<code>filter()</code> renvoie un QuerySet, éventuellement vide · " +
    "<code>first()</code> renvoie <code>None</code> si le QuerySet est vide";

  function frames() {
    return [
      {
        id: "get-nu", label: "get() sans protection", cue: 3,
        hintTitle: "Rappel", hint: RAPPEL,
        type: "choice", wide: true,
        prompt: "<pre><code>def detail(request, pk):\n" +
          "    produit = Produit.objects.get(pk=pk)\n" +
          "    return JsonResponse({\"nom\": produit.nom})</code></pre>" +
          "Le produit 99 n'existe pas. Que reçoit le client ?",
        options: [
          { id: "ok", label: "<b>500</b> — une exception non attrapée" },
          { id: "404", label: "404 — Django comprend que l'objet est absent" },
          { id: "none", label: "200 avec <code>{\"nom\": null}</code>" },
          { id: "vide", label: "200 avec un corps vide" },
        ],
        answer: "ok",
        feedbackFor: {
          404: "Django ne devine pas votre intention. <code>get()</code> lève <code>Produit.DoesNotExist</code>, une exception ordinaire : personne ne l'attrape, elle remonte, et le gestionnaire d'erreurs renvoie 500. Le 404 demande une décision de votre part.",
          none: "<code>get()</code> ne renvoie jamais <code>None</code> — c'est <code>first()</code> qui fait ça. <code>get()</code> vous garantit un objet, ou une exception.",
          vide: "Aucune réponse n'est construite : la ligne suivante n'est jamais exécutée. L'exception interrompt la vue au milieu.",
        },
        explain: "Une exception non attrapée dans une vue devient un <b>500</b>. Et un 500 dit « c'est ma faute » — alors qu'ici le client a simplement demandé une ressource qui n'existe pas. Le code d'état ment sur la responsabilité.",
      },
      {
        id: "or404", label: "get_object_or_404", cue: 2,
        hintTitle: "Indice", hint: "<code>get_object_or_404</code> n'attrape qu'une seule exception : <code>DoesNotExist</code>.",
        type: "choice", wide: true,
        prompt: "On remplace par <code>produit = get_object_or_404(Produit, pk=pk)</code>.<br>" +
          "Que change-t-il exactement ?",
        options: [
          { id: "ok", label: "Il attrape <code>DoesNotExist</code> et lève <code>Http404</code> — que Django transforme en 404" },
          { id: "tout", label: "Il attrape toutes les erreurs de base de données" },
          { id: "none", label: "Il renvoie <code>None</code> au lieu de lever" },
          { id: "cache", label: "Il met le résultat en cache pour éviter une seconde requête" },
        ],
        answer: "ok",
        feedbackFor: {
          tout: "C'est justement ce qu'il ne fait <b>pas</b>, et c'est une qualité : une panne de base ou une erreur de programmation continuent de remonter en 500. Un <code>try/except</code> large les transformerait en 404, et vous ne verriez jamais le vrai bug.",
          none: "Ce serait le comportement de <code>filter().first()</code>. <code>get_object_or_404</code> garantit un objet à la ligne suivante : c'est ce qui rend la vue lisible.",
          cache: "Aucun cache. Il fait une seule chose : convertir une absence en 404.",
        },
        explain: "Une ligne, et le code d'état devient honnête : <b>404</b>, « cette ressource n'existe pas ». Le raccourci est volontairement étroit — il ne masque que l'absence, jamais une panne.",
      },
      {
        id: "first", label: "first() et None", cue: 1,
        hintTitle: "Indice", hint: "<code>first()</code> ne lève jamais.",
        type: "choice", wide: true,
        prompt: "<pre><code>produit = Produit.objects.filter(pk=pk).first()\n" +
          "return JsonResponse({\"nom\": produit.nom})</code></pre>" +
          "Le produit 99 n'existe pas. Que reçoit le client ?",
        options: [
          { id: "ok", label: "<b>500</b> à nouveau — mais avec un message plus obscur qu'avant" },
          { id: "404", label: "404 : <code>first()</code> signale l'absence" },
          { id: "null", label: "200 avec <code>{\"nom\": null}</code>" },
          { id: "vide", label: "200 avec <code>{}</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          404: "<code>first()</code> ne lève rien et ne renvoie aucun code : il rend <code>None</code>, tranquillement. C'est la ligne <i>suivante</i> qui échoue.",
          null: "Il faudrait que <code>produit.nom</code> fonctionne sur <code>None</code>. Or <code>None</code> n'a pas d'attribut <code>nom</code> : <code>AttributeError</code>, donc 500.",
          vide: "Rien n'est construit : l'accès à <code>produit.nom</code> lève avant.",
        },
        explain: "<code>first()</code> est parfaitement légitime — <b>à condition de traiter le <code>None</code></b>. Sans garde, vous obtenez le même 500 qu'avec <code>get()</code>, avec un message qui parle de <code>NoneType</code> au lieu de nommer le modèle : plus dur à diagnostiquer.",
        retry: {
          prompt: "<code>Produit.objects.filter(pk=99).first()</code> tout seul, sans rien après. Que vaut la variable ?",
          options: [
            { id: "ok", label: "<code>None</code>" },
            { id: "404", label: "Une exception <code>DoesNotExist</code>" },
            { id: "null", label: "Un QuerySet vide" },
            { id: "vide", label: "Une liste vide" },
          ],
          answer: "ok",
          explain: "<code>first()</code> évalue le QuerySet et renvoie le premier objet, ou <code>None</code>. C'est le QuerySet <i>avant</i> <code>first()</code> qui aurait été vide.",
        },
      },
      {
        id: "except-large", label: "attraper trop large", cue: 1,
        type: "choice", wide: true,
        prompt: "<pre><code>try:\n    produit = Produit.objects.get(pk=pk)\n" +
          "except Exception:\n    raise Http404</code></pre>" +
          "Le contrat « produit absent → 404 » est rempli. Quel est le problème ?",
        options: [
          { id: "ok", label: "Une panne de base ou un bug deviennent aussi des 404 — et personne ne les verra" },
          { id: "lent", label: "C'est plus lent que <code>get_object_or_404</code>" },
          { id: "rien", label: "Aucun : c'est exactement ce que fait <code>get_object_or_404</code>" },
          { id: "multi", label: "<code>MultipleObjectsReturned</code> ne serait pas attrapée" },
        ],
        answer: "ok",
        feedbackFor: {
          lent: "La performance n'est pas en cause — un <code>try/except</code> ne coûte rien tant qu'aucune exception n'est levée. Le problème est ce que vous attrapez.",
          rien: "<code>get_object_or_404</code> n'attrape que <code>DoesNotExist</code>. Ici vous attrapez <b>tout</b> : une base injoignable, une faute de frappe dans un nom de champ, une erreur de programmation — tout devient un 404 tranquille.",
          multi: "Elle serait attrapée, elle aussi — et c'est bien le problème : deux objets pour un <code>pk</code> unique révèle une corruption de données, que vous venez de déguiser en « ressource absente ».",
        },
        explain: "Un <code>except</code> large est un <b>silencieux à bugs</b>. Votre supervision ne verra plus que des 404 parfaitement normaux, pendant que la base est en panne. Attrapez l'exception précise, ou utilisez le raccourci qui le fait pour vous.",
      },
      {
        id: "retour", label: "ce qu'une vue renvoie", cue: 1,
        type: "multi", wide: true,
        prompt: "Une vue Django doit renvoyer un objet <code>HttpResponse</code> (ou une sous-classe). " +
          "<b>Cochez tout ce qui convient.</b>",
        options: [
          { id: "http", label: "<code>HttpResponse(\"bonjour\")</code>" },
          { id: "json", label: "<code>JsonResponse({\"nom\": \"Clavier\"})</code>" },
          { id: "redirect", label: "<code>HttpResponseRedirect(\"/produits/\")</code>" },
          { id: "dict", label: "<code>{\"nom\": \"Clavier\"}</code> — un dictionnaire" },
          { id: "str", label: "<code>\"bonjour\"</code> — une chaîne" },
        ],
        answers: ["http", "json", "redirect"],
        feedbackFor: {
          dict: "Un dictionnaire n'est pas une réponse HTTP : il n'a ni code d'état, ni en-têtes. Django lève <code>ValueError: The view didn't return an HttpResponse object</code>. C'est <code>JsonResponse</code> qui emballe un dict.",
          str: "Même problème : une chaîne n'a pas de code d'état. <code>HttpResponse(\"bonjour\")</code> l'emballe — et c'est le rôle de cette classe.",
          http: "<code>HttpResponse</code> est la classe de base : c'est bien une réponse valide.",
          json: "<code>JsonResponse</code> est une sous-classe qui sérialise en JSON et pose le bon <code>Content-Type</code>.",
          redirect: "<code>HttpResponseRedirect</code> est une sous-classe qui porte un 302 et l'en-tête <code>Location</code>.",
        },
        explain: "Une vue est une fonction <code>requête → réponse</code>, et la réponse doit être un objet HTTP complet : code, en-têtes, corps. DRF ajoutera <code>Response</code>, qui choisit le format selon ce que le client demande — mais c'est le même contrat.",
      },
      {
        id: "pont-drf", label: "pont vers DRF", cue: 0,
        type: "slots", columns: 3,
        prompt: "Rangez chaque situation selon le code d'état qu'elle doit produire.",
        slots: [
          { id: "404", label: "404", sub: "la ressource n'existe pas" },
          { id: "500", label: "500", sub: "le serveur a échoué" },
          { id: "200", label: "200", sub: "voici le résultat" },
        ],
        tokens: [
          { id: "or404", label: "<code>get_object_or_404</code> ne trouve rien", slot: "404" },
          { id: "getnu", label: "<code>get()</code> nu sur un pk absent", slot: "500" },
          { id: "vide", label: "<code>filter()</code> ne trouve aucune ligne, on renvoie la liste", slot: "200" },
        ],
        feedbackFor: {
          "vide@404": "Une <b>liste vide</b> est une réponse parfaitement valide : la collection existe, elle est simplement vide aujourd'hui. Le 404 dirait que l'adresse <code>/produits/</code> n'existe pas — ce qui est faux.",
          "getnu@404": "Ce serait le comportement souhaitable, mais ce n'est pas celui qu'on obtient : l'exception n'est pas attrapée, elle remonte, et le serveur répond 500.",
          "or404@500": "<code>get_object_or_404</code> convertit précisément l'absence en <code>Http404</code>, que Django transforme en réponse 404. C'est tout son intérêt.",
          or404: "Le raccourci existe pour transformer une absence en 404.",
          getnu: "Une exception non attrapée devient toujours un 500.",
          vide: "Une collection vide se renvoie en 200 avec <code>[]</code> — l'absence de contenu n'est pas l'absence de ressource.",
        },
        explain: "Distinguer « il n'y a rien à cet endroit » (404) de « il n'y a rien dedans » (200 avec une liste vide) est l'une des erreurs les plus fréquentes des premières API.",
      },
    ];
  }

  PIFrames.widget("vuesFrames", function () {
    return { id: "vues-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
