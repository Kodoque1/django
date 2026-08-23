# Cheatsheets — Cours Django IPSSI

> **Syntaxe et vocabulaire uniquement** — pas de discrimination (celle des jeux).
> À distribuer **pendant** la séance.

## Authentification

### Frame 1

Une classe d'authentification. Chaque vue porte une liste authentication_classes&nbsp;: DRF les fait essayer avant tout contrôle de permission, et la première qui reconnaît le client remplit request.user — et request.auth, qui garde la preuve utilisée.

### Frame 2

Dans l'ordre de la liste, chacune essaie&nbsp;; dès qu'une classe reconnaît le client, request.user est rempli et les suivantes ne sont plus consultées. L'ordre de la liste est donc un ordre de priorité entre moyens d'identification.

### Frame 3

Elle décode dGV1OmV0dQ== en etu:etu, vérifie le couple contre la table des comptes, et remplit request.user si le mot de passe est bon. Chaque classe connaît son schéma d'en-tête&nbsp;: « Basic » ici, « Token » pour les jetons.

### Frame 4

Oui. Base64 n'est pas du chiffrement&nbsp;: c'est un recodage inversible, sans clé, prévu pour transporter des octets quelconques dans un en-tête. N'importe qui peut décoder dGV1OmV0dQ== et retrouver le couple. Le mot de passe repart donc à chaque requête — c'est la marque de cette classe.

### Frame 5

L'utilisateur anonyme, et le traitement continue. Faute de reconnaissance, request.user porte l'anonyme — c'est ensuite la permission qui tranche, et le refus éventuel dépend d'elle. Identifier et autoriser sont deux moments distincts.

## Consommation

### Frame 1

A. Avec data=, le corps part en application/x-www-form-urlencoded : chaque valeur arrive comme texte, et toute structure imbriquée se perd. json= encode le document ET déclare Content-Type: application/json. Le client annonce ce qu'il envoie — c'est le même contrat qu'un en-tête de requête HTTP écrit à la main au Jour 1.

### Frame 2

Trois justes : r.json(), r.text, et l'exception possible sur un corps non-JSON. Le code d'état se lit AVANT le corps : 200 promet une ressource, jamais son contenu.

### Frame 3

Quatre codes, quatre diagnostics différents : 201 « créé », 204 « fait et vide », 400 « ton corps est fautif », 405 « ce verbe n'est pas servi à cette adresse ». Un client sérieux teste r.status_code AVANT de décoder le corps.

### Frame 4

La négociation de contenu : DRF compare l'en-tête Accept à ses rendus disponibles. Le navigateur demande du HTML et reçoit la page interactive ; requests accepte tout et reçoit le rendu JSON par défaut. Une même ressource, plusieurs représentations — c'est REST appliqué, pas un réglage de confort.

### Frame 5

permission_classes. Par défaut, un ViewSet autorise tout le monde — d'où le DELETE anonyme. Les classes de permission répondent alors à deux questions distinctes — et chaque question porte son propre refus.

## Cors

### Frame 1

Le navigateur applique sa politique d'origine : une page servie d'une origine ne peut lire la réponse d'une autre que si cette dernière l'autorise, par des en-têtes Access-Control-Allow-Origin. La requête est bien partie, le serveur a bien répondu, le corps a été jeté au retour. requests ne connaît aucune origine : il n'est jamais concerné.

## Implementation

### Frame 1

Déclarer l'application, migrer, doter le compte d'un jeton, puis présenter la clé à chaque requête. Les trois premières se font une fois&nbsp;; la quatrième, à chaque appel — c'est elle que TokenAuthentication lit.

### Frame 2

La clé, et rien qu'elle. L'URL d'échange vérifie le couple nom d'utilisateur, mot de passe, puis renvoie la clé du jeton lié au compte. Le mot de passe a voyagé une fois&nbsp;; ensuite, seule la clé repart, dans Authorization: Token ….

### Frame 3

Authorization: Token 9944b09199c6… — le schéma, un espace, la clé. C'est cette écriture exacte que la classe reconnaît&nbsp;; tout autre mot en tête, et l'en-tête ne désigne plus aucun mécanisme.

### Frame 4

Identifier, puis autoriser, puis servir. Toute permission lit request.user — rempli juste avant par les classes d'authentification. Une identité fausse rend fausse chaque décision de droit&nbsp;: c'est l'ordre qui relie les deux familles de classes, et le premier endroit où chercher quand un refus étonne.

### Frame 5

Par l'authentification. Les permissions lisent request.user sans jamais le fabriquer&nbsp;: si cette valeur est fausse, chaque règle qui la lit décide sur du vide. Identifier avant d'autoriser — l'ordre du serveur est aussi l'ordre du diagnostic.

## Jeton

### Frame 1

401, accompagné de WWW-Authenticate: Token. Le 401 dit « je ne sais pas qui tu es »&nbsp;; l'en-tête ajoute comment te faire connaître — renvoyer la requête portant WWW-Authenticate: Token.

### Frame 2

401, encore accompagné de WWW-Authenticate: Token. Un jeton erroné ne produit pas de request.user&nbsp;: pour la permission, tout se passe comme si rien n'était arrivé. Le diagnostic reste « je ne sais pas qui tu es ».

### Frame 3

Par la liaison. Un jeton est une ligne liée à un compte&nbsp;: la classe cherche la clé, suit le lien, et place l'utilisateur dans request.user — et la ligne du jeton dans request.auth. Présenter la clé suffit&nbsp;: aucun mot de passe ne voyage plus après l'échange initial.

### Frame 4

Le réglage DEFAULT_AUTHENTICATION_CLASSES. Une vue muette hérite de cette liste, qui vaut par défaut [SessionAuthentication, BasicAuthentication]&nbsp;— deux moyens pensés pour le navigateur, aucun pour un client qui écrit son propre code. C'est le lien manquant entre ce qui précède et chaque vue déjà écrite&nbsp;: identifier, lui aussi, a un réglage de projet.

### Frame 5

401 avec WWW-Authenticate: Token. Écrire le réglage une seule fois donne à chaque vue muette du projet la même source d'identité — un jeton présentable par n'importe quel client. Les scripts, applications mobiles et services disposent alors du même accès que le navigateur.

## Orm

### Frame 1

Zéro. Un QuerySet est paresseux : tant que personne ne le parcourt, ce n'est qu'une description. print(qs.query) vous montre le SQL sans l'exécuter — c'est le meilleur moyen de vérifier ce que l'ORM a compris de votre code.

### Frame 2

Déclencheurs : itérer, list(), len(), bool(), une tranche indexée, et repr() — ce dernier explique le classique « ça marche dans le shell et pas dans mon code ».

### Frame 3

Une pour la liste, huit pour les catégories : 9. Avec 10 000 produits, 10 001 requêtes — et le code n'a pas changé d'un caractère. C'est la panne de performance la plus fréquente en Django, et elle est invisible en développement sur 8 lignes.

### Frame 4

Ce ne sont pas deux niveaux d'optimisation, mais deux stratégies imposées par la cardinalité. Vers un « un seul », on joint. Vers un « plusieurs », on fait une seconde requête et on recolle — d'où 2 requêtes, jamais 1. Beaucoup prédisent 1 : c'est le signe qu'on croit à « pareil, en mieux ».

### Frame 5

Même résultat, même nombre de requêtes, coût radicalement différent. C'est pourquoi compter les requêtes ne suffit pas toujours : il faut aussi regarder combien de lignes elles ramènent. Et l'écart grandit avec la table.

### Frame 6

with CaptureQueriesContext(connection) as cap: … puis len(cap.captured_queries). Il force le curseur de debug le temps du bloc, donc il compte partout — là où connection.queries reste désespérément vide dès que DEBUG vaut False.

## Permissions

### Frame 1

200, avec la liste. Faute de déclaration, c'est AllowAny — la classe par défaut de DRF — qui répond à la question des permissions : chaque requête passe, en lecture comme en écriture.

### Frame 2

401, accompagné de l'en-tête WWW-Authenticate: Token. La permission a trouvé un client sans identité, et TokenAuthentication sait dire comment s'en donner une : « je ne sais pas qui tu es ».

### Frame 3

Deux requêtes passent — les deux portent un jeton reconnu. IsAuthenticated ne teste qu'une seule chose : identifié contre anonyme. Elle ne distingue ni les verbes ni les objets.

### Frame 4

Aucune. AllowAny est la classe appliquée par défaut : l'écrire ne change rien au comportement, seulement à l'intention affichée dans le code.

### Frame 5

200. L'attribut porte sur le ViewSet entier : la même règle garde la liste et chaque détail. Pour traiter autrement une action, il faudrait une classe qui regarde le verbe ou l'action — c'est l'objet des classes personnalisées.

### Frame 6

401. Une vue lit permission_classes ; quand elle n'en déclare aucune, elle tombe sur DEFAULT_PERMISSION_CLASSES. Une vue neuve hérite donc du régime du projet sans écrire une ligne.

### Frame 7

200. La vue gagne toujours : une liste permission_classes écrite sur la vue écrase DEFAULT_PERMISSION_CLASSES. Le réglage global ne s'applique qu'aux vues qui n'écrivent pas leur propre liste.

### Frame 8

Vue muette → réglage du projet ; vue déclarante → sa propre liste. Un ordre de priorité unique, rejoué à chaque requête.

### Frame 9

La première. Le réglage ferme par défaut — y compris pour les vues qui naîtront plus tard —, et la déclaration AllowAny rouvre exactement la vue choisie. Les deux niveaux jouent ensemble.

## Personnalisation

### Frame 1

has_permission. Elle reçoit la requête et la vue, jamais d'objet : c'est le filtre appliqué à toute la vue, liste comprise. Retourner True laisse passer ; retourner False produit le refus.

### Frame 2

Uniquement quand un objet précis est chargé. D'où la paire : has_permission filtre la vue entière, has_object_permission affine objet par objet.

### Frame 3

La classe, puis la méthode, puis la décision. Avec l'attribut message = \"réservé aux administrateurs\" dans le corps de la classe, ces quatre lignes suffisent à produire un refus complet.

### Frame 4

Sous \"detail\" : {\"detail\": \"réservé aux administrateurs\

### Frame 5

Une classe d'authentification : elle lit l'en-tête Authorization, reconnaît le jeton, installe request.user — et c'est ensuite seulement que les permissions posent leurs questions. Toute autorisation repose sur ce résultat : identifier quelqu'un est un mécanisme à part entière, distinct du droit accordé ou refusé.

## Refus

### Frame 1

403. Même permission, même absence d'identifiant — et pourtant 403 : SessionAuthentication ne sait pas proposer de mécanisme d'identification, donc DRF ne peut pas répondre 401. Le code change avec le moyen d'authentification, pas avec la permission.

### Frame 2

WWW-Authenticate: Token. Le 401 ne dit pas seulement « je ne sais pas qui tu es » : cet en-tête dit comment te faire connaître — ici, renvoyer une requête portant Authorization: Token ….

### Frame 3

401. Un jeton erroné ne produit pas de request.user : pour la permission, tout se passe comme si rien n'était arrivé. Le diagnostic reste « je ne sais pas qui tu es ».

### Frame 4

403, et le corps porte la raison : {\"detail\": \"réservé aux administrateurs\

### Frame 5

401 : identité absente — l'en-tête WWW-Authenticate indique comment se faire connaître. 403 : identité présente, droit refusé. Deux échecs, deux corrections différentes.

### Frame 6

Sur la permission. Le serveur sait déjà qui il est — le 403 en est la preuve — mais aucune classe déclarée ne lui accorde ce qu'il demande. Corriger l'identité ne changerait rien : c'est le droit qui manque.

## Routage

### Frame 1

Le convertisseur fait deux choses d'un coup : il filtre (seuls les chiffres correspondent) et il convertit (pk arrive en int). C'est la première validation de votre application, et elle s'exécute avant votre première ligne de code.

### Frame 2

Le 404 de routage est produit avant tout code métier. C'est aussi pourquoi il ne coûte rien : aucune requête en base, aucune vue exécutée.

### Frame 3

urlpatterns est une liste ordonnée. Règle pratique : du plus spécifique au plus général. Ici il suffit d'inverser les deux lignes — et /produits/clavier-mecanique/ continue de fonctionner, puisque ce n'est pas un entier.

### Frame 4

str accepte tout sauf « / » : il avale absolument tout ce que int aurait pu prendre.

### Frame 5

Un slash oublié dans un action=\"…\" produit une perte de données silencieuse en production. En développement, Django lève une RuntimeError pour vous prévenir ; en production, il redirige sans rien dire.

### Frame 6

reverse(\"produit-detail\

### Frame 7

Ces trois lignes suffisent à inspecter tout le routage d'un projet, sans lancer de serveur : resolve() pour savoir qui répond, reverse() pour fabriquer une URL, et le client de test pour traverser la chaîne entière — middlewares et redirections compris.

## Serialiseurs

### Frame 1

Decimal(\"25.00\"). La validation et la conversion vont ensemble : is_valid() produit validated_data, où chaque champ porte déjà le type du modèle. C'est cette étape qui manque quand on construit le JSON à la main.

### Frame 2

Requis : nom, prix, categorie. Le modèle décide : un champ avec default devient facultatif, id est lecture seule. Personne n'a écrit ces règles dans le sérialiseur — ModelSerializer les lit sur le modèle.

### Frame 3

400, et le corps de la réponse nomme le champ : {\"categorie\": [\"Ce champ est obligatoire.\"]}. Sur HTTP pur, un PUT remplace toute la ressource ; ici DRF exige d'abord que le corps soit complet et valide. Pour modifier un seul champ, le verbe dédié est PATCH.

### Frame 4

Les trois champs échouent chacun chez lui : {\"nom\": [...], \"prix\": [...], \"categorie\": [...]}. Le corps du 400 est un dictionnaire indexé par champ — le client peut afficher chaque erreur sous son champ de formulaire sans parser du texte.

### Frame 5

12. Le PUT n'a PAS remplacé toute la ressource : required=False fait que le champ absent ne figure pas dans validated_data, donc la mise à jour ne le touche pas. C'est la sémantique de DRF, distincte de celle du protocole HTTP.

### Frame 6

serializer.errors — {\"prix\": [\"Un nombre entier valide est requis.\"]}. Deux attributs jumeaux et exclusifs : validated_data si is_valid() dit vrai, errors s'il dit faux.

## Session

### Frame 1

Par le cookie de session. À la connexion, Django a déposé un cookie sessionid&nbsp;; le navigateur le renvoie automatiquement avec chaque requête vers le serveur, et SessionAuthentication traduit ce cookie en utilisateur. Aucun en-tête à écrire&nbsp;: c'est le navigateur qui le fait.

### Frame 2

403. Aucun identifiant présenté — et pourtant ce n'est pas un 401, pas 401&nbsp;: SessionAuthentication ne sait pas proposer de mécanisme d'identification à un client qui n'a pas de cookie, donc DRF ne peut pas répondre 401.

### Frame 3

Au navigateur. Le dépôt et le renvoi du cookie sont automatiques pour lui, et pour lui seul. Dès qu'un client écrit son propre code — script, application mobile, service —, la session devient une gestion de cookie manuelle, là où un en-tête s'écrit en une ligne.

### Frame 4

Refus. Sur une requête d'écriture, SessionAuthentication exige en plus la preuve CSRF de Django&nbsp;: le cookie seul pourrait être envoyé à l'insu de l'utilisateur par une page tierce. C'est la seconde vérification qu'exige l'écriture quand le client est reconnu par son cookie — lecture fluide, écriture surveillée.

## Viewset

### Frame 1

/api/produits/, plus /api/produits/&lt;pk&gt;/ pour le détail. Deux lignes de configuration ont produit les deux URL qu'on écrivait à la main dans urlpatterns.

### Frame 2

Sur le détail : GET→retrieve, PUT→update, PATCH→partial_update, DELETE→destroy. Sur la liste : GET→list, POST→create. Cette table n'est pas une convention à apprendre : routeur.urls l'écrit noir sur blanc dans l'attribut actions de chaque motif. Un mot de vocabulaire : « update » dit que le verbe exige le corps complet — mais ce que DRF fait des champs facultatifs absents de ce corps n'est pas écrit ici.

### Frame 3

405 Method Not Allowed. La réponse porte un en-tête Allow qui énumère ce qui est servi. Un mauvais verbe n'est ni un corps fautif (400) ni une adresse fausse (404) : l'adresse est juste, le verbe n'y est pas servi.

### Frame 4

Dans la vue. L'URL correspond, la vue tourne, get_object() cherche et lève Http404 — le mécanisme même de get_object_or_404. Deux 404 d'origines différentes : celui-là coûte une exécution de vue et une requête en base, celui du routeur non.

### Frame 5

204 No Content — succès, corps vide. À distinguer du POST qui répond 201 Created avec le nouvel objet : chaque verbe réussi a son code, et le client les lit plutôt que d'analyser le corps.

### Frame 6

ModelViewSet. Il hérite de tout : lecture, création, modification, suppression, validation, codes d'état. Le défaut autorise tout, y compris supprimer.

## Vues

### Frame 1

Une exception non attrapée dans une vue devient un 500. Et un 500 dit « c'est ma faute » — alors qu'ici le client a simplement demandé une ressource qui n'existe pas. Le code d'état ment sur la responsabilité.

### Frame 2

Une ligne, et le code d'état devient honnête : 404, « cette ressource n'existe pas ». Le raccourci est volontairement étroit — il ne masque que l'absence, jamais une panne.

### Frame 3

first() est parfaitement légitime — à condition de traiter le None. Sans garde, vous obtenez le même 500 qu'avec get(), avec un message qui parle de NoneType au lieu de nommer le modèle : plus dur à diagnostiquer.

### Frame 4

first() évalue le QuerySet et renvoie le premier objet, ou None. C'est le QuerySet avant first() qui aurait été vide.

### Frame 5

Un except large est un silencieux à bugs. Votre supervision ne verra plus que des 404 parfaitement normaux, pendant que la base est en panne. Attrapez l'exception précise, ou utilisez le raccourci qui le fait pour vous.

### Frame 6

Une vue est une fonction requête → réponse, et la réponse doit être un objet HTTP complet : code, en-têtes, corps. DRF ajoutera Response, qui choisit le format selon ce que le client demande — mais c'est le même contrat.

### Frame 7

Distinguer « il n'y a rien à cet endroit » (404) de « il n'y a rien dedans » (200 avec une liste vide) est l'une des erreurs les plus fréquentes des premières API.

## Vues Drf

### Frame 1

1. Le QuerySet du ViewSet est exécuté une fois, et chaque objet est converti en Python sans retourner en base : tous les champs affichés viennent de la ligne déjà lue. C'est la référence à laquelle comparer la suite.

### Frame 2

1 + 8 + 8 = 17. Chacun des 8 objets sérialisés touche sa catégorie (une requête) puis ses avis (une autre). Deux champs ajoutés ont coûté seize requêtes — et la réponse reste 200, rapide sur huit lignes, catastrophique sur dix mille.

### Frame 3

Sur le queryset du ViewSet : 17 → 2 requêtes. La règle tient ici mot pour mot — jointure vers le « un seul », seconde requête et recollage vers le « plusieurs » — seule son emplacement change : c'est queryset que lisent list et retrieve.

### Frame 4

queryset. Un héritage suffit : la vue optimisée garde le sérialiseur détaillé et toutes les actions, et repasse à 2 requêtes. Le N+1 se règle là où les objets sont chargés — jamais dans le sérialiseur.

