#!/usr/bin/env node
/**
 * banc-jeux.js — vérifie les jeux de pédagogie programmée hors navigateur (jsdom).
 *
 *   node outils/banc-jeux.js                          # tous les modules
 *   node outils/banc-jeux.js J2-03-…                 # un seul
 *
 * ⚠ Le filtre par module ne restreint QUE les passes A et B, qui jugent chaque jeu isolément.
 * La passe C compare les jeux ENTRE EUX : la restreindre à un module la rendrait verte sur une
 * divergence inter-modules, c'est-à-dire précisément le défaut qu'elle existe pour attraper.
 * Tous les fichiers sont donc toujours chargés ; seul le périmètre du jugement se réduit.
 *
 * Deux passes, dans cet ordre d'importance :
 *
 *   A. COMPLÉTUDE DES FEEDBACKS — pour chaque erreur qu'un étudiant peut réellement
 *      commettre, `feedbackFor` doit fournir un message. Un repli sur `explain` ou sur
 *      le message générique du moteur est compté comme un DÉFAUT, pas comme un filet :
 *      c'est la règle non négociable de la pédagogie programmée (« un message par erreur
 *      prévue »). C'est cette passe qui a le plus de valeur — elle voit des trous qu'un
 *      parcours manuel ne rencontrerait qu'au hasard des clics.
 *
 *   B. PARCOURS — chaque jeu est joué de bout en bout, en se trompant à chaque frame,
 *      jusqu'au bilan. Vérifie qu'aucun rendu ne casse et que la boucle se termine.
 *
 * Prérequis : jsdom. S'il est installé globalement (cas de ce poste), exporter
 *   NODE_PATH=/usr/local/lib/node_modules
 */
"use strict";

const fs = require("fs");
const path = require("path");

const RACINE = path.resolve(__dirname, "..");
const MOTEUR = path.join(RACINE, "cours/js/pi-frames.js");
const COURS = path.join(RACINE, "cours");

// Les modules demandés en argument, comme pour les trois bancs Python. Vide = tous.
const DEMANDES = process.argv.slice(2);

// Découverte automatique : chaque module a son `js/widgets/`. Un chemin en dur ici ferait
// que les modules suivants passeraient sous le radar — et c'est justement la passe A, la
// plus utile, qui les manquerait.
//
// Le module d'origine est retenu avec le fichier : c'est lui qui permet de restreindre les
// passes A et B sans priver la passe C du corpus complet.
function fichiersDeJeux() {
  return fs
    .readdirSync(COURS)
    .filter((d) => fs.existsSync(path.join(COURS, d, "js/widgets")))
    .sort()
    .flatMap((d) =>
      fs
        .readdirSync(path.join(COURS, d, "js/widgets"))
        .filter((f) => f.endsWith(".js"))
        .sort()
        .map((f) => ({ module: d, chemin: path.join(COURS, d, "js/widgets", f) }))
    );
}

let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (e) {
  console.error("✗ jsdom introuvable. Essayer :\n" +
    "    NODE_PATH=/usr/local/lib/node_modules node outils/banc-jeux.js\n" +
    "  ou : npm install -g jsdom");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Chargement : on intercepte PIFrames.widget pour capturer les fabriques de config,
// ce qui donne accès aux frames sans les dupliquer ici.
// ---------------------------------------------------------------------------
function charger() {
  const dom = new JSDOM(
    "<!doctype html><html><body><div id='mount'></div></body></html>",
    // « outside-only » : les scripts de la page ne s'exécutent pas, mais window.eval
    // évalue DANS le contexte de la fenêtre. Sans cela, `window.PIFrames` n'existe pas.
    { runScripts: "outside-only", pretendToBeVisual: true }
  );
  const w = dom.window;
  w.eval(fs.readFileSync(MOTEUR, "utf8"));

  const fabriques = {};
  const moduleDe = {};
  let moduleCourant = null;
  const vrai = w.PIFrames.widget;
  w.PIFrames.widget = function (nom, fabrique) {
    fabriques[nom] = fabrique;
    moduleDe[nom] = moduleCourant;
    return vrai(nom, fabrique);
  };

  // Les simulations vivent dans les mêmes dossiers mais ne passent pas par
  // `PIFrames.widget` : elles ne sont donc pas capturées, et c'est voulu — elles sont
  // vérifiées par `banc-deck.py`, qui seul peut juger d'une animation.
  //
  // TOUS les fichiers sont chargés, même quand un module est demandé : la passe C a besoin
  // du corpus entier pour comparer les jeux entre eux.
  const fichiers = fichiersDeJeux();
  fichiers.forEach((f) => {
    moduleCourant = f.module;
    w.eval(fs.readFileSync(f.chemin, "utf8"));
  });
  moduleCourant = null;

  return { dom, w, fabriques, moduleDe, fichiers };
}

// Les jeux du périmètre demandé. Vide = tous.
function restreindre(fabriques, moduleDe) {
  if (!DEMANDES.length) return fabriques;
  const retenus = {};
  Object.keys(fabriques).forEach((nom) => {
    if (DEMANDES.includes(moduleDe[nom])) retenus[nom] = fabriques[nom];
  });
  return retenus;
}

// ---------------------------------------------------------------------------
// Passe A — complétude des feedbacks
// ---------------------------------------------------------------------------
// Pour chaque type de frame, on énumère les erreurs qu'un étudiant peut commettre et on
// vérifie qu'une clé de `feedbackFor` y répond. Les règles de résolution reproduisent
// exactement celles de pi-frames.js (renderers.*.submit).
function trousDeFeedback(frame) {
  const fb = frame.feedbackFor || {};
  const trous = [];
  const a = (quoi) => trous.push(quoi);

  switch (frame.type) {
    case "choice":
      // renderers.choice : fb[option] || explain
      (frame.options || []).forEach((o) => {
        if (o.sep || o.id === frame.answer) return;
        if (!fb[o.id]) a(`option « ${o.id} » sans message`);
      });
      break;

    case "multi":
      // renderers.multi : fb[coché à tort] || fb[oublié] || explain
      // Toute option peut jouer l'un des deux rôles.
      (frame.options || []).forEach((o) => {
        if (!fb[o.id]) a(`option « ${o.id} » sans message`);
      });
      break;

    case "slots": {
      // renderers.slots : fb[token@slot] || fb[token] || message générique du moteur
      const slots = (frame.slots || []).map((s) => s.id);
      (frame.tokens || []).forEach((t) => {
        if (fb[t.id]) return;
        const manquants = slots.filter((s) => s !== t.slot && !fb[t.id + "@" + s]);
        if (manquants.length) {
          a(`étiquette « ${t.id} » : ni repli fb["${t.id}"], ni fb["${t.id}@${manquants[0]}"]`);
        }
      });
      break;
    }

    case "order": {
      // renderers.order : fb[item@position] || fb[item] || message générique du moteur
      const items = frame.items || [];
      items.forEach((it) => {
        if (fb[it.id]) return;
        const positions = items
          .map((_, i) => i)
          .filter((i) => items[i].id !== it.id && !fb[it.id + "@" + i]);
        if (positions.length) {
          a(`item « ${it.id} » : ni repli fb["${it.id}"], ni fb["${it.id}@${positions[0]}"]`);
        }
      });
      break;
    }

    case "build": {
      // renderers.build : fb[jeton@position] || fb[jeton] || fb[_manque:attendu] || explain
      const rep = frame.answer || [];
      (frame.tokens || []).forEach((t) => {
        if (fb[t.id]) return;
        const aUnePosition = Object.keys(fb).some((k) => k.indexOf(t.id + "@") === 0);
        if (!aUnePosition) a(`jeton « ${t.id} » sans message`);
      });
      // Séquence incomplète : le moteur cherche alors _manque:<attendu>.
      const sansManque = rep.filter((id) => !fb["_manque:" + id]);
      if (sansManque.length === rep.length && rep.length) {
        a(`aucune clé « _manque:… » : une suite incomplète tombe sur explain`);
      }
      break;
    }

    case "free":
      // renderers.free : fb[saisie exacte] || fb._defaut || explain
      if (!fb._defaut) a("pas de fb._defaut : toute saisie imprévue tombe sur explain");
      break;

    default:
      a(`type inconnu « ${frame.type} »`);
  }
  return trous;
}

function passeA(fabriques) {
  console.log("PASSE A — complétude des feedbacks\n");
  let defauts = 0;
  let frames = 0;

  Object.keys(fabriques).sort().forEach((nom) => {
    const cfg = fabriques[nom]();
    const problemes = [];
    (cfg.frames || []).forEach((f) => {
      frames++;
      trousDeFeedback(f).forEach((t) => problemes.push(`${f.id} · ${t}`));
    });
    if (problemes.length) {
      defauts += problemes.length;
      console.log(`  ✗ ${nom} — ${problemes.length} trou(s)`);
      problemes.forEach((p) => console.log(`      ${p}`));
    } else {
      console.log(`  ✓ ${nom} — ${(cfg.frames || []).length} frames, chaque erreur prévue a son message`);
    }
  });
  console.log(`\n  ${frames} frames examinées.\n`);
  return defauts;
}

// ---------------------------------------------------------------------------
// Passe B — parcours
// ---------------------------------------------------------------------------
// Le moteur montre la réponse au 2ᵉ échec et clôt la frame : une erreur délibérée puis
// deux validations suffisent donc toujours à avancer, quel que soit le type.
function jouer(w, nom, fabrique) {
  const doc = w.document;
  const mount = doc.getElementById("mount");
  mount.innerHTML = "";

  const jeu = w.PIFrames.create(mount, fabrique());
  const q = (s) => mount.querySelector(s);
  const qa = (s) => Array.from(mount.querySelectorAll(s));
  const clic = (el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const visible = (el) => el && el.style.display !== "none";
  const bouton = (txt) =>
    qa(".pi-actions .pi-btn.primary").filter((b) => visible(b) && b.textContent.indexOf(txt) === 0)[0];

  const rapport = { frames: 0, erreurs: 0, bilan: false };

  for (let tour = 0; tour < 400; tour++) {
    if (q(".pi-summary")) { rapport.bilan = true; break; }

    const suivant = qa(".pi-actions .pi-btn.primary")
      .filter((b) => visible(b) && /Suivant|bilan/.test(b.textContent))[0];
    if (suivant) { clic(suivant); continue; }

    rapport.frames++;
    const valider = () => { const b = bouton("Valider"); if (b && !b.disabled) clic(b); };

    if (q(".pi-free")) {
      const inp = q(".pi-free");
      inp.value = "réponse volontairement fausse";
      inp.dispatchEvent(new w.Event("input", { bubbles: true }));
      valider(); rapport.erreurs++;
      valider();
    } else if (q(".pi-order-item")) {
      // Auto-validant : une erreur ne clôt pas la frame, il faut finir la séquence.
      const enPremier = qa(".pi-order-item:not([disabled])");
      if (enPremier.length > 1) { clic(enPremier[enPremier.length - 1]); rapport.erreurs++; }
      for (let k = 0; k < 60; k++) {
        const restants = qa(".pi-order-item:not([disabled])");
        if (!restants.length) break;
        restants.forEach((b) => { if (!b.disabled) clic(b); });
      }
    } else if (q(".pi-build-pool .pi-token")) {
      const jetons = qa(".pi-build-pool .pi-token");
      clic(jetons[jetons.length - 1]);
      valider(); rapport.erreurs++;
      valider();
    } else if (q(".pi-token[data-id]")) {
      // slots : tout empiler dans la première case — au moins un placement sera faux.
      const cases = qa(".pi-slot");
      qa(".pi-token[data-id]").forEach((t) => { clic(t); clic(cases[0]); });
      valider(); rapport.erreurs++;
      valider();
    } else if (q(".pi-opt")) {
      const multi = !!q(".pi-options.multi");
      const vivantes = () => qa(".pi-opt").filter((o) => !o.classList.contains("dead"));
      clic(vivantes()[0]);
      valider(); rapport.erreurs++;
      if (!multi) { const v = vivantes(); if (v.length) clic(v[0]); }
      valider();
    } else {
      throw new Error(`${nom} : aucune interaction reconnue à la frame ${rapport.frames}`);
    }

    // Filet : si la frame n'a pas abouti, le moteur a changé d'état sans qu'on le voie.
    if (!bouton("Valider") && !qa(".pi-actions .pi-btn.primary").filter(visible).length) {
      throw new Error(`${nom} : frame ${rapport.frames} bloquée, aucun bouton actif`);
    }
  }

  jeu.destroy();
  if (mount.innerHTML !== "") throw new Error(`${nom} : destroy() a laissé du DOM derrière lui`);
  return rapport;
}

function passeB(w, fabriques) {
  console.log("PASSE B — parcours complet, en se trompant à chaque frame\n");
  let echecs = 0;
  Object.keys(fabriques).sort().forEach((nom) => {
    try {
      const r = jouer(w, nom, fabriques[nom]);
      if (!r.bilan) {
        echecs++;
        console.log(`  ✗ ${nom} — bilan jamais atteint (${r.frames} frames jouées)`);
      } else {
        console.log(`  ✓ ${nom} — ${r.frames} frames jouées, ${r.erreurs} erreurs provoquées, ` +
          `bilan atteint, démontage propre`);
      }
    } catch (e) {
      echecs++;
      console.log(`  ✗ ${nom} — ${e.message}`);
    }
  });
  console.log("");
  return echecs;
}

// ---------------------------------------------------------------------------
// Passe C — le bandeau est le même partout
// ---------------------------------------------------------------------------
// Ce qu'un étudiant voit en arrivant sur une slide de jeu ne doit pas dépendre du jeu.
// Le cas qui a motivé cette passe : `status-triage` posait `duel: true`, ce qui affichait
// le chrono et agrandissait le bandeau — sur ce jeu-là seulement, et dès la manche solo.
// Le mode duel est un geste de l'enseignant pendant la séance (le bouton est sur chaque
// jeu), jamais un réglage écrit dans une config.
//
// `shared` n'est PAS ici : c'est un état partagé entre frames, une différence
// fonctionnelle. Cette passe ne regarde que ce qui change l'affichage de départ.
const CLES_PRESENTATION = ["duel"];

// Une divergence n'est pas interdite pour toujours — elle doit être DÉCLARÉE, avec sa
// raison, comme les exemptions des autres bancs. La liste vide est l'état normal.
const DIVERGENCES_ADMISES = [
  // ["nom-du-jeu", "duel", "raison"],
];

function passeC(fabriques) {
  console.log("PASSE C — uniformité du bandeau\n");
  let defauts = 0;
  const noms = Object.keys(fabriques).sort();
  const cibles = new Set();

  noms.forEach((nom) => {
    const cfg = fabriques[nom]();
    CLES_PRESENTATION.forEach((cle) => {
      if (cfg[cle] === undefined) return;
      if (DIVERGENCES_ADMISES.some(([n, c]) => n === nom && c === cle)) return;
      defauts++;
      console.log(`  ✗ ${nom} — pose « ${cle}: ${JSON.stringify(cfg[cle])} »`);
      console.log("      le bandeau doit être identique sur tous les jeux au montage");
    });
    cibles.add(cfg.masteryTarget === undefined ? "(absente)" : String(cfg.masteryTarget));
  });

  if (cibles.size > 1) {
    defauts++;
    console.log(`  ✗ masteryTarget diverge : ${[...cibles].join(" · ")}`);
    console.log("      un bilan ne peut pas changer de sens d'un jeu à l'autre");
  }

  if (!defauts) {
    console.log(`  ✓ ${noms.length} jeux — même bandeau, même cible (${[...cibles][0]})`);
  }
  console.log("");
  return defauts;
}

// ---------------------------------------------------------------------------
const { dom, w, fabriques, moduleDe, fichiers } = charger();
const perimetre = restreindre(fabriques, moduleDe);
const nb = Object.keys(perimetre).length;

console.log(`banc-jeux — ${fichiers.length} fichiers, ${Object.keys(fabriques).length} jeux enregistrés`);
if (DEMANDES.length) {
  // Le compte examiné doit se voir : un module mal orthographié donnerait sinon un vert
  // qui n'a rien vérifié.
  console.log(`             périmètre demandé : ${DEMANDES.join(" · ")} → ${nb} jeu(x) examiné(s) ` +
    `(passe C toujours sur le corpus complet)`);
}
console.log("");

if (DEMANDES.length && nb === 0) {
  console.log(`❌ banc-jeux : aucun jeu ne correspond à « ${DEMANDES.join(" · ")} ».`);
  console.log(`   Modules disponibles : ${[...new Set(fichiers.map((f) => f.module))].join(" · ")}\n`);
  dom.window.close();
  process.exit(1);
}

const erreursConsole = [];
w.addEventListener("error", (e) => erreursConsole.push(String(e.message)));

const defauts = passeA(perimetre);
const divergences = passeC(fabriques);
const echecs = passeB(w, perimetre);

if (erreursConsole.length) {
  console.log("Erreurs remontées par la fenêtre :");
  erreursConsole.forEach((e) => console.log("  " + e));
}

dom.window.close();

const total = defauts + divergences + echecs + erreursConsole.length;
console.log(total === 0
  ? "✅ banc-jeux : tout est vert\n"
  : `❌ banc-jeux : ${defauts} trou(s) de feedback, ${divergences} divergence(s) de bandeau, ` +
    `${echecs} parcours en échec\n`);
process.exit(total === 0 ? 0 : 1);
