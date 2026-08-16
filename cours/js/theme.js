/*
 * theme.js — bascule clair/sombre, partagée par toutes les pages du cours.
 *
 * Extrait de `init.js` (qui ne l'utilise plus que par ici) pour que les pages **hors
 * reveal.js** — l'accueil `cours/index.html`, et plus tard les jeux autonomes de
 * `cours/jeux/<slug>/` — s'en servent au lieu de la recopier. C'est ce qu'exige le
 * §4 de `design/jeux/00-contrat-de-design.md` : « extraire la fonction plutôt que la
 * dupliquer ».
 *
 * La clé de stockage est commune (`course-theme`) : le choix suit l'utilisateur d'une
 * page à l'autre, ce qui est le point — basculer en sombre sur l'accueil et retrouver
 * le deck en clair serait un défaut visible en salle.
 *
 * Usage :
 *
 *     CourseTheme.init();                                  // page simple
 *     CourseTheme.init({ onChange: function (t, opts) {     // deck : re-rendre Mermaid
 *       if (!opts || opts.rerenderMermaid !== false) invalidateAllMermaid();
 *     }});
 *
 * À charger AVANT `init.js`.
 */
(function () {
  "use strict";

  var KEY = "course-theme";
  var onChange = null;

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;                       // navigation privée, stockage refusé
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") ||
      (systemPrefersDark() ? "dark" : "light");
  }

  function apply(theme, opts) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* sans stockage, le thème vaut pour la session */ }
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️ Clair" : "🌙 Sombre";
    if (onChange) onChange(theme, opts);
  }

  function init(config) {
    onChange = (config && config.onChange) || null;

    var initial = stored() || (systemPrefersDark() ? "dark" : "light");
    // Au démarrage, on pose le thème sans déclencher le rappel : rien n'est encore
    // rendu, et le deck n'a pas à recalculer ses diagrammes pour l'état initial.
    apply(initial, { rerenderMermaid: false });

    if (document.getElementById("theme-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "theme-toggle";
    btn.type = "button";
    btn.textContent = initial === "dark" ? "☀️ Clair" : "🌙 Sombre";
    btn.addEventListener("click", function () {
      apply(current() === "dark" ? "light" : "dark");
    });
    document.body.appendChild(btn);
  }

  window.CourseTheme = { init: init, apply: apply, current: current, KEY: KEY };
})();
