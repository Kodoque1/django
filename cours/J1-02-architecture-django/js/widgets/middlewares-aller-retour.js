/*
 * Simulation — les middlewares, à l'aller et au retour.
 *
 * ⚠ Le mot « oignon » est proscrit (LEXIQUE d'outils/banc-redaction.py). C'était une
 * métaphore importée, et elle contredisait la ligne suivante : un middleware n'est pas
 * COMME des pelures, c'est littéralement un appel de fonction imbriqué. Le nom décrit
 * désormais ce qu'on voit — la requête descend, la réponse remonte.
 *
 * REPRÉSENTATION (contrat de design §2 bis) : ce n'est pas une métaphore. Un middleware
 * Django est littéralement un appel de fonction imbriqué —
 *
 *     def __call__(self, request):
 *         # … aller
 *         reponse = self.get_response(request)   # ← tout le reste se passe ICI
 *         # … retour
 *         return reponse
 *
 * — donc on dessine ce qui se passe vraiment : la requête DESCEND la pile, atteint la vue,
 * et REMONTE en repassant par chaque couche dans l'ordre inverse. Un middleware qui ne
 * rappelle pas `get_response` fait demi-tour : c'est visible sans le moindre libellé
 * (test 4), et les couches du dessous ne sont jamais atteintes.
 *
 * CALCULÉ, PAS ÉNUMÉRÉ (test 3) : le trajet est déduit de l'ordre courant et de l'état de
 * la requête. Avec 5 middlewares réordonnables et un badge, il y a 120 trajets possibles ;
 * personne ne les a écrits à la main.
 *
 * Isomorphe au temps 2 du TP d'instrumentation, où l'étudiant écrit la sonde en Python.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, enfants) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) {
        n.setAttribute(k, attrs[k]);
      }
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function h(tag, attrs, enfants) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "onclick") n.addEventListener("click", attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // --- le modèle -----------------------------------------------------------
  // Chaque couche déclare ce qu'elle fait à l'aller et au retour. `coupe` est une
  // fonction : c'est elle qui décide si la couche court-circuite, en regardant la requête.
  var CATALOGUE = [
    {
      id: "security", nom: "SecurityMiddleware", court: "Security",
      aller: "force HTTPS, pose les en-têtes de sécurité",
      retour: null,
    },
    {
      id: "session", nom: "SessionMiddleware", court: "Session",
      aller: "lit le cookie de session",
      retour: "réécrit le cookie si la session a changé",
    },
    {
      id: "common", nom: "CommonMiddleware", court: "Common",
      aller: "APPEND_SLASH : redirige si le slash manque",
      retour: null,
    },
    {
      id: "videur", nom: "Videur (le vôtre)", court: "Videur",
      aller: "exige ?badge=ok",
      retour: null,
      coupe: function (req) { return !req.badge; },
      raison: "403 — pas de badge, et le Videur ne rappelle pas get_response()",
    },
    {
      id: "chrono", nom: "Chrono (le vôtre)", court: "Chrono",
      aller: "démarre le chronomètre",
      retour: "pose l'en-tête X-Duree-ms",
    },
  ];

  var ORDRE_DEFAUT = ["security", "session", "common", "videur", "chrono"];

  function parId(id) {
    for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].id === id) return CATALOGUE[i];
    return null;
  }

  /**
   * Le cœur : déduit le trajet de l'ordre courant et de la requête.
   * Rien n'est pré-écrit — c'est cette fonction qui rend la simulation falsifiable.
   */
  function calculer(ordre, req) {
    var etapes = [];
    var coupeA = -1;
    for (var i = 0; i < ordre.length; i++) {
      var mw = parId(ordre[i]);
      etapes.push({ i: i, sens: "aller", mw: mw });
      if (mw.coupe && mw.coupe(req)) { coupeA = i; break; }
    }
    var vue = coupeA === -1;
    if (vue) etapes.push({ i: ordre.length, sens: "vue", mw: null });
    var jusqua = coupeA === -1 ? ordre.length - 1 : coupeA;
    for (var j = jusqua; j >= 0; j--) {
      etapes.push({ i: j, sens: "retour", mw: parId(ordre[j]) });
    }
    return {
      etapes: etapes,
      vue: vue,
      coupePar: coupeA === -1 ? null : parId(ordre[coupeA]),
      statut: vue ? 200 : 403,
      // L'en-tête n'existe que si Chrono a vu passer la réponse au RETOUR.
      duree: etapes.some(function (e) { return e.sens === "retour" && e.mw && e.mw.id === "chrono"; }),
    };
  }

  // --- la scène ------------------------------------------------------------
  var L = { x0: 150, largeur: 660, hBande: 46, hVue: 40, gap: 6, marge: 14 };

  function construireScene(svg, ordre) {
    svg.innerHTML = "";
    var n = ordre.length;
    var hauteur = L.marge * 2 + n * (L.hBande + L.gap) + L.hVue;
    svg.setAttribute("viewBox", "0 0 960 " + hauteur);

    var bandes = {};
    ordre.forEach(function (id, i) {
      var mw = parId(id);
      var y = L.marge + i * (L.hBande + L.gap);
      // Les couches s'emboîtent : chacune est plus étroite que celle du dessus.
      var retrait = i * 26;
      var g = el("g", { class: "sim-node", "data-id": id });
      g.appendChild(el("rect", {
        class: "sim-node-rect", x: L.x0 + retrait, y: y,
        width: L.largeur - retrait * 2, height: L.hBande, rx: 9,
      }));
      g.appendChild(el("text", {
        class: "sim-node-text gauche", x: L.x0 + retrait + 14, y: y + L.hBande / 2 + 4,
      }, [document.createTextNode(mw.court)]));
      g.appendChild(el("text", {
        class: "sim-node-sub droite", x: L.x0 + L.largeur - retrait - 14, y: y + L.hBande / 2 + 4,
      }, [document.createTextNode(mw.aller)]));
      svg.appendChild(g);
      bandes[id] = { g: g, y: y, retrait: retrait };
    });

    var yv = L.marge + n * (L.hBande + L.gap);
    var gv = el("g", { class: "sim-node", "data-id": "__vue" });
    gv.appendChild(el("rect", {
      class: "sim-node-rect cible", x: L.x0 + n * 26, y: yv,
      width: L.largeur - n * 52, height: L.hVue, rx: 9,
    }));
    gv.appendChild(el("text", {
      class: "sim-node-text", x: 480, y: yv + L.hVue / 2 + 4,
    }, [document.createTextNode("la vue")]));
    svg.appendChild(gv);

    var paquet = el("circle", { class: "sim-packet", r: 9, cx: -50, cy: -50 });
    svg.appendChild(paquet);

    var etiquette = el("text", { class: "sim-flottant", x: 40, y: L.marge + 24 }, []);
    svg.appendChild(etiquette);

    return { bandes: bandes, vue: { g: gv, y: yv }, paquet: paquet, etiquette: etiquette, hauteur: hauteur };
  }

  // Où se trouve le paquet à une étape donnée : à gauche quand il descend, à droite
  // quand il remonte. C'est ce simple décalage qui rend le demi-tour lisible.
  function position(scene, ordre, etape) {
    if (etape.sens === "vue") {
      return { x: 480, y: scene.vue.y + L.hVue / 2 };
    }
    var b = scene.bandes[ordre[etape.i]];
    var dedans = 26;
    return {
      x: etape.sens === "aller" ? L.x0 + b.retrait + dedans : L.x0 + L.largeur - b.retrait - dedans,
      y: b.y + L.hBande / 2,
    };
  }

  function init(conteneur) {
    conteneur.classList.add("sim-widget");

    var ordre = ORDRE_DEFAUT.slice();
    var req = { badge: false };
    var scene = null;
    var raf = null;
    var minuteur = null;

    var svg = el("svg", { class: "sim-svg", preserveAspectRatio: "xMidYMid meet" });
    var stage = h("div", { class: "sim-stage" });
    stage.appendChild(svg);

    var liste = h("div", { class: "sim-pile" });
    var badgeBtn = h("button", { class: "sim-btn", type: "button" });
    var envoyer = h("button", { class: "sim-btn primary", type: "button", text: "Envoyer la requête" });
    var reinit = h("button", { class: "sim-btn", type: "button", text: "↺ Ordre par défaut" });

    var relStatut = h("b");
    var relEtapes = h("b");
    var relVue = h("b");
    var relDuree = h("b");
    var readout = h("div", { class: "sim-readout" }, [
      h("span", { text: "code " }), relStatut,
      h("span", { text: "étapes traversées " }), relEtapes,
      h("span", { text: "vue atteinte " }), relVue,
      h("span", { text: "X-Duree-ms " }), relDuree,
    ]);

    var journal = h("div", { class: "sim-log" });

    // La pile n'est pas une invention du widget : c'est la liste `MIDDLEWARE` de settings.py.
    // Sans ce titre ni la légende ci-dessous, l'écran montre cinq noms et quatre chiffres dont
    // rien ne dit ce qu'ils sont — et la version étudiante n'a aucune note orateur pour le
    // rattraper.
    var titrePile = h("div", { class: "sim-titre", html:
      "<code>settings.MIDDLEWARE</code>" +
      "<em>le premier de la liste voit la requête en premier, et la réponse en dernier</em>" });

    var legende = h("div", { class: "sim-legend" }, [
      h("span", { html: "<b>étapes traversées</b> chaque passage dans une couche, aller et retour" }),
      h("span", { html: "<b>vue atteinte</b> le code de la vue a-t-il tourné" }),
      h("span", { html: "<b>X-Duree-ms</b> l'en-tête que pose Chrono, s'il voit la réponse" }),
    ]);

    var bas = h("div", { class: "sim-bas" }, [
      h("div", { class: "sim-colonne" }, [titrePile, liste]),
      h("div", { class: "sim-colonne" }, [
        h("div", { class: "sim-controls" }, [badgeBtn, envoyer, reinit]),
        readout,
        legende,
        journal,
      ]),
    ]);

    conteneur.appendChild(stage);
    conteneur.appendChild(bas);

    function log(texte, classe) {
      var ligne = h("div", { class: "sim-log-line " + (classe || "") }, [
        h("span", { class: "t", text: String(journal.childElementCount + 1).padStart(2, "0") }),
        h("span", { class: "m", text: texte }),
      ]);
      journal.appendChild(ligne);
      journal.scrollTop = journal.scrollHeight;
    }

    function rendreListe() {
      liste.innerHTML = "";
      ordre.forEach(function (id, i) {
        var mw = parId(id);
        liste.appendChild(h("div", { class: "sim-pile-item", "data-id": id }, [
          h("span", { class: "sim-pile-rang", text: String(i + 1) }),
          h("span", { class: "sim-pile-nom", text: mw.nom }),
          h("button", {
            class: "sim-btn", type: "button", text: "↑", title: "monter",
            disabled: i === 0 ? "disabled" : null,
            onclick: function () { permuter(i, i - 1); },
          }),
          h("button", {
            class: "sim-btn", type: "button", text: "↓", title: "descendre",
            disabled: i === ordre.length - 1 ? "disabled" : null,
            onclick: function () { permuter(i, i + 1); },
          }),
        ]));
      });
    }

    function permuter(a, b) {
      var t = ordre[a]; ordre[a] = ordre[b]; ordre[b] = t;
      rendreListe();
      redessiner();
      log("ordre modifié : " + ordre.map(function (i) { return parId(i).court; }).join(" → "));
    }

    function majBadge() {
      badgeBtn.textContent = req.badge ? "requête : ?badge=ok" : "requête : sans badge";
      badgeBtn.setAttribute("aria-pressed", req.badge ? "true" : "false");
    }

    function redessiner() {
      arreter();
      scene = construireScene(svg, ordre);
    }

    function arreter() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    }

    function jouer() {
      arreter();
      journal.innerHTML = "";
      redessiner();

      var r = calculer(ordre, req);
      var points = r.etapes.map(function (e) {
        return { p: position(scene, ordre, e), e: e };
      });

      relStatut.textContent = r.statut;
      relStatut.className = r.vue ? "ok" : "mauvais";
      relEtapes.textContent = r.etapes.length;
      relVue.textContent = r.vue ? "oui" : "non";
      relVue.className = r.vue ? "ok" : "mauvais";
      relDuree.textContent = r.duree ? "présent" : "absent";
      relDuree.className = r.duree ? "ok" : "alerte";

      var k = 0;
      function segment() {
        if (k >= points.length) {
          // Ce qui n'a JAMAIS été atteint doit se voir sans lire un mot (test 4 du contrat) :
          // c'est tout l'intérêt du court-circuit, et la raison pour laquelle l'ordre compte.
          var vus = {};
          r.etapes.forEach(function (e) { if (e.mw) vus[e.mw.id] = true; });
          ordre.forEach(function (id) {
            if (!vus[id]) {
              scene.bandes[id].g.classList.add("jamais");
              log(parId(id).court + " n'a jamais été atteint", "alerte");
            }
          });
          if (!r.vue) {
            scene.vue.g.classList.add("jamais");
            log("la vue n'a jamais été atteinte", "mauvais");
          }
          if (!r.duree) {
            log("X-Duree-ms absent : Chrono n'a pas vu passer la réponse", "alerte");
          }
          return;
        }
        var depart = k === 0 ? { x: 40, y: L.marge + L.hBande / 2 } : points[k - 1].p;
        var arrivee = points[k].p;
        var etape = points[k].e;
        var t0 = performance.now();
        var duree = 260;

        Object.keys(scene.bandes).forEach(function (id) {
          scene.bandes[id].g.classList.remove("actif");
        });
        scene.vue.g.classList.remove("actif");
        if (etape.sens === "vue") scene.vue.g.classList.add("actif");
        else scene.bandes[ordre[etape.i]].g.classList.add("actif");

        var mw = etape.mw;
        if (etape.sens === "aller") {
          scene.paquet.setAttribute("class", "sim-packet");
          if (mw.coupe && mw.coupe(req)) {
            scene.bandes[mw.id].g.classList.add("hs");
            log(mw.court + " ✋ " + mw.raison, "mauvais");
          } else {
            log(mw.court + " → " + mw.aller);
          }
        } else if (etape.sens === "vue") {
          log("la vue répond 200", "ok");
        } else {
          scene.paquet.setAttribute("class", "sim-packet " + (r.vue ? "ok" : "perdu"));
          log(mw.court + " ← " + (mw.retour || "laisse passer la réponse"),
              mw.id === "chrono" ? "ok" : "");
        }

        function pas(t) {
          var u = Math.min(1, (t - t0) / duree);
          scene.paquet.setAttribute("cx", depart.x + (arrivee.x - depart.x) * u);
          scene.paquet.setAttribute("cy", depart.y + (arrivee.y - depart.y) * u);
          if (u < 1) { raf = requestAnimationFrame(pas); return; }
          raf = null;
          k++;
          minuteur = setTimeout(segment, 90);
        }
        raf = requestAnimationFrame(pas);
      }
      segment();
    }

    badgeBtn.addEventListener("click", function () {
      req.badge = !req.badge;
      majBadge();
      log("requête " + (req.badge ? "avec" : "sans") + " badge");
    });
    envoyer.addEventListener("click", jouer);
    reinit.addEventListener("click", function () {
      ordre = ORDRE_DEFAUT.slice();
      rendreListe();
      redessiner();
      log("ordre par défaut rétabli");
    });

    rendreListe();
    majBadge();
    redessiner();

    return {
      destroy: function () {
        arreter();
        conteneur.classList.remove("sim-widget");
        conteneur.innerHTML = "";
      },
    };
  }

  window.CourseWidgets = window.CourseWidgets || {};
  window.CourseWidgets.middlewaresAllerRetour = {
    init: function (c) {
      if (this._cur) this._cur.destroy();
      this._cur = init(c);
    },
    destroy: function () {
      if (this._cur) this._cur.destroy();
      this._cur = null;
    },
    // Exposé pour le banc : le test 3 du contrat exige de prouver que l'état est CALCULÉ.
    _calculer: calculer,
    _ordreDefaut: ORDRE_DEFAUT,
  };
})();
