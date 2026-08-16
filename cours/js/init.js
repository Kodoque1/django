/*
 * init.js — bootstrap du deck : reveal.js, plugins, Mermaid (rendu paresseux + thème),
 * bascule clair/sombre, et montage/démontage des widgets interactifs selon la slide visible.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------
  // Thème clair / sombre
  // ---------------------------------------------------------------
  // ⚠ DIVERGENCE ASSUMÉE avec `archi/cours/js/init.js`, dont ce fichier est par ailleurs
  // une copie : la bascule vit désormais dans `js/theme.js`, pour que les pages hors
  // reveal.js (l'accueil `cours/index.html`, les futurs jeux autonomes) la partagent au
  // lieu de la dupliquer — cf. `design/jeux/00-contrat-de-design.md` §4. Ne PAS écraser
  // ce fichier par la version d'archi sans reporter ce bloc et le <script> de theme.js.

  function initThemeToggle() {
    if (!window.CourseTheme) {
      console.error("theme.js doit être chargé avant init.js");
      return;
    }
    window.CourseTheme.init({
      onChange: function (theme, opts) {
        if (!opts || opts.rerenderMermaid !== false) invalidateAllMermaid();
      },
    });
  }

  // ---------------------------------------------------------------
  // Mermaid — rendu paresseux (slide visible uniquement) + thème
  // ---------------------------------------------------------------

  // Diagrammes Mermaid recolorés aux couleurs IPSSI : thème "base" + themeVariables lues
  // en direct sur les custom properties de theme-ipssi.css (source de vérité unique, pas de
  // hex dupliqués ici). getComputedStyle sur <html> résout déjà la bonne valeur clair/sombre
  // puisque l'attribut data-theme est posé avant tout appel à ces fonctions.
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function mermaidThemeVariables() {
    var fontFamily = '"Segoe UI", "Inter", system-ui, -apple-system, sans-serif';
    var fg = cssVar("--fg", "#1c2333");
    var fgMuted = cssVar("--fg-muted", "#57607a");
    var accent = cssVar("--accent", "#2b4cd6");
    var accent2 = cssVar("--accent-2", "#7c6cf0");
    var bg = cssVar("--bg", "#ffffff");
    var bgAlt = cssVar("--bg-alt", "#f3f5fb");
    var cardBg = cssVar("--card-bg", "#ffffff");
    var cardBorder = cssVar("--card-border", "#e2e6f2");

    return {
      fontFamily: fontFamily,
      background: bgAlt,
      textColor: fg,
      primaryColor: cardBg,
      primaryBorderColor: accent,
      primaryTextColor: fg,
      secondaryColor: bgAlt,
      secondaryBorderColor: accent2,
      tertiaryColor: bgAlt,
      tertiaryBorderColor: cardBorder,
      lineColor: fgMuted,
      mainBkg: cardBg,
      nodeBorder: accent,
      clusterBkg: bgAlt,
      clusterBorder: cardBorder,
      edgeLabelBackground: bg,
      actorBkg: cardBg,
      actorBorder: accent,
      actorTextColor: fg,
      actorLineColor: fgMuted,
      signalColor: fgMuted,
      signalTextColor: fg,
      labelBoxBkgColor: bgAlt,
      labelBoxBorderColor: cardBorder,
      labelTextColor: fg,
      loopTextColor: fgMuted,
      noteBkgColor: bgAlt,
      noteBorderColor: cardBorder,
      noteTextColor: fg,
      activationBkgColor: bgAlt,
      activationBorderColor: accent2,
    };
  }

  function configureMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: mermaidThemeVariables(),
      securityLevel: "loose",
      flowchart: { htmlLabels: true, curve: "basis" },
    });
  }

  function renderMermaidIn(root) {
    if (!root) return;
    var nodes = root.querySelectorAll(".mermaid:not([data-processed])");
    if (!nodes.length) return;

    nodes.forEach(function (el) {
      if (!el.hasAttribute("data-mmd-src")) {
        el.setAttribute("data-mmd-src", el.textContent);
      }
    });

    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    // Sur un rechargement à froid avec lien profond, Reveal peut déclencher "ready" avant que
    // la page n'ait terminé un cycle complet de layout : mermaid.run() mesure alors le texte
    // des labels trop tôt et produit des nœuds trop étroits (texte visuellement tronqué), un
    // bug intermittent qui disparaît dès qu'un re-rendu a lieu (ex. bascule de thème). On laisse
    // deux frames s'écouler avant de lancer le rendu pour laisser le layout se stabiliser.
    fontsReady
      .then(function () {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        });
      })
      .then(function () {
        return mermaid.run({ nodes: Array.prototype.slice.call(nodes) });
      })
      .then(function () {
        nodes.forEach(roundMermaidCorners);
      })
      .catch(function (err) {
        console.error("Erreur de rendu Mermaid :", err);
      });
  }

  // rx/ry en attribut SVG plutôt qu'en CSS (support navigateur plus fiable) pour arrondir les
  // nœuds/acteurs générés par Mermaid et matcher l'arrondi des cartes/panneaux du deck.
  function roundMermaidCorners(el) {
    var svg = el.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".node rect, .cluster rect, .actor").forEach(function (rect) {
      rect.setAttribute("rx", 8);
      rect.setAttribute("ry", 8);
    });
  }

  // Marque tous les diagrammes déjà rendus comme "à re-rendre" avec le nouveau thème.
  // Le rendu effectif n'a lieu que lorsque la slide redevient visible (renderMermaidIn).
  function invalidateAllMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: mermaidThemeVariables(),
      securityLevel: "loose",
      flowchart: { htmlLabels: true, curve: "basis" },
    });

    var processed = document.querySelectorAll(".mermaid[data-processed]");
    processed.forEach(function (el) {
      var src = el.getAttribute("data-mmd-src");
      if (src == null) return;
      el.removeAttribute("data-processed");
      el.innerHTML = src;
    });

    // Re-rendu immédiat de la slide actuellement visible
    if (window.Reveal && Reveal.isReady()) {
      renderMermaidIn(Reveal.getCurrentSlide());
    }
  }

  // ---------------------------------------------------------------
  // Widgets interactifs — montés/démontés selon la slide visible
  // ---------------------------------------------------------------

  function widgetNameFor(slideEl) {
    return slideEl && slideEl.getAttribute ? slideEl.getAttribute("data-widget") : null;
  }

  // Slide actuellement montée : suivie explicitement (plutôt que de se fier à
  // event.previousSlide) pour rester idempotent quand "ready" et "slidechanged" se
  // déclenchent tous les deux sur la même slide au chargement initial d'un lien profond
  // (ex. index.html#/4/2) — sans ce garde-fou, le widget serait monté deux fois et un
  // widget Tangle (qui écrit dans le HTML statique existant plutôt que de le remplacer)
  // se retrouve avec ses valeurs dupliquées ("67 %67 %").
  var mountedSlide = null;

  function mountWidget(slideEl) {
    if (slideEl === mountedSlide) return;
    if (mountedSlide) unmountWidget(mountedSlide);

    var name = widgetNameFor(slideEl);
    if (!name) return;
    var registry = window.CourseWidgets || {};
    var widget = registry[name];
    if (!widget) {
      console.warn("Widget inconnu :", name);
      return;
    }
    var container = slideEl.querySelector("[data-widget-mount]");
    if (!container) {
      console.warn("Point de montage introuvable pour le widget :", name);
      return;
    }
    // Les widgets Tangle écrivent dans le HTML statique existant (spans injectés) plutôt que
    // de remplacer le contenu du conteneur — sans restauration explicite du gabarit d'origine,
    // quitter la slide puis y revenir (destroy() se contente de désactiver l'instance, sans vider
    // le DOM) fait remonter Tangle sur un conteneur déjà traité et duplique les valeurs affichées
    // ("0,95 ms0,95 ms"). On capture le gabarit vierge au premier montage et on le restaure à
    // chaque montage suivant, avant d'appeler init() — sans effet pour les widgets custom qui
    // vident déjà eux-mêmes leur conteneur.
    if (!container.hasAttribute("data-widget-src")) {
      container.setAttribute("data-widget-src", container.innerHTML);
    } else {
      container.innerHTML = container.getAttribute("data-widget-src");
    }
    widget.init(container);
    mountedSlide = slideEl;
  }

  function unmountWidget(slideEl) {
    var name = widgetNameFor(slideEl);
    if (name) {
      var registry = window.CourseWidgets || {};
      var widget = registry[name];
      if (widget) widget.destroy();
    }
    if (mountedSlide === slideEl) mountedSlide = null;
  }

  // ---------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    configureMermaid();

    Reveal.initialize({
      hash: true,
      controls: true,
      progress: true,
      center: false,
      transition: "slide",
      width: 1280,
      height: 720,
      margin: 0.06,
      // ⚠ Indispensable, et pas un détail de confort. En mode « default », la flèche droite
      // ne parcourt que l'axe HORIZONTAL : elle saute toutes les slides verticales — donc
      // tout le contenu, puisque chaque partie est une pile verticale — et se bloque sur
      // l'intercalaire de la dernière partie. Le deck paraît vide et cassé. En « linear »,
      // gauche/droite parcourent les slides dans l'ordre de lecture, comme la barre d'espace.
      navigationMode: "linear",
      plugins: [RevealHighlight, RevealNotes],
    });

    Reveal.on("ready", function (event) {
      renderMermaidIn(event.currentSlide);
      mountWidget(event.currentSlide);
    });

    Reveal.on("slidechanged", function (event) {
      renderMermaidIn(event.currentSlide);
      mountWidget(event.currentSlide);
    });
  });
})();
