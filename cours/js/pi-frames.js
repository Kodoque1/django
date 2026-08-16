/*
 * pi-frames.js — moteur de pédagogie programmée (Skinner) pour les jeux sérieux du deck.
 *
 * Principes implémentés, dans l'ordre d'importance :
 *   1. Aucune révélation sans réponse construite : le bouton « Suivant » n'existe qu'après
 *      validation.
 *   2. Feedback IMMÉDIAT et SPÉCIFIQUE : chaque erreur prévue porte son propre message
 *      (`feedbackFor`), jamais un simple « faux ». C'est la règle non négociable — un message
 *      générique est un bug pédagogique.
 *   3. Estompage des indices (fading) : `cue` 3 → 0. L'aide passe de toujours visible, à
 *      repliée, à disponible sur demande (et son usage est tracé), à absente. La difficulté
 *      monte par RETRAIT d'indice, pas par complexification de la question.
 *   4. Boucle de reprise : tout item raté ou résolu avec indice est réinjecté 3 frames plus
 *      loin (reformulé si la frame fournit un bloc `retry`). Le jeu n'est « acquis » que
 *      lorsque chaque item est passé une fois du premier coup et sans aide.
 *   5. Compteurs informatifs, jamais punitifs : pas de vies, pas d'échec bloquant.
 *   6. Mode duel : bandeau score / série / chrono agrandi, lisible au vidéoprojecteur.
 *
 * Contrat d'utilisation :
 *
 *   var game = PIFrames.create(container, {
 *     id: "url-anatomy",              // clé de persistance localStorage
 *     duel: false,                    // mode duel actif au montage
 *     shared: {},                     // état partagé entre les stages (ex. la base produits)
 *     frames: [ … ],
 *   });
 *   game.destroy();
 *
 * Frame commune : { id, cue, hint, hintTitle, prompt, note, type, stage, stageId, onSettle, retry }
 * Types : choice | multi | slots | order | build | free   (predict = choice + onSettle animé)
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------
  // Utilitaires DOM
  // ---------------------------------------------------------------

  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          n.addEventListener(k.slice(2), attrs[k]);
        } else if (attrs[k] != null && attrs[k] !== false) {
          n.setAttribute(k, attrs[k]);
        }
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Normalisation tolérante pour les réponses libres : casse, accents, espaces multiples,
  // guillemets typographiques. On ne veut pas punir une faute de frappe sur un accent quand
  // c'est la notion qui est évaluée.
  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pct(n, d) {
    if (!d) return "—";
    return Math.round((n / d) * 100) + " %";
  }

  function mmss(ms) {
    var s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  // ---------------------------------------------------------------
  // Rendus par type de frame
  //
  // Chaque rendu expose :
  //   mount(el, frame, api)  construit l'interaction dans el
  //   submit()               appelé par « Valider » (absent si le type s'auto-valide au clic)
  //   destroy()
  // et signale son résultat via api.settle(ok, message).
  // api.canValidate(bool) pilote l'activation du bouton « Valider ».
  // ---------------------------------------------------------------

  var renderers = {};

  // ---- choice : QCM à réponse unique ----------------------------------------
  renderers.choice = function () {
    var selected = null;
    var buttons = [];
    var frame = null;
    var api = null;
    var tried = {};

    return {
      keyable: true,
      mount: function (el, f, a) {
        frame = f; api = a;
        var opts = f.shuffle === false ? f.options : shuffle(f.options);
        // layout "url" : les options sont les morceaux d'une URL, affichés côte à côte dans
        // l'ordre — le plateau de jeu EST l'objet étudié.
        var list = h("div", { class: "pi-options" + (f.wide ? " wide" : "") + (f.layout ? " " + f.layout : "") });
        opts.forEach(function (o) {
          // Un item marqué `sep` est un décor non cliquable (ex. le « :// » d'une URL) : il
          // garde l'objet étudié lisible sans devenir une réponse possible.
          if (o.sep) {
            list.appendChild(h("span", { class: "pi-sep", html: o.label }));
            return;
          }
          var btn = h("button", {
            class: "pi-opt",
            type: "button",
            "data-id": o.id,
            onclick: function () {
              if (btn.classList.contains("dead")) return;
              buttons.forEach(function (b) { b.classList.remove("sel"); });
              btn.classList.add("sel");
              selected = o.id;
              api.canValidate(true);
            },
          }, [
            h("span", { class: "pi-opt-key", text: String(buttons.length + 1) }),
            h("span", { class: "pi-opt-label", html: o.label }),
          ]);
          buttons.push(btn);
          list.appendChild(btn);
        });
        el.appendChild(list);
        api.canValidate(false);
      },
      pick: function (i) {
        if (buttons[i] && !buttons[i].classList.contains("dead")) buttons[i].click();
      },
      submit: function () {
        if (selected == null) return;
        var ok = selected === frame.answer;
        var msg = ok
          ? frame.explain
          : (frame.feedbackFor && frame.feedbackFor[selected]) || frame.explain;
        if (!ok) {
          tried[selected] = true;
          buttons.forEach(function (b) {
            if (tried[b.getAttribute("data-id")]) {
              b.classList.add("dead");
              b.classList.remove("sel");
            }
          });
          selected = null;
          api.canValidate(false);
        }
        api.settle(ok, msg, { value: selected, chosen: Object.keys(tried) });
      },
      revealAnswer: function () {
        buttons.forEach(function (b) {
          if (b.getAttribute("data-id") === frame.answer) b.classList.add("truth");
        });
      },
      destroy: function () { buttons = []; },
    };
  };

  // ---- multi : plusieurs bonnes réponses (cases à cocher) --------------------
  renderers.multi = function () {
    var picked = {};
    var buttons = [];
    var frame = null;
    var api = null;

    return {
      keyable: true,
      mount: function (el, f, a) {
        frame = f; api = a;
        var opts = f.shuffle === false ? f.options : shuffle(f.options);
        var list = h("div", { class: "pi-options multi" + (f.wide ? " wide" : "") });
        opts.forEach(function (o, i) {
          var btn = h("button", {
            class: "pi-opt", type: "button", "data-id": o.id,
            onclick: function () {
              picked[o.id] = !picked[o.id];
              btn.classList.toggle("sel", !!picked[o.id]);
              api.canValidate(Object.keys(picked).some(function (k) { return picked[k]; }));
            },
          }, [
            h("span", { class: "pi-opt-key", text: String(i + 1) }),
            h("span", { class: "pi-opt-label", html: o.label }),
          ]);
          buttons.push(btn);
          list.appendChild(btn);
        });
        el.appendChild(list);
        api.canValidate(false);
      },
      pick: function (i) { if (buttons[i]) buttons[i].click(); },
      submit: function () {
        var want = frame.answers.slice().sort().join("|");
        var got = Object.keys(picked).filter(function (k) { return picked[k]; }).sort().join("|");
        var ok = want === got;
        var msg = frame.explain;
        if (!ok && frame.feedbackFor) {
          // Le message le plus utile porte sur la PREMIÈRE divergence : un item coché à tort,
          // sinon un item oublié.
          var faux = Object.keys(picked).filter(function (k) {
            return picked[k] && frame.answers.indexOf(k) === -1;
          })[0];
          var oubli = frame.answers.filter(function (k) { return !picked[k]; })[0];
          msg = frame.feedbackFor[faux] || frame.feedbackFor[oubli] || frame.explain;
        }
        api.settle(ok, msg, { value: got });
      },
      revealAnswer: function () {
        buttons.forEach(function (b) {
          var id = b.getAttribute("data-id");
          b.classList.toggle("truth", frame.answers.indexOf(id) !== -1);
          b.classList.toggle("dead", frame.answers.indexOf(id) === -1);
        });
      },
      destroy: function () { buttons = []; picked = {}; },
    };
  };

  // ---- slots : étiquettes à ranger dans des cases ---------------------------
  // Clic sur une étiquette puis clic sur une case (fonctionne aussi bien à la souris qu'au
  // vidéoprojecteur) — le glisser-déposer est accepté en plus.
  renderers.slots = function () {
    var frame = null, api = null;
    var placement = {};      // tokenId -> slotId
    var held = null;         // étiquette sélectionnée
    var tokenEls = {}, slotEls = {}, poolEl = null;

    function refresh() {
      Object.keys(tokenEls).forEach(function (tid) {
        var el = tokenEls[tid];
        el.classList.toggle("held", held === tid);
        var target = placement[tid] ? slotEls[placement[tid]].querySelector(".pi-slot-drop") : poolEl;
        if (el.parentNode !== target) target.appendChild(el);
      });
      var placed = Object.keys(placement).length;
      api.canValidate(placed === frame.tokens.length);
    }

    function put(tokenId, slotId) {
      if (slotId) placement[tokenId] = slotId;
      else delete placement[tokenId];
      held = null;
      refresh();
    }

    return {
      mount: function (el, f, a) {
        frame = f; api = a;
        var wrap = h("div", { class: "pi-slots" });
        var board = h("div", { class: "pi-slot-board", style: "grid-template-columns:repeat(" + (f.columns || f.slots.length) + ",1fr)" });
        f.slots.forEach(function (s) {
          var drop = h("div", { class: "pi-slot-drop" });
          var slot = h("div", {
            class: "pi-slot", "data-id": s.id,
            onclick: function () { if (held) put(held, s.id); },
            ondragover: function (e) { e.preventDefault(); slot.classList.add("over"); },
            ondragleave: function () { slot.classList.remove("over"); },
            ondrop: function (e) {
              e.preventDefault(); slot.classList.remove("over");
              var tid = e.dataTransfer.getData("text/plain");
              if (tid) put(tid, s.id);
            },
          }, [h("div", { class: "pi-slot-title", html: s.label }), drop]);
          if (s.sub) slot.insertBefore(h("div", { class: "pi-slot-sub", html: s.sub }), drop);
          slotEls[s.id] = slot;
          board.appendChild(slot);
        });

        poolEl = h("div", {
          class: "pi-token-pool",
          onclick: function (e) { if (e.target === poolEl && held) put(held, null); },
          ondragover: function (e) { e.preventDefault(); },
          ondrop: function (e) {
            e.preventDefault();
            var tid = e.dataTransfer.getData("text/plain");
            if (tid) put(tid, null);
          },
        });

        shuffle(f.tokens).forEach(function (t) {
          var tok = h("span", {
            class: "pi-token", draggable: "true", "data-id": t.id, html: t.label,
            onclick: function (e) {
              e.stopPropagation();
              held = held === t.id ? null : t.id;
              if (!held && placement[t.id]) put(t.id, null);
              refresh();
            },
            ondragstart: function (e) { e.dataTransfer.setData("text/plain", t.id); held = t.id; },
          });
          tokenEls[t.id] = tok;
          poolEl.appendChild(tok);
        });

        wrap.appendChild(board);
        wrap.appendChild(poolEl);
        wrap.appendChild(h("div", { class: "pi-slots-tip", text: "Cliquez une étiquette, puis sa case (ou glissez-la)." }));
        el.appendChild(wrap);
        refresh();
      },
      submit: function () {
        var wrong = null;
        frame.tokens.forEach(function (t) {
          if (!wrong && placement[t.id] !== t.slot) wrong = t;
        });
        var ok = !wrong;
        var msg = frame.explain;
        if (wrong) {
          var fb = frame.feedbackFor || {};
          msg = fb[wrong.id + "@" + placement[wrong.id]] || fb[wrong.id] ||
            "« " + wrong.label.replace(/<[^>]+>/g, "") + " » n'est pas à sa place.";
          Object.keys(tokenEls).forEach(function (tid) {
            var t = frame.tokens.filter(function (x) { return x.id === tid; })[0];
            tokenEls[tid].classList.toggle("bad", placement[tid] !== t.slot);
          });
        }
        api.settle(ok, msg, { value: placement });
      },
      revealAnswer: function () {
        frame.tokens.forEach(function (t) { placement[t.id] = t.slot; });
        held = null;
        refresh();
        Object.keys(tokenEls).forEach(function (tid) {
          tokenEls[tid].classList.remove("bad");
          tokenEls[tid].classList.add("truth");
        });
      },
      destroy: function () { tokenEls = {}; slotEls = {}; placement = {}; },
    };
  };

  // ---- order : cliquer les éléments dans le bon ordre -----------------------
  // Auto-validant : chaque clic est corrigé immédiatement — c'est le format le plus « frame par
  // frame » du lot, un pas = un clic.
  renderers.order = function () {
    var frame = null, api = null, pos = 0, buttons = [], trackEl = null, errored = false;

    return {
      selfValidating: true,
      mount: function (el, f, a) {
        frame = f; api = a;
        trackEl = h("ol", { class: "pi-order-track" });
        var pool = h("div", { class: "pi-order-pool" });
        shuffle(f.items).forEach(function (it) {
          var btn = h("button", {
            class: "pi-order-item", type: "button", "data-id": it.id, html: it.label,
            onclick: function () { click(it, btn); },
          });
          buttons.push(btn);
          pool.appendChild(btn);
        });
        el.appendChild(h("div", { class: "pi-order" }, [trackEl, pool]));

        function click(it, btn) {
          if (btn.disabled) return;
          var expected = frame.items[pos];
          if (it.id === expected.id) {
            btn.disabled = true;
            btn.classList.add("done");
            pos++;
            trackEl.appendChild(h("li", { class: "ok", html: it.label }));
            if (pos === frame.items.length) {
              api.settle(!errored, errored
                ? (frame.explainAfterError || frame.explain)
                : frame.explain, { value: pos });
            }
          } else {
            errored = true;
            btn.classList.add("bad");
            setTimeout(function () { btn.classList.remove("bad"); }, 600);
            var fb = frame.feedbackFor || {};
            api.hint(fb[it.id + "@" + pos] || fb[it.id] ||
              "Pas encore : à cette étape, il manque quelque chose avant.");
          }
        }
      },
      revealAnswer: function () {
        while (pos < frame.items.length) {
          var it = frame.items[pos];
          trackEl.appendChild(h("li", { class: "truth", html: it.label }));
          buttons.forEach(function (b) { if (b.getAttribute("data-id") === it.id) b.disabled = true; });
          pos++;
        }
      },
      destroy: function () { buttons = []; },
    };
  };

  // ---- build : assembler une suite de jetons --------------------------------
  renderers.build = function () {
    var frame = null, api = null, seq = [], lineEl = null, poolEl = null;

    function refresh() {
      lineEl.innerHTML = "";
      if (!seq.length) lineEl.appendChild(h("span", { class: "pi-build-empty", text: "cliquez les morceaux dans l'ordre…" }));
      seq.forEach(function (t, i) {
        lineEl.appendChild(h("span", {
          class: "pi-build-piece", html: t.label, title: "Retirer",
          onclick: function () { seq.splice(i, 1); refresh(); },
        }));
      });
      api.canValidate(seq.length > 0);
    }

    return {
      mount: function (el, f, a) {
        frame = f; api = a; seq = [];
        lineEl = h("div", { class: "pi-build-line" });
        poolEl = h("div", { class: "pi-build-pool" });
        (f.shuffle === false ? f.tokens : shuffle(f.tokens)).forEach(function (t) {
          poolEl.appendChild(h("button", {
            class: "pi-token", type: "button", html: t.label,
            onclick: function () { seq.push(t); refresh(); },
          }));
        });
        el.appendChild(h("div", { class: "pi-build" }, [
          h("div", { class: "pi-build-prefix", html: f.prefix || "" }),
          lineEl,
          poolEl,
          h("div", { class: "pi-slots-tip", text: "Cliquez un morceau posé pour le retirer." }),
        ]));
        refresh();
      },
      submit: function () {
        var got = seq.map(function (t) { return t.id; }).join("|");
        var want = frame.answer.join("|");
        var ok = got === want;
        var msg = frame.explain;
        if (!ok && frame.feedbackFor) {
          // premier jeton fautif à sa position
          for (var i = 0; i < Math.max(seq.length, frame.answer.length); i++) {
            var gotId = seq[i] ? seq[i].id : null;
            if (gotId !== frame.answer[i]) {
              msg = frame.feedbackFor[gotId + "@" + i] || frame.feedbackFor[gotId] ||
                frame.feedbackFor["_manque:" + frame.answer[i]] || frame.explain;
              break;
            }
          }
        }
        api.settle(ok, msg, { value: got });
      },
      revealAnswer: function () {
        var byId = {};
        frame.tokens.forEach(function (t) { byId[t.id] = t; });
        seq = frame.answer.map(function (id) { return byId[id]; });
        refresh();
        lineEl.classList.add("truth");
      },
      destroy: function () { seq = []; },
    };
  };

  // ---- free : saisie courte -------------------------------------------------
  renderers.free = function () {
    var frame = null, api = null, input = null, focusTimer = null;

    return {
      mount: function (el, f, a) {
        frame = f; api = a;
        input = h("input", {
          class: "pi-free", type: "text", placeholder: f.placeholder || "votre réponse…",
          autocomplete: "off", spellcheck: "false",
          oninput: function () { api.canValidate(input.value.trim().length > 0); },
          onkeydown: function (e) {
            e.stopPropagation();                       // ne pas laisser reveal.js changer de slide
            if (e.key === "Enter") { e.preventDefault(); api.requestSubmit(); }
          },
        });
        el.appendChild(h("div", { class: "pi-free-wrap" }, [
          f.prefix ? h("span", { class: "pi-free-prefix", html: f.prefix }) : null,
          input,
        ]));
        api.canValidate(false);
        // Mise au point différée (le champ vient d'être inséré). Le minuteur est annulé au
        // démontage : sans cela, quitter la slide dans les 30 ms lève sur un champ déjà libéré.
        focusTimer = setTimeout(function () {
          focusTimer = null;
          if (input) input.focus();
        }, 30);
      },
      submit: function () {
        var v = norm(input.value);
        var ok = (frame.answers || []).some(function (a) { return norm(a) === v; });
        var msg = frame.explain;
        if (!ok && frame.feedbackFor) {
          var key = Object.keys(frame.feedbackFor).filter(function (k) { return norm(k) === v; })[0];
          if (key) msg = frame.feedbackFor[key];
          else if (frame.feedbackFor._defaut) msg = frame.feedbackFor._defaut;
        }
        input.classList.toggle("bad", !ok);
        api.settle(ok, msg, { value: input.value });
      },
      revealAnswer: function () {
        input.value = frame.answers[0];
        input.classList.remove("bad");
        input.classList.add("truth");
        input.disabled = true;
      },
      destroy: function () {
        if (focusTimer) clearTimeout(focusTimer);
        focusTimer = null;
        input = null;
      },
    };
  };

  // ---------------------------------------------------------------
  // Moteur
  // ---------------------------------------------------------------

  function create(container, config) {
    var cfg = config || {};
    var shared = cfg.shared || {};
    var source = (cfg.frames || []).map(function (f, i) {
      var c = {};
      for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) c[k] = f[k];
      if (c.id == null) c.id = "f" + i;
      return c;
    });

    var st = {
      queue: source.slice(),
      idx: 0,
      attempts: 0,
      hintUsed: false,
      settled: false,
      duel: !!cfg.duel,
      startedAt: null,
      timerId: null,
      renderer: null,
      stage: null,
      stageId: null,
      failedIds: {},
      stats: { seen: 0, firstTry: 0, errors: 0, hints: 0, streak: 0, bestStreak: 0 },
    };

    // ---- coquille ----
    container.innerHTML = "";
    container.classList.add("pi-root");
    if (st.duel) container.classList.add("duel");

    var elProgress = h("div", { class: "pi-progress-fill" });
    var elCount = h("b", { text: "0" });
    var elStreak = h("b", { text: "0" });
    var elRate = h("b", { text: "—" });
    var elChrono = h("span", { class: "pi-chrono", text: "00:00" });
    var duelBtn = h("button", {
      class: "pi-btn ghost", type: "button",
      text: st.duel ? "🙋 Mode solo" : "⚔️ Mode duel",
      onclick: function () {
        st.duel = !st.duel;
        container.classList.toggle("duel", st.duel);
        duelBtn.textContent = st.duel ? "🙋 Mode solo" : "⚔️ Mode duel";
        if (st.duel && !st.timerId) startChrono();
      },
    });

    var hud = h("div", { class: "pi-hud" }, [
      h("div", { class: "pi-progress" }, [elProgress]),
      h("div", { class: "pi-metrics" }, [
        h("span", { class: "pi-metric" }, [elCount, document.createTextNode(" / " + source.length)]),
        h("span", { class: "pi-metric streak" }, [document.createTextNode("série "), elStreak]),
        h("span", { class: "pi-metric rate" }, [document.createTextNode("1ᵉʳ essai "), elRate]),
        elChrono,
        duelBtn,
      ]),
    ]);

    var elHint = h("div", { class: "pi-hint" });
    var elHintBtn = h("button", {
      class: "pi-btn hint", type: "button", text: "💡 Voir l'indice",
      onclick: function () {
        st.hintUsed = true;
        st.stats.hints++;
        elHint.classList.add("show");
        elHintBtn.style.display = "none";
      },
    });
    var elStage = h("div", { class: "pi-stage" });
    var elPrompt = h("div", { class: "pi-prompt" });
    var elAnswer = h("div", { class: "pi-answer" });
    var elFeedback = h("div", { class: "pi-feedback", role: "status" });
    var validateBtn = h("button", {
      class: "pi-btn primary", type: "button", text: "Valider",
      onclick: function () { doSubmit(); },
    });
    var nextBtn = h("button", {
      class: "pi-btn primary", type: "button", text: "Suivant →",
      onclick: function () { next(); },
    });
    var restartBtn = h("button", {
      class: "pi-btn ghost", type: "button", text: "↻ Recommencer",
      onclick: function () { restart(); },
    });
    var elActions = h("div", { class: "pi-actions" }, [validateBtn, nextBtn, restartBtn]);

    container.appendChild(hud);
    container.appendChild(h("div", { class: "pi-body" }, [
      elHint, elHintBtn, elStage, elPrompt, elAnswer, elFeedback, elActions,
    ]));

    // ---- chrono ----
    function startChrono() {
      if (st.startedAt == null) st.startedAt = Date.now();
      if (st.timerId) return;
      st.timerId = setInterval(function () {
        elChrono.textContent = mmss(Date.now() - st.startedAt);
      }, 500);
    }
    function stopChrono() {
      if (st.timerId) clearInterval(st.timerId);
      st.timerId = null;
    }

    // ---- HUD ----
    function renderHud() {
      var done = st.stats.seen;
      elCount.textContent = String(Math.min(done, source.length));
      elStreak.textContent = String(st.stats.streak);
      elRate.textContent = done ? pct(st.stats.firstTry, done) : "—";
      elProgress.style.width = Math.round((st.idx / st.queue.length) * 100) + "%";
      hud.classList.toggle("perfect", done > 0 && st.stats.firstTry === done);
    }

    // ---- API exposée aux rendus ----
    var rapi = {
      canValidate: function (ok) {
        validateBtn.disabled = !ok;
      },
      requestSubmit: function () {
        if (!validateBtn.disabled) doSubmit();
      },
      // Message correctif sans consommer d'essai (utilisé par les types auto-validants sur un
      // clic fautif : on corrige immédiatement, mais la frame continue).
      hint: function (msg) {
        st.attempts++;
        st.stats.errors++;
        st.stats.streak = 0;
        setFeedback("ko", msg);
        renderHud();
      },
      settle: function (ok, msg, meta) { settle(ok, msg, meta); },
      shared: shared,
      stage: function () { return st.stage; },
    };

    function setFeedback(kind, msg) {
      elFeedback.className = "pi-feedback " + kind + " show";
      elFeedback.innerHTML = msg || "";
    }

    // ---- cycle de vie d'une frame ----
    function frame() { return st.queue[st.idx]; }

    function mountFrame() {
      var f = frame();
      st.attempts = 0;
      st.hintUsed = false;
      st.settled = false;

      // Indice : visible (cue 3), replié mais présent (cue 2), sur demande (cue 1), absent (cue 0)
      var cue = f.cue == null ? 2 : f.cue;
      elHint.className = "pi-hint";
      elHint.innerHTML = "";
      elHintBtn.style.display = "none";
      if (f.hint && cue >= 1) {
        elHint.innerHTML = (f.hintTitle ? "<b>" + f.hintTitle + "</b> " : "") + f.hint;
        if (cue >= 3) elHint.classList.add("show", "open");
        else if (cue === 2) elHint.classList.add("show", "compact");
        else elHintBtn.style.display = "";
      }

      // Scène : conservée telle quelle si la frame suivante partage le même stageId
      // (indispensable pour « Le bon verbe », où la table produits doit garder son état).
      var wantStage = f.stage ? (f.stageId || f.id) : null;
      if (st.stageId !== wantStage) {
        if (st.stage && st.stage.destroy) st.stage.destroy();
        st.stage = null;
        elStage.innerHTML = "";
        st.stageId = wantStage;
        if (f.stage) st.stage = f.stage(elStage, shared, rapi) || {};
      }
      elStage.style.display = f.stage ? "" : "none";
      if (st.stage && st.stage.onFrame) st.stage.onFrame(f);

      elPrompt.innerHTML = (f._isRetry ? '<span class="pi-retag">2ᵉ passage</span> ' : "") + f.prompt;
      elAnswer.innerHTML = "";
      elFeedback.className = "pi-feedback";
      elFeedback.innerHTML = "";

      if (st.renderer && st.renderer.destroy) st.renderer.destroy();
      st.renderer = renderers[f.type]();
      st.renderer.mount(elAnswer, f, rapi);

      validateBtn.style.display = st.renderer.selfValidating ? "none" : "";
      nextBtn.style.display = "none";
      if (!st.renderer.selfValidating) validateBtn.disabled = true;
      startChrono();
      renderHud();
    }

    function doSubmit() {
      if (st.settled || !st.renderer.submit) return;
      st.renderer.submit();
    }

    function settle(ok, msg, meta) {
      if (ok) {
        st.stats.seen++;
        var clean = st.attempts === 0 && !st.hintUsed;
        if (clean) {
          st.stats.firstTry++;
          st.stats.streak++;
          st.stats.bestStreak = Math.max(st.stats.bestStreak, st.stats.streak);
        } else {
          st.stats.streak = 0;
          requeue(frame());
        }
        st.settled = true;
        setFeedback(clean ? "ok" : "partial", (clean ? "✅ " : "☑️ ") + (msg || "C'est ça."));
        if (st.hintUsed) {
          elFeedback.innerHTML += '<div class="pi-note">Indice utilisé — cette question reviendra plus loin, avec un indice de moins.</div>';
        }
        finishFrame(meta);
        return;
      }

      // Erreur : feedback spécifique, on laisse retenter. Au 2ᵉ échec on donne la réponse
      // (règle du taux d'erreur bas : on ne laisse personne s'enliser).
      st.attempts++;
      st.stats.errors++;
      st.stats.streak = 0;
      st.failedIds[frame().id] = true;

      if (st.attempts >= 2) {
        st.settled = true;
        st.stats.seen++;
        if (st.renderer.revealAnswer) st.renderer.revealAnswer();
        setFeedback("ko", "❌ " + (msg || "") +
          '<div class="pi-note">La bonne réponse est affichée. Cette question reviendra plus loin.</div>');
        requeue(frame());
        finishFrame(meta);
      } else {
        setFeedback("ko", "❌ " + (msg || "Pas tout à fait — réessayez."));
      }
      renderHud();
    }

    function finishFrame(meta) {
      var f = frame();
      if (f.onSettle) f.onSettle(st.stage, meta || {}, elFeedback, shared);
      validateBtn.style.display = "none";
      nextBtn.style.display = "";
      nextBtn.textContent = st.idx >= st.queue.length - 1 ? "Voir le bilan →" : "Suivant →";
      nextBtn.focus();
      renderHud();
    }

    // Réinjection : 3 frames plus loin, reformulée si la frame propose un bloc `retry`.
    // L'étudiant la voit revenir marquée « 2ᵉ passage », avec un cran d'indice en moins.
    function requeue(f) {
      if (f._isRetry) return;               // un 2ᵉ passage n'en déclenche pas un 3ᵉ
      var copy = {};
      for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) copy[k] = f[k];
      if (f.retry) for (var k2 in f.retry) copy[k2] = f.retry[k2];
      copy._isRetry = true;
      copy.cue = Math.max(0, (f.cue == null ? 2 : f.cue) - 1);
      var at = Math.min(st.idx + 3, st.queue.length);
      st.queue.splice(at, 0, copy);
    }

    function next() {
      if (st.idx >= st.queue.length - 1) { showSummary(); return; }
      st.idx++;
      mountFrame();
    }

    function restart() {
      st.queue = source.slice();
      st.idx = 0;
      st.failedIds = {};
      st.stats = { seen: 0, firstTry: 0, errors: 0, hints: 0, streak: 0, bestStreak: 0 };
      st.startedAt = null;
      stopChrono();
      elChrono.textContent = "00:00";
      if (st.stage && st.stage.destroy) st.stage.destroy();
      st.stage = null; st.stageId = null; elStage.innerHTML = "";
      mountFrame();
    }

    // ---- bilan ----
    function showSummary() {
      stopChrono();
      var total = st.stats.seen;
      var rate = total ? st.stats.firstTry / total : 0;
      var duree = st.startedAt ? mmss(Date.now() - st.startedAt) : "—";
      var atteint = rate >= (cfg.masteryTarget || 0.9);

      var best = loadBest();
      var score = st.stats.firstTry * 10 + st.stats.bestStreak * 5;
      if (!best || score > best.score) {
        best = { score: score, rate: Math.round(rate * 100), streak: st.stats.bestStreak, time: duree };
        saveBest(best);
      }

      var revoir = Object.keys(st.failedIds).map(function (id) {
        var f = source.filter(function (x) { return x.id === id; })[0];
        return f && f.label ? f.label : null;
      }).filter(Boolean);

      elHint.className = "pi-hint";
      elHintBtn.style.display = "none";
      elStage.style.display = "none";
      elPrompt.innerHTML = atteint
        ? "🎉 Objectif atteint — " + Math.round(rate * 100) + " % de réussite au premier essai."
        : "Bilan — " + Math.round(rate * 100) + " % au premier essai (cible : 90 %).";
      elAnswer.innerHTML = "";
      elAnswer.appendChild(h("div", { class: "pi-summary" }, [
        h("div", { class: "pi-stat" }, [h("b", { text: String(st.stats.firstTry) + "/" + total }), h("span", { text: "du premier coup" })]),
        h("div", { class: "pi-stat" }, [h("b", { text: String(st.stats.bestStreak) }), h("span", { text: "meilleure série" })]),
        h("div", { class: "pi-stat" }, [h("b", { text: String(st.stats.errors) }), h("span", { text: "corrections" })]),
        h("div", { class: "pi-stat" }, [h("b", { text: duree }), h("span", { text: "durée" })]),
        h("div", { class: "pi-stat best" }, [h("b", { text: String(best.score) }), h("span", { text: "record (score)" })]),
      ]));
      elFeedback.className = "pi-feedback " + (atteint ? "ok" : "partial") + " show";
      elFeedback.innerHTML = revoir.length
        ? "À revoir en priorité : " + revoir.join(" · ")
        : "Aucune notion en attente — vous pouvez passer à la suite.";
      validateBtn.style.display = "none";
      nextBtn.style.display = "none";
      elProgress.style.width = "100%";
    }

    function loadBest() {
      try { return JSON.parse(localStorage.getItem("pi:" + (cfg.id || "jeu"))); }
      catch (e) { return null; }
    }
    function saveBest(v) {
      try { localStorage.setItem("pi:" + (cfg.id || "jeu"), JSON.stringify(v)); }
      catch (e) { /* mode privé : on joue sans record */ }
    }

    // ---- clavier : chiffres pour choisir, Entrée pour valider/avancer ----
    function onKey(e) {
      if (!container.isConnected) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Enter") {
        e.stopPropagation();
        if (nextBtn.style.display !== "none") next();
        else if (!validateBtn.disabled) doSubmit();
        return;
      }
      if (/^[1-9]$/.test(e.key) && st.renderer && st.renderer.pick && !st.settled) {
        e.stopPropagation();
        st.renderer.pick(parseInt(e.key, 10) - 1);
      }
    }
    document.addEventListener("keydown", onKey, true);

    mountFrame();

    return {
      destroy: function () {
        stopChrono();
        document.removeEventListener("keydown", onKey, true);
        if (st.renderer && st.renderer.destroy) st.renderer.destroy();
        if (st.stage && st.stage.destroy) st.stage.destroy();
        container.innerHTML = "";
        container.classList.remove("pi-root", "duel");
      },
    };
  }

  // Fabrique d'un widget complet : évite de répéter le singleton init/destroy dans les 5 jeux.
  function widget(name, configFactory) {
    var current = null;
    function init(container) {
      if (!container) return;
      destroy();
      current = create(container, configFactory());
    }
    function destroy() {
      if (current) current.destroy();
      current = null;
    }
    window.CourseWidgets = window.CourseWidgets || {};
    window.CourseWidgets[name] = { init: init, destroy: destroy };
  }

  window.PIFrames = { create: create, widget: widget, h: h, shuffle: shuffle, norm: norm };
})();
