/*
 * tangle-kit-lite.js
 * Petit kit de composants réactifs pour Tangle.js (vanilla JS, sans MooTools).
 * Fournit : nombre ajustable (drag / clavier / dblclick), menu déroulant, barre de mesure,
 * et quelques formatteurs français (durée, entier avec séparateur de milliers, %, ms).
 *
 * Usage dans le HTML :
 *   <span class="TKAdjustableNumber" data-var="requests" data-min="1" data-max="10000000" data-step="1000" data-dragunit="1000" data-format="intFormat"></span>
 *   (attention : les attributs data-* composés doivent être écrits SANS tiret, ex. "dragunit" et non "drag-unit",
 *    car Tangle expose l'option telle quelle dans options[nomSansData-])
 *   <span class="TKDropdown" data-var="tierIndex" data-options="0,1,2,3" data-labels="RAM locale|SSD local|DB (même datacenter)|DB (région distante)"></span>
 *   <span class="TKMeter" data-var="effectiveLatencyMs" data-min="0" data-max="10"></span>
 *   <span class="tk-output" data-var="totalLabel"></span>
 */
(function () {
  "use strict";

  if (typeof Tangle === "undefined") {
    console.error("tangle-kit-lite: Tangle.js doit être chargé avant ce fichier.");
    return;
  }

  // ---------------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------------

  Tangle.formats.intFormat = function (value) {
    var n = Math.round(Number(value));
    return n.toLocaleString("fr-FR");
  };

  Tangle.formats.percent = function (value) {
    return Tangle.formats.intFormat(value) + " %";
  };

  Tangle.formats.ms = function (value) {
    var n = Number(value);
    var digits = n < 10 ? 2 : n < 100 ? 1 : 0;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " ms";
  };

  Tangle.formats.seconds = function (value) {
    return Tangle.formats.intFormat(value) + " s";
  };

  Tangle.formats.factor = function (value) {
    return "× " + Tangle.formats.intFormat(value);
  };

  // Formatte une durée exprimée en nanosecondes vers l'unité la plus lisible.
  Tangle.formats.duration = function (ns) {
    ns = Number(ns);
    if (ns < 1000) return Tangle.formats.intFormat(ns) + " ns";
    if (ns < 1e6) return (ns / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " µs";
    if (ns < 1e9) return (ns / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " ms";
    if (ns < 60e9) return (ns / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " s";
    if (ns < 3600e9) return (ns / 60e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " min";
    if (ns < 86400e9) return (ns / 3600e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " h";
    return (ns / 86400e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " j";
  };

  // ---------------------------------------------------------------
  // TKAdjustableNumber — nombre modifiable par glisser / flèches / double-clic
  // ---------------------------------------------------------------

  Tangle.classes.TKAdjustableNumber = {
    initialize: function (element, options, tangle, variable) {
      this.tangle = tangle;
      this.variable = variable;
      this.min = options.min !== undefined ? parseFloat(options.min) : -Infinity;
      this.max = options.max !== undefined ? parseFloat(options.max) : Infinity;
      this.step = options.step !== undefined ? parseFloat(options.step) : 1;
      this.dragUnit = options.dragunit !== undefined ? parseFloat(options.dragunit) : this.step;
      this.formatName = options.format || null;

      element.classList.add("TKAdjustableNumber");
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "slider");
      element.setAttribute("aria-valuemin", String(this.min));
      element.setAttribute("aria-valuemax", String(this.max));

      var self = this;
      var dragging = false;
      var startX = 0;
      var startValue = 0;
      var moved = false;

      function clamp(v) {
        var stepped = Math.round(v / self.step) * self.step;
        return Math.min(self.max, Math.max(self.min, stepped));
      }

      function beginDrag(clientX) {
        dragging = true;
        moved = false;
        startX = clientX;
        startValue = tangle.getValue(variable);
        element.classList.add("dragging");
      }

      function updateDrag(clientX) {
        if (!dragging) return;
        var dx = clientX - startX;
        if (Math.abs(dx) > 2) moved = true;
        var delta = Math.round(dx / 4) * self.dragUnit;
        var next = clamp(startValue + delta);
        tangle.setValue(variable, next);
      }

      function endDrag() {
        if (!dragging) return;
        dragging = false;
        element.classList.remove("dragging");
      }

      element.addEventListener("mousedown", function (e) {
        beginDrag(e.clientX);
        e.preventDefault();
      });
      window.addEventListener("mousemove", function (e) {
        if (dragging) updateDrag(e.clientX);
      });
      window.addEventListener("mouseup", endDrag);

      element.addEventListener(
        "touchstart",
        function (e) {
          beginDrag(e.touches[0].clientX);
        },
        { passive: true }
      );
      window.addEventListener(
        "touchmove",
        function (e) {
          if (dragging) updateDrag(e.touches[0].clientX);
        },
        { passive: true }
      );
      window.addEventListener("touchend", endDrag);

      element.addEventListener("keydown", function (e) {
        var v = tangle.getValue(variable);
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          tangle.setValue(variable, clamp(v + self.step));
          e.preventDefault();
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          tangle.setValue(variable, clamp(v - self.step));
          e.preventDefault();
        }
      });

      element.addEventListener("dblclick", function () {
        var v = tangle.getValue(variable);
        var input = window.prompt("Nouvelle valeur :", v);
        if (input !== null) {
          var n = parseFloat(input.replace(",", "."));
          if (!isNaN(n)) tangle.setValue(variable, clamp(n));
        }
      });

      // évite qu'un simple clic déclenche une navigation reveal.js
      element.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      // Peinture initiale : si la variable démarre à sa valeur par défaut du modèle,
      // Tangle ne déclenche aucun setter au chargement (aucun "changement" détecté),
      // donc on force un premier rendu ici. Différé en microtâche car _model n'est
      // pas encore peuplé pendant initializeElements() (appelé avant setModel()).
      var self = this;
      Promise.resolve().then(function () {
        self.update(element, tangle.getValue(variable));
      });
    },

    update: function (element, value) {
      element.setAttribute("aria-valuenow", String(value));
      var formatted =
        this.formatName && Tangle.formats[this.formatName]
          ? Tangle.formats[this.formatName](value)
          : String(value);
      element.textContent = formatted;
    },
  };

  // ---------------------------------------------------------------
  // TKDropdown — menu déroulant lié à une variable
  // ---------------------------------------------------------------

  Tangle.classes.TKDropdown = {
    initialize: function (element, options, tangle, variable) {
      var values = (options.options || "").split(",").map(function (s) {
        return s.trim();
      });
      var labels = options.labels
        ? options.labels.split("|").map(function (s) {
            return s.trim();
          })
        : values;

      var select = document.createElement("select");
      for (var i = 0; i < values.length; i++) {
        var opt = document.createElement("option");
        opt.value = values[i];
        opt.textContent = labels[i] !== undefined ? labels[i] : values[i];
        select.appendChild(opt);
      }

      element.classList.add("TKDropdown");
      element.appendChild(select);

      select.addEventListener("change", function (e) {
        e.stopPropagation();
        var raw = select.value;
        var n = parseFloat(raw);
        var isNumeric = !isNaN(n) && String(n) === raw;
        tangle.setValue(variable, isNumeric ? n : raw);
      });
      select.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      this.select = select;

      // Peinture initiale (voir la même remarque dans TKAdjustableNumber).
      var self = this;
      Promise.resolve().then(function () {
        self.update(element, tangle.getValue(variable));
      });
    },

    update: function (element, value) {
      this.select.value = String(value);
    },
  };

  // ---------------------------------------------------------------
  // TKMeter — barre de mesure horizontale
  // ---------------------------------------------------------------

  Tangle.classes.TKMeter = {
    initialize: function (element, options, tangle, variable) {
      this.min = options.min !== undefined ? parseFloat(options.min) : 0;
      this.max = options.max !== undefined ? parseFloat(options.max) : 100;
      element.classList.add("TKMeter");
      var fill = document.createElement("div");
      fill.className = "fill";
      element.appendChild(fill);
      this.fill = fill;

      // Peinture initiale (voir la même remarque dans TKAdjustableNumber).
      if (variable) {
        var self = this;
        Promise.resolve().then(function () {
          self.update(element, tangle.getValue(variable));
        });
      }
    },
    update: function (element, value) {
      var pct = ((value - this.min) / (this.max - this.min)) * 100;
      pct = Math.min(100, Math.max(0, pct));
      this.fill.style.width = pct + "%";
    },
  };
})();
