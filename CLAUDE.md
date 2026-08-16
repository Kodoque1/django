# Contrat pédagogique — cours Django IPSSI

Ce fichier prime sur les habitudes. Il tient la cohérence du cours pendant sa production
rapide. En cas de doute pendant l'écriture d'un module, **c'est ici qu'on tranche** ; les
documents détaillés (`README.md` pour le pilotage, `cours/README.md` pour le moteur,
`design/jeux/00-contrat-de-design.md` pour les jeux) précisent, ils ne contredisent pas.

## 0. La règle qui prime sur toutes les autres

> **Aucune révélation avant que l'apprenant ait construit une réponse.**

Concrètement, et c'est la faute la plus facile à commettre : **une slide ne dit jamais ce que la
frame suivante fait construire.** Si le contenu d'une slide se retrouve dans le `prompt`, le
`hint` ou l'`explain` d'une frame qui suit, la slide est en trop — ou elle est mal placée.

Corollaire : la **matière de référence** (un catalogue de codes, un tableau de correspondance)
vient **après** le dispositif qui la fait découvrir, jamais avant.

Vérifié par `outils/banc-revelation.py`, qui signale toute suite de **six mots** commune à une
slide et à l'`explain` ou au `hint` d'une frame qui la suit. Six mots consécutifs ne sont pas une
coïncidence de vocabulaire : c'est une copie. Sa limite est nette et il faut la connaître — il
n'attrape **pas** une révélation reformulée. Une slide qui dit « chaque couche ignore ses voisines
éloignées » devant une frame qui fait construire « chaque couche ne connaît que sa voisine » passe
au vert. C'est une aide à la relecture, pas un substitut.

Il connaît une exemption, et une seule forme d'exemption : la slide qui **pose la question sans y
répondre**, la frame délivrant la réponse. C'est le patron correct — le récit peut être partagé,
la conclusion non.

## 0 bis. Le cours ne parle jamais de lui-même

Aucune remarque **méta** dans ce que voit l'étudiant. Pas de durée annoncée, pas de « vous
allez… », pas de renvoi à un autre dispositif (« vous le mesurerez au TP », « la simulation vient
de montrer », « dans la partie suivante »), pas d'objectifs déclarés, pas de « à retenir ».

> **On énonce le fait, on pose la question, on corrige l'erreur. Rien d'autre.**

Ce n'est pas une question de ton : une annonce est une révélation déguisée (§0), et un renvoi au
dispositif détourne l'attention de la notion vers le cours. Garder le fait, retirer l'emballage :

| ❌ | ✅ |
|---|---|
| « Vous le mesurerez au TP (temps 1.2) avec un compteur qui restera à zéro. » | *(supprimé — la phrase d'avant dit déjà que la vue n'est pas appelée)* |
| « Vous venez de voir la trace dans la simulation — aucune ligne « vue ». » | « La trace ne comporte aucune ligne « vue » : la fonction n'a pas tourné. » |
| « À retenir : chaque couche ne connaît que sa voisine. » | « Chaque couche ne connaît que sa voisine. » |
| « Ce qui arrive quand il en manque une, vous allez le prédire. » | « Trois inventions, trois verbes. » |

Le méta a **deux lieux légitimes**, et seulement deux :

- les **notes orateur** (`<aside class="notes">`) — c'est votre script : minutage, déroulé,
  « faire prédire avant de lancer », objectifs pédagogiques ;
- les **documents de pilotage** — `README.md`, `cours/index.html`, `design/`.

Conséquence directe : **pas de slide « Objectifs de la journée »**. La pédagogie programmée ne
déclare pas ce qu'on va apprendre, elle le fait apprendre. Les objectifs vont en notes.

Vérifié par `outils/banc-redaction.py`, qui n'examine que le texte vu par l'étudiant — slides
hors notes, et `prompt` / `hint` / `explain` / `feedbackFor` des frames. Les faux positifs se
traitent par exemption explicite dans le banc, jamais en tordant la formulation.

## 0 ter. Un mot, une chose

Le même objet porte **le même nom partout**. Deux mots pour une même chose obligent l'étudiant à
vérifier qu'il s'agit bien de la même — un coût inutile, et une source d'erreur quand il conclut
que non. Décisions prises : **couche** (jamais « étage »), **partie** d'une URL (jamais
« morceau »), **segment** TCP (jamais « morceau »), **2ᵉ passage** pour une question réinjectée
(jamais « reprise », opaque), **question** et non « item », qui est du jargon.

Et pas de **consigne redondante** : une question posée appelle déjà une réponse construite,
« Prédisez » n'ajoute rien. Quand « Prédisez. » tient lieu d'énoncé, c'est le signe que la
question n'a pas été posée.

Plus grave que l'incohérence : un mot qui **autorise un raisonnement faux**. « Brique » désignait
URL, HTTP et HTML — et suggérait des pièces démontables, d'où « on retire HTTP », une phrase sans
référent. Ce sont des **conventions** : elles ne se retirent pas, elles peuvent ne pas exister
encore. Le terme est proscrit.

> Avant de nommer : ce mot autorise-t-il une phrase que je ne voudrais pas voir écrite ?

Le `LEXIQUE` d'`outils/banc-redaction.py` tient la liste des termes proscrits, chacun avec son
remplacement et sa raison.

### Les calques de l'anglais

Le cours s'écrit en français. Le piège n'est pas le mot anglais — qui se voit — mais **le mot
français employé au sens anglais**, qui passe inaperçu : « ce qu'il faut emporter » pour
*takeaways*, « librairie » pour *library*, « supporter » pour *support*, « digital » pour
*numérique*.

Contre-exemples à connaître, parce qu'ils ressemblent à des calques sans en être :

| Tour | Verdict |
|---|---|
| « la requête est **définitivement** perdue » | ✅ *pour toujours*. Le calque serait de l'employer pour *certainement* |
| « une `RuntimeError` pour vous **prévenir** » | ✅ *avertir*. Le calque serait pour *empêcher* |
| « un QuerySet, **éventuellement** vide » | ✅ *le cas échéant*. Le calque serait pour *finalement* |

D'où une limite assumée : **cette vigilance ne s'automatise qu'à la marge.** Un balayage large
a produit quatre faux positifs sur six correspondances. Le lexique ne retient donc que les
locutions **jamais** correctes ici ; le reste relève de la relecture.

#### La famille la plus coûteuse : l'image importée

Trois familles de décalages ont été relevées à l'usage. La liste des termes vit dans le
`LEXIQUE` ; ce qui suit range les **causes**, parce que c'est la cause qui se prévient.

| Famille | Ce qui a été repris |
|---|---|
| **A · l'image importée** | « ce qu'il faut emporter » ← *takeaways* · « l'oignon des middlewares » ← *the middleware onion* · « ce qu'on achète » ← *what you buy* · « brique », qui n'est pas un calque mais la même faute |
| **B · le mot français au sens anglais** | librairie, supporter, digital, ça fait sens |
| **C · l'abréviation anglaise en phrase française** | « 401 **vs** 403 » — le français écrit *ou*, *contre*, *face à* |

**La famille A est la plus fréquente et la plus invisible**, parce qu'elle ne contient aucun
mot anglais. La prose technique anglaise tourne à la métaphore — *onion*, *buy*, *takeaway*,
*ship it*, *spin up*, *under the hood* — là où la prose technique française énonce le mécanisme.
Traduire l'image mot à mot importe la métaphore avec elle, et souvent un raisonnement faux : on
ne « retire » pas une brique qui est une convention, on n'« achète » pas une propriété
d'architecture.

Ce n'est donc pas une règle de plus : c'est **le §4 — représentation, jamais métaphore —
appliqué à la langue**. Et c'est l'endroit où on l'enfreint sans s'en apercevoir. La preuve par
l'absurde a été produite dans ce dépôt : le fichier de la simulation des middlewares affirmait
« ce n'est pas une métaphore » quatre lignes sous un titre qui en était une.

> **Le test** : est-ce que je décris ce qui se passe, ou est-ce que je le compare à autre chose ?
> Si c'est le second, la phrase vient probablement de l'anglais.

Les quatre cas de la famille A ont tous été trouvés **à la lecture, aucun par un banc** — ce qui
confirme la limite ci-dessus au lieu de la contredire. Un motif n'entre au `LEXIQUE` qu'après
coup, pour empêcher la récidive.

## 1. Les trois régimes

| Régime | Dispositif | Ce qu'on y fait | Sur quoi |
|---|---|---|---|
| **Construire** | frame · simulation · jeu | câbler, prédire, diagnostiquer | un modèle fidèle mais simulé |
| **Mesurer** | le TP d'instrumentation | falsifier ou confirmer ce que le cours affirmait | le vrai Django, avec `assert` |
| **Livrer** | le projet des Jours 3 et 5 | assumer les conséquences | une application qui tourne |

**Une notion traitée deux fois doit changer de régime.** Deux dispositifs qui font tous deux
*construire* la même chose : l'un est en trop.

## 2. Quel dispositif pour quelle opération mentale

C'est le choix structurant, et il se fait **avant** d'écrire quoi que ce soit.

| L'opération demandée est… | Dispositif | Pourquoi |
|---|---|---|
| se souvenir · classer sous règle · suivre une procédure | **frame** (`pi-frames.js`) | dix fois moins cher qu'un jeu, et pédagogiquement supérieur ici |
| **voir un mécanisme se dérouler** dans le temps | **simulation** | on ne comprend une propagation qu'en la regardant se propager |
| composer · prédire · diagnostiquer · spécifier · chercher un contre-exemple | **jeu** | seul dispositif qui met en défaut une intuition |
| exécuter une commande, montrer une interface | **démonstration en direct** | rien à construire, ne pas fabriquer d'interactif |

Choisir un dispositif trop lourd est aussi grave que d'en choisir un trop léger : le budget
consommé ailleurs manque là où il aurait compté.

## 3. Les slides

- **Au plus deux slides informatives par partie**, hors intercalaire de titre.
- Une slide informative sert à **motiver** (« pourquoi ce chapitre existe ») ou à **cadrer** —
  jamais à énoncer ce qui va être découvert, ni à annoncer le programme (§0 bis).
- Les notes orateur portent le développement. La slide n'est pas le script.
- Un document historique **n'est pas une décoration** : il devient le `stage` d'une frame
  (« voici la proposition de 1989, surlignez les trois inventions qu'elle décrit »). Sinon il n'a
  rien à faire là.

## 3 bis. Ouvrir sur le problème

> **Une partie s'ouvre sur ce qui ne marche pas sans elle, jamais sur le mécanisme.**

Un chapitre qui commence par « voici comment on écrit une route » demande d'apprendre une syntaxe
avant d'avoir rencontré la difficulté qu'elle lève. L'apprenant retient alors une procédure, pas
une raison — et il ne saura pas quand s'en servir.

Le test, avant d'écrire la première ligne d'une partie : **si on retirait ce chapitre, qu'est-ce
qui casserait ?** La réponse est le sous-titre de l'intercalaire.

Trois formes, de la moins chère à la plus chère — prendre la première qui suffit :

| Forme | Quand | Exemple |
|---|---|---|
| **sous-titre + notes de l'intercalaire** | le cas normal, coût nul | « Une URL arrive. Quelle fonction doit répondre ? » |
| **la première frame du dispositif** | la partie ouvre sur un jeu | `web-invention` : « 1989, rien ne permet encore de désigner un document » |
| **une slide de motivation** | un artefact réel la porte | le serveur en six lignes de `socket` · l'incident du Web Accelerator |

La deuxième est la meilleure : le problème y est **construit** au lieu d'être énoncé. La
troisième ne se justifie que par un artefact — du code qui tourne, un incident daté. Jamais un
paragraphe d'intentions.

**Le sous-titre nomme le problème, pas la solution.** C'est la faute qu'on commet sans s'en
apercevoir, et elle coûte double : elle gâche l'occasion d'ouvrir, et elle révèle (§0). « Une
liste, lue dans l'ordre, jusqu'au premier qui répond » était le sous-titre de la partie dont la
simulation fait précisément découvrir ça.

Aucun banc ne le voit : la révélation est ici une **paraphrase**, pas une copie. Cette règle se
relit à la main, comme les calques et le commentaire sur la difficulté d'une question.

## 4. Représentation, jamais métaphore

Le visuel se conçoit **en premier** — avant la mécanique. Mais il doit être **l'objet lui-même** :

- ✅ le plateau d'`url-anatomy` **est** l'URL, découpée en morceaux cliquables ;
- ✅ l'emballage de `tcpip-stack` **est** l'encapsulation — emboîter *est* ce que fait la pile ;
- ❌ « la requête est un colis qui traverse une usine » : une analogie venue d'ailleurs, qu'il
  faudra tordre au troisième niveau.

Une analogie extérieure est un signal d'alarme, pas une trouvaille. Si l'objet n'a aucune forme
visible, la question à se poser est *qu'est-ce qui change quand ça marche ?* — et c'est **ça**
qu'on dessine.

## 5. Les quatre tests d'une simulation

Une simulation est une **animation interactive qui montre un mécanisme**. Le mode d'échec est
connu et documenté : des sous-slides déguisées en menu.

> **Une simulation calcule ; un menu sélectionne.**

Contre-exemple à ne pas reproduire — `archi/cours/J4-09-bases-de-donnees/js/widgets/db-type-selector.js` :
« cliquer une carte l'illustre en grand », **zéro** `requestAnimationFrame`, cinq textes rédigés
d'avance. Patron de référence — `archi/cours/J2-04-architecture-n-tiers/js/widgets/flow-ntiers.js` :
topologie SVG et paquet dont la position est interpolée (`packet.setAttribute("cx", a.x + (b.x - a.x) * t)`).

À appliquer à **chaque** simulation avant de l'écrire :

1. **État de modèle** — existe-t-il un état qui évolue, distinct de ce qui est affiché (une file,
   une position, un compteur) ?
2. **Axe du temps** — quelque chose met du temps, et on le voit se produire ?
3. **Calculé, pas énuméré** — si l'auteur a pu écrire tous les cas à la main, c'est un menu.
4. **Lisible sans texte** — en retirant tous les libellés, reste-t-il quelque chose qui bouge et
   qu'on comprend ?

Un « non » à l'un des quatre : ce n'est pas une simulation, c'est une slide avec des onglets.

## 6. Les frames

Les six règles du moteur sont dans `cours/README.md`. Les deux non négociables :

- **Un message par erreur prévue** (`feedbackFor`). Un repli sur `explain` ou sur le message
  générique du moteur est un **défaut**, pas un filet — `outils/banc-jeux.js` le détecte.
- **La difficulté monte par retrait d'indice** (`cue` 3 → 0), jamais par complexification.

Et une règle de présentation : **le bandeau est le même sur tous les jeux au montage.** Le mode
duel — chrono affiché, bandeau agrandi pour le vidéoprojecteur — est un **geste de l'enseignant
pendant la séance**, un bouton présent sur chaque jeu, jamais un réglage écrit dans une config.
La pédagogie programmée est auto-rythmée : une horloge qui tourne pendant que l'apprenant
construit sa réponse travaille contre la cible des 90 % au premier essai. La durée figure au
bilan, une fois la partie finie — une mesure, pas une pression. Vérifié par la passe C de
`banc-jeux`.

## 7. Cheatsheets et version étudiante

- La **version étudiante** ne contient que les sections `widget-slide` — les jeux et les frames,
  pas le cours.
- Une **cheatsheet**, consultée pendant la séance, contient de la **syntaxe et du vocabulaire** :
  signatures, notation, noms de méthodes. **Jamais la discrimination qu'une frame demande.** Le
  catalogue des codes d'état n'y figure pas : c'est la réponse du jeu du triage.
- La **fiche de révision**, engendrée depuis les champs `explain`, se distribue **après** la
  séance.

## 8. La fidélité l'emporte sur la commodité

L'oracle est **`tp-instrumentation/verifier.py`** : 22 comportements mesurés sur un vrai Django
5.2. Toute affirmation sur Django ou DRF s'y tranche.

> **Quand la mesure contredit le support, c'est le support qui change.**

Précédent : `PUT` n'écrase pas un champ `required=False` absent — vrai du protocole HTTP, faux de
DRF. Le support dit désormais dans quel registre il parle.

Si un raccourci pédagogique est nécessaire, il est **déclaré comme limite**, jamais laissé
silencieux.

## 9. Conventions pratiques

- **Widget** : `window.CourseWidgets.<camelCase> = { init, destroy }` ; slide
  `class="widget-slide" data-widget="<camelCase>"` avec un enfant `data-widget-mount`.
  Contrat identique entre `archi/` et `django/` — une simulation d'archi se monte ici sans
  modification.
- **CSS des simulations** : le socle `cours/css/simulations.css` déclare **une fois** les rôles
  partagés — `sim-widget / -stage / -svg / -node / -packet / -edge / -controls / -readout /
  -log / -legend`. Une nouvelle simulation les réutilise et n'ajoute un préfixe propre que pour
  ce qui lui est **vraiment** spécifique. (Archi fait l'inverse — 1 187 lignes pour 24 widgets,
  presque toutes dupliquées : ne pas reproduire ce schéma ici.)
- **Couleurs** : toujours par variable (`var(--accent)`, `var(--ok)`, `var(--danger)`…), jamais
  en dur. C'est ce qui rend une simulation correcte en clair comme en sombre sans travail
  supplémentaire.
- **Ordre des scripts** : `theme.js` avant `init.js` ; le script d'un jeu avant `reveal.js`.
- `cours/js/init.js` **diverge** de celui d'archi (la bascule de thème en a été extraite) — ne pas
  l'écraser par la version d'archi.
- **Servir** : `python3 serve.py`, jamais `python3 -m http.server` (le cache rejoue d'anciens JS).
- **Hors-ligne intégral** : aucune requête réseau depuis une page du cours. Tout est vendorisé.

## 10. Vérifier

```bash
bash outils/verifier-tout.sh                  # tout le dépôt
bash outils/verifier-tout.sh J3-01-drf        # un seul module
```

Six bancs, dont `banc-revelation` qui refuse qu'une slide livre ce qu'une frame fait construire
(§0), `banc-redaction` qui refuse toute remarque méta (§0 bis) et `banc-jeux` qui refuse tout
feedback générique (§6). Les trois échouent sur du texte fraîchement écrit : c'est normal, et
c'est le moment de corriger.

Après toute modification d'un deck ou du CSS, la passe manuelle en plus — aucun banc ne calcule
de style : dérouler les slides, jouer les frames **en se trompant volontairement**, quitter une
slide de jeu et y revenir, basculer clair/sombre et le mode duel, console navigateur vierge.

Ne jamais déclarer un module terminé sans avoir lancé les deux.

## 10 bis. Les quatre gestes

Ce fichier dit **ce qui est vrai**. La **procédure** — dans quel ordre s'écrit un module, comment
se lit un banc rouge, ce que la relecture cherche, comment un défaut trouvé à l'œil repart en
motif — vit dans `.claude/skills/`, un skill par geste :

| Skill | Le geste |
|---|---|
| `ecrire-module` | l'ordre des étapes, dont trois se font avant d'écrire une ligne |
| `verifier-cours` | lancer les six bancs, et lire ce qu'ils disent |
| `relire` | les sept axes qu'aucun banc ne voit — la passe humaine |
| `durcir-un-banc` | inscrire un défaut en motif, après mesure des faux positifs |

Ils **pointent vers ce fichier**, ils ne le recopient pas : une seconde copie de la doctrine
divergerait de celle-ci, et c'est celle-ci qui tranche. `.claude/skills/README.md` porte en plus
la carte de ce qui se parallélise entre plusieurs agents et de ce qui reste sérialisé.

## 11. Périmètre en cours

Dix jours, une classe. **Frames + simulations partout** ; `design/jeux/django-lite.js` et les cinq
gros jeux (A/C/D/E/F′) sont **reportés**, specs conservées. Ne pas les commencer sans arbitrage
explicite : le noyau seul vaut trois à quatre jours.

État d'avancement et couverture du programme : `README.md`.
