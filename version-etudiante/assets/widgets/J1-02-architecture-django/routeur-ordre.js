/*
 * Simulation — le routeur essaie les motifs dans l'ordre.
 *
 * REPRÉSENTATION : `urlpatterns` EST une liste ordonnée, et `resolve()` la parcourt du haut
 * vers le bas en s'arrêtant au premier motif qui correspond. On dessine donc exactement
 * ça : le chemin demandé descend la liste, chaque motif s'allume au moment où il est
 * essayé, et la descente s'arrête net sur celui qui mord. Un motif placé après un motif
 * plus large ne s'allume jamais — l'inatteignabilité se voit, elle ne se raconte pas.
 *
 * CALCULÉ, PAS ÉNUMÉRÉ (test 3) : les motifs sont réellement compilés en expressions
 * régulières et confrontés au chemin saisi. On peut taper n'importe quoi, y compris ce que
 * l'auteur n'avait pas prévu, et obtenir le vrai comportement — y compris la redirection
 * 301 d'APPEND_SLASH, qui relance une seconde résolution.
 *
 * Isomorphe au temps 1 du TP d'instrumentation (`resolve`, `Resolver404`, `APPEND_SLASH`).
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
      else if (k === "onclick") n.addEventListener("click", attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // --- les convertisseurs, tels que Django les définit ----------------------
  var CONVERTISSEURS = {
    int: { re: "[0-9]+", py: function (v) { return parseInt(v, 10); }, type: "int" },
    str: { re: "[^/]+", py: function (v) { return v; }, type: "str" },
    slug: { re: "[-a-zA-Z0-9_]+", py: function (v) { return v; }, type: "str" },
    uuid: { re: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", py: function (v) { return v; }, type: "UUID" },
  };

  function echapper(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /** Compile un motif Django en expression régulière, comme le fait `RoutePattern`. */
  function compiler(motif) {
    var re = "^";
    var noms = [];
    var reste = motif;
    var m;
    while ((m = /<(\w+):(\w+)>/.exec(reste)) !== null) {
      re += echapper(reste.slice(0, m.index));
      var conv = CONVERTISSEURS[m[1]] || CONVERTISSEURS.str;
      re += "(" + conv.re + ")";
      noms.push({ nom: m[2], conv: conv });
      reste = reste.slice(m.index + m[0].length);
    }
    re += echapper(reste) + "$";
    return { re: new RegExp(re), noms: noms };
  }

  var MOTIFS_DEFAUT = [
    { id: "slug", motif: "produits/<slug:slug>/", vue: "ProduitParSlug" },
    { id: "detail", motif: "produits/<int:pk>/", vue: "ProduitDetail" },
    { id: "liste", motif: "produits/", vue: "ProduitListe" },
  ];

  var CHEMINS = [
    "/produits/12/",
    "/produits/clavier-mecanique/",
    "/produits/12",
    "/produits/abc/",
  ];

  /**
   * Le cœur. Renvoie la liste des motifs ESSAYÉS (dans l'ordre), celui qui a mordu, les
   * kwargs typés, et le cas échéant la redirection d'APPEND_SLASH avec sa seconde passe.
   */
  function resoudre(motifs, chemin, appendSlash) {
    function passe(c) {
      var sansSlash = c.replace(/^\//, "");
      var essayes = [];
      for (var i = 0; i < motifs.length; i++) {
        var p = motifs[i];
        var c2 = compiler(p.motif);
        var m = c2.re.exec(sansSlash);
        essayes.push({ id: p.id, ok: !!m });
        if (m) {
          var kwargs = {};
          c2.noms.forEach(function (n, j) { kwargs[n.nom] = { val: n.conv.py(m[j + 1]), type: n.conv.type }; });
          return { essayes: essayes, gagnant: p, kwargs: kwargs };
        }
      }
      return { essayes: essayes, gagnant: null, kwargs: null };
    }

    var r = passe(chemin);
    if (r.gagnant) return { passes: [r], statut: 200, redirige: null, chemin: chemin };

    // APPEND_SLASH : aucun motif ne correspond, mais chemin + « / » en trouverait un.
    if (appendSlash && !/\/$/.test(chemin)) {
      var r2 = passe(chemin + "/");
      if (r2.gagnant) {
        return { passes: [r, r2], statut: 301, redirige: chemin + "/", chemin: chemin };
      }
    }
    return { passes: [r], statut: 404, redirige: null, chemin: chemin };
  }

  // --- la scène ------------------------------------------------------------
  var L = { x: 210, largeur: 560, hLigne: 44, gap: 8, marge: 46 };

  function construireScene(svg, motifs) {
    svg.innerHTML = "";
    var hauteur = L.marge + motifs.length * (L.hLigne + L.gap) + 58;
    svg.setAttribute("viewBox", "0 0 960 " + hauteur);

    svg.appendChild(el("text", { class: "sim-flottant", x: 20, y: 24 },
      [document.createTextNode("urlpatterns — essayés de haut en bas")]));

    var lignes = {};
    motifs.forEach(function (p, i) {
      var y = L.marge + i * (L.hLigne + L.gap);
      var g = el("g", { class: "sim-node", "data-id": p.id });
      g.appendChild(el("rect", {
        class: "sim-node-rect", x: L.x, y: y, width: L.largeur, height: L.hLigne, rx: 9,
      }));
      g.appendChild(el("text", {
        class: "sim-node-text mono gauche", x: L.x + 16, y: y + L.hLigne / 2 + 4,
      }, [document.createTextNode('path("' + p.motif + '")')]));
      g.appendChild(el("text", {
        class: "sim-node-sub droite", x: L.x + L.largeur - 16, y: y + L.hLigne / 2 + 4,
      }, [document.createTextNode(p.vue)]));
      svg.appendChild(g);
      lignes[p.id] = { g: g, y: y };
    });

    var yb = L.marge + motifs.length * (L.hLigne + L.gap);
    var rebut = el("g", { class: "sim-node", "data-id": "__rebut" });
    rebut.appendChild(el("rect", {
      class: "sim-node-rect", x: L.x + 150, y: yb, width: L.largeur - 300, height: 38, rx: 9,
    }));
    rebut.appendChild(el("text", {
      class: "sim-node-text", x: L.x + L.largeur / 2, y: yb + 24,
    }, [document.createTextNode("Resolver404")]));
    svg.appendChild(rebut);

    var etiquette = el("text", { class: "sim-packet-chemin", x: 20, y: L.marge + 26 }, []);
    var paquet = el("circle", { class: "sim-packet", r: 9, cx: -50, cy: -50 });
    svg.appendChild(etiquette);
    svg.appendChild(paquet);

    return { lignes: lignes, rebut: { g: rebut, y: yb }, paquet: paquet, etiquette: etiquette };
  }

  function init(conteneur) {
    conteneur.classList.add("sim-widget");

    var motifs = MOTIFS_DEFAUT.map(function (p) { return { id: p.id, motif: p.motif, vue: p.vue }; });
    var chemin = CHEMINS[0];
    var appendSlash = true;
    var scene = null;
    var raf = null;
    var minuteur = null;

    var svg = el("svg", { class: "sim-svg", preserveAspectRatio: "xMidYMid meet" });
    var stage = h("div", { class: "sim-stage" });
    stage.appendChild(svg);

    var pile = h("div", { class: "sim-pile" });
    var champ = h("input", { class: "sim-champ", type: "text", value: chemin, spellcheck: "false" });
    var slashBtn = h("button", { class: "sim-btn", type: "button" });
    var envoyer = h("button", { class: "sim-btn primary", type: "button", text: "Résoudre" });
    var reinit = h("button", { class: "sim-btn", type: "button", text: "↺ Ordre par défaut" });

    var presets = h("div", { class: "sim-controls" }, CHEMINS.map(function (c) {
      return h("button", {
        class: "sim-btn", type: "button", text: c,
        onclick: function () { champ.value = c; jouer(); },
      });
    }));

    var relEssayes = h("b");
    var relVue = h("b");
    var relKwargs = h("b");
    var relStatut = h("b");
    var readout = h("div", { class: "sim-readout" }, [
      h("span", { text: "motifs essayés " }), relEssayes,
      h("span", { text: "vue " }), relVue,
      h("span", { text: "kwargs " }), relKwargs,
      h("span", { text: "code " }), relStatut,
    ]);

    var journal = h("div", { class: "sim-log" });

    conteneur.appendChild(stage);
    conteneur.appendChild(h("div", { class: "sim-bas" }, [
      pile,
      h("div", { class: "sim-colonne" }, [
        presets,
        h("div", { class: "sim-controls" }, [
          h("span", { class: "sim-label", text: "chemin" }), champ, envoyer, slashBtn, reinit,
        ]),
        readout,
        journal,
      ]),
    ]));

    function log(texte, classe) {
      journal.appendChild(h("div", { class: "sim-log-line " + (classe || "") }, [
        h("span", { class: "t", text: String(journal.childElementCount + 1).padStart(2, "0") }),
        h("span", { class: "m", text: texte }),
      ]));
      journal.scrollTop = journal.scrollHeight;
    }

    function rendrePile() {
      pile.innerHTML = "";
      motifs.forEach(function (p, i) {
        pile.appendChild(h("div", { class: "sim-pile-item", "data-id": p.id }, [
          h("span", { class: "sim-pile-rang", text: String(i + 1) }),
          h("span", { class: "sim-pile-nom", text: 'path("' + p.motif + '")' }),
          h("button", {
            class: "sim-btn", type: "button", text: "↑", title: "monter",
            disabled: i === 0 ? "disabled" : null,
            onclick: function () { permuter(i, i - 1); },
          }),
          h("button", {
            class: "sim-btn", type: "button", text: "↓", title: "descendre",
            disabled: i === motifs.length - 1 ? "disabled" : null,
            onclick: function () { permuter(i, i + 1); },
          }),
        ]));
      });
    }

    function permuter(a, b) {
      var t = motifs[a]; motifs[a] = motifs[b]; motifs[b] = t;
      rendrePile();
      arreter();
      scene = construireScene(svg, motifs);
      log("ordre modifié — " + motifs.map(function (p) { return p.motif; }).join("  puis  "));
    }

    function majSlash() {
      slashBtn.textContent = "APPEND_SLASH = " + (appendSlash ? "True" : "False");
      slashBtn.setAttribute("aria-pressed", appendSlash ? "true" : "false");
    }

    function arreter() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    }

    function jouer() {
      arreter();
      journal.innerHTML = "";
      scene = construireScene(svg, motifs);
      chemin = champ.value.trim() || "/";

      var r = resoudre(motifs, chemin, appendSlash);
      scene.etiquette.textContent = chemin;

      // On aplatit les passes en une suite d'arrêts à animer.
      var arrets = [];
      r.passes.forEach(function (p, ip) {
        p.essayes.forEach(function (e) { arrets.push({ type: "essai", id: e.id, ok: e.ok, passe: ip }); });
        if (!p.gagnant) arrets.push({ type: "rebut", passe: ip });
      });

      var total = r.passes.reduce(function (n, p) { return n + p.essayes.length; }, 0);
      var derniere = r.passes[r.passes.length - 1];
      relEssayes.textContent = total;
      relStatut.textContent = r.statut;
      relStatut.className = r.statut === 200 ? "ok" : (r.statut === 301 ? "alerte" : "mauvais");
      relVue.textContent = derniere.gagnant ? derniere.gagnant.vue : "aucune";
      relVue.className = derniere.gagnant ? "ok" : "mauvais";
      relKwargs.textContent = derniere.kwargs
        ? Object.keys(derniere.kwargs).map(function (k) {
            var v = derniere.kwargs[k];
            return k + "=" + JSON.stringify(v.val) + " (" + v.type + ")";
          }).join(", ")
        : "—";

      var k = 0;
      var passeCourante = 0;
      function suivant() {
        if (k >= arrets.length) {
          if (r.statut === 301) {
            log("301 → " + r.redirige + " · le navigateur redemande : DEUX aller-retours", "alerte");
          } else if (r.statut === 404) {
            log("Resolver404 — aucune vue n'a été appelée", "mauvais");
          } else {
            log("→ " + derniere.gagnant.vue + " reçoit " + relKwargs.textContent, "ok");
          }
          var jamais = motifs.filter(function (p) {
            return !r.passes.some(function (pa) {
              return pa.essayes.some(function (e) { return e.id === p.id; });
            });
          });
          jamais.forEach(function (p) {
            scene.lignes[p.id].g.classList.add("jamais");
            log('path("' + p.motif + '") n\'a même pas été essayé — un motif plus haut a mordu avant', "alerte");
          });
          return;
        }
        var a = arrets[k];
        if (a.passe !== passeCourante) {
          passeCourante = a.passe;
          log("APPEND_SLASH : on réessaie avec « " + chemin + "/ »", "alerte");
          scene.etiquette.textContent = chemin + "/";
          Object.keys(scene.lignes).forEach(function (id) {
            scene.lignes[id].g.setAttribute("class", "sim-node");
          });
        }
        var cible = a.type === "rebut"
          ? { x: L.x + L.largeur / 2, y: scene.rebut.y + 19 }
          : { x: L.x - 26, y: scene.lignes[a.id].y + L.hLigne / 2 };
        var depart = k === 0
          ? { x: L.x - 26, y: 12 }
          : (arrets[k - 1].type === "rebut"
              ? { x: L.x + L.largeur / 2, y: scene.rebut.y + 19 }
              : { x: L.x - 26, y: scene.lignes[arrets[k - 1].id].y + L.hLigne / 2 });

        var t0 = performance.now();
        function pas(t) {
          var u = Math.min(1, (t - t0) / 220);
          scene.paquet.setAttribute("cx", depart.x + (cible.x - depart.x) * u);
          scene.paquet.setAttribute("cy", depart.y + (cible.y - depart.y) * u);
          if (u < 1) { raf = requestAnimationFrame(pas); return; }
          raf = null;
          if (a.type === "essai") {
            var g = scene.lignes[a.id].g;
            g.classList.add(a.ok ? "ok" : "essaye");
            var p = motifs.filter(function (x) { return x.id === a.id; })[0];
            log((a.ok ? "✓ " : "✗ ") + 'path("' + p.motif + '")' + (a.ok ? " — correspond" : ""),
                a.ok ? "ok" : "");
          } else {
            scene.rebut.g.classList.add("hs");
            scene.paquet.setAttribute("class", "sim-packet perdu");
          }
          k++;
          minuteur = setTimeout(suivant, 120);
        }
        raf = requestAnimationFrame(pas);
      }
      suivant();
    }

    champ.addEventListener("keydown", function (e) {
      e.stopPropagation();               // ne pas laisser reveal.js changer de slide
      if (e.key === "Enter") { e.preventDefault(); jouer(); }
    });
    envoyer.addEventListener("click", jouer);
    slashBtn.addEventListener("click", function () {
      appendSlash = !appendSlash;
      majSlash();
      log("APPEND_SLASH = " + appendSlash);
    });
    reinit.addEventListener("click", function () {
      motifs = MOTIFS_DEFAUT.map(function (p) { return { id: p.id, motif: p.motif, vue: p.vue }; });
      rendrePile();
      arreter();
      scene = construireScene(svg, motifs);
      log("ordre par défaut rétabli");
    });

    rendrePile();
    majSlash();
    scene = construireScene(svg, motifs);

    return {
      destroy: function () {
        arreter();
        conteneur.classList.remove("sim-widget");
        conteneur.innerHTML = "";
      },
    };
  }

  window.CourseWidgets = window.CourseWidgets || {};
  window.CourseWidgets.routeurOrdre = {
    init: function (c) { if (this._cur) this._cur.destroy(); this._cur = init(c); },
    destroy: function () { if (this._cur) this._cur.destroy(); this._cur = null; },
    _resoudre: resoudre,
    _motifsDefaut: MOTIFS_DEFAUT,
  };
})();
