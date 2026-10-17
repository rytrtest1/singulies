# Mesures du site actuel — 17/10/2026

Page mesurée : `https://singulies.com/?envoi=0` (en ligne ; `envoi=0` = ni email ni compteur, les mesures ne polluent rien).
Outil : `tools/mesure-chargement.mjs` — profil **Moto G Power** (412×915, ×2,625, Chrome Android), **réseau Fast 4G** (1,6 Mb/s descendants, 0,75 Mb/s montants, 150 ms), **première visite** (contexte neuf, cache vide), Edge. Parcours : 12 s d'intro, saisie de LEA, Entrée, attente de la feuille (`#offre.txt-on`).
Données brutes : `actuel-cpu4.json` (CPU ralenti ×4, 3 passages) et `actuel-cpu1.json` (CPU normal, 2 passages).

> **Limite à connaître.** Cet ordinateur n'a pas le GPU d'un téléphone : le rendu WebGL est logiciel (SwiftShader). Le **poids, le nombre de requêtes et les temps réseau sont fiables**. Les **images/s et les durées de scène 3D ne sont que des indications** (déjà noté dans `CLAUDE.md`, « Preuves »). Il faut une mesure sur un vrai téléphone avant de fixer les objectifs de fluidité (protocole ci-dessous).
> Peu de passages (2 et 3) et forte variance : lire les ordres de grandeur, pas les décimales.

## Ce qui est fiable

| Mesure | Résultat |
|---|---|
| JavaScript | **190 Ko** (compressé), dont le script principal 33 Ko |
| Polices | 57 Ko · CSS 15 Ko · HTML 2 Ko |
| **Images** | **1,9 Mo à 3,3 Mo** selon le passage, soit **83 à 91 % du poids** |
| Poids total (jusqu'à l'offre) | **2,2 à 3,6 Mo**, 46 à 50 requêtes |
| Vidéo de la machine | 57 Ko |
| Premier affichage (FCP), CPU ×4 | **3,6 s** (médiane ; 3,6 à 5,6 s) |
| Premier affichage (FCP), CPU normal | 2,1 à 2,8 s |
| Décalage de mise en page (CLS) | 0 à 0,02 : bon |
| Erreurs JavaScript | aucune |
| Mémoire JavaScript | 7 à 24 Mo |

**Les fichiers lourds** (tous des images) :
- `/cards/logo.png` — **989 Ko** et `/cards/paper.jpg` — **857 Ko** : les matières des cartes, ≈ 1,85 Mo à elles deux, téléchargées dès l'arrivée ;
- les quatre exemples `/exemples/*.jpg` — ≈ 1,38 Mo (339 à 359 Ko chacun), eux aussi téléchargés avant que la personne ait écrit une lettre.

**Le signal `load` n'est pas fiable pour ce site** : selon le passage, il arrive à **1,6 s** (155 Ko reçus) ou à **12 à 17 s** (2,1 Mo reçus), selon que les grosses images sont déjà arrivées. Ce qu'on perçoit, c'est le FCP et la première frappe possible, pas `load`.

## Ce qui n'est qu'indicatif (rendu logiciel)

| Mesure | CPU ×4 | CPU normal |
|---|---|---|
| Images/s pendant l'intro (12 s) | 14 à 28 | 25 à 51 |
| Images/s à la saisie du prénom | 5 à 6 | 7 |
| Images/s pendant la transition vers la feuille | 2,6 à 2,9 | 3,8 à 6,5 |
| Pire image (transition) | 5,6 à 5,9 s | 4,3 à 5,4 s |
| Temps de la validation à la feuille | 35 à 40 s | 13 à 25 s |
| Temps de blocage (TBT) | 22 à 30 s | 5 à 9 s |

Lecture : la transition prénom → feuille est le **moment le plus lourd** (préparation de la scène des cartes, textures, shaders) ; un rendu logiciel l'exagère beaucoup. Sur un vrai téléphone, `CLAUDE.md` rapporte un iPhone X d'abord à 9 i/s puis fluide après la correction du relief — le téléphone réel dira où l'on en est.

## Protocole pour un vrai téléphone (facultatif, tout à la fin — décision du 17/10 : la fluidité n'est pas une priorité)

1. Sur ton téléphone (de préférence un Android milieu de gamme **et** ton iPhone), data mobile en 4G, navigateur **neuf ou cache vidé** : ouvre `https://singulies.com/?fps=1&envoi=0`.
2. Le petit compteur en haut à droite donne **i/s** et **pire image**. Note-les (ou fais une capture) à chaque moment : **intro** · **saisie du prénom (3 lettres)** · **pendant le vol des lettres** · **feuille posée** · **après RECEVOIR** (cartes) · **enveloppe**.
3. Chronomètre : du moment où tu valides le prénom jusqu'à ce que « RECEVOIR » soit utilisable.
4. Envoie-moi les captures : je remplis la colonne « téléphone réel » et je fixe les objectifs de fluidité.

## Objectifs chiffrés proposés (poids et chargement d'abord ; la fluidité est facultative)

| | V1 (DOM, sans 3D) | V2 et V3 (moteur actuel) |
|---|---|---|
| Poids avant la première interaction | **≤ 150 Ko** (HTML + CSS + JS + polices, compressés) | **≤ 250 Ko** (le script actuel pèse 190 Ko + 57 Ko de polices) |
| Poids jusqu'au paiement | **≤ 600 Ko** hors vidéo | **≤ 2,5 Mo** (aujourd'hui 2,2 à 3,6 Mo) |
| FCP (Fast 4G, CPU ×4) | **≤ 1,8 s** | **≤ 2,5 s** (aujourd'hui 3,6 s) |
| LCP | **≤ 2,5 s** | non pertinent (canvas) — remplacé par « première frappe possible ≤ 3 s » |
| Temps de blocage (TBT) | **≤ 200 ms** | à fixer sur téléphone réel |
| CLS · INP | ≤ 0,1 · ≤ 200 ms | ≤ 0,1 · ≤ 200 ms |
| Fluidité (téléphone réel) | sans objet | **médiane ≥ 30 i/s, pire image ≤ 100 ms** à la saisie et dans les scènes ; la transition vers la feuille ≤ 3 s perçues |
| WebGL | **aucun** | repli « version simple » si WebGL2 absent |

## Pistes déjà visibles (à décider, rien n'est fait)

1. **Textures des cartes** (`logo.png` 989 Ko, `paper.jpg` 857 Ko) : les recompresser, ou les charger sans bloquer le premier affichage. Ce sont les matières du site : à valider à l'œil avant toute compression.
2. **Les quatre exemples** (1,38 Mo) : les charger **après** que la personne a commencé à écrire (ou à la demande), pas à l'arrivée. V1 : chargement différé, vignettes légères.
3. **`load` à 12–17 s** : montre que des images lourdes bloquent la fin du chargement ; les passer en priorité basse améliore la perception sans rien changer à l'apparence.
