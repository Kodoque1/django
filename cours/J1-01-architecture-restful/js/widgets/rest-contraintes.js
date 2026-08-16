/*
 * Jeu — « Retirez la contrainte » (notion : le style REST).
 *
 * Mécanique : contrefactuel, une contrainte retirée par frame, dans l'ordre où Fielding les
 * dérive au chapitre 5 de sa thèse — client-serveur, sans état, cachable, interface uniforme,
 * système en couches, code à la demande.
 *
 * ⚠ Le contrefactuel est LÉGITIME ici, alors qu'il avait été proscrit pour les inventions du
 * Web (« on retire HTTP » ne veut rien dire : une convention peut seulement ne pas exister
 * encore). La différence est réelle et il faut la tenir : une CONTRAINTE est précisément ce
 * qu'on peut choisir de ne pas imposer. « Retirez le sans-état » décrit des systèmes qui
 * existent vraiment, et qui tournent.
 *
 * Ce que chaque `explain` doit porter, sans quoi REST se récite au lieu de se comprendre :
 * le COÛT de la contrainte, pas seulement son bénéfice. Les coûts cités sont ceux que Fielding
 * nomme lui-même — bande passante répétée, efficacité dégradée, latence ajoutée, visibilité
 * perdue.
 *
 * La frame 6 vaut le jeu : elle brise le patron des cinq précédentes. Après cinq « qu'est-ce
 * qui casse ? », la réponse est « rien » — le code à la demande est la seule contrainte que
 * Fielding déclare optionnelle. Sans ce coup, l'étudiant sort avec une liste de six choses
 * obligatoires, ce qui est faux.
 *
 * Vient APRÈS les cinq parties, qui ont construit les ingrédients sans les nommer. C'est un
 * assemblage, pas une introduction — l'inverse révélerait (§0).
 */
(function () {
  "use strict";

  var h = PIFrames.h;

  // --- le décor, commun aux six frames ---------------------------------------
  // Sans lui, chaque énoncé inventait son propre monde et les mots flottaient : « la
  // réponse » de qui, « le catalogue » de quoi, « les clients » lesquels. La scène pose le
  // système UNE fois ; les frames n'ont plus qu'à en retirer une pièce.
  //
  // `stageId` constant sur les six frames : le moteur ne remonte alors la scène qu'une seule
  // fois (pi-frames.js, mountFrame), et `onFrame` se contente de déplacer le repère.
  var PARTIES = [
    { id: "clients", titre: "des clients que vous ne connaissez pas",
      items: ["app mobile", "script partenaire", "navigateur"] },
    { id: "milieu", titre: "des intermédiaires que personne n'a choisis",
      items: ["cache", "proxy"] },
    { id: "serveur", titre: "votre code", items: ["serveur boutique", "base"] },
  ];

  function systeme(el) {
    el.innerHTML = "";
    var groupes = {};
    var rangee = h("div", { class: "rc-rangee" });

    PARTIES.forEach(function (p, i) {
      if (i) rangee.appendChild(h("div", { class: "rc-fleche", text: "→" }));
      var g = h("div", { class: "rc-groupe" }, [
        h("div", { class: "rc-puces" }, p.items.map(function (t) {
          return h("span", { class: "rc-puce", text: t });
        })),
        h("div", { class: "rc-titre", text: p.titre }),
      ]);
      groupes[p.id] = g;
      rangee.appendChild(g);
    });

    el.appendChild(h("div", { class: "rc-systeme" }, [
      h("div", { class: "rc-legende",
        text: "L'API de la boutique. De tout ceci, vous ne contrôlez que le serveur." }),
      rangee,
    ]));

    return {
      onFrame: function (f) {
        PARTIES.forEach(function (p) { groupes[p.id].classList.remove("vise"); });
        if (f.cible && groupes[f.cible]) groupes[f.cible].classList.add("vise");
      },
      destroy: function () { el.innerHTML = ""; },
    };
  }

  // Indice de MÉTHODE, pas de contenu : il ne nomme aucune contrainte, il dit comment
  // chercher. Un indice qui listerait les six réponses viderait le jeu.
  var METHODE =
    "Chaque contrainte échange quelque chose contre une propriété. La question n'est pas " +
    "« est-ce moins bien ? » mais <b>qu'est-ce qui devient impossible</b> ?";

  function frames() {
    return [
      {
        id: "client-serveur", label: "client-serveur", cue: 3,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "serveur",
        prompt: "Un logiciel de gestion comme on en écrivait avant le Web : la <b>vue</b> et le " +
          "<b>modèle de données</b> ne font qu'un seul programme.<br>Un partenaire veut " +
          "interroger vos données. Que pouvez-vous lui proposer ?",
        options: [
          { id: "ok", label: "Rien qui existe déjà : aucune interface n'est séparée des données" },
          { id: "base", label: "Un accès direct à la base de données" },
          { id: "ecran", label: "Une copie de la vue, qu'il adaptera" },
          { id: "http", label: "HTTP — il lui suffit d'envoyer une requête" },
        ],
        answer: "ok",
        feedbackFor: {
          base: "Alors il dépend de vos tables. Vous ne pouvez plus en changer une sans casser son code : vous venez de souder deux systèmes que vous vouliez séparés.",
          ecran: "Une vue affiche, elle ne répond pas à un programme. Et l'adapter supposerait qu'elle soit détachable du modèle — c'est justement ce qui manque ici.",
          http: "HTTP transporte des messages, il n'en fabrique aucun. Encore faut-il qu'un composant écoute et réponde ; c'est cela qui n'existe pas ici.",
        },
        explain: "<b>Client-serveur</b> — séparer la vue des données de leur modèle. " +
          "Le prix : deux composants au lieu d'un, donc plus de complexité. En contrepartie : " +
          "les deux évoluent séparément, et un client écrit par quelqu'un d'autre devient possible.",
      },

      {
        id: "sans-etat", label: "sans état", cue: 3,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "serveur",
        prompt: "Le serveur garde en mémoire qui vous êtes et où vous en êtes. Le trafic " +
          "double : on ajoute un <b>deuxième serveur</b> derrière un répartiteur.<br>" +
          "Que se passe-t-il ?",
        options: [
          { id: "ok", label: "Une requête sur deux tombe sur le serveur qui ne vous connaît pas" },
          { id: "lent", label: "Rien de particulier — c'est simplement plus lent" },
          { id: "perdu", label: "Les données enregistrées en base sont perdues" },
          { id: "double", label: "Chaque requête est traitée deux fois" },
        ],
        answer: "ok",
        feedbackFor: {
          lent: "Ce n'est pas une affaire de vitesse. Le second serveur n'a jamais vu votre session : il ne répond pas plus lentement, il ne peut pas répondre du tout.",
          perdu: "La base est commune aux deux serveurs, elle n'est pas en cause. Ce qui manque au second, c'est le contexte que le premier gardait dans sa <i>mémoire</i>.",
          double: "Un répartiteur envoie chaque requête à un seul serveur. Le problème n'est pas la duplication : c'est que le serveur choisi peut être celui qui ne sait rien de vous.",
        },
        explain: "<b>Sans état</b> — chaque requête porte tout son contexte. Le prix est visible " +
          "et Fielding le nomme : le même contexte repart à chaque fois, c'est de la donnée " +
          "répétée. En contrepartie : n'importe quel serveur peut répondre à n'importe quelle " +
          "requête, et c'est ce qui rend la mise à l'échelle horizontale possible.",
      },

      {
        id: "cachable", label: "cachable", cue: 2,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "milieu",
        prompt: "Aucune réponse du <b>serveur</b> ne dit si elle peut être réutilisée. Le " +
          "catalogue des produits change une fois par jour, et dix mille clients " +
          "l'affichent chaque minute.<br>Que se passe-t-il ?",
        options: [
          { id: "ok", label: "Elle interroge la base dix mille fois par minute pour un contenu identique" },
          { id: "devine", label: "Les caches finissent par deviner que le catalogue est stable" },
          { id: "refuse", label: "Les clients cessent d'eux-mêmes de redemander" },
          { id: "erreur", label: "Le serveur refuse au-delà d'un certain volume" },
        ],
        answer: "ok",
        feedbackFor: {
          devine: "Deviner, c'est risquer de servir un prix périmé. Un cache qui ne <i>sait</i> pas ne garde rien : sans déclaration explicite, s'abstenir est le seul comportement sûr.",
          refuse: "Un client demande ce dont il a besoin. Rien ne lui dit qu'il pourrait réutiliser ce qu'il a déjà reçu — il ne peut donc que redemander.",
          erreur: "Rien dans le protocole ne plafonne le volume. Le serveur répondra dix mille fois, et paiera dix mille fois.",
        },
        explain: "<b>Cachable</b> — une réponse déclare si elle peut être réutilisée, et pour " +
          "combien de temps. Le prix : le risque de servir une donnée périmée. En contrepartie : " +
          "des requêtes qui n'ont jamais lieu, les moins chères de toutes.",
      },

      {
        id: "uniforme", label: "interface uniforme", cue: 1,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "clients",
        prompt: "Chaque serveur définit ses propres opérations : <code>lireProduit</code> ici, " +
          "<code>getArticle</code> là, <code>fetchItem</code> ailleurs.<br>" +
          "Qu'est-ce qui devient impossible ?",
        options: [
          { id: "ok", label: "Écrire un outil qui les traverse tous sans rien savoir d'aucun" },
          { id: "doc", label: "Rien : il suffit de lire la documentation de chacun" },
          { id: "lire", label: "Lire les données" },
          { id: "vite", label: "Répondre rapidement" },
        ],
        answer: "ok",
        feedbackFor: {
          doc: "C'est exactement le coût : il faut lire, et recommencer à chaque serveur. Or un cache ou un proxy ne lisent aucune documentation — ils ne sauraient plus rien faire de générique.",
          lire: "Les données restent lisibles une fois qu'on sait comment demander. Le problème est qu'il faut le réapprendre à chaque fois, pour chaque serveur.",
          vite: "La vitesse n'y perd rien — elle y gagnerait plutôt : une interface taillée sur mesure est toujours plus efficace qu'une interface générique.",
        },
        explain: "<b>Interface uniforme</b> — les mêmes verbes, les mêmes codes, la même façon " +
          "de nommer, partout. Fielding l'écrit sans détour : une interface uniforme <i>dégrade " +
          "l'efficacité</i>, puisqu'on transfère sous une forme normalisée plutôt que taillée " +
          "pour le besoin. En contrepartie : n'importe quel client parle à n'importe quel " +
          "serveur, et les intermédiaires travaillent sans rien connaître de l'application.",
      },

      {
        id: "couches", label: "système en couches", cue: 1,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "milieu",
        prompt: "Le client voit toute la chaîne : il sait qu'il parle au <b>serveur 3 du centre " +
          "B</b>, et il s'y adresse nommément.<br>On veut insérer un cache devant. Que se passe-t-il ?",
        options: [
          { id: "ok", label: "Le client continue de viser le serveur 3 : le cache est contourné, ou il casse" },
          { id: "transparent", label: "Rien : un cache est transparent par nature" },
          { id: "lent", label: "L'ensemble ralentit d'un cran" },
          { id: "secu", label: "Le cache doit s'authentifier auprès du client" },
        ],
        answer: "ok",
        feedbackFor: {
          transparent: "Il l'est quand un composant ne connaît que son voisin. Ici le client s'adresse à une machine <i>nommée</i> : quelque chose qui répond à sa place est, de son point de vue, une anomalie.",
          lent: "Un intermédiaire ajoute bien de la latence — c'est le prix de cette contrainte, pas sa conséquence quand on la retire. Ici le client ne parle à personne d'autre qu'à la machine qu'il a désignée.",
          secu: "L'authentification ne règle rien : le client ne cherche pas à savoir <i>qui</i> répond, il exige que ce soit le serveur 3.",
        },
        explain: "<b>Système en couches</b> — un composant ne connaît que sa voisine. C'est " +
          "l'idée de la pile TCP/IP, portée cette fois à l'application. Le prix : de la latence " +
          "à chaque couche traversée. En contrepartie : insérer un cache, un répartiteur ou une " +
          "passerelle sans que personne d'autre n'ait à le savoir.",
      },

      {
        id: "code-demande", label: "code à la demande", cue: 0,
        hintTitle: "Comment chercher", hint: METHODE,
        type: "choice", wide: true,
        stage: systeme, stageId: "systeme", cible: "clients",
        prompt: "Le serveur peut envoyer au client du <b>code à exécuter</b> — c'est ce que fait " +
          "toute page qui embarque du JavaScript.<br>Si l'API de la boutique n'en envoie " +
          "jamais, qu'est-ce qui casse ?",
        options: [
          { id: "ok", label: "Rien : c'est la seule contrainte dont on puisse se passer" },
          { id: "js", label: "Les navigateurs ne fonctionnent plus" },
          { id: "api", label: "Une API ne peut plus répondre" },
          { id: "cache", label: "Les caches deviennent inutiles" },
        ],
        answer: "ok",
        feedbackFor: {
          js: "Une page sans JavaScript reste une page : le serveur envoie du contenu, le client l'affiche. On perd des clients plus simples et de l'extensibilité — pas le fonctionnement.",
          api: "Une API qui renvoie du JSON n'envoie aucun code exécutable, et elle répond parfaitement. La plupart des API s'en passent sans même le savoir.",
          cache: "Les caches dépendent de la contrainte de cachabilité, pas de celle-ci. Les deux sont indépendantes.",
        },
        explain: "<b>Code à la demande</b> — la seule que Fielding déclare <b>optionnelle</b>. " +
          "Les cinq autres définissent le style ; celle-ci s'ajoute quand on la veut. Son prix : " +
          "une perte de visibilité, un intermédiaire ne pouvant plus savoir ce que fait le " +
          "message qu'il transporte. En contrepartie : des clients qu'on étend sans les redéployer.",
        explainAfterError: "<b>Code à la demande</b> — la seule des six que Fielding déclare " +
          "<b>optionnelle</b>. Après cinq contraintes dont le retrait casse quelque chose, " +
          "celle-ci ne casse rien : une API en JSON n'en use pas, et reste conforme au style.",
      },
    ];
  }

  PIFrames.widget("restContraintes", function () {
    return { id: "rest-contraintes", masteryTarget: 0.9, frames: frames() };
  });
})();
