# `outils/` — les bancs de vérification

Un seul point d'entrée :

```bash
bash outils/verifier-tout.sh                  # tout le dépôt
bash outils/verifier-tout.sh J3-01-drf        # un seul module
```

| Banc | Ce qu'il vérifie | Prérequis |
|---|---|---|
| `banc-redaction.py` | aucune remarque méta dans le texte vu par l'étudiant | — |
| `banc-revelation.py` | aucune slide ne livre ce qu'une frame fait construire (§0) | — |
| `banc-jeux.js` | les jeux : feedbacks complets, bandeau uniforme, parcours complet | `node` + `jsdom` |
| `verifier.py` *(dans `tp-instrumentation/`)* | les 22 mesures du TP sur un vrai Django | Django 5.x |
| `banc-fiche.py` | `FICHE-TP.md` rejouée bloc par bloc, comme un étudiant qui recopie | Django 5.x |
| `banc-deck.py` | les decks dans un vrai Chrome : rendu, débordements, remontage, thème | `google-chrome` + `websocket-client` |

## Vérifier un seul module

Les **quatre bancs qui jugent un deck** acceptent un ou plusieurs modules en argument, et
`verifier-tout.sh` les leur transmet. C'est ce qui rend la boucle utilisable quand plusieurs
voies de travail écrivent des modules différents : chacune vérifie le sien en quelques secondes
au lieu de tout le dépôt.

Trois précisions qui comptent :

- **Les deux bancs Django sont alors sautés.** `verifier.py` et `banc-fiche` mesurent le TP
  d'instrumentation, qui ne dépend d'aucun deck : les rejouer à chaque itération coûterait une
  minute pour une information inchangée. À repasser une fois en fin de chantier.
- **La passe C de `banc-jeux` reste sur le corpus complet**, même quand un module est demandé.
  Elle compare les jeux **entre eux** ; la restreindre à un module la rendrait verte sur une
  divergence inter-modules, c'est-à-dire exactement le défaut qu'elle existe pour attraper.
  Seules les passes A et B se restreignent.
- **Un module qui ne correspond à rien est un échec, pas un succès.** Les quatre bancs le
  refusent et listent les modules disponibles. Sans cette garde, une faute de frappe dans un nom
  donnait un banc vert qui n'avait rien examiné — le pire état possible pour une suite de
  vérification.

`verifier-tout.sh` **saute** proprement les deux bancs Python si Django 5 est absent
(le poste n'a que la 3.2 en système) plutôt que d'échouer. Pour les activer :

```bash
cd tp-instrumentation
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

> Sur Debian/Ubuntu, `python3 -m venv` réclame le paquet `python3-venv`. À défaut,
> `PYTHONPATH=<dossier avec Django 5> bash outils/verifier-tout.sh` fait l'affaire.

Si `jsdom` est installé globalement, `node` ne le résout qu'avec `NODE_PATH` — le script
s'en charge (`npm root -g`).

## Ce que chaque banc attrape, et pourquoi il existe

**`banc-jeux.js`, passe A — la plus utile.** Elle reproduit les règles de résolution de
`feedbackFor` de `pi-frames.js` (`renderers.*.submit`) et signale toute erreur plausible
qui retomberait sur `explain` ou sur le message générique du moteur. C'est la règle non
négociable de la pédagogie programmée — *un message par erreur prévue* — rendue
vérifiable. À sa première exécution elle a trouvé **16 trous** dans les cinq jeux
pourtant relus à la main : trois verbes sans message dans la matrice sûr/idempotent,
trois situations sans message dans le tri des familles de codes, etc. Un parcours manuel
ne les rencontre qu'au hasard des clics.

**`banc-jeux.js`, passe B.** Joue chaque jeu jusqu'au bilan en se trompant à chaque
frame. Le moteur montrant la réponse au 2ᵉ échec, une erreur délibérée puis deux
validations suffisent toujours à avancer — d'où un pilote court et sans cas particuliers.
Vérifie aussi que `destroy()` ne laisse pas de DOM derrière lui.

**`banc-jeux.js`, passe C.** Le bandeau doit être le même sur tous les jeux au montage : ce qu'un
étudiant voit en arrivant sur une slide de jeu ne peut pas dépendre du jeu. Elle a été écrite pour
un défaut visible à l'œil — `status-triage` posait `duel: true`, donc **un seul jeu sur huit**
affichait le chrono et un bandeau agrandi, dès la manche solo. Le réglage contredisait ses propres
notes orateur (« une manche solo au poste, **puis** une manche projetée »).

Elle contrôle les clés qui changent l'affichage de départ (`duel`) et l'uniformité de
`masteryTarget` — un bilan ne peut pas changer de sens d'un jeu à l'autre. `shared` n'y figure
pas : c'est un état partagé entre frames, une différence fonctionnelle. Une divergence reste
possible, mais **déclarée** dans `DIVERGENCES_ADMISES` avec sa raison ; la liste vide est l'état
normal.

**`banc-fiche.py`.** Concatène les blocs ```` ```python ```` de la fiche et les joue dans
un **sous-processus**, pas dans un `exec()` : l'amorce déclare son app Django avec
`name = "__main__"`, donc Django importe le vrai module `__main__` pour y trouver la
classe `Boutique`. Un espace de noms synthétique échoue avec un `ImportError` trompeur —
le banc doit reproduire les conditions réelles, sinon il valide autre chose que ce qu'on
distribue. Il gère les blocs qui *doivent* lever (§1.5, 1.6, 1.7) et saute l'exercice
laissé à l'étudiant (§4.6), couvert par `verifier.py` §4.6.

C'est ce banc qui a débusqué le middleware `Videur` resté branché entre deux temps — il
faisait répondre 403 à tout le temps 4 — et les identifiants écrits en dur que SQLite ne
réutilise jamais après une suppression.

**`banc-redaction.py`.** Le cours enseigne ; il ne se décrit pas, ne s'annonce pas et ne se
commente pas. Ce banc extrait le texte **vu par l'étudiant** — slides moins les
`<aside class="notes">`, et `prompt` / `hint` / `explain` / `feedbackFor` des frames — puis
signale les durées annoncées, les « vous allez… », les renvois vers un autre dispositif, les
objectifs déclarés et les « à retenir ». Il a trouvé **59 occurrences** à sa première exécution.

Il ne regarde **jamais** les notes orateur, `cours/index.html`, `README.md`, `CLAUDE.md` ni
`design/` : le méta y est à sa place.

> **Trois familles de décalages idiomatiques** sont relevées dans `CLAUDE.md` §0 ter — l'image
> importée (« l'oignon des middlewares »), le mot français au sens anglais (« librairie »), et
> l'abréviation anglaise (« vs »). La première est la plus coûteuse et **aucun banc ne la voit** :
> elle ne contient pas un seul mot anglais. Les quatre cas rencontrés ont tous été trouvés à la
> lecture, puis inscrits au `LEXIQUE` pour empêcher la récidive — jamais l'inverse.

> **Pourquoi la liste de calques est courte.** Un balayage large des anglicismes a produit
> **quatre faux positifs sur six** : « définitivement perdue », « pour vous prévenir » et
> « éventuellement vide » sont du français correct. Le `LEXIQUE` ne retient donc que les
> locutions jamais correctes dans ce cours. Ne pas l'élargir sans refaire la mesure — un banc
> qui crie à tort finit par ne plus être lu.

> **Chaque méta trouvé à l'œil repart en motif.** Sinon le banc entérine l'existant au lieu de le
> contrôler. Trois familles ont ainsi été ajoutées après coup : l'**auto-référence** (« la
> question 4 n'a pas de réponse unique » — un commentaire sur l'exercice, pas sur la notion), le
> **renvoi qui ne nomme aucun dispositif** (« elle sera reprise », « on y revient », « tout le
> reste du cours »), et « **à garder sous la main** », même famille que « à retenir ». Sept
> occurrences, zéro faux positif. Écarté volontairement : `au moment de…`, qui ne distingue pas le
> renvoi (« au moment des ViewSet ») du fait d'exécution (« au moment de la requête »).

> ⚠ **Deux limites à connaître.** D'abord, il ratissait à l'origine les champs un par un
> (`prompt:\s*"…"`), ce qui ne voyait que le **premier morceau** d'un énoncé écrit en
> concaténation sur plusieurs lignes — « Prédisez » lui a échappé pendant toute une passe,
> ainsi qu'un renvoi au TP. Il extrait désormais **tous** les littéraux de chaîne du fichier.
> Ensuite, les textes émis par le moteur lui-même (`cours/js/pi-frames.js` : le badge,
> les notes, le bilan) restent **hors de portée**, parce qu'ils sont mêlés à la logique. Ce sont
> eux qui ont laissé passer « reprise » et « item » : à relire à la main. Les faux positifs — « tout ce qui suit le `?` » décrit une
URL, pas la suite du cours — sont traités par une liste d'**exemptions de chaînes exactes**,
chacune avec sa raison. Si cette liste enfle, c'est le motif qu'il faut revoir, pas l'exemption
qu'il faut ajouter.

**`banc-revelation.py`.** Il vérifie **§0**, la règle qui prime sur toutes les autres — et qui
n'était vérifiée par rien jusque-là. La position de chaque `data-widget="X"` découpe le deck ; le
texte des slides qui **précèdent** est découpé en suites de six mots, et toute suite qu'on
retrouve dans un `explain` ou un `hint` du widget est signalée.

Le seuil de six vient d'une mesure. En sac de mots — recouvrement de vocabulaire — les deux
premiers modules produisaient **25 signalements pour 2 réels** : inexploitable, parce qu'une slide
et une frame sur le même sujet partagent forcément « couche », « requête », « serveur ». À six
mots consécutifs : **4 signalements, 3 réels**. Six mots d'affilée ne sont pas une coïncidence,
c'est une copie.

Il a trouvé d'emblée le pire cas possible : la slide « Trois inventions, trois verbes » précédait
le jeu `webInvention`, qu'elle donnait entièrement — définitions comprises, mot pour mot dans le
premier `explain`. La slide est passée **après** le jeu, où elle est à sa place.

> **La seule exemption admissible** est la slide qui **pose la question sans y répondre**. « 2005 —
> le jour où un robot a vidé des bases » raconte l'affaire du Web Accelerator et s'arrête sur
> « Alors qui est en tort ? » ; le jeu délivre la réponse. Le récit est partagé, la conclusion non.
> L'exemption écarte la **slide entière** pour **ce widget seulement**, et porte sa raison — sans
> quoi quelqu'un finira par « corriger » la meilleure slide motivante du module.

**`banc-deck.py`.** jsdom ne calcule aucun style : il ne peut ni voir une slide qui déborde,
ni savoir si Mermaid a rendu, ni détecter un widget monté deux fois. Ce banc pilote Chrome par
le protocole DevTools et, pour chaque deck : déroule **toutes** les slides, vérifie que chaque
diagramme se rend, puis visite chaque slide de jeu pour contrôler le montage, l'unicité du
bandeau et surtout que **rien ne dépasse sous la slide** — le bandeau de validation était sorti
de 201 px et aucun autre banc ne pouvait le voir. Il finit par un aller-retour (remontage
propre) et une bascule de thème.

Il vérifie aussi qu'**aucune slide ne dépasse la hauteur du canevas**. Une slide trop haute est
simplement **coupée** : rien ne la réduit, aucune barre de défilement n'apparaît, et le bas —
souvent la phrase qui conclut — n'existe pas pour la salle. Le contrôle de débordement des jeux
ne le voyait pas, parce qu'il compare des éléments à leur slide, jamais la slide à l'écran. La
slide d'ouverture du module II perdait ainsi ses trois dernières lignes.

> ⚠ Deux pièges dans cette mesure, tous deux rencontrés. **La marge n'est pas à soustraire** :
> reveal l'absorbe dans l'échelle qu'il calcule, `dispo` est donc `config.height` nu. La
> soustraire fait apparaître un écart **constant de 86 px** sur toute slide dimensionnée pour
> remplir la hauteur — les widgets — et le banc accuse alors des slides parfaitement lisibles.
> Et la mesure doit être **relative au haut de sa propre section** : comparer à `window` donne
> des faux positifs en pleine transition, quand la slide est encore translatée.

> Piège rencontré en l'écrivant : après une bascule de thème, `invalidateAllMermaid()` invalide
> **tous** les diagrammes et ne re-rend que celui de la slide visible — c'est le rendu paresseux
> voulu. Exiger que les cinq restent rendus était un faux positif. Le banc se place donc sur une
> slide qui porte un diagramme avant de basculer.

## Ce qu'aucun banc ne couvre

Le jugement. Est-ce que le message de feedback colle vraiment à l'erreur commise ? Le mode duel
est-il lisible au fond de la salle ? Une slide dense reste-t-elle confortable dans les deux
thèmes ? `verifier-tout.sh` rappelle cette liste courte en fin d'exécution.

S'y ajoute le **sous-titre d'intercalaire qui énonce la réponse** (§3 bis). « Une liste, lue dans
l'ordre, jusqu'au premier qui répond » était le sous-titre de la partie dont la simulation fait
précisément découvrir ça — et `banc-revelation` ne pouvait pas le voir : la phrase n'est écrite
nulle part dans la simulation, qui le *montre*. Révélation par paraphrase, donc relecture humaine.

S'y ajoutent trois formes que **rien** ne signalera : le **commentaire sur la difficulté d'une
question** (« c'est celle qui sépare la récitation de la conception » ne contient aucune tournure
repérable — c'est du méta par ce qu'il fait, pas par la façon dont il est écrit), les **calques
employés au sens anglais**, et la **révélation reformulée**, que `banc-revelation` laisse passer
par construction. Toutes trois relèvent de la relecture, et d'elle seule.

> **Pourquoi pas spaCy / NLTK.** La question s'est posée, et la réponse a été mesurée. La seule
> règle morphologique prometteuse — « vous » **sujet** + futur, qui généraliserait la liste de
> verbes énumérée à la main — donne sur le corpus réel **1 vrai positif pour 3 faux** :
> « ce dont vous aurez besoin » et « les codes que vous rencontrerez en production » sont des
> énoncés sur l'ORM et sur le métier, pas sur le cours. Rapport moins bon que les regex actuelles.
>
> La raison est structurelle : le méta se définit par **ce dont la phrase parle** — le cours ou la
> notion — pas par sa grammaire. Et la désambiguïsation de sens, seul remède aux calques, n'est
> pas dans spaCy. *(NLTK serait pire : son français se limite aux mots-vides et à un stemmer.)*
> Ne pas rouvrir la question sans refaire la mesure.
