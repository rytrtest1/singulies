# Tour 1 — Lucas (perf, fiabilité)

Chiffres relevés dans le dépôt (17/10) : JS source ≈ 1,13 Mo, dont `src/cards` 245 Ko, `src/alt` 140, `src/sheet` 122, `src/simple` 68 (+ 688 Ko d'images `public/simple` à régénérer à chaque retouche). Bundle : `main` 82 Ko (32 gzip), `cardRenderer` 54 (20), `offre` 43, `sheet` 40, `nav` 37, `scene` 36… ≈ 14 programmes de shaders. `epure.js` : 16 Ko. Vidéo de la machine : 57 Ko. Polices manuscrites : 1,5 Mo (inutiles au parcours).

Dans le navigateur intégré d'Instagram sur iPhone X : noir 1,5 s (planche-site, case 1 : la seule image du site pendant ce temps), compilation des shaders au premier geste, déjà 9 i/s avant le correctif du relief, perte de contexte possible dès qu'on sort de l'app (le contexte est rendu au système). Le prix n'apparaît qu'après le prénom + 6,6 s de rituel : **≥ 12 s pour quelqu'un qui tape vite, jamais pour qui ne comprend pas le curseur.**

## 1. Garder de A
- **La vidéo des mains et du mécanisme** (57 Ko, `machine-7.mp4`) : c'est le meilleur rapport preuve / coût du site. Elle répond au soupçon d'IA mieux que n'importe quelle 3D.
- **Tirer une carte** (cases 7-8) : le geste du jeu, celui de la vidéo. À faire en CSS 3D (`transform: rotateY`, `backface-visibility`) sur les images déjà rendues par le moteur : ≈ 3 Ko, 60 i/s partout.
- **Le prénom qui s'allume dans un champ de prénoms**, en version allégée : canvas 2D, 40 mots, flou pré-rendu en 3 sprites (pas de `ctx.filter`, absent de Safari < 18), mis en pause hors de l'écran. Fond du premier écran, pas porte d'entrée.

## 2. Garder de B
- **Le premier écran en HTML** (planche-epure, case 1) : feuille, curseur, RECEVOIR, prix visibles à la première image. LCP < 1 s en 4G, aucun shader.
- **Le prénom qui s'écrit directement en colonne** sur la feuille (case 2) : même moment fort que le vol des lettres, coût nul.
- **L'adresse qui s'écrit sur l'enveloppe** (case 6) : DOM + une image, rien ne peut planter.

## 3. Retirer
- **La « version simple » comme code parallèle** : 68 Ko + 688 Ko d'images et la règle « toute évolution 3D reportée » = deux sites à maintenir. Un seul chemin, celui qui marche partout.
- Le vol des lettres, la dérive, la vitrine en 3D scrubbée au défilement, le bandeau qu'on glisse, le relais de scènes, le paquet qui se mélange.
- Le cachet qui se forme en maillage fin (`alwaysFine`) : le moment le plus cher, vu deux secondes.
- Les 21 polices manuscrites tant qu'elles ne servent pas.

## 4. Parcours idéal
1. Lien en bio → feuille noire + curseur + « écris ton prénom », champ 2D derrière ; **prix et RECEVOIR visibles à 0,8 s**.
2. Le prénom s'écrit en colonne, ses lettres s'allument dans le champ ; la vidéo des mains paraît sous la feuille (≈ 2 s après la dernière lettre).
3. RECEVOIR (toujours visible) → le paquet (image), « tire une carte », flip CSS.
4. Réponse sur la carte vierge (ou rien = j'improvise).
5. L'adresse s'écrit sur l'enveloppe, puis l'email.
6. RESERVER → l'enveloppe se ferme, cachet en image (une courte vidéo de 1 s si on tient au geste, < 80 Ko).
7. « c'est noté », la référence.

La 3D WebGL n'est **pas** chargée dans ce parcours. Si on veut la garder quelque part : en `import()` différé, après le premier écran, seulement si `WEBGL2` + `deviceMemory ≥ 4` + hors navigateur intégré, pour une page « voir de près » optionnelle.

## 5. Risque principal
Perdre le saisissement : un site rapide mais ordinaire, conversion plus basse malgré la vitesse. Mesure : GoatCounter (déjà branché) en entonnoir — arrivée → première lettre → RECEVOIR → RESERVER — sur deux liens en bio pendant 2 semaines (A / nouveau), plus un événement « temps jusqu'à RECEVOIR visible » et les erreurs `webglcontextlost` envoyées au compteur. Si le taux arrivée → RESERVER ne baisse pas, on a gagné.
