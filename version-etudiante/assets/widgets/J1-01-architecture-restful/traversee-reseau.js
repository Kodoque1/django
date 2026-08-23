/*
 * Simulation — d'un hôte à l'autre : encapsuler, découper, traverser, décapsuler.
 *
 * Vient APRÈS le jeu « Emballer, envoyer, déballer », qui fait construire l'emboîtement
 * couche par couche et l'ordre de déballage. Ce que la simulation ajoute, et que le jeu
 * n'a pas : les DEUX hôtes, le découpage en segments, la traversée du lien, la perte — et
 * le coût chiffré de tout cela.
 *
 * CALCULÉ, PAS ÉNUMÉRÉ (test 3) : le nombre de segments, la taille de chacun, les octets
 * réellement posés sur le câble et le surcoût se déduisent de la charge, du transport choisi
 * et de la perte éventuelle. Personne n'a écrit ces cas — la fragmentation apparaît d'elle-même
 * dès qu'on dépasse le MSS, et la réémission recalcule le coût.
 *
 * LISIBLE SANS TEXTE (test 4) : la largeur des enveloppes est proportionnelle aux octets ; le
 * découpage se VOIT (un bloc devient trois) ; et la différence TCP/UDP se voit aussi — sur
 * perte, le segment TCP repart, le segment UDP ne revient jamais.
 *
 * ⚠ Deux erreurs de représentation ont été corrigées ici, à ne pas réintroduire :
 *   · l'hôte B était dessiné pile INVERSÉE (Accès réseau en haut), si bien que la
 *     décapsulation descendait l'écran au lieu de le remonter ;
 *   · comme le lien se trace sur la dernière rangée de chaque colonne, il se retrouvait
 *     branché sur la couche APPLICATION de B. Le dessin affirmait quelque chose de faux.
 *   Les deux piles se dessinent donc dans le même sens, Application en haut, et le trajet
 *   sur B monte.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, enfants) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function h(tag, attrs, enfants) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // --- le modèle -----------------------------------------------------------
  // Tailles conformes aux RFC, sans options : TCP 20 o, UDP 8 o, IPv4 20 o,
  // Ethernet II 14 o d'en-tête + 4 o de FCS. MTU 1500 — d'où le MSS de 1460, chiffre
  // que l'étudiant recroisera partout.
  var ENTETES = { tcp: 20, udp: 8, ip: 20, eth: 18 };
  var MTU = 1500;

  var COUCHES = [
    { id: "app", nom: "Application", pdu: "données" },
    { id: "transport", nom: "Transport", pdu: "segment" },
    { id: "internet", nom: "Internet", pdu: "paquet" },
    { id: "acces", nom: "Accès réseau", pdu: "trame" },
  ];

  /**
   * @param perdu index du segment perdu sur le lien, ou null.
   *
   * La différence TCP/UDP n'est PAS la taille d'en-tête — 12 octets d'écart, invisibles.
   * C'est ici qu'elle se joue : sur perte, TCP réémet (le câble paie un segment de plus, et
   * B reçoit tout), UDP abandonne (le câble ne paie rien, et B reçoit moins).
   */
  function calculer(charge, transport, perdu) {
    var ht = ENTETES[transport];
    var mss = MTU - ENTETES.ip - ht;
    var nb = Math.max(1, Math.ceil(charge / mss));
    var parSegment = ht + ENTETES.ip + ENTETES.eth;

    var tailles = [], reste = charge;
    for (var i = 0; i < nb; i++) {
      var t = Math.min(mss, reste);
      tailles.push(t);
      reste -= t;
    }

    var cable = charge + nb * parSegment;
    var reemissions = 0;
    var remis = charge;
    if (perdu != null && perdu < nb) {
      if (transport === "tcp") {
        reemissions = 1;
        cable += tailles[perdu] + parSegment;   // le segment repasse en entier
      } else {
        remis = charge - tailles[perdu];        // personne ne le redemande
      }
    }

    return {
      mss: mss, segments: nb, tailles: tailles, cable: cable,
      surcout: (cable - remis) / cable,
      entetes: { transport: ht, internet: ENTETES.ip, acces: ENTETES.eth },
      parSegment: parSegment, reemissions: reemissions, remis: remis,
    };
  }

  // --- la scène ------------------------------------------------------------
  var L = {
    hLigne: 38, gap: 6, margeY: 18,
    aX: 14, bX: 806, colL: 140,
    blocA: 300, blocB: 660, blocMax: 300,
    fileX: 176,                             // la file d'attente des segments non encore émis
  };

  function yCouche(i) { return L.margeY + i * (L.hLigne + L.gap); }
  function iCouche(id) {
    for (var i = 0; i < COUCHES.length; i++) if (COUCHES[i].id === id) return i;
    return 0;
  }

  function construireScene(svg) {
    svg.innerHTML = "";
    var hauteur = L.margeY * 2 + COUCHES.length * (L.hLigne + L.gap) + 18;
    svg.setAttribute("viewBox", "0 0 960 " + hauteur);

    function colonne(x, titre, aligne) {
      var g = el("g", {});
      // ⚠ `.sim-flottant` n'impose pas de `text-anchor` : sans classe explicite, le texte
      // DÉMARRE au x donné et le titre de l'hôte B sortait du viewBox.
      g.appendChild(el("text", {
        class: "sim-flottant " + aligne, y: 12,
        x: aligne === "droite" ? x + L.colL : x,
      }, [document.createTextNode(titre)]));
      var els = {};
      // Les DEUX colonnes dans le même sens : Application en haut, Accès réseau en bas.
      COUCHES.forEach(function (c, i) {
        var y = yCouche(i);
        var gg = el("g", { class: "sim-node", "data-id": c.id });
        gg.appendChild(el("rect", { class: "sim-node-rect", x: x, y: y, width: L.colL, height: L.hLigne, rx: 8 }));
        gg.appendChild(el("text", { class: "sim-node-text", x: x + L.colL / 2, y: y + 16 },
          [document.createTextNode(c.nom)]));
        gg.appendChild(el("text", { class: "sim-node-sub", x: x + L.colL / 2, y: y + 29 },
          [document.createTextNode(c.pdu)]));
        svg.appendChild(gg);
        els[c.id] = gg;
      });
      svg.appendChild(g);
      return els;
    }

    var bas = yCouche(COUCHES.length - 1) + L.hLigne / 2;
    // Le lien physique, entre les deux couches d'accès réseau — qui sont maintenant toutes
    // deux sur la dernière rangée.
    svg.appendChild(el("line", {
      class: "sim-edge", x1: L.aX + L.colL, y1: bas, x2: L.bX, y2: bas, "stroke-dasharray": "6 5",
    }));

    var aEls = colonne(L.aX, "hôte A · il emballe", "gauche");
    var bEls = colonne(L.bX, "hôte B · il déballe", "droite");

    var file = el("g", { class: "tr-file" });
    var bloc = el("g", { class: "sim-bloc" });
    svg.appendChild(file);
    svg.appendChild(bloc);

    return { aEls: aEls, bEls: bEls, bloc: bloc, file: file, bas: bas };
  }

  /**
   * Dessine un PDU de `taille` octets utiles à (cx, cy) avec `n` enveloppes posées.
   * L'échelle est **adaptative** : le bloc complet occupe toujours `echelle × blocMax`, si
   * bien que les proportions INTERNES sont exactes et lisibles quelle que soit la charge.
   * C'est ce rapport-là qui enseigne, pas la taille absolue du dessin.
   */
  function dessinerBloc(g, cx, cy, n, r, taille, echelle, classe) {
    var total = taille + r.entetes.transport + r.entetes.internet + r.entetes.acces;
    var px = (L.blocMax * (echelle || 1)) / total;
    var couches = [
      { cls: "acces", octets: r.entetes.acces },
      { cls: "internet", octets: r.entetes.internet },
      { cls: "transport", octets: r.entetes.transport },
    ];
    var dedans = taille;
    var pose = couches.slice(3 - n);
    pose.forEach(function (c) { dedans += c.octets; });

    var hb = 30 * (echelle || 1);
    var courant = dedans * px;
    pose.forEach(function (c) {
      g.appendChild(el("rect", {
        class: "sim-enveloppe sim-env-" + c.cls + (classe ? " " + classe : ""),
        x: cx - courant / 2, y: cy - hb / 2, width: courant, height: hb, rx: 5,
      }));
      courant -= c.octets * px;
    });
    g.appendChild(el("rect", {
      class: "sim-enveloppe sim-charge" + (classe ? " " + classe : ""),
      x: cx - courant / 2, y: cy - hb / 2 + 4 * (echelle || 1),
      width: Math.max(1.5, courant), height: hb - 8 * (echelle || 1), rx: 3,
    }));
    if (courant > 34 && !echelle) {
      g.appendChild(el("text", { class: "sim-bloc-txt", x: cx, y: cy + 4 },
        [document.createTextNode(taille + " o")]));
    }
  }

  function init(conteneur) {
    conteneur.classList.add("sim-widget");

    var charge = 120;
    var transport = "tcp";
    var perteArmee = false;
    var scene = null, raf = null, minuteur = null;

    var svg = el("svg", { class: "sim-svg", preserveAspectRatio: "xMidYMid meet" });
    var stage = h("div", { class: "sim-stage" });
    stage.appendChild(svg);

    var curseur = h("input", { class: "sim-range", type: "range", min: "1", max: "4000", value: "120", step: "1" });
    var valeur = h("b", { text: "120 o" });
    var transportBtn = h("button", { class: "sim-btn", type: "button" });
    var perteBtn = h("button", { class: "sim-btn", type: "button" });
    var envoyer = h("button", { class: "sim-btn primary", type: "button", text: "Envoyer" });

    var relSeg = h("b"), relCable = h("b"), relSur = h("b"), relRemis = h("b");
    var readout = h("div", { class: "sim-readout" }, [
      h("span", { text: "segments " }), relSeg,
      h("span", { text: "sur le câble " }), relCable,
      h("span", { text: "surcoût " }), relSur,
      h("span", { text: "remis à B " }), relRemis,
    ]);
    var journal = h("div", { class: "sim-log" });

    conteneur.appendChild(stage);
    conteneur.appendChild(h("div", { class: "sim-bas simple" }, [
      h("div", { class: "sim-controls" }, [
        h("span", { class: "sim-label", text: "charge utile" }),
        h("span", { class: "sim-slider" }, [curseur, valeur]),
        transportBtn, perteBtn, envoyer,
      ]),
      readout,
      h("div", { class: "sim-legend" }, [
        h("span", {}, [h("i", { class: "sim-env-transport" }), document.createTextNode("en-tête transport")]),
        h("span", {}, [h("i", { class: "sim-env-internet" }), document.createTextNode("en-tête IP")]),
        h("span", {}, [h("i", { class: "sim-env-acces" }), document.createTextNode("en-tête Ethernet")]),
        h("span", {}, [h("i", { class: "sim-charge" }), document.createTextNode("charge utile")]),
      ]),
      journal,
    ]));

    function log(texte, classe) {
      journal.appendChild(h("div", { class: "sim-log-line " + (classe || "") }, [
        h("span", { class: "t", text: String(journal.childElementCount + 1).padStart(2, "0") }),
        h("span", { class: "m", text: texte }),
      ]));
      journal.scrollTop = journal.scrollHeight;
    }

    function arreter() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    }

    function perdu() {
      // On perd toujours le DERNIER segment : déterministe, donc rejouable devant la classe,
      // et c'est celui qui porte le reste — donc celui dont l'absence se voit le mieux.
      if (!perteArmee) return null;
      return Math.max(0, calculer(charge, transport, null).segments - 1);
    }

    function majReleve() {
      var r = calculer(charge, transport, perdu());
      relSeg.textContent = r.segments + (r.reemissions ? " (+1 réémis)" : "");
      relSeg.className = r.segments > 1 ? "alerte" : "";
      relCable.textContent = r.cable + " o";
      relSur.textContent = Math.round(r.surcout * 100) + " %";
      relSur.className = r.surcout > 0.5 ? "mauvais" : (r.surcout > 0.15 ? "alerte" : "ok");
      relRemis.textContent = r.remis + " o";
      relRemis.className = r.remis < charge ? "mauvais" : "ok";
      return r;
    }

    function majBoutons() {
      transportBtn.textContent = transport === "tcp" ? "transport : TCP" : "transport : UDP";
      transportBtn.setAttribute("aria-pressed", transport === "udp" ? "true" : "false");
      perteBtn.textContent = perteArmee ? "réseau : perd un segment" : "réseau : fiable";
      perteBtn.setAttribute("aria-pressed", perteArmee ? "true" : "false");
    }

    function eteindre() {
      COUCHES.forEach(function (c) {
        scene.aEls[c.id].classList.remove("actif");
        scene.bEls[c.id].classList.remove("actif");
      });
    }

    function allumer(hote, couche) {
      eteindre();
      (hote === "a" ? scene.aEls : scene.bEls)[couche].classList.add("actif");
    }

    // Les segments encore à émettre, dessinés en petit dans le couloir : c'est ce qui rend
    // le découpage VISIBLE, et non plus seulement chiffré dans le relevé.
    function dessinerFile(r, restants) {
      scene.file.innerHTML = "";
      restants.forEach(function (idx, k) {
        var y = yCouche(COUCHES.length - 1) + L.hLigne / 2 - 26 - k * 18;
        dessinerBloc(scene.file, L.fileX, y, 3, r, r.tailles[idx], 0.28, "attente");
      });
    }

    function anime(g, de, vers, duree, dessine, fin) {
      var t0 = performance.now();
      function pas(t) {
        var u = Math.min(1, (t - t0) / duree);
        g.innerHTML = "";
        dessine(de.x + (vers.x - de.x) * u, de.y + (vers.y - de.y) * u);
        if (u < 1) { raf = requestAnimationFrame(pas); return; }
        raf = null;
        minuteur = setTimeout(fin, 90);
      }
      raf = requestAnimationFrame(pas);
    }

    function jouer() {
      arreter();
      journal.innerHTML = "";
      scene = construireScene(svg);
      var iPerdu = perdu();
      var r = majReleve();
      var yBas = yCouche(COUCHES.length - 1) + L.hLigne / 2;

      log("A · " + charge + " o de données à envoyer");

      // ---- 1. la charge descend de Application à Transport ----
      function descenteAppTransport() {
        allumer("a", "app");
        anime(scene.bloc,
          { x: L.blocA, y: yCouche(0) + L.hLigne / 2 },
          { x: L.blocA, y: yCouche(1) + L.hLigne / 2 }, 340,
          function (x, y) { dessinerBloc(scene.bloc, x, y, 0, r, charge); },
          function () {
            allumer("a", "transport");
            if (r.segments > 1) {
              // Ne pas escamoter l'en-tête de transport sous prétexte qu'on découpe :
              // chaque segment le porte, et c'est lui qui fixe le MSS.
              log("A · " + transport.toUpperCase() + " découpe " + charge + " o en "
                  + r.segments + " segments de " + r.mss + " o au plus, et ajoute "
                  + r.entetes.transport + " o d'en-tête à chacun", "alerte");
            } else {
              log("A · " + transport.toUpperCase() + " ajoute " + r.entetes.transport + " o d'en-tête");
            }
            decoupe();
          });
      }

      // ---- 2. le découpage : un bloc devient N ----
      function decoupe() {
        scene.bloc.innerHTML = "";
        var yT = yCouche(1) + L.hLigne / 2;
        r.tailles.forEach(function (t, i) {
          var dx = (i - (r.segments - 1) / 2) * (L.blocMax / Math.max(1, r.segments) + 8);
          dessinerBloc(scene.bloc, L.blocA + dx, yT, 1, r, t,
            r.segments > 1 ? 1 / r.segments : 1);
        });
        minuteur = setTimeout(function () {
          scene.bloc.innerHTML = "";
          envoiSegment(0);
        }, r.segments > 1 ? 700 : 260);
      }

      // ---- 3. chaque segment : descente, traversée, remontée ----
      function envoiSegment(i, reemission) {
        if (i >= r.segments) { remontageFinal(); return; }
        var taille = r.tailles[i];
        var restants = [];
        for (var k = i + 1; k < r.segments; k++) restants.push(k);
        dessinerFile(r, restants);

        var etiquette = r.segments > 1 ? "segment " + (i + 1) + "/" + r.segments : "le segment";

        // descente Transport → Internet → Accès réseau, une enveloppe par couche
        var descente = [
          { couche: "internet", n: 2, y: yCouche(2) + L.hLigne / 2 },
          { couche: "acces", n: 3, y: yCouche(3) + L.hLigne / 2 },
        ];
        var d = 0;
        function pasDescente() {
          if (d >= descente.length) { traversee(); return; }
          var e = descente[d];
          var deY = d === 0 ? yCouche(1) + L.hLigne / 2 : descente[d - 1].y;
          allumer("a", e.couche);
          if (!reemission) {
            log("A · " + (e.couche === "internet" ? "IP" : "Ethernet") + " ajoute "
                + (e.couche === "internet" ? r.entetes.internet : r.entetes.acces) + " o d'en-tête");
          }
          anime(scene.bloc, { x: L.blocA, y: deY }, { x: L.blocA, y: e.y }, 300,
            function (x, y) { dessinerBloc(scene.bloc, x, y, e.n, r, taille); },
            function () { d++; pasDescente(); });
        }

        function traversee() {
          eteindre();
          var perteIci = (iPerdu === i) && !reemission;
          var arrivee = perteIci ? (L.blocA + L.blocB) / 2 : L.blocB;
          anime(scene.bloc, { x: L.blocA, y: yBas }, { x: arrivee, y: yBas },
            perteIci ? 420 : 620,
            function (x, y) {
              dessinerBloc(scene.bloc, x, y, 3, r, taille, 1, perteIci ? "perdu" : null);
            },
            function () {
              if (perteIci) { perteDuSegment(i, taille, etiquette); return; }
              log("le lien · " + etiquette + " — " + (taille + r.parSegment) + " o de trame"
                  + (reemission ? " (réémis)" : ""));
              remonteeB(i, taille, etiquette);
            });
        }
        pasDescente();
      }

      // ---- la perte : c'est ICI que TCP et UDP cessent de se ressembler ----
      function perteDuSegment(i, taille, etiquette) {
        scene.bloc.innerHTML = "";
        if (transport === "tcp") {
          log("le lien · " + etiquette + " perdu — aucun accusé de réception", "mauvais");
          minuteur = setTimeout(function () {
            log("A · TCP ne voit rien revenir : il réémet le segment", "alerte");
            envoiSegment(i, true);
          }, 620);
        } else {
          log("le lien · " + etiquette + " perdu — UDP n'attend aucun accusé, "
              + "personne ne le redemande", "mauvais");
          minuteur = setTimeout(function () { envoiSegment(i + 1); }, 500);
        }
      }

      // ---- 4. remontée sur B : de Accès réseau vers Transport, en RETIRANT ----
      function remonteeB(i, taille, etiquette) {
        // À l'arrivée sur une couche, c'est l'en-tête de la couche du DESSOUS qui vient
        // d'être retiré. Rien n'est retiré à l'arrivée de la trame elle-même.
        var montee = [
          { couche: "acces", n: 3, retire: null },
          { couche: "internet", n: 2, retire: "Ethernet" },
          { couche: "transport", n: 1, retire: "IP" },
        ];
        var m = 0;
        function pasMontee() {
          if (m >= montee.length) { minuteur = setTimeout(function () { envoiSegment(i + 1); }, 120); return; }
          var e = montee[m];
          var idx = iCouche(e.couche);
          var deY = m === 0 ? yBas : yCouche(iCouche(montee[m - 1].couche)) + L.hLigne / 2;
          allumer("b", e.couche);
          if (e.retire) log("B · " + e.retire + " retire son en-tête");
          anime(scene.bloc, { x: L.blocB, y: deY }, { x: L.blocB, y: yCouche(idx) + L.hLigne / 2 }, 300,
            function (x, y) { dessinerBloc(scene.bloc, x, y, e.n, r, taille); },
            function () { m++; pasMontee(); });
        }
        pasMontee();
      }

      // ---- 5. réassemblage au transport, puis remise à l'application ----
      function remontageFinal() {
        scene.file.innerHTML = "";
        allumer("b", "transport");
        if (r.segments > 1 && r.remis === charge) {
          log("B · Transport remet les " + r.segments + " segments bout à bout");
        }
        anime(scene.bloc,
          { x: L.blocB, y: yCouche(1) + L.hLigne / 2 },
          { x: L.blocB, y: yCouche(0) + L.hLigne / 2 }, 340,
          function (x, y) { dessinerBloc(scene.bloc, x, y, 0, r, r.remis); },
          function () {
            eteindre();
            if (r.remis < charge) {
              log("B · " + r.remis + " o remis à l'application sur " + charge
                  + " — il manque un segment, et rien ne le dira jamais", "mauvais");
            } else if (r.reemissions) {
              log("B · " + charge + " o remis à l'application — complets, au prix d'un "
                  + "segment envoyé deux fois", "ok");
            } else {
              log("B · " + charge + " o remis à l'application — identiques à ce qui est parti", "ok");
            }
          });
      }

      descenteAppTransport();
    }

    curseur.addEventListener("input", function () {
      charge = parseInt(curseur.value, 10);
      valeur.textContent = charge + " o";
      majReleve();
    });
    transportBtn.addEventListener("click", function () {
      transport = transport === "tcp" ? "udp" : "tcp";
      majBoutons();
      majReleve();
    });
    perteBtn.addEventListener("click", function () {
      perteArmee = !perteArmee;
      majBoutons();
      majReleve();
    });
    envoyer.addEventListener("click", jouer);

    majBoutons();
    scene = construireScene(svg);
    var r0 = majReleve();
    dessinerBloc(scene.bloc, L.blocA, yCouche(0) + L.hLigne / 2, 0, r0, charge);

    return {
      destroy: function () {
        arreter();
        conteneur.classList.remove("sim-widget");
        conteneur.innerHTML = "";
      },
    };
  }

  window.CourseWidgets = window.CourseWidgets || {};
  window.CourseWidgets.traverseeReseau = {
    init: function (c) { if (this._cur) this._cur.destroy(); this._cur = init(c); },
    destroy: function () { if (this._cur) this._cur.destroy(); this._cur = null; },
    _calculer: calculer,
  };
})();
