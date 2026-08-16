# Les sept axes de relecture

Chaque axe est **une seule question**, posée à chaque slide et à chaque frame du module. Les
parcourir un par un : mélangés, on les fait tous à moitié.

Les cas cités ont tous été rencontrés dans ce dépôt. Aucun n'a été trouvé par un banc.

Format de réponse, rappelé ici pour l'agent qui n'a que ce fichier :

```
<fichier>:<ligne> · axe <A-G> · « <citation exacte> » · <diagnostic en une phrase> · §<n>
```

Un axe qui ne signale rien s'écrit `axe <X> — rien`.

---

## A · Révélation par paraphrase — §0

> **Cette slide dit-elle, dans d'autres mots, ce que la frame suivante fait construire ?**

`banc-revelation` compare des suites de six mots : il attrape la copie, **jamais** la
reformulation. Une slide qui écrit « chaque couche ignore ses voisines éloignées » devant une
frame qui fait construire « chaque couche ne connaît que sa voisine » passe au vert.

Méthode : pour chaque `data-widget="X"`, lire les `explain` et `hint` du widget **d'abord**, puis
remonter les slides qui le précèdent en se demandant si la conclusion y figure déjà, sous quelque
forme que ce soit.

L'exemption unique — et il n'y en a qu'une forme : la slide **pose la question sans y répondre**,
la frame délivre la réponse. Le récit peut être partagé, la conclusion non.

Corollaire à vérifier aussi : la **matière de référence** (catalogue de codes, tableau de
correspondance) vient **après** le dispositif qui la fait découvrir.

## B · Le sous-titre énonce la réponse — §3 bis

> **L'intercalaire nomme-t-il le problème, ou la solution ?**

La faute coûte double : elle gâche l'occasion d'ouvrir sur ce qui ne marche pas sans le chapitre,
et elle révèle.

Cas réel : *« Une liste, lue dans l'ordre, jusqu'au premier qui répond »* était le sous-titre de
la partie dont la simulation fait précisément découvrir ça. Aucun banc ne pouvait le voir — la
phrase n'est écrite nulle part dans la simulation, qui le *montre*.

Le test : **si on retirait ce chapitre, qu'est-ce qui casserait ?** La réponse est le sous-titre.
✅ « Une URL arrive. Quelle fonction doit répondre ? » — ❌ « Le routeur essaie les motifs dans
l'ordre ».

## C · L'image importée — §0 ter, famille A

> **Est-ce que je décris ce qui se passe, ou est-ce que je le compare à autre chose ?**

Si c'est le second, la phrase vient probablement de l'anglais. C'est la famille la plus fréquente
et la plus invisible, **parce qu'elle ne contient aucun mot anglais** : la prose technique
anglaise tourne à la métaphore (*onion*, *buy*, *takeaway*, *under the hood*) là où la prose
technique française énonce le mécanisme.

Les quatre cas rencontrés, tous trouvés à la lecture : « l'oignon des middlewares » ←
*the middleware onion* · « ce qu'on achète » ← *what you buy* · « ce qu'il faut emporter » ←
*takeaways* · « brique », qui n'est pas un calque mais la même faute.

Traduire l'image importe avec elle un raisonnement faux : on ne « retire » pas une brique qui est
une convention, on n'« achète » pas une propriété d'architecture.

Les deux autres familles sont couvertes par le `LEXIQUE` du banc et ne demandent pas de
relecture : le mot français au sens anglais (librairie, supporter, digital) et l'abréviation
anglaise (« vs »).

Contre-exemples à ne **pas** signaler — ils ressemblent à des calques sans en être :
« définitivement perdue » (*pour toujours*), « pour vous prévenir » (*avertir*), « éventuellement
vide » (*le cas échéant*). Un balayage large a produit quatre faux positifs sur six.

## D · Le méta non repérable — §0 bis

> **Cette phrase parle-t-elle de la notion, ou de l'exercice ?**

`banc-redaction` attrape les tournures. Il ne peut pas attraper le méta qui n'en a aucune — le
**commentaire sur la difficulté d'une question**.

Cas réel : *« La question 4 n'a pas de réponse unique — c'est celle qui sépare la récitation de
la conception. »* Pas une tournure repérable dans la seconde moitié : c'est du méta par ce qu'il
fait, pas par la façon dont il est écrit.

Même famille : une frame qui commente sa propre place dans le jeu, une slide qui juge de
l'importance de ce qu'elle porte, une consigne redondante (« Prédisez » devant une question qui
appelle déjà une réponse).

## E · Un mot, une chose — §0 ter

> **Ce mot désigne-t-il ailleurs autre chose ? Autorise-t-il une phrase que je ne voudrais pas
> voir écrite ?**

Deux mots pour un même objet obligent l'étudiant à vérifier qu'il s'agit bien du même — un coût
inutile, et une erreur quand il conclut que non.

Décisions déjà prises : **couche** (jamais « étage ») · **partie** d'une URL · **segment** TCP ·
**2ᵉ passage** (jamais « reprise ») · **question** (jamais « item »). Ces cinq-là sont au
`LEXIQUE`, le banc les tient.

Ce que le banc ne tient pas : un mot **juste** employé pour deux objets différents. Deux tensions
relevées et non encore arbitrées, à signaler si elles se propagent :

- **chaîne / pile / couche** pour la liste `MIDDLEWARE` ;
- **modèle** pour le modèle TCP/IP *et* le modèle de données — la tension revient avec
  `models.py`.

Plus grave que l'incohérence : le mot qui **autorise un raisonnement faux**. « Brique » désignait
URL, HTTP et HTML, et suggérait des pièces démontables — d'où « on retire HTTP », une phrase sans
référent.

## F · Densité et référents — §3

> **Chaque « le X » a-t-il un antécédent sur la slide ? Combien de choses la slide porte-t-elle ?**

Les deux vont ensemble : c'est la densité qui produit les référents manquants. À sept choses sur
une slide, chaque affirmation se réduit à une formule, et une formule ne renvoie à rien.

Cas réel : une slide de référence portait la thèse, les RFC, la genèse, une échelle et ses
niveaux, la position de DRF, un désaccord et le périmètre du cours. D'où *« Le style a été
élaboré… »* — la slide ne disait jamais que REST **est** un style d'architecture — et *« ce qui
le faisait tenir »*, une formule creuse. Dédoublée, chaque affirmation a retrouvé de la place et
un antécédent.

Trois contrôles :

1. **La catégorie est-elle nommée ?** Avant d'employer « le style », « le modèle », « le niveau »,
   la slide doit avoir dit de quoi il s'agit.
2. **Une échelle est-elle présentée comme une échelle ?** Trois niveaux définis dans une incise,
   sans dire que ça commence à 0, rend les numéros arbitraires.
3. **Chaque affirmation est-elle ancrée ?** Une formule qu'on ne peut pas vérifier est à remplacer
   par le fait qui la fonde, ou à retirer.

Rappel du budget : au plus **deux slides informatives par partie**, hors intercalaire. Le
développement va en notes orateur — la slide n'est pas le script.

## G · Le dispositif mal choisi — §2 et §5

> **Ce dispositif fait-il faire l'opération mentale qu'on visait ?**

Deux fautes symétriques, aussi graves l'une que l'autre : un dispositif trop lourd consomme le
budget là où il aurait compté ailleurs ; trop léger, il ne fait pas construire.

Contrôle sur toute simulation — les **quatre tests**, un « non » suffit à disqualifier :

1. **État de modèle** — un état qui évolue, distinct de ce qui est affiché ?
2. **Axe du temps** — quelque chose met du temps, et on le voit se produire ?
3. **Calculé, pas énuméré** — si l'auteur a pu écrire tous les cas à la main, c'est un menu.
4. **Lisible sans texte** — libellés retirés, reste-t-il quelque chose qui bouge et qu'on comprend ?

Le mode d'échec documenté : des sous-slides déguisées en menu. *Une simulation calcule ; un menu
sélectionne.*

Contrôle sur une représentation (§4) : le visuel est-il **l'objet lui-même**, ou une analogie
venue d'ailleurs qu'il faudra tordre au troisième niveau ? Et dit-il quelque chose de **vrai** —
une pile dessinée à l'envers branchait le lien physique sur la couche Application, et le dessin
affirmait une fausseté que personne n'avait lue.

Contrôle sur une notion traitée deux fois : **change-t-elle de régime** ? Deux dispositifs qui
font tous deux *construire* la même chose, l'un est en trop.
