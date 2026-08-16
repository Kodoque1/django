# `.claude/skills/` — les quatre gestes de production du cours

Quatre skills, un par geste. Ils ne contiennent **ni doctrine ni contrat technique** : ceux-ci
vivent déjà dans `CLAUDE.md`, `cours/README.md`, `outils/README.md` et
`design/jeux/00-contrat-de-design.md`. Les skills **pointent**, ils ne recopient pas — une
seconde copie diverge toujours de la première, et ce dépôt l'interdit explicitement.

Ce qu'ils apportent est ce qui n'était écrit nulle part : **la procédure et le jugement**.

| Skill | Le geste | Ce qu'il porte, et qui n'existe pas ailleurs |
|---|---|---|
| `ecrire-module` | écrire ou étendre un module | l'**ordre** des étapes, dont deux se font avant d'écrire une ligne |
| `verifier-cours` | lancer les six bancs | comment **lire** un rouge, et ce qui reste à l'œil |
| `relire` | la passe humaine | les **sept axes** que les bancs ne voient pas |
| `durcir-un-banc` | inscrire un défaut en motif | le **protocole de mesure** obligatoire avant adoption |

## La boucle

Elle s'est rejouée à chaque remarque de relecture, et c'est elle que les skills stabilisent :

```
    ecrire-module ──▶ verifier-cours ──▶ relire ──▶ durcir-un-banc
          ▲                                  │             │
          └──────────── correction ──────────┘             │
                                                           ▼
                              le défaut ne peut plus repasser inaperçu
```

Le dernier maillon est celui qu'on saute quand on est pressé, et c'est celui qui compte : **un
défaut trouvé à l'œil qu'aucun banc ne voyait doit repartir en motif**, sinon le banc entérine
l'existant au lieu de le contrôler. Trois familles de méta et quatre calques ont été ajoutés
ainsi, après coup — jamais l'inverse.

---

## Travailler à plusieurs agents

### Ce qui se parallélise, et ce qui ne se parallélise pas

| Fichier | Régime |
|---|---|
| `cours/J*-*/` — **un module** | **une voie chacun.** Modules III, IV et V sont trois dossiers disjoints : aucune friction |
| `cours/index.html` · `README.md` (table de couverture, file d'attente) | **sérialisé** — l'orchestrateur écrit, jamais les voies |
| `outils/banc-*.py` · `outils/banc-jeux.js` | **sérialisé** — deux `durcir-un-banc` concurrents se marchent dessus |
| `cours/css/*.css` · `cours/js/*.js` | **sérialisé** — socle partagé par tous les modules |
| `CLAUDE.md` | **sérialisé** — c'est l'arbitre, il ne se modifie pas depuis une voie |

### Les bancs sont dépôt-entier par défaut

C'est le piège qui coûte le plus cher à plusieurs : une ligne rouge peut venir du module d'une
autre voie. **Vérifier le chemin imprimé avant de « corriger ».**

Les quatre bancs de deck acceptent un module en argument, et `verifier-tout.sh` le transmet :

```bash
bash outils/verifier-tout.sh J3-01-drf       # une voie ne vérifie que son module
```

Un module nommé saute les deux bancs Django (`verifier.py`, `banc-fiche`) : ils mesurent le TP,
pas le deck. Ils restent à passer en fin de chantier, une fois, par l'orchestrateur.

### `relire` est la fan-out naturelle

Sept axes indépendants, **lecture seule**, format de sortie fixé. Un agent par axe sur un module,
ou un agent par module sur un axe : aucun état partagé, aucune fusion à arbitrer. C'est le seul
endroit où le parallélisme rapporte franchement — le reste du travail est séquentiel par nature.

### ⚠ Prérequis : un commit

Le dépôt n'a **aucun commit**. Avant toute session d'écriture en parallèle, en faire un : sans
lui, rien ne permet de départager deux voies qui se seraient croisées, ni de revenir en arrière.

```bash
git add -A && git commit -m "état de départ"
```
