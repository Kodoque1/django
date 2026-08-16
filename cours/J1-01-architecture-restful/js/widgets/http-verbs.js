/*
 * Jeu — « Le bon verbe » (notion : verbes / méthodes HTTP)
 *
 * Mécanique : une console d'API avec la table `produits` visible en permanence. Chaque
 * réponse validée est réellement exécutée sur cette table — le verbe cesse d'être une
 * étiquette pour devenir un effet observable. Deux démonstrations font le cœur du jeu :
 * PUT qui mutile une ligne (les champs omis sont écrasés), et le double envoi qui distingue
 * POST des verbes idempotents.
 *
 * ⚠ Le jeu s'arrête à la matrice sûr/idempotent, et PAS de frame « pont DRF ». Il y en a eu
 * une — « quelle action de ModelViewSet répond à PATCH ? » — retirée pour trois raisons :
 *   · elle se répondait par le mot « partial », sans rien mobiliser de HTTP, alors qu'elle
 *     était en `cue: 0`, donc censée être la plus difficile ;
 *   · elle nommait un objet que l'étudiant n'a jamais vu — le module I se tient hors
 *     framework, c'est sa promesse ;
 *   · le module III fait CONSTRUIRE des ViewSets : les classer ici, c'est la même notion
 *     deux fois dans le même régime (§1).
 * Le pont vers DRF est porté par la slide de récapitulation qui suit — une table de
 * correspondance est du vocabulaire, pas une discrimination à faire construire.
 * Ne pas la remettre pour « couvrir III.C » : c'est le module III qui couvre III.C.
 */
(function () {
  "use strict";

  var h = PIFrames.h;

  function baseProduits() {
    return [
      { id: 12, nom: "Clavier mécanique", prix: 49, stock: 8 },
      { id: 13, nom: "Écran 27 pouces", prix: 219, stock: 3 },
    ];
  }

  // ---------------------------------------------------------------
  // Scène : console + table, partagées par toutes les frames du jeu
  // ---------------------------------------------------------------
  function apiStage(el, shared) {
    el.innerHTML = "";
    if (!shared.produits) shared.produits = baseProduits();
    var timers = [];

    var journal = h("div", { class: "hv-journal" });
    var tableWrap = h("div", { class: "hv-table-wrap" });
    el.appendChild(h("div", { class: "hv-stage" }, [
      h("div", { class: "hv-col" }, [h("div", { class: "hv-col-titre", text: "console" }), journal]),
      h("div", { class: "hv-col" }, [h("div", { class: "hv-col-titre", text: "table produits" }), tableWrap]),
    ]));

    function rendreTable(surligne) {
      tableWrap.innerHTML = "";
      var t = h("table", { class: "hv-table" });
      t.appendChild(h("tr", {}, [
        h("th", { text: "id" }), h("th", { text: "nom" }),
        h("th", { text: "prix" }), h("th", { text: "stock" }),
      ]));
      shared.produits.forEach(function (p) {
        var cls = surligne && surligne.indexOf(p.id) !== -1 ? "flash" : "";
        function cell(v) {
          return v == null
            ? h("td", { class: "vide", text: "—" })
            : h("td", { text: String(v) });
        }
        t.appendChild(h("tr", { class: cls }, [
          h("td", { text: String(p.id) }), cell(p.nom), cell(p.prix), cell(p.stock),
        ]));
      });
      if (!shared.produits.length) {
        tableWrap.appendChild(h("div", { class: "hv-vide", text: "table vide" }));
      }
      tableWrap.appendChild(t);
    }

    function log(verbe, chemin, corps, code, texte) {
      var e = h("div", { class: "hv-ligne" }, [
        h("span", { class: "hv-verbe v-" + verbe.toLowerCase(), text: verbe }),
        h("code", { text: chemin + (corps ? "  " + JSON.stringify(corps) : "") }),
        h("span", { class: "hv-code c" + String(code)[0], text: String(code) }),
        h("span", { class: "hv-texte", text: texte }),
      ]);
      journal.appendChild(e);
      journal.scrollTop = journal.scrollHeight;
    }

    function trouver(id) {
      return shared.produits.filter(function (p) { return p.id === id; })[0];
    }

    // Exécute réellement la requête sur la table : c'est l'effet, pas le libellé, qui enseigne.
    function executer(verbe, chemin, corps) {
      var m = chemin.match(/\/produits\/(\d+)\/?$/);
      var id = m ? parseInt(m[1], 10) : null;
      var p = id ? trouver(id) : null;

      if (verbe === "GET") {
        if (id && !p) { log(verbe, chemin, null, 404, "introuvable"); return; }
        log(verbe, chemin, null, 200, id ? "fiche renvoyée — rien n'a changé" : shared.produits.length + " produits — rien n'a changé");
        rendreTable(id ? [id] : []);
        return;
      }
      if (verbe === "POST") {
        var nouvel = shared.produits.reduce(function (a, x) { return Math.max(a, x.id); }, 12) + 1;
        var cree = { id: nouvel, nom: (corps && corps.nom) || "Souris sans fil", prix: (corps && corps.prix) || 29, stock: (corps && corps.stock) || 20 };
        shared.produits.push(cree);
        log(verbe, chemin, corps, 201, "créé — id " + nouvel);
        rendreTable([nouvel]);
        return;
      }
      if (verbe === "PUT") {
        if (!p) { log(verbe, chemin, corps, 404, "introuvable"); return; }
        // PUT REMPLACE : tout champ absent du corps disparaît. C'est la démonstration clé.
        // Registre : c'est la sémantique du PROTOCOLE, que ce magasin applique à la lettre.
        // Une vraie API DRF n'en fait pas autant — son sérialiseur refuse en 400 un champ
        // requis absent, et conserve un champ qui a une valeur par défaut. Mesuré dans
        // tp-instrumentation/verifier.py §4.3 ; dit à l'étudiant dans l'`explain` ci-dessous.
        p.nom = corps && "nom" in corps ? corps.nom : null;
        p.prix = corps && "prix" in corps ? corps.prix : null;
        p.stock = corps && "stock" in corps ? corps.stock : null;
        log(verbe, chemin, corps, 200, "remplacé — les champs absents ont été écrasés");
        rendreTable([id]);
        return;
      }
      if (verbe === "PATCH") {
        if (!p) { log(verbe, chemin, corps, 404, "introuvable"); return; }
        for (var k in corps) p[k] = corps[k];
        log(verbe, chemin, corps, 200, "modifié — seuls les champs fournis ont bougé");
        rendreTable([id]);
        return;
      }
      if (verbe === "DELETE") {
        if (!p) { log(verbe, chemin, null, 404, "déjà supprimé — introuvable"); rendreTable([]); return; }
        shared.produits = shared.produits.filter(function (x) { return x.id !== id; });
        log(verbe, chemin, null, 204, "supprimé, sans contenu de réponse");
        rendreTable([]);
        return;
      }
    }

    function differe(ms, fn) { timers.push(setTimeout(fn, ms)); }

    rendreTable([]);

    return {
      onFrame: function (f) {
        if (f.resetTable) {
          shared.produits = baseProduits();
          journal.innerHTML = "";
          rendreTable([]);
        }
      },
      executer: executer,
      differe: differe,
      restaurer: function () { shared.produits = baseProduits(); rendreTable([]); },
      note: function (texte) { journal.appendChild(h("div", { class: "hv-note", text: texte })); journal.scrollTop = journal.scrollHeight; },
      destroy: function () { timers.forEach(clearTimeout); el.innerHTML = ""; },
    };
  }

  var HINT_VERBES =
    "<table>" +
    "<tr><th>GET</th><td>lire — ne change rien</td><th>POST</th><td>créer dans une collection</td></tr>" +
    "<tr><th>PUT</th><td>remplacer un élément <b>en entier</b></td><th>PATCH</th><td>modifier <b>quelques champs</b></td></tr>" +
    "<tr><th>DELETE</th><td>supprimer un élément</td><th></th><td><code>/produits/</code> = la collection · <code>/produits/12/</code> = un élément</td></tr>" +
    "</table>";

  function frames() {
    return [
      {
        id: "lire", label: "GET sur un élément", cue: 3,
        hintTitle: "Les cinq verbes utiles", hint: HINT_VERBES,
        type: "choice", wide: true, stage: apiStage, stageId: "api", resetTable: true,
        prompt: "Intention : <b>consulter la fiche du produit 12</b>. Quelle requête ?",
        options: [
          { id: "ok", label: "<code>GET /produits/12/</code>" },
          { id: "liste", label: "<code>GET /produits/</code>" },
          { id: "post", label: "<code>POST /produits/12/</code>" },
          { id: "put", label: "<code>PUT /produits/12/</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          liste: "Ça renvoie la collection entière. Pour une fiche précise, l'identifiant fait partie du <b>chemin</b> : <code>/produits/12/</code>.",
          post: "POST demande de <i>créer</i>. Consulter ne doit jamais rien créer — et POST sur un élément existant n'a pas de sens.",
          put: "PUT remplacerait le produit 12 par ce que vous envoyez. Vous voulez le lire, pas l'écraser.",
        },
        explain: "Le verbe porte l'<b>intention</b>, l'URL porte la <b>ressource</b>. Deux axes indépendants — c'est toute l'idée de REST.",
        onSettle: function (st) { st.executer("GET", "/produits/12/"); },
      },

      {
        id: "creer", label: "POST sur la collection", cue: 3,
        hintTitle: "Les cinq verbes utiles", hint: HINT_VERBES,
        type: "choice", wide: true, stage: apiStage, stageId: "api",
        prompt: "Intention : <b>ajouter un nouveau produit</b> au catalogue. Quelle requête ?",
        options: [
          { id: "ok", label: "<code>POST /produits/</code>" },
          { id: "elem", label: "<code>POST /produits/14/</code>" },
          { id: "putcoll", label: "<code>PUT /produits/</code>" },
          { id: "getparam", label: "<code>GET /produits/?nouveau=Souris</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          elem: "On poste <b>dans</b> la collection, pas sur un élément : l'identifiant n'existe pas encore, c'est le serveur qui l'attribuera et le renverra.",
          putcoll: "PUT sur la collection signifierait « remplace tout le catalogue par ceci » — techniquement valide, et catastrophique.",
          getparam: "Un GET ne doit <b>jamais</b> modifier quoi que ce soit : le paramètre <code>?nouveau=</code> ne change rien à l'affaire, la requête reste une lecture.",
        },
        explain: "POST sur la collection, réponse <code>201 Created</code> avec l'en-tête <code>Location</code> pointant la ressource créée. Regardez la table : une ligne est apparue, avec un id choisi par le serveur.",
        onSettle: function (st) { st.executer("POST", "/produits/", { nom: "Souris sans fil", prix: 29, stock: 20 }); },
      },

      {
        id: "put-patch", label: "PUT contre PATCH", cue: 2,
        hintTitle: "Rappel", hint: "PUT <b>remplace</b> la ressource entière par le corps envoyé. PATCH n'applique que les champs fournis.",
        type: "choice", wide: true, stage: apiStage, stageId: "api",
        prompt: "Intention : <b>corriger uniquement le prix</b> du produit 12 (49 → 39). Quelle requête ?",
        options: [
          { id: "ok", label: "<code>PATCH /produits/12/</code> avec <code>{\"prix\": 39}</code>" },
          { id: "put", label: "<code>PUT /produits/12/</code> avec <code>{\"prix\": 39}</code>" },
          { id: "post", label: "<code>POST /produits/12/</code> avec <code>{\"prix\": 39}</code>" },
          { id: "get", label: "<code>GET /produits/12/?prix=39</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          put: "PUT <b>remplace</b> la ressource entière. Les champs absents du corps ne sont pas « laissés tranquilles » : ils sont écrasés.",
          post: "POST crée ; il ne modifie pas un élément existant.",
          get: "GET ne modifie rien — c'est sa définition. Le paramètre serait simplement ignoré.",
        },
        explain: "PATCH est une modification <b>partielle</b>. Le PUT fautif vide <code>nom</code> et <code>stock</code>, parce qu'ils n'étaient pas dans le corps : c'est l'erreur classique en début de projet DRF.<br><br>⚠️ Précision de registre : ce remplacement intégral est la sémantique du <b>protocole HTTP</b>, appliquée ici à la lettre. Une vraie API DRF y ajoute la validation du sérialiseur — un champ requis absent donne un <b>400</b>, et un champ qui possède une valeur par défaut n'est pas écrasé du tout. Le protocole dit ce qui <i>devrait</i> arriver ; le sérialiseur décide ce qui arrive.",
        onSettle: function (st) {
          st.note("Démonstration — d'abord le PUT fautif :");
          st.executer("PUT", "/produits/12/", { prix: 39 });
          st.differe(1600, function () {
            st.restaurer();
            st.note("…puis, sur une table restaurée, la bonne requête :");
            st.executer("PATCH", "/produits/12/", { prix: 39 });
          });
        },
      },

      {
        id: "supprimer", label: "DELETE", cue: 2,
        hintTitle: "Rappel", hint: HINT_VERBES,
        type: "choice", wide: true, stage: apiStage, stageId: "api", resetTable: true,
        prompt: "Intention : <b>retirer le produit 13 du catalogue</b>. Quelle requête, et quel code de réponse attendre ?",
        options: [
          { id: "ok", label: "<code>DELETE /produits/13/</code> → <code>204</code>" },
          { id: "coll", label: "<code>DELETE /produits/</code> → <code>204</code>" },
          { id: "post", label: "<code>POST /produits/13/supprimer/</code> → <code>200</code>" },
          { id: "get", label: "<code>GET /produits/13/?action=supprimer</code> → <code>200</code>" },
        ],
        answer: "ok",
        feedbackFor: {
          coll: "Sans identifiant, vous demandez la suppression de <b>toute la collection</b>. Le catalogue entier y passerait.",
          post: "C'est le réflexe hérité des formulaires HTML, qui ne connaissent que GET et POST. En API, le verbe existe : inutile de mettre l'action dans l'URL. Une URL nomme une <i>ressource</i>, pas une opération.",
          get: "Un GET destructeur est la faute la plus dangereuse du lot — la question suivante montre pourquoi.",
        },
        explain: "<code>204 No Content</code> : c'est fait, et il n'y a rien à renvoyer. Notez que l'URL désigne toujours une <b>ressource</b> (<code>/produits/13/</code>) et jamais une action (<code>/supprimerProduit/</code>).",
        onSettle: function (st) { st.executer("DELETE", "/produits/13/"); },
      },

      {
        id: "idempotence", label: "idempotence", cue: 1,
        hintTitle: "Indice", hint: "Comparez l'<b>état final</b> de la table, pas la réponse renvoyée.",
        type: "choice", wide: true, stage: apiStage, stageId: "api", resetTable: true,
        prompt: "Réseau capricieux : la même requête <code>POST /produits/</code> part <b>deux fois</b>. Quel est l'état final de la table ?",
        options: [
          { id: "deux", label: "Deux nouvelles lignes : le produit est créé en double" },
          { id: "une", label: "Une seule ligne : le serveur détecte le doublon" },
          { id: "erreur", label: "Une ligne puis une erreur 409" },
          { id: "aucune", label: "Aucune : le second envoi annule le premier" },
        ],
        answer: "deux",
        feedbackFor: {
          une: "Rien dans HTTP ne dédoublonne : le serveur ne peut pas deviner que ce POST est un renvoi et non une seconde commande volontaire. C'est exactement pourquoi les sites affichent « ne rechargez pas cette page ».",
          erreur: "409 supposerait une contrainte d'unicité que vous auriez écrite vous-même. Par défaut, POST crée, sans se poser de question.",
          aucune: "Aucun verbe HTTP n'annule le précédent.",
        },
        explain: "POST n'est <b>pas idempotent</b> : le rejouer change l'état à chaque fois. PUT et DELETE le sont — rejouer « remplace par ceci » ou « supprime ceci » laisse le même état final (seul le code de retour peut différer : 204 puis 404). Conséquence pratique : un client peut réémettre sans risque un PUT perdu, jamais un POST.",
        onSettle: function (st) {
          st.executer("POST", "/produits/", { nom: "Souris sans fil", prix: 29, stock: 20 });
          st.differe(900, function () {
            st.note("Le même envoi, une seconde fois :");
            st.executer("POST", "/produits/", { nom: "Souris sans fil", prix: 29, stock: 20 });
          });
          st.differe(1900, function () {
            st.note("Pour comparaison, deux DELETE identiques :");
            st.executer("DELETE", "/produits/13/");
          });
          st.differe(2600, function () { st.executer("DELETE", "/produits/13/"); });
        },
      },

      {
        id: "surete", label: "verbes sûrs", cue: 1,
        hintTitle: "Indice", hint: "Un robot d'indexation suit <b>tous</b> les liens d'un site, sans rien demander à personne. Quels verbes peut-il déclencher sans danger ?",
        type: "multi", wide: true,
        prompt: "Quels verbes sont <b>sûrs</b>, c'est-à-dire ne modifient jamais l'état du serveur ? (plusieurs réponses)",
        options: [
          { id: "get", label: "GET" },
          { id: "head", label: "HEAD" },
          { id: "options", label: "OPTIONS" },
          { id: "post", label: "POST" },
          { id: "delete", label: "DELETE" },
        ],
        answers: ["get", "head", "options"],
        feedbackFor: {
          post: "POST crée : il modifie l'état par définition. Il n'est donc pas sûr.",
          delete: "DELETE supprime — difficile de faire moins sûr.",
          head: "HEAD est un GET sans corps de réponse : on ne récupère que les en-têtes. Rien n'est modifié, il est donc sûr.",
          options: "OPTIONS interroge les capacités du serveur (« quels verbes acceptez-vous ici ? »). Il ne modifie rien.",
          get: "GET est le verbe sûr par excellence : c'est sur cette garantie que reposent le cache, le préchargement et l'indexation.",
        },
        explain: "La sûreté n'est pas une politesse, c'est un <b>contrat</b>. Google l'a appris en 2005 : son Web Accelerator préchargeait les liens des pages, et des applications qui cachaient des suppressions derrière de simples liens <code>&lt;a href&gt;</code> ont vu leurs données disparaître. Le robot ne faisait que des GET — il respectait le contrat, pas elles.",
      },

      {
        id: "matrice", label: "sûr / idempotent", cue: 0,
        type: "slots", columns: 3,
        prompt: "Rangez les cinq verbes selon leurs deux propriétés.",
        slots: [
          { id: "sur", label: "Sûr <i>et</i> idempotent", sub: "ne modifie rien" },
          { id: "idem", label: "Idempotent seulement", sub: "modifie, mais rejouable" },
          { id: "ni", label: "Ni l'un ni l'autre", sub: "modifie, non rejouable" },
        ],
        tokens: [
          { id: "get", label: "GET", slot: "sur" },
          { id: "put", label: "PUT", slot: "idem" },
          { id: "delete", label: "DELETE", slot: "idem" },
          { id: "post", label: "POST", slot: "ni" },
          { id: "patch", label: "PATCH", slot: "ni" },
        ],
        feedbackFor: {
          "post@idem": "Vous venez de le voir : deux POST identiques créent deux lignes. Il n'est pas rejouable sans conséquence.",
          "patch@idem": "PATCH n'est idempotent que si <i>vous</i> l'écrivez ainsi. <code>{\"stock\": 5}</code> l'est ; <code>{\"stock\": \"+1\"}</code> ne l'est pas. La norme ne le garantit donc pas.",
          "delete@ni": "Rejouez un DELETE : la ressource reste supprimée, l'état final est le même. Seul le code change (204 puis 404) — et l'idempotence porte sur l'<b>état</b>, pas sur le code.",
          "put@ni": "PUT remplace par une valeur fixe : le rejouer dix fois donne exactement le même résultat qu'une fois.",
          "get@idem": "GET ne modifie rien du tout : il est donc à la fois sûr et idempotent.",
          "delete@sur": "DELETE supprime — il n'a rien de sûr. Il est en revanche rejouable sans changer l'état final.",
          "put@sur": "PUT écrit sur le serveur : il n'est pas sûr. Mais il est rejouable.",
          get: "GET ne modifie rien du tout : il est <b>sûr</b>, et tout verbe sûr est automatiquement idempotent.",
          post: "POST crée à chaque appel : deux envois identiques laissent deux ressources. Il n'est donc ni sûr, ni idempotent.",
          patch: "PATCH modifie le serveur — il n'est pas sûr. Et son idempotence dépend de ce que <i>vous</i> mettez dedans : la norme ne la garantit pas.",
        },
        explain: "Deux propriétés distinctes : <b>sûr</b> = ne modifie rien ; <b>idempotent</b> = rejouable sans changer l'état final. Tout verbe sûr est idempotent, l'inverse est faux. C'est cette grille qui décide si un client a le droit de réessayer après un délai dépassé.",
      },

    ];
  }

  PIFrames.widget("httpVerbs", function () {
    return { id: "http-verbs", masteryTarget: 0.9, shared: {}, frames: frames() };
  });
})();
