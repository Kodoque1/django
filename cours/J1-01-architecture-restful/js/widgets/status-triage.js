/*
 * Jeu — « Le triage » (notion : codes d'état HTTP)
 *
 * Mécanique : la précision exigée augmente à mesure que les indices disparaissent. On trie
 * d'abord par famille, puis on désigne le fautif (client ou serveur), puis on discrimine les
 * paires qui se confondent le plus souvent — 401/403, 200/201/204, 301/302, 404/410/400,
 * 500/502/503 — avant deux frames en rafale sans filet et le pont vers Django/DRF.
 *
 * Ce jeu se prête bien à une manche projetée au tableau, une fois la partie solo terminée —
 * le bouton du bandeau y bascule. Ne PAS le poser en dur dans la config : le mode duel
 * affiche le chrono et agrandit le bandeau, ce qui n'a rien à faire sur la manche solo, où
 * l'apprenant construit sa réponse à son rythme.
 */
(function () {
  "use strict";

  var CATALOGUE =
    "<table>" +
    "<tr><th>1xx</th><td>information — rare, transitoire</td></tr>" +
    "<tr><th>2xx</th><td>succès — la demande a abouti</td></tr>" +
    "<tr><th>3xx</th><td>redirection — c'est ailleurs</td></tr>" +
    "<tr><th>4xx</th><td>la <b>demande</b> est fautive : au client de corriger</td></tr>" +
    "<tr><th>5xx</th><td>le <b>serveur</b> a échoué : au client de réessayer</td></tr>" +
    "</table>";

  function frames() {
    return [
      // Frame d'ouverture : elle pose le PROBLÈME de la partie (§3 bis). Le cas est réel et
      // très répandu — une API qui renvoie 200 avec un champ « erreur » dans le corps. Elle
      // ne nomme aucune famille de codes : c'est la frame suivante qui les fait construire.
      {
        id: "probleme", label: "ce qu'un programme sait lire", cue: 2,
        type: "choice", wide: true,
        prompt: "Votre programme appelle une API. La réponse arrive avec le code " +
          "<code>200 OK</code>, et pour corps :<br>" +
          "<code>{\"erreur\": \"produit introuvable\"}</code><br>" +
          "Le programme doit décider s'il réessaie. Que sait-il ?",
        options: [
          { id: "ok", label: "Rien d'exploitable — <code>200</code> annonce un succès, et le programme ne lit pas le français" },
          { id: "lire", label: "Que le produit n'existe pas : c'est écrit dans la réponse" },
          { id: "champ", label: "Qu'il doit regarder le champ <code>erreur</code> — c'est la convention" },
          { id: "retry", label: "Qu'il doit réessayer : l'erreur est peut-être passagère" },
        ],
        answer: "ok",
        feedbackFor: {
          lire: "C'est écrit pour <i>vous</i>. Un programme reçoit une suite d'octets ; « produit introuvable », « article inconnu » et « not found » lui sont trois chaînes sans rapport.",
          champ: "Cette convention n'existe qu'entre ces deux programmes-là, et seulement tant que personne ne renomme le champ. Un client écrit par quelqu'un d'autre ne la connaît pas.",
          retry: "Réessayer une demande qui vise un produit inexistant donnera exactement le même résultat, indéfiniment. Et rien dans cette réponse ne permet de le savoir.",
        },
        explain: "Le corps s'adresse à un humain ; il faut autre chose pour la machine — quelque chose de court, d'universel, et qui ne dépende d'aucun accord préalable entre les deux programmes.",
      },

      {
        id: "familles", label: "les cinq familles", cue: 3,
        hintTitle: "Les familles de codes", hint: CATALOGUE,
        type: "slots", columns: 4,
        prompt: "Rangez chaque situation dans sa <b>famille</b> de codes.",
        slots: [
          { id: "2xx", label: "2xx", sub: "succès" },
          { id: "3xx", label: "3xx", sub: "redirection" },
          { id: "4xx", label: "4xx", sub: "faute du client" },
          { id: "5xx", label: "5xx", sub: "faute du serveur" },
        ],
        tokens: [
          { id: "cree", label: "L'article a bien été créé", slot: "2xx" },
          { id: "deplace", label: "L'adresse a changé, voici la nouvelle", slot: "3xx" },
          { id: "inexistant", label: "La page demandée n'existe pas", slot: "4xx" },
          { id: "exception", label: "Le code de la vue a levé une exception", slot: "5xx" },
          { id: "jeton", label: "Le jeton d'authentification est expiré", slot: "4xx" },
        ],
        feedbackFor: {
          "exception@4xx": "Le client n'y est pour rien : c'est <i>votre</i> code qui a planté. Toute erreur venant du serveur est en 5xx.",
          "jeton@5xx": "Un jeton expiré est un défaut de la <b>demande</b> : le client doit se reconnecter et réessayer. C'est du 4xx.",
          "inexistant@5xx": "Le serveur va très bien : il répond correctement qu'il n'a pas cette ressource. La demande visait une adresse inexistante — 4xx.",
          "deplace@2xx": "Rien n'a encore abouti : on indique au client où aller chercher. C'est une redirection, 3xx.",
          "cree@3xx": "La création a bien eu lieu : c'est un succès, 2xx.",
          exception: "Une exception dans votre vue, c'est le serveur qui échoue : 5xx.",
          jeton: "Un jeton expiré : au client de corriger — 4xx.",
          cree: "La création a abouti : c'est un <b>succès</b>, donc 2xx (201 précisément — « j'ai créé »).",
          deplace: "Rien n'a échoué et rien n'est fini : on renvoie le client vers une autre adresse. C'est une <b>redirection</b>, 3xx.",
          inexistant: "Le serveur va parfaitement bien : il répond correctement qu'il n'a pas cette ressource. La faute est dans la <b>demande</b> — 4xx.",
        },
        explain: "Le premier chiffre suffit à situer la responsabilité. C'est le réflexe à acquérir : avant de chercher <i>quel</i> code, demandez-vous <b>qui</b> doit corriger.",
      },

      {
        id: "qui-corrige", label: "client ou serveur", cue: 3,
        hintTitle: "La question à se poser", hint: "« Le client peut-il changer quelque chose à sa requête pour que ça marche ? » Si oui → 4xx. Sinon → 5xx.",
        type: "slots", columns: 2,
        prompt: "Qui doit corriger ?",
        slots: [
          { id: "client", label: "Au client de corriger", sub: "4xx" },
          { id: "serveur", label: "Au serveur de corriger", sub: "5xx" },
        ],
        tokens: [
          { id: "json", label: "Le corps JSON envoyé est malformé", slot: "client" },
          { id: "bdd", label: "La base de données est injoignable", slot: "serveur" },
          { id: "champ", label: "Un champ obligatoire manque dans le formulaire", slot: "client" },
          { id: "zero", label: "Une division par zéro dans la vue", slot: "serveur" },
          { id: "expire", label: "Le jeton envoyé a expiré", slot: "client" },
          { id: "paiement", label: "Le service de paiement en amont ne répond pas", slot: "serveur" },
        ],
        feedbackFor: {
          "json@serveur": "Le serveur a fait son travail : il a lu, détecté l'erreur et su la nommer. C'est la requête qui était fautive — et le client peut la corriger.",
          "champ@serveur": "Une validation qui échoue est un succès du serveur, pas une panne : il a correctement refusé une demande incomplète.",
          "bdd@client": "Le client ne peut rien y faire : quelle que soit sa requête, elle échouera. C'est du 5xx — d'ailleurs, il a raison de réessayer plus tard.",
          "zero@client": "C'est un bug dans votre code. Aucune correction côté client n'y changera rien.",
          "paiement@client": "Votre serveur dépend d'un tiers qui flanche : de l'extérieur, c'est votre service qui est en défaut. 5xx — typiquement 502 ou 504.",
          "expire@serveur": "Le client peut agir : se reconnecter et réémettre. C'est donc 4xx.",
        },
        explain: "Ce partage n'est pas cosmétique : il détermine le <b>comportement du client</b>. Sur 4xx, réessayer à l'identique est inutile. Sur 5xx, réessayer plus tard est la bonne conduite — c'est sur cette convention que reposent tous les mécanismes de reprise automatique.",
      },

      {
        id: "401-403", label: "401 contre 403", cue: 2,
        hintTitle: "Rappel", hint: "L'un dit « je ne sais pas qui vous êtes », l'autre « je sais très bien qui vous êtes ».",
        type: "choice", wide: true,
        prompt: "Un utilisateur <b>connecté</b>, mais qui n'est pas administrateur, appelle <code>DELETE /produits/12/</code>. Que renvoyer ?",
        options: [
          { id: "403", label: "<code>403 Forbidden</code>" },
          { id: "401", label: "<code>401 Unauthorized</code>" },
          { id: "404", label: "<code>404 Not Found</code>" },
          { id: "400", label: "<code>400 Bad Request</code>" },
        ],
        answer: "403",
        feedbackFor: {
          "401": "401 <i>Unauthorized</i> est mal nommé : il signifie en réalité « non <b>authentifié</b> ». Il s'accompagne d'un en-tête <code>WWW-Authenticate</code> qui invite à s'identifier — ce qui n'aurait aucun sens ici, puisque l'utilisateur l'est déjà.",
          "404": "Certaines API répondent 404 pour ne pas révéler qu'une ressource existe. C'est un choix défendable, mais ce n'est pas la réponse par défaut : ici la ressource existe et l'utilisateur est identifié, il lui manque un <b>droit</b>.",
          "400": "400 vise une requête <b>malformée</b>. Celle-ci est parfaitement formée : elle est simplement interdite à cet utilisateur.",
        },
        explain: "<b>401 = authentification</b> (qui êtes-vous ?), <b>403 = autorisation</b> (avez-vous le droit ?). En DRF, l'absence de jeton valide donne 401, et vos classes de permission donnent 403.",
        retry: { prompt: "Lequel des deux codes signifie « je sais qui vous êtes, mais c'est non » ?" },
      },

      {
        id: "201", label: "200 / 201 / 204", cue: 2,
        hintTitle: "Rappel", hint: "<code>200</code> voici le résultat · <code>201</code> j'ai créé, voici où · <code>204</code> c'est fait, rien à renvoyer",
        type: "choice", wide: true,
        prompt: "<code>POST /produits/</code> vient de créer une ressource. Quel code renvoyer ?",
        options: [
          { id: "201", label: "<code>201 Created</code>, avec un en-tête <code>Location</code>" },
          { id: "200", label: "<code>200 OK</code>" },
          { id: "204", label: "<code>204 No Content</code>" },
          { id: "202", label: "<code>202 Accepted</code>" },
        ],
        answer: "201",
        feedbackFor: {
          "200": "200 conviendrait pour une lecture ou une modification. Pour une création, 201 dit quelque chose de plus : une ressource <b>nouvelle</b> existe, et l'en-tête <code>Location</code> donne son URL.",
          "204": "204 signifie « c'est fait, et il n'y a rien à renvoyer » — parfait après un DELETE. Après une création, on a justement quelque chose à renvoyer : la ressource créée.",
          "202": "202 <i>Accepted</i> signifie « pris en compte, mais pas encore traité » : c'est le code d'un traitement asynchrone (mise en file d'attente). Ici, la création a bien eu lieu tout de suite.",
        },
        explain: "Un code précis est une <b>information gratuite</b> pour le client. 201 lui permet de récupérer l'URL de la ressource sans deviner ; 204 lui évite de tenter de lire un corps vide.",
      },

      {
        id: "301-302", label: "301 contre 302", cue: 1,
        hintTitle: "Indice", hint: "L'un des deux est mémorisé par le navigateur et par les moteurs de recherche.",
        type: "choice", wide: true,
        prompt: "Pendant deux semaines seulement, <code>/promo/</code> doit renvoyer vers <code>/soldes/</code>. Quel code ?",
        options: [
          { id: "302", label: "<code>302 Found</code> — redirection temporaire" },
          { id: "301", label: "<code>301 Moved Permanently</code>" },
          { id: "200", label: "<code>200 OK</code> en servant directement le contenu de <code>/soldes/</code>" },
          { id: "404", label: "<code>404 Not Found</code> sur <code>/promo/</code>" },
        ],
        answer: "302",
        feedbackFor: {
          "301": "301 dit <b>permanent</b> : navigateurs et moteurs le mettent en cache, parfois pour très longtemps, et cessent de demander l'ancienne adresse. Deux semaines plus tard, une partie de vos visiteurs sera <i>toujours</i> renvoyée vers <code>/soldes/</code>, même après retrait de la redirection. Un 301 posé à tort se paie pendant des mois.",
          "200": "Servir le contenu sous l'ancienne adresse crée deux URL pour une même page : mauvais pour le référencement, et le client ne sait pas qu'il devrait utiliser la nouvelle.",
          "404": "Vous casseriez tous les liens existants vers <code>/promo/</code> alors que vous savez parfaitement où mène la page.",
        },
        explain: "302 est temporaire et n'engage rien : le client redemandera l'ancienne adresse la prochaine fois. Côté Django, <code>redirect(\"soldes\")</code> produit un 302 ; <code>redirect(\"soldes\", permanent=True)</code> un 301. Et le fameux slash final ajouté par <code>APPEND_SLASH</code> ? Un 301.",
      },

      {
        id: "404-410-400", label: "404 / 410 / 400", cue: 1,
        hintTitle: "Indice", hint: "Demandez-vous ce que Django fait <i>avant</i> d'appeler la moindre vue.",
        type: "choice", wide: true,
        prompt: "<code>urls.py</code> déclare <code>path(\"produits/&lt;int:pk&gt;/\", …)</code>. Un client demande <code>GET /produits/abc/</code>. Que renvoie Django ?",
        options: [
          { id: "404", label: "<code>404</code> — aucune route ne correspond" },
          { id: "400", label: "<code>400</code> — l'identifiant est invalide" },
          { id: "500", label: "<code>500</code> — la conversion en entier échoue dans la vue" },
          { id: "410", label: "<code>410</code> — la ressource n'est plus là" },
        ],
        answer: "404",
        feedbackFor: {
          "400": "Intuitivement séduisant, mais Django ne peut pas savoir que vous <i>visiez</i> cette route : <code>abc</code> ne correspond à aucun motif déclaré, donc <b>aucune vue n'est appelée</b>. Le routeur épuise sa liste et conclut : 404.",
          "500": "Aucune conversion n'a lieu : le convertisseur <code>&lt;int:…&gt;</code> filtre <i>avant</i> l'appel de la vue. Votre code n'est jamais exécuté, il ne peut donc pas planter.",
          "410": "410 <i>Gone</i> signifie « cette ressource a existé et a été volontairement supprimée » — une information rare et délibérée. Ici, elle n'a jamais existé.",
        },
        explain: "404 = je ne connais pas cette adresse. 410 = je la connaissais, elle a été retirée exprès. 400 = j'ai bien reçu la demande, mais elle est malformée (un corps JSON invalide, par exemple). La différence n'est pas byzantine : elle dit au client s'il doit corriger sa requête ou renoncer.",
      },

      {
        id: "500-502-503", label: "500 / 502 / 503", cue: 1,
        hintTitle: "Indice", hint: "Deux serveurs sont en jeu. Lequel des deux vous répond, et que sait-il de l'autre ?",
        type: "choice", wide: true,
        prompt: "Nginx est placé devant Gunicorn. Vous redémarrez Gunicorn : pendant quelques secondes, il n'accepte plus aucune connexion. Que renvoie Nginx au client ?",
        options: [
          { id: "502", label: "<code>502 Bad Gateway</code>" },
          { id: "500", label: "<code>500 Internal Server Error</code>" },
          { id: "503", label: "<code>503 Service Unavailable</code>" },
          { id: "504", label: "<code>504 Gateway Timeout</code>" },
        ],
        answer: "502",
        feedbackFor: {
          "500": "500 est la réponse de <i>votre application</i> quand son propre code échoue. Ici, votre application ne parle pas du tout : celui qui répond, c'est Nginx, et il va très bien.",
          "503": "503 est ce que renvoie un serveur <b>qui répond</b> pour annoncer son indisponibilité : surcharge, maintenance programmée, souvent avec un en-tête <code>Retry-After</code>. Ici, l'amont ne répond pas du tout.",
          "504": "504 serait le cas où Gunicorn <i>accepte</i> la connexion mais met trop de temps à répondre. Ici il la refuse : la passerelle n'obtient aucune réponse valide, pas une réponse tardive.",
        },
        explain: "500 = mon code a planté. 502 = j'ai interrogé quelqu'un en amont et je n'ai rien obtenu d'exploitable. 503 = je réponds, mais je suis indisponible. 504 = l'amont est trop lent. Ce sont les trois codes que vous rencontrerez le jour de la mise en production — et savoir lequel tombe vous dit <b>où</b> aller regarder.",
      },

      {
        id: "rafale-400", label: "rafale — validation", cue: 0,
        type: "choice", wide: true,
        prompt: "<b>Rafale 1/2.</b> Le corps envoyé à votre API contient <code>\"prix\": \"gratuit\"</code> là où un entier est attendu. Le sérialiseur DRF le rejette. Quel code part ?",
        options: [
          { id: "400", label: "<code>400 Bad Request</code>" },
          { id: "422", label: "<code>422 Unprocessable Entity</code>" },
          { id: "500", label: "<code>500 Internal Server Error</code>" },
          { id: "403", label: "<code>403 Forbidden</code>" },
        ],
        answer: "400",
        feedbackFor: {
          "422": "422 existe et se défend — certaines API l'utilisent pour distinguer « JSON illisible » de « JSON lisible mais invalide ». Mais DRF renvoie <b>400</b> par défaut quand un sérialiseur est invalide.",
          "500": "Erreur fréquente et coûteuse : votre code a parfaitement fonctionné, il a <i>détecté</i> une donnée invalide. Renvoyer 500 enverrait votre équipe chercher un bug qui n'existe pas — et empêcherait le client de comprendre qu'il doit corriger son envoi.",
          "403": "403 concerne les droits. Ici l'utilisateur a peut-être tous les droits du monde : c'est la donnée qui ne convient pas.",
        },
        explain: "<code>serializer.is_valid(raise_exception=True)</code> lève une <code>ValidationError</code>, que DRF traduit en <b>400</b> avec le détail des champs fautifs dans le corps de la réponse.",
      },

      {
        id: "rafale-401", label: "rafale — authentification", cue: 0,
        type: "choice", wide: true,
        prompt: "<b>Rafale 2/2.</b> Une vue protégée par <code>IsAuthenticated</code> (avec <code>TokenAuthentication</code>) est appelée <b>sans aucun jeton</b>. Quel code ?",
        options: [
          { id: "401", label: "<code>401 Unauthorized</code>" },
          { id: "403", label: "<code>403 Forbidden</code>" },
          { id: "404", label: "<code>404 Not Found</code>" },
          { id: "400", label: "<code>400 Bad Request</code>" },
        ],
        answer: "401",
        feedbackFor: {
          "403": "Presque — et c'est une subtilité réelle : DRF renvoie bien 403 lorsque aucun mécanisme d'authentification ne sait <i>comment</i> réclamer des identifiants (cas de la session seule). Mais avec <code>TokenAuthentication</code>, il peut émettre un en-tête <code>WWW-Authenticate</code> : il renvoie donc <b>401</b>.",
          "404": "Masquer l'existence d'une ressource protégée derrière un 404 est une stratégie volontaire, pas le comportement par défaut.",
          "400": "La requête est parfaitement formée : il lui manque une identité, pas une correction de syntaxe.",
        },
        explain: "Pas de jeton → 401, on ne sait pas qui vous êtes. Jeton valide mais droits insuffisants → 403. La règle et sa nuance : un 401 exige de pouvoir dire <i>comment</i> s'authentifier, via <code>WWW-Authenticate</code>.",
      },

      {
        id: "pont-django", label: "pont Django/DRF", cue: 0,
        type: "slots", columns: 4,
        prompt: "Reliez chaque situation Django/DRF au code qu'elle produit.",
        slots: [
          { id: "400", label: "400" },
          { id: "401", label: "401" },
          { id: "403", label: "403" },
          { id: "404", label: "404" },
        ],
        tokens: [
          { id: "g404", label: "<code>get_object_or_404()</code> ne trouve rien", slot: "404" },
          { id: "valid", label: "<code>is_valid(raise_exception=True)</code> échoue", slot: "400" },
          { id: "isauth", label: "<code>IsAuthenticated</code>, aucun jeton fourni", slot: "401" },
          { id: "isadmin", label: "<code>IsAdminUser</code>, utilisateur simple connecté", slot: "403" },
        ],
        feedbackFor: {
          "isadmin@401": "L'utilisateur <b>est</b> authentifié — son jeton est valide. Ce qui manque, c'est le droit : 403.",
          "isauth@403": "Aucun jeton n'a été fourni : le serveur ne sait pas qui parle. C'est un défaut d'authentification, 401.",
          "valid@404": "Les données sont invalides, mais la ressource visée existe bel et bien : c'est un problème de contenu, pas d'adresse. 400.",
          "g404@400": "L'adresse ne correspond à aucun objet : c'est le cas type du 404.",
          isadmin: "Droits insuffisants sur un utilisateur pourtant identifié : 403.",
          isauth: "Identité inconnue : 401.",
          g404: "<code>get_object_or_404()</code> attrape <code>DoesNotExist</code> et lève <code>Http404</code> : l'objet demandé n'existe pas. C'est le cas type du 404.",
          valid: "La validation du sérialiseur a rejeté le <b>contenu</b> envoyé : l'adresse était bonne, les données non. 400.",
        },
        explain: "La boucle est complète : une intention devient un verbe et une URL, la réponse revient avec un code, et ce code dit au client quoi faire. C'est le contrat d'une API — DRF ne fait que l'outiller.",
      },
    ];
  }

  PIFrames.widget("statusTriage", function () {
    return { id: "status-triage", masteryTarget: 0.9, frames: frames() };
  });
})();
