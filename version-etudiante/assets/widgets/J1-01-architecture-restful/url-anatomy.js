/*
 * Jeu — « Anatomie d'une URL » (notion : URL)
 *
 * Progression : on nomme les parties une par une (indice complet affiché), on consolide en
 * rangeant les six étiquettes d'un coup, puis on retire les indices pour attaquer ce qui se
 * discrimine mal — port implicite, fragment jamais transmis, `?` vs `&`, chemin relatif — et
 * on termine sur le pont Django (`path()` + slash final).
 */
(function () {
  "use strict";

  var URL_FIL_ROUGE = [
    { id: "scheme", label: "https" },
    { sep: true, label: "://" },
    { id: "host", label: "boutique.ipssi.fr" },
    { id: "port", label: ":8000" },
    { id: "path", label: "/produits/12/" },
    { id: "query", label: "?tri=prix&amp;page=2" },
    { id: "fragment", label: "#avis" },
  ];

  var LEGENDE =
    "<table>" +
    "<tr><th>schéma</th><td>avec quel protocole parler — <code>https</code>, <code>http</code>, <code>ftp</code>…</td></tr>" +
    "<tr><th>hôte</th><td>le nom de la machine à joindre, traduit en adresse IP par le DNS</td></tr>" +
    "<tr><th>port</th><td>quelle application sur cette machine — <code>:8000</code></td></tr>" +
    "<tr><th>chemin</th><td>quelle ressource dans ce serveur — <code>/produits/12/</code></td></tr>" +
    "<tr><th>requête</th><td>les paramètres qui affinent la demande — <code>?tri=prix</code></td></tr>" +
    "<tr><th>fragment</th><td>l'ancre visée dans la page — <code>#avis</code></td></tr>" +
    "</table>";

  function segmentFrame(opts) {
    return {
      id: opts.id,
      label: opts.label,
      cue: opts.cue,
      hintTitle: "Les six parties d'une URL",
      hint: LEGENDE,
      type: "choice",
      layout: "url",
      shuffle: false,
      wide: true,
      prompt: opts.prompt,
      options: URL_FIL_ROUGE,
      answer: opts.answer,
      feedbackFor: opts.feedbackFor,
      explain: opts.explain,
      retry: opts.retry,
    };
  }

  function frames() {
    return [
      // Frame d'ouverture : elle pose le PROBLÈME de la partie (§3 bis) au lieu d'entrer
      // dans l'anatomie. La réponse attendue est un principe — il faut de quoi joindre la
      // machine ET de quoi désigner le document dessus — et non la liste des six parties,
      // que les frames suivantes font découvrir une par une.
      {
        id: "probleme", label: "ce qu'il faut pour désigner", cue: 2,
        type: "choice", wide: true,
        prompt: "Un collègue veut vous faire lire un document qui se trouve sur une machine " +
          "que vous ne connaissez pas. Il ne peut vous écrire qu'<b>une seule ligne de " +
          "texte</b>.<br>Que doit contenir cette ligne pour que ça marche à coup sûr ?",
        options: [
          { id: "ok", label: "De quoi <b>joindre la machine</b>, et de quoi <b>désigner le document</b> dessus" },
          { id: "fichier", label: "Le nom du fichier — le réseau se charge de le retrouver" },
          { id: "ip", label: "L'adresse IP de la machine : elle est unique au monde" },
          { id: "nom", label: "Le nom de la machine ; le reste, elle le devinera" },
        ],
        answer: "ok",
        feedbackFor: {
          fichier: "Aucun annuaire mondial de fichiers n'existe. Le réseau achemine des octets vers une adresse ; il ne cherche rien par son nom.",
          ip: "L'adresse permet d'arriver à la machine — et ensuite ? Une machine héberge des milliers de documents, il faut encore dire lequel.",
          nom: "Une machine ne devine pas : elle sert ce qu'on lui demande. Sans désignation du document, elle n'a aucun moyen de choisir.",
        },
        explain: "Deux choses, indissociables : <b>où</b>, et <b>quoi</b>. Tout le reste d'une URL sert à lever les ambiguïtés qui subsistent une fois ces deux-là fixées.",
        explainAfterError: "Deux choses, indissociables : <b>où</b> — sinon la ligne ne mène nulle part — et <b>quoi</b> — sinon la machine ne sait pas quoi servir.",
      },

      segmentFrame({
        id: "scheme", label: "schéma", cue: 3,
        prompt: "Cliquez le <b>schéma</b> — la partie qui dit <i>quel protocole</i> utiliser.",
        answer: "scheme",
        feedbackFor: {
          host: "C'est le nom de la machine à joindre, pas le protocole employé pour lui parler. Le schéma se trouve tout au début, avant <code>://</code>.",
          port: "<code>:8000</code> désigne l'application à joindre sur cette machine. Le schéma, lui, ouvre l'URL.",
          path: "Le chemin désigne la ressource <i>à l'intérieur</i> du serveur. Le schéma est en tête d'URL.",
          query: "La requête affine la demande une fois le serveur joint. Le schéma est en tête d'URL.",
          fragment: "Le fragment vise un endroit dans la page. Le schéma est en tête d'URL, avant <code>://</code>.",
        },
        explain: "<code>https</code> annonce le protocole. Changez-le et tout change : <code>http</code> (en clair), <code>ftp</code>, <code>mailto:</code>.",
        retry: { prompt: "Reprenons : quelle partie annonce le <b>protocole</b> à utiliser ?" },
      }),

      segmentFrame({
        id: "host", label: "hôte", cue: 3,
        prompt: "Cliquez l'<b>hôte</b> — la machine à joindre.",
        answer: "host",
        feedbackFor: {
          scheme: "<code>https</code> dit comment parler, pas à qui. L'hôte est le nom qui suit <code>://</code>.",
          port: "<code>:8000</code> précise l'application <i>sur</i> la machine ; le nom de la machine le précède.",
          path: "Le chemin ne sort jamais du serveur : c'est une adresse interne. L'hôte est ce qui permet de trouver le serveur lui-même.",
          query: "Les paramètres voyagent <i>vers</i> l'hôte, ils ne le désignent pas.",
          fragment: "Le fragment ne quitte même pas le navigateur.",
        },
        explain: "C'est ce nom que le <b>DNS</b> traduit en adresse IP : première étape de toute requête, avant même la connexion.",
        retry: { prompt: "Reprenons : quelle partie le <b>DNS</b> doit-il traduire en adresse IP ?" },
      }),

      segmentFrame({
        id: "path", label: "chemin", cue: 2,
        prompt: "Cliquez le <b>chemin</b> — la ressource demandée à ce serveur.",
        answer: "path",
        feedbackFor: {
          query: "<code>?tri=prix&amp;page=2</code> affine la demande, mais la ressource visée est ce qui se trouve <i>avant</i> le <code>?</code>.",
          host: "L'hôte désigne le serveur ; le chemin désigne ce qu'on lui demande une fois joint.",
          port: "Le port choisit l'application, pas la ressource.",
          scheme: "Le schéma choisit le protocole, pas la ressource.",
          fragment: "Le fragment désigne un endroit <i>dans</i> la page une fois celle-ci reçue.",
        },
        explain: "Côté Django, c'est cette partie — et elle seule — que <code>urls.py</code> compare à vos <code>path()</code>.",
      }),

      {
        id: "consolidation", label: "les six parties", cue: 2,
        hintTitle: "Les six parties d'une URL", hint: LEGENDE,
        type: "slots", columns: 3,
        prompt: "Rangez maintenant les six noms sur les six parties.",
        slots: [
          { id: "s1", label: "<code>https</code>" },
          { id: "s2", label: "<code>boutique.ipssi.fr</code>" },
          { id: "s3", label: "<code>:8000</code>" },
          { id: "s4", label: "<code>/produits/12/</code>" },
          { id: "s5", label: "<code>?tri=prix&amp;page=2</code>" },
          { id: "s6", label: "<code>#avis</code>" },
        ],
        tokens: [
          { id: "scheme", label: "schéma", slot: "s1" },
          { id: "host", label: "hôte", slot: "s2" },
          { id: "port", label: "port", slot: "s3" },
          { id: "path", label: "chemin", slot: "s4" },
          { id: "query", label: "requête", slot: "s5" },
          { id: "fragment", label: "fragment", slot: "s6" },
        ],
        feedbackFor: {
          "port@s5": "Attention : un port se note <code>:</code> juste après l'hôte. <code>?tri=prix</code>, c'est la chaîne de requête.",
          "query@s6": "<code>#avis</code> commence par <code>#</code> : c'est le fragment. La requête commence par <code>?</code>.",
          "fragment@s5": "Inversion : <code>?</code> ouvre la requête, <code>#</code> ouvre le fragment.",
          scheme: "Le schéma, c'est ce qui précède <code>://</code> : ici <code>https</code>.",
          path: "Le chemin, c'est ce qui suit l'hôte (et son port) et s'arrête au <code>?</code> : <code>/produits/12/</code>.",
          port: "Le port, c'est <code>:8000</code> — le nombre qui suit l'hôte, séparé par deux-points.",
          host: "L'hôte, c'est le nom de domaine seul : <code>boutique.ipssi.fr</code>, sans le port.",
          query: "La requête, c'est tout ce qui suit le <code>?</code>.",
          fragment: "Le fragment, c'est tout ce qui suit le <code>#</code>.",
        },
        explain: "Ordre invariable : <code>schéma://hôte:port/chemin?requête#fragment</code>. Tout ce qui suit est facultatif, mais l'ordre, lui, ne change jamais.",
      },

      {
        id: "port-implicite", label: "port implicite", cue: 2,
        hintTitle: "Rappel", hint: "Un port absent de l'URL n'est pas un port absent de la connexion : le navigateur applique celui du schéma.",
        type: "choice",
        prompt: "Cette URL n'affiche aucun port : <code>https://example.com/produits?id=12#avis</code>.<br>Sur quel port la requête part-elle ?",
        options: [
          { id: "443", label: "443" },
          { id: "80", label: "80" },
          { id: "12", label: "12" },
          { id: "none", label: "Aucun — la connexion échoue" },
        ],
        answer: "443",
        feedbackFor: {
          "80": "80 est le port par défaut de <code>http://</code>. Ici le schéma est <code>https</code> : le défaut est 443.",
          "12": "<code>id=12</code> est un paramètre de requête, pas un port. Un port s'écrit avec deux-points, juste après l'hôte : <code>example.com:12</code>.",
          none: "Une connexion TCP a <i>toujours</i> un port de destination. Quand l'URL n'en donne pas, le navigateur prend celui du schéma.",
        },
        explain: "Port implicite : <code>http</code> → 80, <code>https</code> → 443. En développement, <code>runserver</code> écoute sur 8000 — d'où le <code>:8000</code> qu'il faut alors écrire explicitement.",
      },

      {
        id: "fragment", label: "fragment non transmis", cue: 1,
        hintTitle: "Ce que le serveur reçoit vraiment",
        hint: "<code>GET /produits?id=12 HTTP/1.1</code><br><code>Host: example.com</code><br>…et rien d'autre de l'URL.",
        type: "choice", wide: true,
        prompt: "Une seule de ces parties n'est <b>jamais</b> transmise au serveur. Laquelle ?",
        options: [
          { id: "fragment", label: "le fragment — <code>#avis</code>" },
          { id: "query", label: "la chaîne de requête — <code>?id=12</code>" },
          { id: "path", label: "le chemin — <code>/produits</code>" },
          { id: "port", label: "le port" },
        ],
        answer: "fragment",
        feedbackFor: {
          query: "Elle part bel et bien : elle figure dans la première ligne de la requête (<code>GET /produits?id=12 HTTP/1.1</code>) — c'est même là que Django la lit, via <code>request.GET</code>.",
          path: "Le chemin est le cœur du message : sans lui le serveur ne sait pas quoi servir.",
          port: "Le port n'est pas écrit <i>dans</i> le message HTTP, mais il détermine la connexion TCP : il est bien utilisé.",
        },
        explain: "<code>#avis</code> reste dans le navigateur : il sert à faire défiler la page jusqu'à l'ancre, une fois celle-ci reçue. Conséquence très concrète : <b>aucune vue Django ne peut lire un fragment</b>.",
        retry: {
          prompt: "Votre vue Django doit récupérer une valeur envoyée dans l'URL. Où ne devez-vous surtout pas la mettre ?",
        },
      },

      {
        id: "build-query", label: "construire une requête", cue: 1,
        hintTitle: "Rappel", hint: "<code>?</code> ouvre la chaîne de requête, <code>&amp;</code> sépare les paramètres suivants.",
        type: "build",
        prompt: "Construisez l'URL demandant la <b>page 2</b> du catalogue <b>trié par prix</b>.",
        prefix: "https://boutique.ipssi.fr",
        tokens: [
          { id: "path", label: "/produits/" },
          { id: "q", label: "?" },
          { id: "amp", label: "&amp;" },
          { id: "tri", label: "tri=prix" },
          { id: "page", label: "page=2" },
          { id: "hash", label: "#" },
        ],
        answer: ["path", "q", "tri", "amp", "page"],
        feedbackFor: {
          "amp@1": "Le <b>premier</b> paramètre s'introduit toujours par <code>?</code>. Le <code>&amp;</code> ne sert qu'à séparer les suivants.",
          "q@3": "Un seul <code>?</code> par URL : les paramètres qui suivent s'enchaînent avec <code>&amp;</code>.",
          "hash@0": "<code>#</code> ouvre un fragment — qui ne partira jamais au serveur. Ce n'est pas ainsi qu'on passe des paramètres.",
          hash: "<code>#</code> ouvre un fragment, qui reste dans le navigateur : il ne peut pas transporter de paramètre vers Django.",
          "tri@0": "Il faut d'abord dire <i>quelle ressource</i> : le chemin vient avant tout paramètre.",
          "page@0": "Il faut d'abord dire <i>quelle ressource</i> : le chemin vient avant tout paramètre.",
          "_manque:path": "Il manque le chemin — la ressource visée se déclare avant le <code>?</code>.",
          path: "Le chemin ne se pose qu'<b>une fois</b>, et en premier : c'est lui qui désigne la ressource. Tout ce qui suit le <code>?</code> ne fait que préciser la demande.",
        },
        explain: "<code>/produits/?tri=prix&amp;page=2</code>. Côté Django : <code>request.GET[\"page\"]</code>. Et si une valeur contient un espace ou un accent, elle doit être encodée — <code>chaise de bureau</code> devient <code>chaise%20de%20bureau</code> (ou <code>chaise+de+bureau</code> dans une chaîne de requête).",
      },

      {
        id: "relatif", label: "chemin relatif", cue: 1,
        hintTitle: "Trois écritures à ne pas confondre",
        hint: "<code>galerie/</code> relatif au dossier courant · <code>/galerie/</code> depuis la racine du site · <code>https://…/galerie/</code> absolu.",
        type: "choice", wide: true,
        prompt: "Vous êtes sur <code>https://site.fr/blog/2024/article</code>. Un lien pointe vers <code>../galerie/</code>. Où arrivez-vous ?",
        options: [
          { id: "ok", label: "<code>https://site.fr/blog/galerie/</code>" },
          { id: "sansdotdot", label: "<code>https://site.fr/blog/2024/galerie/</code>" },
          { id: "racine", label: "<code>https://site.fr/galerie/</code>" },
          { id: "brut", label: "<code>https://site.fr/blog/2024/../galerie/</code> — envoyé tel quel" },
        ],
        answer: "ok",
        feedbackFor: {
          sansdotdot: "Ce serait le résultat de <code>galerie/</code> tout court. Le <code>../</code> fait remonter d'un cran avant de descendre.",
          racine: "Ça, c'est <code>/galerie/</code> avec un slash initial : une adresse repartant de la racine du site, qui ignore l'endroit où l'on se trouve.",
          brut: "Le <code>..</code> est résolu par le navigateur <i>avant</i> l'envoi : le serveur ne reçoit jamais de <code>..</code> dans une requête normale.",
        },
        explain: "<code>../galerie/</code> remonte du dossier <code>2024/</code> vers <code>blog/</code>, puis descend : <code>/blog/galerie/</code>. En pratique, on n'écrit jamais ces chemins à la main sous Django — <code>{% url %}</code> et <code>reverse()</code> les génèrent, et restent justes quand <code>urls.py</code> change.",
      },

      {
        id: "django", label: "pont Django", cue: 0,
        type: "free",
        prompt: "<code>urls.py</code> contient <code>path(\"produits/&lt;int:pk&gt;/\", vues.detail)</code>.<br>Écrivez le chemin qui affiche le produit <b>12</b>.",
        prefix: "https://boutique.ipssi.fr",
        placeholder: "/…",
        answers: ["/produits/12/", "produits/12/"],
        feedbackFor: {
          "/produits/12": "Presque — il manque le slash final. Le motif <code>produits/&lt;int:pk&gt;/</code> en attend un ; sans lui Django répond par une redirection 301 vers l'URL avec slash (réglage <code>APPEND_SLASH</code>).",
          "produits/12": "Presque — il manque le slash final. Le motif <code>produits/&lt;int:pk&gt;/</code> en attend un.",
          "/produits/pk/": "<code>&lt;int:pk&gt;</code> est un emplacement à remplir, pas un texte à recopier : la valeur attendue ici est <code>12</code>.",
          "/produits/?pk=12": "Ici <code>pk</code> voyage dans le <b>chemin</b>, pas dans la chaîne de requête — c'est ce que déclare <code>&lt;int:pk&gt;</code>.",
          _defaut: "Lisez le motif littéralement : le texte <code>produits/</code>, puis un entier, puis un <code>/</code>.",
        },
        explain: "<code>/produits/12/</code> : <code>&lt;int:pk&gt;</code> capture <code>12</code> et le passe à la vue en argument. Les deux bouts sont reliés — l'URL du navigateur et la table de routage de Django.",
      },
    ];
  }

  PIFrames.widget("urlAnatomy", function () {
    return { id: "url-anatomy", masteryTarget: 0.9, frames: frames() };
  });
})();
