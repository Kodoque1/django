/*
 * Jeu de frames — CORS (III.H).
 *
 * Une seule frame : le reste est une démonstration en direct (voir les notes
 * orateur de la slide). Fidélité : le serveur répond normalement ; c'est le
 * navigateur qui bloque, côté client.
 */
(function () {
  "use strict";

  function frames() {
    return [
      {
        id: "qui-bloque", label: "qui bloque quoi ?", cue: 2,
        hintTitle: "Indice",
        hint: "Le même appel, exécuté depuis un script Python ou depuis <code>curl</code>, obtient un 200 avec son corps. Seul l'endroit d'où part la requête a changé.",
        type: "choice", wide: true,
        prompt: "Une page servie par <code>localhost:3000</code> appelle <code>http://localhost:8000/api/produits/</code> en JavaScript. Le serveur répond 200 — mais le navigateur refuse de remettre la réponse au script et affiche une erreur CORS. Que s'est-il passé ?",
        options: [
          { id: "navigateur", label: "<b>Le navigateur</b> a bloqué la RÉPONSE : l'appel vient d'une autre origine, et le serveur n'a pas déclaré avoir le droit d'y répondre" },
          { id: "serveur", label: "<b>Le serveur</b> a refusé la requête en silence : 200 ment, rien n'a été servi" },
          { id: "reseau", label: "<b>Le réseau</b> a intercepté l'appel entre les deux ports" },
          { id: "javascript", label: "<b>Le code JavaScript</b> a levé une exception avant même d'envoyer la requête" },
        ],
        answer: "navigateur",
        feedbackFor: {
          serveur: "Le serveur a réellement traité la requête et répondu 200 — la trace côté serveur le confirme. Ce qui a été bloqué se joue après.",
          reseau: "Aucun équipement intermédiaire n'intervient : les deux services sont sur la même machine, et la requête est arrivée à bon port.",
          javascript: "La requête EST partie — le serveur a répondu. L'échec survient au retour, pas au départ.",
        },
        explain: "Le navigateur applique sa politique d'origine : une page servie d'une origine ne peut lire la réponse d'une autre que si cette dernière l'autorise, par des en-têtes <code>Access-Control-Allow-Origin</code>. La requête est bien partie, le serveur a bien répondu, le corps a été jeté au retour. <code>requests</code> ne connaît aucune origine : il n'est jamais concerné.",
      },
    ];
  }

  PIFrames.widget("corsFrames", function () {
    return { id: "cors-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
