/*
 * Jeu — « Les trois inventions du Web » (notion : Web mondial)
 *
 * Mécanique : contrefactuel historique. On se place en 1989 — le réseau existe déjà, les
 * trois conventions du CERN non — et l'apprenant PRÉDIT ce qu'un navigateur peut faire
 * avant de le voir. Chaque frame accorde les conventions des frames précédentes : la
 * progression est cumulative.
 *
 * ⚠ Vocabulaire : ce sont des CONVENTIONS, pas des pièces. On ne « retire » pas HTTP d'un
 * système qui tourne — la phrase ne veut rien dire. Une convention peut seulement ne pas
 * exister encore. Le mot « brique », qui suggérait une pièce démontable, est proscrit
 * (voir le LEXIQUE d'outils/banc-redaction.py).
 * Puis on sépare Internet du Web, et on établit qui engage l'échange — préparation du « sans
 * état » de REST.
 *
 * Le jeu s'arrête là volontairement. Il portait une frame `order` sur le cycle d'une requête
 * (nom → adresse → connexion → document) ; elle demandait d'ordonner des étapes dont la
 * moitié n'avait pas encore d'existence dans le cours. L'ordonnancement est désormais dans
 * `boucle-complete.js`, en fin de module, où les cinq notions sont construites.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, children) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function txt(x, y, cls, content) {
    var t = s("text", { x: x, y: y, class: cls });
    t.textContent = content;
    return t;
  }

  // Chaque invention est désignée par le VERBE qu'elle rend possible — plus fort qu'un
  // « où / comment / quoi », et « relier » dit ce que « quoi ? » manquait : l'hyperlien.
  var INVENTIONS = [
    { id: "url", nom: "URL", verbe: "nommer" },
    { id: "http", nom: "HTTP", verbe: "demander" },
    { id: "html", nom: "HTML", verbe: "relier" },
  ];

  // ---------------------------------------------------------------
  // Scène : navigateur ↔ serveur, avec les trois inventions sous le lien
  // ---------------------------------------------------------------
  function scene(el) {
    el.innerHTML = "";
    var svg = s("svg", { viewBox: "0 0 620 190", class: "wi-svg" });
    el.appendChild(svg);

    var casse = null;
    var raf = null;
    var ecran = null, paquet = null;

    function render() {
      svg.innerHTML = "";

      // navigateur
      svg.appendChild(s("rect", { x: 20, y: 20, width: 190, height: 110, rx: 10, class: "wi-box" }));
      svg.appendChild(s("rect", { x: 20, y: 20, width: 190, height: 22, rx: 10, class: "wi-chrome" }));
      svg.appendChild(txt(30, 36, "wi-mini", "◉ ◉ ◉   navigateur"));
      ecran = txt(115, 85, "wi-screen", "prêt");
      ecran.setAttribute("text-anchor", "middle");
      svg.appendChild(ecran);

      // serveur
      svg.appendChild(s("rect", { x: 430, y: 20, width: 170, height: 110, rx: 10, class: "wi-box" }));
      svg.appendChild(txt(515, 60, "wi-label", "serveur"));
      svg.appendChild(txt(515, 88, "wi-mini", "boutique.ipssi.fr"));
      svg.querySelectorAll(".wi-label, .wi-mini").forEach(function (t) {
        if (parseFloat(t.getAttribute("x")) > 400) t.setAttribute("text-anchor", "middle");
      });

      // lien
      svg.appendChild(s("line", { x1: 214, y1: 75, x2: 426, y2: 75, class: "wi-link" + (casse ? " cut" : "") }));

      // les trois inventions, sous le lien
      INVENTIONS.forEach(function (b, i) {
        var x = 232 + i * 62;
        var g = s("g", { class: "wi-invention" + (casse === b.id ? " manquante" : "") });
        g.appendChild(s("rect", { x: x, y: 140, width: 56, height: 40, rx: 8, class: "wi-invention-rect" }));
        var n = txt(x + 28, 158, "wi-invention-nom", b.nom); n.setAttribute("text-anchor", "middle");
        var q = txt(x + 28, 172, "wi-invention-verbe", b.verbe); q.setAttribute("text-anchor", "middle");
        g.appendChild(n); g.appendChild(q);
        if (casse === b.id) {
          g.appendChild(s("line", { x1: x + 6, y1: 146, x2: x + 50, y2: 174, class: "wi-cross" }));
          g.appendChild(s("line", { x1: x + 50, y1: 146, x2: x + 6, y2: 174, class: "wi-cross" }));
        }
        svg.appendChild(g);
      });

      paquet = s("circle", { r: 8, cx: 214, cy: 75, class: "wi-packet" });
      paquet.style.opacity = "0";
      svg.appendChild(paquet);
    }

    function anime(x0, x1, duree, fin) {
      paquet.style.opacity = "1";
      var t0 = null;
      function pas(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / duree);
        paquet.setAttribute("cx", x0 + (x1 - x0) * t);
        if (t < 1) raf = requestAnimationFrame(pas);
        else { raf = null; if (fin) fin(); }
      }
      raf = requestAnimationFrame(pas);
    }

    // Rejoue la scène avec l'invention manquante, jusqu'au point exact où ça casse.
    function rejouer(manquante) {
      if (raf) cancelAnimationFrame(raf);
      casse = manquante;
      render();
      if (manquante === "url") {
        ecran.setAttribute("class", "wi-screen err");
        ecran.textContent = "aucun document à désigner";
        paquet.style.opacity = "0";
        return;
      }
      if (manquante === "http") {
        anime(214, 420, 700, function () {
          paquet.setAttribute("class", "wi-packet err");
          ecran.setAttribute("class", "wi-screen err");
          ecran.textContent = "connecté, mais rien à dire";
        });
        return;
      }
      if (manquante === "html") {
        anime(214, 426, 600, function () {
          anime(426, 214, 600, function () {
            paquet.style.opacity = "0";
            ecran.setAttribute("class", "wi-screen err");
            ecran.textContent = "�?ç%~ ¶ 0x4f…";
          });
        });
        return;
      }
      anime(214, 426, 600, function () {
        anime(426, 214, 600, function () {
          paquet.style.opacity = "0";
          ecran.setAttribute("class", "wi-screen ok");
          ecran.textContent = "page affichée ✓";
        });
      });
    }

    render();

    return {
      onFrame: function (f) {
        if (raf) cancelAnimationFrame(raf);
        casse = null;
        render();
        if (f.invention) {
          casse = f.invention;
          render();
          ecran.textContent = "que va-t-il se passer ?";
        }
      },
      rejouer: rejouer,
      destroy: function () { if (raf) cancelAnimationFrame(raf); el.innerHTML = ""; },
    };
  }

  // Indice tenu en une ligne : trois noms, trois verbes. Le détail est dans les `explain`, et
  // sur la slide de référence — qui vient APRÈS ce jeu (§0) : un indice qui prend trois rangées
  // vole la place des réponses, et la dernière option passe sous le pli.
  var HINT_INVENTIONS =
    "<b>URL</b> nommer &nbsp;·&nbsp; <b>HTTP</b> demander &nbsp;·&nbsp; <b>HTML</b> relier";

  function inventionFrame(o) {
    return {
      id: o.id, label: o.label, cue: o.cue,
      hintTitle: "Les trois inventions", hint: HINT_INVENTIONS,
      type: "choice", wide: true,
      stage: scene, stageId: "scene", invention: o.invention,
      prompt: o.prompt,
      options: o.options, answer: o.answer,
      feedbackFor: o.feedbackFor, explain: o.explain, retry: o.retry,
      onSettle: function (st) { if (st && st.rejouer) st.rejouer(o.invention); },
    };
  }

  function frames() {
    return [
      inventionFrame({
        id: "sans-url", label: "nommer une ressource", cue: 3, invention: "url",
        prompt: "<b>1989.</b> Le réseau relie les machines, mais rien ne permet encore de " +
          "<b>désigner</b> un document situé sur l'une d'elles.<br>" +
          "Que peut faire un navigateur ?",
        options: [
          { id: "rien-ne-part", label: "Rien : impossible de dire <i>quel</i> document, sur <i>quelle</i> machine" },
          { id: "recherche", label: "Il interroge le réseau pour retrouver le document par son titre" },
          { id: "format", label: "Il récupère le document, mais ne sait pas l'afficher" },
          { id: "lent", label: "Il y arrive, en essayant les machines une par une" },
        ],
        answer: "rien-ne-part",
        feedbackFor: {
          recherche: "Il n'existe aucun annuaire de documents : le réseau achemine des octets vers une adresse, il ne cherche rien par son contenu. Le nom doit être <i>donné</i>, il ne peut pas être deviné.",
          format: "C'est ce qui manque quand aucun format n'est convenu — une autre invention, plus tardive. Ici, le document n'est même pas réclamé.",
          lent: "Ce n'est pas une affaire de temps. Même en essayant toutes les machines du réseau, il faudrait encore savoir quel fichier réclamer, et dans quels termes le réclamer.",
        },
        explain: "L'URL est un <b>nom universel</b> : un seul texte qui porte le protocole, la machine et le chemin. Avant elle, désigner un document supposait de connaître à l'avance le système d'en face et ses conventions propres. C'est ce qui rend une ressource <i>citable</i> — et donc, plus tard, reliable.",
        retry: {
          prompt: "Laquelle des trois inventions permet de <b>nommer</b> une ressource, où qu'elle se trouve ?",
          options: [
            { id: "url", label: "L'URL" },
            { id: "http", label: "HTTP" },
            { id: "html", label: "HTML" },
          ],
          answer: "url",
          feedbackFor: {
            http: "HTTP sert à <b>demander</b> une ressource déjà nommée. Sans nom, il n'aurait rien à réclamer.",
            html: "HTML sert à <b>relier</b> des documents déjà obtenus. Il intervient une fois la ressource reçue.",
          },
        },
      }),

      inventionFrame({
        id: "sans-http", label: "demander une ressource", cue: 3, invention: "http",
        prompt: "La ressource a un <b>nom universel</b> et la connexion s'ouvre. Mais client et " +
          "serveur n'ont aucune convention pour <b>formuler une demande</b>.<br>Que se passe-t-il ?",
        options: [
          { id: "muet", label: "La connexion tient, et aucune demande ne peut être exprimée" },
          { id: "introuvable", label: "Le serveur reste introuvable" },
          { id: "spontane", label: "Le serveur envoie spontanément tout ce qu'il possède" },
          { id: "clair", label: "L'échange fonctionne, mais en clair" },
        ],
        answer: "muet",
        feedbackFor: {
          introuvable: "Le nom a fait son travail : la machine est trouvée, la connexion s'ouvre. Ce qui manque vient après — une <i>langue commune</i> pour dire ce qu'on veut.",
          spontane: "Un serveur ne parle jamais le premier. Et il ne saurait pas quoi envoyer : encore faudrait-il s'être mis d'accord sur la façon de formuler une demande.",
          clair: "Le chiffrement est une couche à part — TLS, le « s » de <code>https</code>. Ici ce n'est pas la confidentialité qui manque, c'est la demande elle-même.",
        },
        explain: "HTTP est une <b>grammaire commune</b> : un verbe, un chemin, des en-têtes, un code de retour. Deux programmes qui ne se sont jamais rencontrés savent construire une demande et interpréter une réponse.",
      }),

      inventionFrame({
        id: "sans-html", label: "relier des documents", cue: 2, invention: "html",
        prompt: "La demande est comprise, les octets arrivent. Mais aucun <b>format commun</b> ne " +
          "dit comment les <b>interpréter</b>.<br>Que voit l'utilisateur ?",
        options: [
          { id: "octets", label: "Une suite d'octets : rien à afficher, rien à cliquer" },
          { id: "erreur404", label: "Une erreur 404" },
          { id: "rien-recu", label: "Rien n'arrive du serveur" },
          { id: "texte-ok", label: "Le texte s'affiche, il manque seulement les images" },
        ],
        answer: "octets",
        feedbackFor: {
          erreur404: "404 dirait que la ressource est introuvable. Elle arrive très bien — c'est sa <i>forme</i> que personne ne sait lire.",
          "rien-recu": "C'est ce qui manque quand la ressource n'a pas de nom. Ici la demande part et la réponse revient : c'est à l'interprétation que ça bloque.",
          "texte-ok": "Sans format convenu, rien ne dit que ces octets <i>sont</i> du texte — ni où commence un titre, ni ce qui est cliquable. Et surtout, aucun <b>lien</b> n'existe.",
        },
        explain: "HTML est un <b>format convenu</b>, et sa vraie invention n'est pas la mise en forme : c'est l'<b>hyperlien</b>. Trois documents nommés, réclamables et lisibles restent trois documents isolés. Ce sont les liens qui en font une <i>toile</i>.",
      }),

      {
        id: "internet-web", label: "Internet ≠ Web", cue: 2,
        hintTitle: "La distinction",
        hint: "<b>Internet</b> = le réseau physique et ses protocoles, depuis les années 1970. <b>Le Web</b> = <i>un</i> service qui tourne dessus, inventé en 1989. Le courriel, lui, existait avant le Web.",
        type: "slots", columns: 2,
        prompt: "Rangez chaque élément : relève-t-il d'<b>Internet</b> (le réseau) ou du <b>Web</b> (un service qui l'utilise) ?",
        slots: [
          { id: "net", label: "Internet", sub: "le réseau et ses protocoles" },
          { id: "web", label: "Web", sub: "un service parmi d'autres" },
        ],
        tokens: [
          { id: "smtp", label: "Le courriel (SMTP)", slot: "net" },
          { id: "site", label: "Un site consulté au navigateur", slot: "web" },
          { id: "dns", label: "Le DNS", slot: "net" },
          { id: "ftp", label: "Le transfert de fichiers (FTP)", slot: "net" },
          { id: "lien", label: "Un hyperlien entre deux pages", slot: "web" },
          { id: "cables", label: "Les câbles sous-marins", slot: "net" },
        ],
        feedbackFor: {
          "smtp@web": "Le courriel est plus ancien que le Web (1971 contre 1989) et n'en dépend pas : c'est un autre service d'Internet. Un <i>webmail</i> est une page Web posée par-dessus, ce qui n'est pas la même chose.",
          "dns@web": "Le DNS sert à tout Internet, pas seulement au Web : votre client de messagerie l'utilise aussi pour trouver son serveur.",
          "ftp@web": "FTP est un protocole de transfert antérieur au Web, avec ses propres clients.",
          "cables@web": "Les câbles, c'est l'infrastructure physique du réseau — le Web n'est qu'un usage qui circule dessus.",
          "site@net": "Une page consultée au navigateur, avec ses liens, c'est exactement ce que le Web a apporté <i>en plus</i> d'Internet.",
          "lien@net": "L'hyperlien est l'invention propre au Web : Internet transportait déjà des fichiers, il ne les reliait pas entre eux.",
        },
        explain: "Internet est la <b>route</b>, le Web est <b>un</b> véhicule. La confusion courante vient de ce que le Web a fini par absorber presque tous les autres usages — mais votre API Django parlera bien HTTP <i>sur</i> Internet, pas « sur le Web ».",
      },

      {
        id: "qui-parle", label: "qui engage l'échange", cue: 1,
        hintTitle: "Indice",
        hint: "Comptez le nombre de messages qu'un serveur peut envoyer à un navigateur qui ne lui a rien demandé.",
        type: "choice", wide: true,
        prompt: "Sur le Web, qui engage l'échange ?",
        options: [
          { id: "client", label: "Le client, toujours : le serveur ne fait que répondre" },
          { id: "serveur", label: "Le serveur, qui pousse les pages quand elles changent" },
          { id: "deux", label: "Les deux indifféremment, c'est symétrique" },
          { id: "dns", label: "Le DNS, qui déclenche la connexion" },
        ],
        answer: "client",
        feedbackFor: {
          serveur: "Un serveur ne peut pas joindre un navigateur de lui-même : il ignore où il est, et rien n'écoute de ce côté. Il a fallu <i>inventer</i> des contournements (interrogation régulière, WebSocket, SSE) précisément parce que ce n'est pas possible nativement.",
          deux: "L'échange est délibérément <b>asymétrique</b> : un côté demande, l'autre répond. C'est ce qui permet à un serveur de tenir des milliers de clients.",
          dns: "Le DNS ne fait que traduire un nom en adresse, quand on le lui demande. Il ne déclenche rien.",
        },
        explain: "Une requête, une réponse, et on raccroche. Le serveur ne garde rien entre deux requêtes : c'est le caractère <b>sans état</b> (<i>stateless</i>) que REST érigera en principe — et la raison pour laquelle chaque appel à votre API devra porter lui-même son jeton d'authentification.",
      },
    ];
  }

  PIFrames.widget("webInvention", function () {
    return { id: "web-invention", masteryTarget: 0.9, frames: frames() };
  });
})();
