/*
 * Jeu — « Emballer, envoyer, déballer » (notion : suite de protocoles Internet)
 *
 * Mécanique : la requête HTTP descend la pile, et l'apprenant pose lui-même l'en-tête de
 * chaque couche. La scène montre l'emballage s'épaissir à mesure — l'encapsulation devient
 * visible au lieu d'être un schéma à mémoriser. On trie ensuite les protocoles par couche
 * (le piège du DNS), on établit le rôle du port face à l'IP, on éprouve TCP contre UDP sur
 * une perte de paquet, puis on remonte la pile côté serveur jusqu'à Django.
 */
(function () {
  "use strict";

  var h = PIFrames.h;

  var COUCHES = [
    { id: "app", nom: "Application", pdu: "données", ex: "HTTP, DNS, SMTP" },
    { id: "transport", nom: "Transport", pdu: "segment", ex: "TCP, UDP" },
    { id: "internet", nom: "Internet", pdu: "paquet", ex: "IP" },
    { id: "acces", nom: "Accès réseau", pdu: "trame", ex: "Ethernet, Wi-Fi, ARP" },
  ];

  var ENTETES = {
    transport: { court: "TCP · port 443", cls: "ts-h-transport" },
    internet: { court: "IP · 93.184.216.34", cls: "ts-h-internet" },
    acces: { court: "Ethernet · aa:bb:cc", cls: "ts-h-acces" },
  };

  // ---------------------------------------------------------------
  // Scène 1 : la pile, et l'emballage qui s'épaissit
  // ---------------------------------------------------------------
  function pileStage(el) {
    el.innerHTML = "";
    var wrap = h("div", { class: "ts-stage" });
    var colonne = h("div", { class: "ts-couches" });
    var couchesEls = {};
    COUCHES.forEach(function (c) {
      var e = h("div", { class: "ts-couche", "data-id": c.id }, [
        h("b", { text: c.nom }),
        h("span", { class: "ts-pdu", text: c.pdu }),
      ]);
      couchesEls[c.id] = e;
      colonne.appendChild(e);
    });
    var paquet = h("div", { class: "ts-paquet" });
    wrap.appendChild(colonne);
    wrap.appendChild(paquet);
    el.appendChild(wrap);

    function dessiner(posees) {
      // Emballage imbriqué : la charge utile HTTP au centre, un en-tête de plus par couche
      // traversée — l'ordre de lecture de gauche à droite est celui du câble.
      var coeur = h("div", { class: "ts-charge", text: "GET /produits/ HTTP/1.1" });
      var courant = coeur;
      ["transport", "internet", "acces"].forEach(function (k) {
        if (posees.indexOf(k) === -1) return;
        var e = ENTETES[k];
        courant = h("div", { class: "ts-enveloppe " + e.cls }, [
          h("span", { class: "ts-entete", text: e.court }),
          courant,
        ]);
      });
      paquet.innerHTML = "";
      paquet.appendChild(courant);
    }

    return {
      onFrame: function (f) {
        Object.keys(couchesEls).forEach(function (k) {
          couchesEls[k].classList.toggle("active", k === f.couche);
          couchesEls[k].classList.toggle("faite", (f.posees || []).indexOf(k) !== -1);
        });
        dessiner(f.posees || []);
      },
      poser: function (couche) {
        var lu = paquet.querySelectorAll(".ts-enveloppe").length;
        dessiner(["transport", "internet", "acces"].slice(0, lu + 1));
        paquet.firstChild.classList.add("neuve");
      },
      destroy: function () { el.innerHTML = ""; },
    };
  }

  // ---------------------------------------------------------------
  // Scène 2 : perte d'un segment, TCP contre UDP
  // ---------------------------------------------------------------
  function perteStage(el) {
    el.innerHTML = "";
    var wrap = h("div", { class: "ts-perte" });
    var timers = [];
    function voie(titre, cls) {
      var pistes = h("div", { class: "ts-voie-pistes" });
      var v = h("div", { class: "ts-voie " + cls }, [h("b", { text: titre }), pistes]);
      wrap.appendChild(v);
      return pistes;
    }
    var tcp = voie("TCP — le tuyau fiable", "tcp");
    var udp = voie("UDP — le tuyau sans garantie", "udp");
    el.appendChild(wrap);

    function remplir(pistes, mode) {
      pistes.innerHTML = "";
      var recu = h("div", { class: "ts-recu" });
      [1, 2, 3, 4].forEach(function (n) {
        var perdu = n === 3;
        var seg = h("span", { class: "ts-seg" + (perdu ? " perdu" : ""), text: String(n) });
        pistes.appendChild(seg);
      });
      pistes.appendChild(recu);
      var t = setTimeout(function () {
        if (mode === "tcp") {
          var rej = h("span", { class: "ts-seg renvoi", text: "3" });
          pistes.appendChild(h("span", { class: "ts-flag", text: "↻ réémission" }));
          pistes.appendChild(rej);
          recu.textContent = "reçu : 1 2 3 4 — complet, un peu plus tard";
          recu.className = "ts-recu ok";
        } else {
          pistes.appendChild(h("span", { class: "ts-flag", text: "✗ rien n'est redemandé" }));
          recu.textContent = "reçu : 1 2 _ 4 — le trou reste";
          recu.className = "ts-recu ko";
        }
      }, 700);
      timers.push(t);
    }

    return {
      onFrame: function () { tcp.innerHTML = ""; udp.innerHTML = ""; },
      rejouer: function () { remplir(tcp, "tcp"); remplir(udp, "udp"); },
      destroy: function () {
        timers.forEach(clearTimeout);
        el.innerHTML = "";
      },
    };
  }

  var HINT_COUCHES =
    "<table>" +
    "<tr><th>Application</th><td>le message utile — <code>HTTP</code>, DNS, SMTP</td></tr>" +
    "<tr><th>Transport</th><td>quelle <b>application</b> sur la machine, et avec quelles garanties — <code>TCP</code>/<code>UDP</code>, ports</td></tr>" +
    "<tr><th>Internet</th><td>quelle <b>machine</b> sur le réseau mondial — <code>IP</code></td></tr>" +
    "<tr><th>Accès réseau</th><td>quelle <b>carte</b> sur le lien local — Ethernet, Wi-Fi, adresses MAC</td></tr>" +
    "</table>";

  function frames() {
    return [
      {
        id: "transport", label: "couche transport", cue: 3,
        hintTitle: "Les quatre couches du modèle TCP/IP", hint: HINT_COUCHES,
        type: "choice", stage: pileStage, stageId: "pile",
        couche: "transport", posees: [],
        prompt: "La requête <code>GET /produits/</code> descend d'une couche. Quel en-tête la couche <b>Transport</b> ajoute-t-elle ?",
        options: [
          { id: "port", label: "Un numéro de <b>port</b> — <code>443</code>" },
          { id: "ip", label: "Une adresse <b>IP</b> — <code>93.184.216.34</code>" },
          { id: "mac", label: "Une adresse <b>MAC</b> — <code>aa:bb:cc:dd:ee:ff</code>" },
          { id: "url", label: "L'<b>URL</b> complète" },
        ],
        answer: "port",
        feedbackFor: {
          ip: "L'adresse IP est ajoutée à la couche <b>en dessous</b> (Internet). Le transport, lui, ne se demande pas <i>quelle machine</i> mais <i>quelle application sur la machine</i>.",
          mac: "L'adresse MAC est ajoutée tout en bas, par la couche Accès réseau, et elle change à chaque tronçon du trajet.",
          url: "L'URL est déjà consommée : le chemin est parti dans la requête HTTP, l'hôte a été traduit par le DNS. Il ne reste plus d'URL à transporter.",
        },
        explain: "TCP ajoute un port <b>source</b> et un port <b>destination</b>. Le segment est né.",
        onSettle: function (st) { if (st && st.poser) st.poser("transport"); },
      },

      {
        id: "internet", label: "couche internet", cue: 2,
        hintTitle: "Rappel", hint: HINT_COUCHES,
        type: "choice", stage: pileStage, stageId: "pile",
        couche: "internet", posees: ["transport"],
        prompt: "Une couche plus bas : qu'ajoute la couche <b>Internet</b> ?",
        options: [
          { id: "ip", label: "Les adresses <b>IP</b> source et destination" },
          { id: "port2", label: "Un second port, pour la route" },
          { id: "mac2", label: "L'adresse <b>MAC</b> du serveur distant" },
          { id: "rien", label: "Rien : le segment part tel quel" },
        ],
        answer: "ip",
        feedbackFor: {
          port2: "Les ports appartiennent au transport, et il n'y en a qu'une paire. Ici la question est : <i>quelle machine</i> dans le monde ?",
          mac2: "Piège classique : on ne connaît <b>jamais</b> l'adresse MAC d'une machine distante. Une MAC n'a de sens que sur le lien local — celle qu'on utilisera est celle du routeur de sortie.",
          rien: "Sans adresse IP, aucun routeur ne saurait où aiguiller : le paquet ne sortirait pas du réseau local.",
        },
        explain: "IP rend le paquet <b>routable</b> de bout en bout. C'est la seule couche vraiment mondiale : elle traverse tous les réseaux intermédiaires sans changer.",
        onSettle: function (st) { if (st && st.poser) st.poser("internet"); },
      },

      {
        id: "tri-protocoles", label: "protocoles par couche", cue: 2,
        hintTitle: "Rappel", hint: HINT_COUCHES,
        type: "slots", columns: 4,
        prompt: "Rangez chaque protocole à sa couche.",
        slots: COUCHES.map(function (c) { return { id: c.id, label: c.nom, sub: c.pdu }; }),
        tokens: [
          { id: "http", label: "HTTP", slot: "app" },
          { id: "dns", label: "DNS", slot: "app" },
          { id: "tcp", label: "TCP", slot: "transport" },
          { id: "udp", label: "UDP", slot: "transport" },
          { id: "ip", label: "IP", slot: "internet" },
          { id: "arp", label: "ARP", slot: "acces" },
          { id: "eth", label: "Ethernet", slot: "acces" },
        ],
        feedbackFor: {
          "dns@transport": "Piège classique. Le DNS <i>utilise</i> UDP (ou TCP) pour voyager, mais c'est lui-même un service applicatif : un client interroge un serveur DNS comme il interrogerait une API.",
          "dns@internet": "Le DNS ne route rien : il traduit des noms. Il s'appuie sur les couches du dessous comme n'importe quelle application.",
          dns: "Le DNS est une <b>application</b> : il voyage <i>dans</i> UDP ou TCP, il n'en fait pas partie.",
          "arp@internet": "ARP traduit une adresse IP en adresse MAC <i>sur le lien local</i> : il sert la couche d'accès réseau, il n'achemine rien à travers Internet.",
          "udp@app": "UDP est un moyen de transport, pas un message : il ne dit rien du contenu, seulement qu'on l'envoie sans garantie.",
          "http@transport": "HTTP est le message lui-même — le verbe, le chemin, les en-têtes. Le transport ne fait que le convoyer.",
          http: "HTTP est un protocole <b>applicatif</b> : c'est le contenu de ce que TCP transporte.",
          tcp: "TCP est un protocole de <b>transport</b> : c'est lui qui numérote les segments, réclame ce qui manque et désigne l'application par son port.",
          ip: "IP est la couche <b>Internet</b> : la seule adresse qui a un sens de bout en bout, celle sur laquelle les routeurs décident.",
          eth: "Ethernet, c'est le lien physique local : la couche la plus basse du modèle.",
          udp: "UDP est un protocole de <b>transport</b>, comme TCP — mais sans accusé de réception ni remise en ordre. Il convoie, il ne dit rien du contenu.",
          arp: "ARP travaille sur le <b>lien local</b> : il traduit une adresse IP en adresse MAC pour la machine d'à côté. Il ne traverse aucun routeur.",
        },
        explain: "Chaque couche ne connaît que sa voisine. HTTP ignore tout de TCP, TCP ignore tout du contenu HTTP — c'est cette indépendance qui a permis de faire passer HTTP/3 sur UDP sans réécrire le Web.",
      },

      {
        id: "ip-vs-port", label: "IP contre port", cue: 1,
        hintTitle: "Indice", hint: "Vous avez deux onglets ouverts sur le même site, sur la même machine. Comment les réponses ne se mélangent-elles pas ?",
        type: "choice", wide: true,
        prompt: "Si l'adresse IP identifie déjà la machine, à quoi sert encore le <b>port</b> ?",
        options: [
          { id: "appli", label: "À désigner <b>l'application</b> visée sur cette machine" },
          { id: "vitesse", label: "À choisir la vitesse de la connexion" },
          { id: "secu", label: "À chiffrer l'échange" },
          { id: "route", label: "À choisir la route que suivront les paquets" },
        ],
        answer: "appli",
        feedbackFor: {
          vitesse: "Le numéro de port n'a aucun effet sur le débit : c'est une simple étiquette de destination interne à la machine.",
          secu: "Le chiffrement est l'affaire de TLS. Le port 443 est <i>par convention</i> celui de HTTPS, mais rien n'y chiffre quoi que ce soit tout seul.",
          route: "Le routage se décide sur l'adresse IP. Les routeurs intermédiaires n'ont pas à ouvrir le segment TCP.",
        },
        explain: "IP = <b>quelle machine</b>, port = <b>quelle application sur cette machine</b>. Deux onglets sur le même site utilisent deux ports <i>source</i> différents : c'est ce qui permet à votre système de rendre chaque réponse au bon onglet. Et c'est pourquoi <code>runserver</code> vous demande un port : plusieurs projets Django peuvent cohabiter sur <code>127.0.0.1</code>.",
      },

      {
        id: "perte", label: "TCP contre UDP", cue: 1,
        hintTitle: "Indice", hint: "TCP numérote ce qu'il envoie et attend un accusé de réception pour chaque segment. UDP n'attend rien.",
        type: "choice", wide: true, stage: perteStage, stageId: "perte",
        prompt: "Une requête HTTP/1.1 voyage sur TCP. Un segment se perd en chemin. Que reçoit Django ?",
        options: [
          { id: "complet", label: "La requête complète, avec un peu de retard : TCP a redemandé le segment manquant" },
          { id: "tronque", label: "Une requête tronquée, à laquelle il manque un bout" },
          { id: "err500", label: "Une erreur 500" },
          { id: "rien", label: "Rien : la requête est définitivement perdue" },
        ],
        answer: "complet",
        feedbackFor: {
          tronque: "TCP ne livre jamais un flux à trous : il garde les segments reçus, réclame le manquant et ne remet à l'application que du continu, dans l'ordre. Django ne <i>peut pas</i> voir une requête tronquée par le réseau.",
          err500: "500 est un code applicatif, produit par le serveur quand <i>son</i> code plante. Une perte réseau est réparée bien en dessous, sans que l'application en sache rien.",
          rien: "Ce serait le comportement d'UDP. TCP, lui, réémet jusqu'à réception ou expiration du délai.",
        },
        explain: "C'est tout le sens de « fiable » : TCP masque les pertes, le désordre et les doublons. Le prix, c'est l'attente. UDP fait l'inverse — il livre vite et laisse les trous, ce qui convient à la voix ou au jeu… et c'est justement sur UDP que <b>HTTP/3</b> a été rebâti, avec QUIC pour rétablir la fiabilité autrement.",
        onSettle: function (st) { if (st && st.rejouer) st.rejouer(); },
      },

      {
        id: "remontee", label: "désencapsulation", cue: 0,
        type: "order",
        prompt: "Le paquet arrive sur le serveur. Cliquez les quatre opérations de <b>déballage</b> dans l'ordre.",
        items: [
          { id: "eth", label: "Retirer l'en-tête Ethernet et vérifier l'adresse MAC" },
          { id: "ip", label: "Lire l'en-tête IP : ce paquet est-il bien pour moi ?" },
          { id: "tcp", label: "Lire le port <code>8000</code> et remettre les octets dans l'ordre" },
          { id: "http", label: "Remettre la requête HTTP complète à Django" },
        ],
        feedbackFor: {
          "http@0": "On déballe dans l'ordre inverse de l'emballage : la requête HTTP est au <b>centre</b>, c'est donc la dernière atteinte.",
          "tcp@0": "L'en-tête TCP est encore enfermé dans l'en-tête IP, lui-même dans la trame Ethernet. On ouvre de l'extérieur vers l'intérieur.",
          "ip@0": "Avant l'IP, il y a l'emballage du lien local : c'est lui qu'on retire en premier.",
          eth: "Ethernet, c'est l'emballage le plus extérieur : il ne peut être retiré qu'une fois, au tout début.",
          ip: "L'en-tête IP est sous la trame Ethernet et par-dessus TCP : il se lit en <b>deuxième</b>, une fois le lien local retiré.",
          tcp: "TCP vient après IP : on ne sait à quel port remettre les octets qu'une fois le paquet reconnu comme destiné à cette machine.",
          http: "La requête HTTP est au <b>centre</b> de l'emballage : c'est la dernière atteinte, quand toutes les couches ont été retirées.",
        },
        explain: "Déballage strictement inverse de l'emballage : chaque couche retire <i>son</i> en-tête et passe le reste au-dessus. Le serveur applique le même modèle que le client, en sens inverse.",
        explainAfterError: "De l'extérieur vers l'intérieur : Ethernet, puis IP, puis TCP, puis HTTP. On déballe toujours dans l'ordre inverse de l'emballage.",
      },

      {
        id: "django-pile", label: "pont Django", cue: 0,
        type: "choice", wide: true,
        prompt: "Dans quelle couche votre code Django travaille-t-il ?",
        options: [
          { id: "app", label: "Application uniquement — il reçoit une requête HTTP déjà reconstituée" },
          { id: "apptransport", label: "Application et transport : c'est Django qui ouvre les connexions TCP" },
          { id: "toutes", label: "Toutes : Django gère la pile de bout en bout" },
          { id: "transport", label: "Transport : Django écoute sur le port 8000" },
        ],
        answer: "app",
        feedbackFor: {
          apptransport: "Non : l'ouverture, le maintien et la fiabilité des connexions TCP sont l'affaire du <b>système d'exploitation</b>. Django reçoit un objet <code>HttpRequest</code> déjà constitué.",
          toutes: "Aucun cadre applicatif ne descend jusqu'aux couches basses : c'est justement l'intérêt du modèle en couches — vous écrivez des vues, pas des pilotes réseau.",
          transport: "C'est le serveur (<code>runserver</code>, Gunicorn, Nginx) qui tient la socket sur le port 8000, via le système. Votre vue, elle, ne voit qu'une requête déjà déballée.",
        },
        explain: "Vous ne codez qu'en <b>couche application</b>. Entre la socket et votre vue, il y a un serveur (Gunicorn) et une convention d'appel (WSGI/ASGI) qui traduit la requête HTTP en objet Python. Tout le reste de la pile est déjà fait pour vous — mais quand un bug survient, savoir <i>dans quelle couche</i> il se produit vous fait gagner des heures.",
      },
    ];
  }

  PIFrames.widget("tcpipStack", function () {
    return { id: "tcpip-stack", masteryTarget: 0.9, frames: frames() };
  });
})();
