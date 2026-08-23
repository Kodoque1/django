/*
 * Jeu de frames — vues génériques et le N+1 côté sérialiseur (III.F).
 *
 * Fidélité : temps 4.6 du TP — 1 requête avec le sérialiseur plat, 17 quand deux
 * champs ajoutés parcourent les relations, 2 après select_related +
 * prefetch_related posés SUR LE QUERYSET DU VIEWSET.
 */
(function () {
  "use strict";

  var DECOR =
    "<code>8 produits</code> en base, chacun avec une catégorie et des avis.";

  function frames() {
    return [
      {
        id: "plat", label: "la liste, version plate", cue: 3,
        hintTitle: "Indice",
        hint: "Un champ qui ne quitte pas la table du modèle ne coûte aucune lecture supplémentaire.",
        type: "choice", wide: true,
        prompt: DECOR + "<pre><code>class ProduitSerializer(serializers.ModelSerializer):\n" +
          "    class Meta:\n" +
          "        model = Produit\n" +
          "        fields = [\"id\", \"nom\", \"prix\", \"categorie\"]</code></pre>" +
          "<code>GET /api/produits/</code> sur les 8 produits : combien de requêtes SQL ?",
        options: [
          { id: "une", label: "<b>1</b>" },
          { id: "huit", label: "8 — une par produit" },
          { id: "neuf", label: "9 — la liste plus une par catégorie" },
          { id: "seize", label: "16 — deux requêtes par produit" },
        ],
        answer: "une",
        feedbackFor: {
          huit: "<code>ModelSerializer</code> ne relit pas la base objet par objet : il parcourt le QuerySet déjà ramené.",
          neuf: "La jointure vers <code>categorie</code> n'est pas déclenchée tant que personne n'y touche — et ici, seul l'identifiant sort dans le JSON.",
          seize: "Aucun champ du sérialiseur ne traverse deux relations : tout tient dans une seule table.",
        },
        explain: "<b>1</b>. Le QuerySet du ViewSet est exécuté une fois, et chaque objet est converti en Python sans retourner en base : tous les champs affichés viennent de la ligne déjà lue. C'est la référence à laquelle comparer la suite.",
      },
      {
        id: "detaille", label: "deux champs de plus", cue: 2,
        hintTitle: "Rappel",
        hint: DECOR + " Chaque produit touche SA catégorie et SES avis, l'un après l'autre.",
        type: "choice", wide: true,
        prompt: "Même vue, mais le sérialiseur gagne deux lignes :<pre><code>categorie = serializers.StringRelatedField()\navis = serializers.StringRelatedField(many=True)</code></pre>Combien de requêtes maintenant ?",
        options: [
          { id: "dix-sept", label: "<b>17</b>" },
          { id: "une", label: "1 — les relations sont déjà dans la ligne" },
          { id: "trois", label: "3 — une par table impliquée" },
          { id: "neuf", label: "9 — comme un N+1 ordinaire" },
        ],
        answer: "dix-sept",
        feedbackFor: {
          une: "Une ligne SQL ne lit que sa propre table. Pour lire le nom de la catégorie et la liste des avis, il faut retourner les chercher — par produit.",
          trois: "Trois serait le compte si les relations étaient lues UNE fois chacune pour toute la liste. Or c'est le sérialiseur de CHAQUE produit qui y accède, séparément.",
          neuf: "Il manque huit lectures : il y a DEUX relations parcourues par produit, pas une. Une pour les catégories, une pour les avis, huit fois.",
        },
        explain: "1 + 8 + 8 = <b>17</b>. Chacun des 8 objets sérialisés touche sa catégorie (une requête) puis ses avis (une autre). Deux champs ajoutés ont coûté seize requêtes — et la réponse reste 200, rapide sur huit lignes, catastrophique sur dix mille.",
      },
      {
        id: "ou-corriger", label: "où corriger ?", cue: 1,
        hintTitle: "Indice",
        hint: "Le sérialiseur décrit comment convertir. Qui décide ce qui est chargé avant la conversion ?",
        type: "choice", wide: true,
        prompt: "Les 17 requêtes sont confirmées. Où s'écrit la correction ?",
        options: [
          { id: "viewset", label: "Sur le <code>queryset</code> du ViewSet : <code>select_related(\"categorie\").prefetch_related(\"avis\")</code>" },
          { id: "serialiseur", label: "Dans le sérialiseur, avec un champ pré-chargé" },
          { id: "vue-manuelle", label: "Nulle part : on abandonne le ViewSet et on écrit la vue à la main" },
          { id: "settings", label: "Dans les réglages : DRF optimise tout seul au-dessus d'un seuil" },
        ],
        answer: "viewset",
        feedbackFor: {
          serialiseur: "Le sérialiseur reçoit des objets DÉJÀ chargés : ce qu'il lui manque à la conversion, il va le chercher en base, requête par requête. Charger mieux en amont est le seul levier.",
          "vue-manuelle": "Les vues génériques lisent <code>self.get_queryset()</code> : redéfinir la vue entière pour changer un QuerySet, c'est renoncer aux six actions.",
          settings: "DRF ne devine jamais vos accès futurs : aucun réglage ne remplace <code>select_related</code>, l'ORM ne lit jamais votre code.",
        },
        explain: "Sur le queryset du ViewSet : 17 → <b>2</b> requêtes. La règle tient ici mot pour mot — jointure vers le « un seul », seconde requête et recollage vers le « plusieurs » — seule son emplacement change : c'est <code>queryset</code> que lisent <code>list</code> et <code>retrieve</code>.",
      },
      {
        id: "attribut-queryset", label: "l'attribut lu par les actions", cue: 0,
        type: "free",
        prompt: "<pre><code>class ProduitViewSet(ModelViewSet):    # celui du module, 17 requêtes sur la liste\n    queryset = Produit.objects.all()\n\n\nclass VueOptimisee(____):\n    ____ = Produit.objects.select_related(\"categorie\")\\\n                          .prefetch_related(\"avis\").order_by(\"id\")</code></pre>Deux noms à compléter : de quelle classe hériter, et comment nommer l'attribut qui remplace <code>queryset</code> ?",
        placeholder: "nom de l'attribut…",
        answers: ["queryset"],
        feedbackFor: {
          "serializer_class": "<code>serializer_class</code> choisit le sérialiseur, pas ce qui est chargé — et ici la classe à hériter reste <code>ModelViewSet</code>. Les 17 requêtes viennent du chargement, pas de la conversion.",
          _defaut: "Deux réponses : on hérite de <code>ModelViewSet</code>, et l'attribut s'appelle <code>queryset</code>. Toutes les actions génériques passent par <code>get_queryset()</code>, qui le lit — c'est pourquoi un seul attribut corrige la liste ET le détail.",
        },
        explain: "<code>queryset</code>. Un héritage suffit : la vue optimisée garde le sérialiseur détaillé et toutes les actions, et repasse à 2 requêtes. Le N+1 se règle là où les objets sont chargés — jamais dans le sérialiseur.",
      },
    ];
  }

  PIFrames.widget("vuesDrfFrames", function () {
    return { id: "vues-drf-frames", masteryTarget: 0.9, frames: frames() };
  });
})();
