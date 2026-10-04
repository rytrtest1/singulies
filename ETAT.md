# ETAT.md — SINGULIÉS accueil

## Point de reprise (fin de session 03/10)
- **En ligne** : rytrtest1.github.io/singulies (GitHub Pages, push sur `origin main` = déploiement). Règles à jour : `CLAUDE.md` (fait foi, plus récent que l'historique ci-dessous).
- **Fait** : étapes 2–4, 5 (mode horizontal v1 ; défaut = mélange avance + courants lents), 6 en partie (Entrée = confirmer, toucher le prénom → colonne de l'acrostiche → noir ; visiteur qui revient ; retour). Point de fuite et prénom à 50 %. Recouvrements par lettre. Suggestion du prénom (autocomplete given-name) + clavier fermé après sélection (Safari, Chrome Android). Molette / glisser = avancer-reculer (recul = le temps remonte). Icône SS blanc sur noir.
- **Prochaine étape décidée** : concevoir le passage vers la scène suivante (**les cartes questions**). Proposition retenue en discussion : piste A — le champ s'éteint, la colonne du prénom glisse à gauche et reste comme fil rouge, 3 cartes noires (logo SS gaufré) arrivent du fond, on en retourne une (question tapée à la machine), on garde ou on repioche. Réponses de Maxence (03/10) : **73 questions du jeu : oui** (`Downloads/singulies-questions.json`) ; police machine à écrire : **à déterminer** ; « champ libre » / « surprends-moi » sans texte : **à déterminer** ; son de frappe : **non pour le moment**. → rédiger une section « scène 2 » dans CLAUDE.md, plan avant code (méthode, étape 1).
- **04/10 — scène 2 cadrée** (voir CLAUDE.md « Validation » et « Scène 2 ») : transition par les lettres allumées qui rechargent le prénom, prénom en haut, paquet au centre ; piocher / défausser au toucher ; carte vierge noire = thème libre ; « passer » = improvisation ; questions en minuscules accentuées ; carte hybride (scan du dos + logo extrudé + frappes scannées). Colonne d'acrostiche réservée à la fin. En attente : scans de Maxence, choix du champ de réponse.
- **04/10 — relevé des cartes réelles** (`ressources/cartes/` : 5 photos iPhone 12 Mpx avec règle, `logo_singulies.svg` tracé auto, 1 chemin) : carte **paysage ≈ 87 × 52 mm**, coins r ≈ 3 mm ; logo ≈ 35 × 33 mm centré, **gaufré au dos, en creux visible au recto** (le texte passe dessus). Frappe pica ≈ 2,5 mm/caractère (10 cpi), **double interligne ≈ 8,5–9 mm**, 2–3 lignes, coupures choisies au sens, ≤ 22 car./ligne, marge gauche variable 8,5–13 mm, bloc un peu au-dessus du milieu, « ? » précédé d'une espace. Encre gris-blanc, frappes inégales (lettres partielles), **traces de carbone** (traits horizontaux, rayures, taches), papier marqué. Questions coupées à 24 car. : 2 lignes 36, 3 lignes 35, 4 lignes 1. Manquent : photos en lumière rasante, page de frappes (alphabet).
- **04/10 — scène 2, étape 1 (matières) faite** : `tools/cards-assets.mjs` (Chromium/Playwright, une fois). Redressement des 5 photos (bords ajustés → homographie, 24 px/mm, gris) dans `ressources/cartes/redresse/` (non versionné, comme les photos) ; rapport mesuré 1,68–1,70 → **87 × 51,5 mm**. `public/cards/paper.jpg` (2088×1236, 0,87 Mo) = relief relatif du papier (L / moyenne locale σ 6 mm ; écart-type 0,10), zone du logo comblée par du papier voisin retourné. `public/cards/logo.png` (1024², distance signée ±2 mm, carré de 38,5 mm). `cards.json` = dimensions + encodages. **Logo réel ≈ 33,2 × 33 mm alors que le SVG fait 1,11:1** (dessin du gaufrage un peu plus haut / différent à droite, écart ≈ 1 mm) → on garde les proportions du SVG à 33,2 mm de large (question posée).
- **04/10 — scène 2, étape 2a (carte 3D, banc d'essai)** : `src/cards/cardRenderer.js` (volume 87 × 51,5 × 0,4 mm, coins r 3, tranche ; dos = logo en relief, recto = creux vu en miroir ; papier réel ; relief = SDF 16 bits → R16F ; normales par différences centrées ; micro-relief des fibres tiré du papier ; ombres propres par marche vers la lampe ; lustre de Blinn ; profil = pied raide 0,12 mm (pli) + épaule arrondie 1 mm, h 0,4 mm, élargi à l'empreinte du pixel). `banc-carte.html` + `src/cards/bench.js` (page de dev, non publiée : photo à gauche, rendu à droite, réglages dans l'adresse). `tools/bench-shot.mjs` (capture + luminance + loupe). Calage sur IMG_0063 : lampe az −25°, él. 35°, 220 mm ; papier 25,5 vs photo 24,9. Logo réel ≈ 9 % plus haut que le SVG (lsy 1,09 au banc, en attente de décision). Captures : `captures/cartes/`. Le panneau navigateur intégré ne joint pas le serveur Vite (captures par Playwright). Reste étape 2 : texte tapé (police libre provisoire), carte dans l'éclairage du site.
- **04/10 — étape 2b (réalisme)** : lampe étendue (rayon 60 mm, ombres douces, lobe élargi) + pièce neutre en environnement ; papier = Oren-Nayar (σ 0,25) + GGX (rugosité 0,45) + sheen de Charlie + fibres qui scintillent (facette propre par texel clair) ; grain = détail fin ×3 seulement (pas les nuages) ; gondolage (0,25 / −0,12 / 0,1 mm, maillage en grille) ; bord cassé irrégulier ~0,15 mm, plus aux coins ; tranche plus claire. Papier mesuré 22,5 ± 3,3 vs photo 24,9 ± 3,2. Banc : rendu à la demande.
- **04/10 — étape 2c (question tapée)** : `src/cards/ink.js` — police provisoire **Courier Prime** (OFL, `public/fonts/CourierPrime-*.woff2` + licence), la plus proche de la frappe réelle (même pas, empattements, « a » à deux étages) ; carte d'encre 16 px/mm par carte (Canvas 2D) : pression, frappe partielle, décalage/rotation, œil bouché, double frappe rare, traces de carbone (trait cassé, bavure, poussière). Shader : encre déposée sur les sommets des fibres, moins frappée dans le creux du logo, léger enfoncement du papier. **Coupure** : remplissage ≤ 24 car. sans finir sur un petit mot (te, la, du, ta, qu'…), pas de dernier mot seul court, « ? » insécable → reproduit exactement les cartes relevées (« as-tu eu du mal à / te retrouver après / ta dernière relation ? ») ; 2 lignes 35, 3 lignes 34, 4 lignes 3, 1 ligne 1. `src/cards/questions.json` (73). Recto mesuré 24,6 ± 8,8 vs photo 25,8 ± 9,6.
- **04/10 — frappe v2 (retour Maxence : lettres plus fines et marquées, plus organiques)** : gros plan des cartes réelles → trait fin fait de **grains de carbone serrés (≈ 0,07 mm)**, plus denses au bord de la lettre, avec des manques. Shader : bord net (seuil sur la carte d'encre 24 px/mm), densité = pression (0,3–0,92) × bord × creux du logo, grains = bruit de valeur à 2 octaves + fibres du papier, fondus en densité moyenne quand le grain est plus petit qu'un pixel. Frappes plus variées (pression σ 0,16, ligne de base ±0,09 mm), moins de lettres à moitié effacées.
- **04/10 — frappe v3 (« encore trop plat, document PC »)** : caractères usés (contour déformé ≈ 0,04–0,09 mm), épaisseur variable dans la lettre (seuil modulé), grains de 2 tailles + amas, éclat propre à chaque grain, bavure faible dans les fibres, frappe qui marque plus le papier (inkPress 0,05). Réglage `inkWear` (0 = net, 1 = défaut).
- **04/10 — frappe v4 (Maxence : pas de pointillé — c'était la résolution de la photo ; lettres précises, fines, marquées ; opacité qui varie dans la lettre ; texture du papier intégrée)** : grains, éclats et bavure retirés ; bord franc (seuil 0,4 sur la carte d'encre → trait plus fin) ; opacité = pression × variation douce (≈ 0,5–1 mm) × creux du logo × relief fin du papier (fibres plus blanches, creux moins couverts). Usure du contour réduite à 0,15. Réglages : inkThr, inkVar, inkPaper, inkWear.
- **04/10 — frappe v5 (contours et graisse organiques)** : carte d'encre lue adoucie (≈ 0,08 mm) → la force de chaque frappe change la graisse de la lettre ; seuil du bord modulé à 0,7 mm (épaisseur qui varie dans la lettre) et 0,12 mm (contour irrégulier mais net) ; dessin légèrement déformé (inkWear 0,5) ; papier dans l'encre réduit (inkPaper 2, sinon taches). Banc : zoom molette.
- **04/10 — réglage de la frappe choisi par Maxence** : inkWear 1,4 ; inkThr 0,38 ; inkVar 1,5 ; inkPaper 15 ; inkOrg 0,95 (défauts du banc ; plages de inkVar et inkPaper élargies, il était en butée).
- **04/10 — relief en volume (Maxence : « de profil je ne vois pas de profondeur »)** : parallaxe par marche dans le relief (8–40 pas selon l'angle) : le logo du dos dépasse et masque le papier, le creux du recto se cache en partie ; encre atténuée sur les parois raides du creux. **Carte 0,25 mm** (était 0,4). Sens vérifié : gaufrage à sec = relief au verso (logo), creux au recto (texte). Défaut connu : traînées d'encre sur les parois du creux en vue très rasante.
- **04/10 — gaufrage en vraie géométrie (Maxence : « de profil rien ne dépasse de la tranche »)** : maillage indexé, pas 0,2 mm sur la zone du logo (44 × 46 mm), 2 mm ailleurs (≈ 57 000 quadrilatères par face, ≈ 230 000 triangles au total) ; le shader de sommet lit le relief du logo et pousse toute la feuille (bosse au dos, creux au recto, même déplacement) ; pied adouci à 0,22 mm pour la géométrie, détail fin gardé par les normales. La parallaxe est désactivée par défaut (réglage `parallax`). À surveiller à l'étape 7 : coût des sommets sur téléphone.
- **04/10 — scène 2, étape 3a (paquet dans la scène)** : `src/cards/scene.js` (paquet de 12 cartes visibles, ordre tiré au hasard, variations par carte ; piocher = la carte du dessus se soulève, se retourne (1,05 s) et se pose question visible ; toucher la question ou le paquet = défausser (0,75 s, part à gauche) puis la suivante se retourne aussitôt ; carte vierge dessous, recto ; lumière neutre qui suit le pointeur, ressort ω 2,2 ζ 0,85 ; sélection par coins projetés). Pile en maillage léger (2 mm), dessus/question/vierge en maillage fin. Page de dev `scene-cartes.html?prenom=LEA- **En attente** : étape 7seed=3`. Encre moins effacée sur le creux du logo.
- **En attente** : étape 7 (qualité adaptative, stationnarité en portrait 20–36 mots, peu de mots proches en portrait, tri des essais `?saisie=roue` / `?saisie=voix`) ; test sans consigne à 5 personnes sur mobile.
- **Tests** : `npm test` (43), `npm run test:e2e` (86) ; ne publier que si tout passe. Mesures : `tools/measure.mjs` (agent mesures), `tools/check-live.mjs`.

## Étape 3 — fait (03/10)
- Fichiers : `src/field/camera.js` (FOV 48°, VP 50/45 %, ZF 14 fixe, KB 0,034, κ 0,8), `src/field/field.js` (simulation CPU : tranches, zoom, fondus, zone vide, anti-chevauchement, emit → 20 floats/lettre), `src/field/names.js` (≈ 220 prénoms A–Z), `src/field/rng.js` (mulberry32, `?seed=N`). Renderer : programme FIELD (lettre = quad instancié projeté dans le VS, w = z, flou par lettre `gaussCdf(d/√(σ²+aa²))`, gain lum. ≤ +40 %). 3 draw calls (fond, champ, prénom).
- Grain corrigé : plancher 6,4 + 3,6·bruit (fin 75 % + grumeau 3 px 25 %), vignette 0,45·smoothstep(0,5→1).
- Outils : `measure.mjs --stationarity` (moyenne 60 s à 0/10/20/30 min, simulation accélérée) ; colonnes mots visibles / tranches / chevauchements. `tools/check-live.mjs` (parallaxe, perte de contexte, mouvement réduit). Tests : `tests/unit/field.test.js` (8, agent tests).

### Chiffres étape 3 (seed 7, Chromium swiftshader, pas de GPU)
| capture | px>5 | px>20 | px>80 | lum | visibles (P/M/L) | chev. |
|---|---|---|---|---|---|---|
| imageref | 91.57 | 6.36 | 0.56 | 10.26 | ≈60 | – |
| 1672 vide | 95.41 | 8.92 | 0.24 | 11.17 | 73 (5/31/37) | 0 |
| 1672 LEA | 95.39 | 9.02 | 0.32 | 11.36 | 73 | 1 |
| 1672 CLEMENCE ROSE | 95.41 | 9.11 | 0.61 | 11.91 | 70 | 1 |
| 1672 22 car. | 95.36 | 7.95 | 0.73 | 11.82 | 62 | 2 |
| 390 CLEMENCE ROSE | 95.77 | 9.27 | 1.12 | 12.86 | 29 (3/12/14) | 0 |
- Stationnarité (moy. 60 s) 1672 : 73,5 / 71,1 / 70,3 / 71,7 à 0/10/20/30 min ; 390 : 30,3 / 31,3 / 30,4 / 30,3. Proches 5,2–5,6 (desktop).
- FPS 19 (1672, swiftshader ; 37 avant champ) / 60 (390). 3 draw calls, ≈16 Mo GPU. Préchauffage 700 s : ≈ 0,6 s CPU.
- Perte de contexte → reprise OK (3 draw calls, 417 lettres). Mouvement réduit : 0 mot déplacé. Parallaxe : 38 % de la cible à 0,4 s, ≈ atteinte à 3 s.
- Tests : 37/37 unitaires, 62/62 e2e.

### Décisions étape 3
- S monde 0,30 (proto 0,356) : sinon le plan moyen égale le prénom. Échelle écran étroit `fieldScale` = clamp(W/H/1,5 ; 0,72 ; 1).
- Gris : lointain 0,17 ; 8–16 : 0,36→0,17 ; proche 0,24→0,36 (≈ 0,8 × proto) — à revoir en étape 4 avec les lettres allumées (lum moy et px>80 de la réf les incluent).
- Naissance : z uniforme en ln z dans la tranche, meilleur de 12 positions (visible, hors zone, peu de recouvrement) ; mort au bord proche de la tranche (fondu 4,5 s) ou hors écran (invisible) → renaissance immédiate même tranche, fondu 4,5 s.
- Recouvrement : boîtes élargies de 0,4 em du plus petit mot (mots qui se touchent = recouvrement) ; effacement ≤ 86 % pondéré par la visibilité du plus proche, τ 1,2–1,8 s par mot. Séparation 1 px/s si z_loin/z_proche < 1,3, filtre 1,8 s.
- Zone vide : rectangle max(260×110·ui, prénom + 1,1 fs), fondu 70·ui px, lissé 1 s.
- Caméra : parallaxe pointeur (souris) 0,12/0,08 monde, ressort ω 2,2 ζ 0,85 + oscillation lente 0,05/0,03.

### Révision 3b (retour Maxence : « texte mieux dans le prototype », apparitions aléatoires, clavier iPhone)
- **Diagnostic texte** (loupe prototype vs nôtre) : 1) lointains pâteux — avec un seul KB = 0,034, σ ≈ 1,4 px sur 10 px de corps (σ_em ∝ |1 − z/z_f| croît au loin) ; le prototype floute 6× moins au loin. 2) lettres 16 % plus petites (S 0,30). 3) interlettrage lointain trop large (0,24 em). 4) grain lissé, sans scintillement.
- Corrigé : KB_FAR = 0,007 au-delà de z_f (KB = 0,034 en deçà) ; S = 0,356 (proto) ; interlettrage 0,07–0,15 em ; gris du prototype ; grain plancher 6 + scintillement g⁴ ; vignette 0,32.
- **Flux continu** (nouvelle règle, CLAUDE.md mis à jour) : naissance z 30–34 seulement (fondu 4,5 s), mort seulement hors écran (ou z ≤ 2,3, au centre, déjà effacé). 55 % des naissances près du point de fuite (r < 0,13), réduit sur écran étroit, et régulé (moins de naissances centrales quand > 28 % des mots sont cachés dans la zone) → visibles stables. Noms courts pour les naissances centrales (futurs proches).
- Zone vide : cœur (60 %) efface tous les mots ; zone entière seulement les mots > 10–20 px. Demi-largeur ≤ 0,3 W hors prénom (mobile).
- Recouvrement : marge réduite 0,4 → 0,15 em (moins d'effacements « aléatoires »).
- Mobile : 40 mots (34 avant). Clavier : taille CSS du canvas figée en px → plus d'étirement à l'ouverture du clavier (non vérifié sur iPhone).
- Chiffres 1672 LEA : px>5 94,5 / px>20 8,6 / px>80 1,1 / lum 12,6 ; 62 visibles. Stationnarité (moy. 60 s) 1672 : 55,2 / 54,1 / 56,1 / 59,3 ; 390 : 24,7 / 26,9 / 26,3 / 26. Sur 3 h simulées, moyennes 10 min 54–62. Proches : moy. ≈ 4,7 (1672), ≈ 1–5 (390). FPS 18 (1672 swiftshader) / 60 (390). Tests 38/38 + 62/62.

### Révision 3c — retour au look du prototype (Maxence : « le HTML d'avant est beaucoup mieux »)
- Diagnostic à la loupe ×3 : le **dessin des lettres** (SDF) est équivalent au prototype (graisse, netteté). Les écarts venaient de : 1) **pas de lettres allumées** (le prototype démarre avec LEA déjà saisi : lettres blanches + reste à 62 %) → étape 4 ; 2) **proches trop nets et trop lumineux** (prototype : σ 0,11 em, fantomatiques) ; 3) **cisaillement** : nos lettres étaient des quads 3D (verticales droites, ligne de base inclinée → effet italique) alors que le prototype tourne chaque lettre rigidement ; 4) **grain** du prototype (#050505 + rand³ 23/255, vignette 0,66) remplacé à tort ; 5) aspect « cœur net + halo » du mélange de sprites du prototype.
- Fait : ZF = 10, K proche 0,0712 / lointain 0,0107 (= courbe du proto en continu), plafond 0,11 em ; lettres = sprites placés par la caméra, rotation rigide selon la pente locale de la ligne de base, compression cos ψ ; flou = cœur + halo analytiques jusqu'à 0,045 em puis fondu continu vers un atlas pré-flouté σ 0,11 em (¼ résolution, 512×258) ; gris du proto (courbes smoothstep) ; atténuation des éteintes 0,62 quand un prénom est saisi ; fond et vignette du proto ; interlettrage 0,08–0,14 em.
- Essai abandonné : vrai flou à 12–16 échantillons → 6 img/s en 1672 (logiciel). Atlas pré-flouté : 19 / 60 img/s (identique à avant).
- Régulation des naissances centrales durcie (3 − 2,5·cachés/cible) : visibles moy. 60 s à 0/10/20/30 min = 59,4 / 56,9 / 57,3 / 58 (1672), 27,1 / 26,6 / 27 / 30 (390). Répartition moyen/lointain fluctue (29↔14 moyens) : effet de cohortes du flux.
- Chiffres 1672 LEA (seed 11) : px>5 64,4 / px>20 10,7 / px>80 0,08 / lum 10,5 ; 60 visibles, 1 chevauchement. px>5 bas = grain du proto (référence 91,6).
- Tests 38/38 (fenêtre de stationnarité du test : 5 min).

### Étape 4 (en cours) + retours mouvement / portrait / grain (03/10)
- `src/field/light.js` : diff du prénom → onde par frappe (retard 0,05 + 0,65·dist + 0,35·profondeur + propre), attaque/décroissance/intensité propres, repos 0,55→0,42 selon z × anneau (0,5 + 0,5·(1 − sm(0,25, 1, dist))) × souffle 2 sinus ; retrait = extinction du plus loin vers le centre (0,25–0,6 s). Paramètres par lettre tirés à la naissance du mot (`letterParams`).
- Rendu : allumée = gris éteint (×0,62) + L ; traînée = passage additif (atlas pré-flouté) étiré 1,5 + 3,4·longueur·dist·L, incliné vers l'extérieur ±50°, balancement propre, largeur ×0,75. 4 draw calls.
- Le champ écoute : souffle de caméra (ressort sur f, +0,015 ajout / +0,008 effacement) et courant ralenti à 35 % puis retour en 1,1 s.
- **Mouvement** (retour Maxence : deux mots au même endroit mais à profondeurs différentes bougeaient pareil — c'est le propre d'un zoom exponentiel) : caméra qui avance, vitesse ∝ √z (vraie parallaxe ≈ 3× proche/lointain ; à vitesse constante, les proches tombaient à ≈ 1 visible).
- **Portrait** : réglages portrait supprimés (`fieldScale`, nombre de mots selon la largeur) ; cadre virtuel 16:9 recadré au centre.
- **Grain** retiré par défaut (`?grain=1`).
- Chiffres 1672 (seed 11, repos) : LEA px>5 64,4 / px>20 3,4 / px>80 0,46 / lum 7,6 ; CLEMENCE ROSE lum 9,3 / px>80 1,24. Stationnarité 1672 : 59,1 / 60,9 / 57,8 / 60,5 ; 390 : 28,5 / 25,4 / 24,3 / 32,8 (± 15 % : petite fenêtre recadrée). Proches ≈ 0,7–3 (1672), ≈ 0 en portrait. FPS 21,7 (1672 logiciel). Tests 38/38 + 62/62.
- Reste étape 4 : réglage fin (intensités, anneau, longueur des traînées), mouvement réduit à vérifier visuellement, mesure du rapport allumé/éteint.

### Étape 4 — itérations lumière (03/10)
- Essais successifs abandonnés : traînée copie floue (« copier-coller »), aurore à sinus, flamme procédurale (« cheap »), mode masque, traînée en bande déformée + lettre déformée (« trop d'effort pour peu de résultat »).
- Retenu : propagation lente de l'arrière vers l'avant (≈ 5–6 s, bord irrégulier) ; lettre allumée = mise au point (σ × 0,12) + lumière intérieure (fbm en coordonnées du glyphe, graine propre). 3 draw calls, 27 img/s (1672 logiciel) / 60 (390).
- Chiffres seed 11 (repos, t = 12 s) : 1672 LEA px>5 61,1 / px>20 1,6 / px>80 0,28 / lum 6,4 ; 22 car. px>80 1,19 / lum 7,9 ; 390 CLEMENCE ROSE px>80 1,37 / lum 8,9. Visibles 51–60 (1672), 28–29 (390). Tests 38/38.

### Itérations 03/10 (suite) — voir CLAUDE.md pour les règles à jour
- Flou : mise au point au fond (z_f 34, K 0,055), sans gain de luminosité (fondu net ↔ atlas pré-flouté). Luminosité croissante avec la profondeur.
- Portrait = champ du paysage recadré, prénom au milieu, plus petit/resserré. Curseur effilé qui respire.
- Mouvement : dérive propre et oscillation quasi supprimées ; pas d'accès au mouvement du téléphone ; molette / glisser vertical = avancer-reculer.
- Saisie : suggestion du prénom (autocomplete given-name) par défaut, clavier fermé après remplissage auto ; Entrée = confirmer ; toucher le prénom (ou 2e Entrée) = colonne (acrostiche) puis noir.
- Essais : `?saisie=roue`, `?saisie=voix`. Tests : 43 unitaires, 86 e2e (agent tests : 2 bugs corrigés — repli sans WebGL2 bloqué, 2e Entrée sans focus).

### Clôture étape 4 — mesures (agent mesures, seed 11, t = 12 s, SwiftShader sans GPU)
| capture | px>5 | px>20 | px>80 | lum | visibles (P/M/L) | chev. |
|---|---|---|---|---|---|---|
| imageref | 91.57 | 6.36 | 0.56 | 10.26 | ≈60 | – |
| 1672 vide | 64.27 | 0.73 | 0.01 | 6.07 | 62 (3/19/40) | 1 |
| 1672 LEA | 63.95 | 1.37 | 0.09 | 6.26 | 62 | 2 |
| 1672 CLEMENCE ROSE | 64.67 | 2.44 | 0.42 | 7.24 | 58 | 2 |
| 1672 22 car. | 64.24 | 2.32 | 0.34 | 7.02 | 60 | 2 |
| 390 LEA | 61.72 | 1.36 | 0.18 | 6.30 | 27 (0/6/21) | 0 |
| 390 CLEMENCE ROSE | 61.76 | 2.38 | 0.78 | 7.60 | 26 | 0 |
- Prénom : x 50 %, y 45 % partout (390 : hauteur 21 px LEA, 74 px sur 2 lignes).
- FPS 24,3 (1672) / 60,3 (390), 3 draw calls, 16 / 6,5 Mo GPU.
- Stationnarité (moy. 60 s, 0/10/20/30 min) 1672 : 60 / 56,9 / 58,5 / 60,7 (± 4 %) ; **390 : 30,4 / 36,2 / 20 / 26,5 (± 30 %, à corriger)** — fenêtre recadrée étroite + courant ×2. Proches : 1,4–2,8 (1672), 0–1,3 (390).
- Minuscules OK (1672 LEA lum 6,0 ; 390 lum 6,0). Mouvement réduit : 0 mot déplacé.

### Étape 6 (en cours)
- Visiteur qui revient : lettres déjà allumées à l'arrivée (`light.prime`, sans onde), prénom confirmé (pas de clavier ; toucher le prénom → colonne). Retour (flèche/Échap) : prénom conservé et confirmé, pas de clavier sur téléphone.
- Reste : affiner la colonne de l'acrostiche, stationnarité portrait, premier plan.

### Étape 5 — mode horizontal v1 (03/10)
- `field.step(dt, motion, speed, mh)` : mh 0 profondeur → 1 horizontal (mélange progressif). Horizontal : vx = A·sin(k·Y + φ(t)), z figé, sortie latérale → retour par l'autre bord à même profondeur/hauteur (`wrap`). Bascule : Tab, double-clic, `?mode=horizontal`.
- Mesure (1672, 2 s) : 14 mots vers la droite, 22 vers la gauche ; proches ≈ 34 px/s, lointains 4–16 px/s ; profondeur inchangée ; Tab → retour profondeur en ≈ 3 s.
- Limites v1 : en horizontal, plus de naissances ni d'avance (composition figée en profondeur) ; double toucher sur téléphone = aussi ouverture du clavier.

- v2 (03/10) : nappes 2× plus lentes (A 0,12) ; **mélange par défaut** (avance + nappes, renaissance au fond) ; Tab/double-clic font défiler mélange → profondeur → horizontal. Stationnarité mélange 1672 (moy. 60 s) : 62,7 / 59,9 / 63,6 / 61,4 ; proches 1,5–5,4.

### Recouvrements par lettre (03/10)
- Effacement calculé par lettre (centre/demi-largeur écran de chaque lettre vs boîte du mot plus proche, bords doux), lissé par lettre. Mesure « chevauchements » = une lettre encore nette (alpha > 0,3) sous la boîte d'un mot proche net : 1,8–4,3 (1672). Visibles 63–67. FPS 27 (1672) / 60 (390).

### Point de fuite au centre (03/10)
- À 45 % : autant de densité en haut qu'en bas mais 22 % de surface en plus en bas → plus de mots en bas. Une correction des naissances (58 % en haut) a été essayée puis retirée (« pas de bricolage ») : point de fuite et prénom à 50 %. Mesure 12 tirages × 10 min : mots proches haut/bas 0,99, surface haut/bas 0,97 (par tirage : 0,6–2,2, d'où des impressions trompeuses sur une courte durée). Prénom mesuré à 50 / 49,9 %.

### Ouvert
- Proches un peu sous la cible (≈ 4,7 au lieu de 6) : contrainte du flux (un proche doit naître au centre). Plus de proches = plus de mots cachés dans la zone.
- Option clavier : atténuer le fond quand le clavier est ouvert (proposition de Maxence) — en attente de son essai sur iPhone.
- **Mobile + prénom long** : prénom à 28 px, mots du plan moyen proche (z≈6) ≈ 39 px → « jamais plus petit que le fond » non tenu. Options : réduire encore le fond sur mobile (lointains illisibles < 6 px), ou n'appliquer la règle qu'au plan moyen typique (z≈9 → 21 px). À trancher.
- FPS 1672 en logiciel : à traiter étape 7 (qualité adaptative).
- px>5 = 95 % vs 91,6 % : fond légèrement trop clair en bords (vignette réf plus marquée ?) — mineur.

## Étape 2 — fait (03/10)
- Fichiers : `src/main.js` (amorçage, boucle, états input→leaving→black, clavier mobile), `src/text/normalize.js`, `src/input/model.js` (modèle + undo groupé < 1 s), `src/input/bridge.js` (beforeinput/paste interceptés ; IME = aperçu puis réconciliation à compositionend ; reste → `fromNative`), `src/gl/atlas.js` (SDF EDT maison, 128 px/em, portée 48 px, R16F, distance en em, 52 glyphes → 2048×1029), `src/gl/gl.js` (+ `gaussCdf` GLSL pour le flou), `src/render/renderer.js` (fond + quads instanciés), `src/name/layout.js`, `src/app/storage.js`.
- Outils : `tools/measure.mjs` (build → vite preview 5199 → Chromium swiftshader → JSON). Tests : `npm test` (vitest), `npm run test:e2e` (Vite 5198 + Playwright).
- Police : `public/fonts/EBGaramond-500.woff2` + `OFL.txt` (copiés de @fontsource puis paquet retiré). Chargée via FontFace dans la seconde de noir.
- Pages : `.github/workflows/pages.yml` prêt (Node 20, vitest, build, deploy). Dépôt GitHub pas encore créé (pas de `gh` ; Maxence le crée → push).
- Agents : `.claude/agents/mesures.md` (haiku), `tests.md` (sonnet). Ne se chargent que si la session démarre dans SINGULIES_WEB.

### Chiffres étape 2 (Chromium headless swiftshader, pas de GPU)
| capture | px>5 % | px>20 % | px>80 % | lum moy | prénom x/y % | haut px |
|---|---|---|---|---|---|---|
| imageref | 91.57 | 6.36 | 0.56 | 10.26 | 50.4/45.1 | 82 (avec curseur) |
| 1672 vide | 58.78 | 7.60 | 0 | 9.24 | – | – |
| 1672 LEA | 58.82 | 7.69 | 0.08 | 9.42 | 50/44.9 | 38 |
| 1672 CLEMENCE ROSE | 58.94 | 7.99 | 0.39 | 10.11 | 50/45 | 39 |
| 390 CLEMENCE ROSE | 59.54 | 8.39 | 0.94 | 11.2 | 50/45 | 88 (2 lignes) |
- FPS 37 (1672) / 60 (390), 2 draw calls, ≈16 Mo GPU. `?grain=0` : lum moy 0,2.
- Tests : 29/29 unitaires, 62/62 e2e. Bug corrigé par l'agent tests : `setSelection` coupait le groupe d'annulation à chaque resynchro.

### Décisions étape 2
- Validation : événement + `onNameValidated` émis à la FIN du fondu (1,2 s) ; aussi au rechargement restauré (`detail.restored = true`). Nom émis = forme d'affichage (casse choisie), sans espace final.
- Stockage : localStorage `singulies.name` (visiteur qui revient) ; sessionStorage `singulies.validated` (rechargement → écran noir). Échap/flèche efface les deux, le prénom reste affiché.
- Flèche retour = div non focalisable (un seul focalisable : le champ) ; Échap marche au clavier.
- 22 lettres sans espace sur 390 px : impossible à ≥ 28 px sur une ligne → coupure DANS le mot en dernier recours (fs = 28). Interlettrage compressible jusqu'à 0,15 em avant.
- Clavier mobile : `interactive-widget=resizes-visual` ; remontée via visualViewport (ressort), variation de hauteur seule pendant la saisie = pas de redimensionnement.
- Rendu SDF du prénom : couverture `clamp(d+0.5)` puis `pow(.,0.8)` (préserve les déliés en clair sur sombre).

### À corriger (repéré par les mesures)
- Fond : corrigé en étape 3.
- Non vérifié : téléphones réels, Safari/iOS (IME, dictée, menu d'accents, clavier), lecteurs d'écran.

## Constantes extraites du prototype (points de départ calés à l'œil)
Caméra
- FOV 48°, f = (H/2)/tan(FOV/2), point de fuite (0,5 W ; 0,45 H). κ = 0,8, ψ plafonné à 0,8 rad.
- ZF prototype = 10 **avec respiration** ±4 % période 18 s → INTERDIT par la consigne : z_f fixe 14.
- Flou prototype : 4 niveaux discrets LV = [0 ; 0,018 ; 0,045 ; 0,11] (σ en fraction de la taille de police), ratio = z<zf ? 0,2·(1−z/zf) : 0,03·(z/zf−1) → remplacé par σ ∝ |1/z − 1/z_f| continu.
Champ
- N mots : 78 (W ≥ 700), 34 (mobile).
- Tranches : 8 % z 2,8–4,6 ; 42 % z 6–14 ; 50 % z 16–32 (identiques à la consigne).
- Placement : u,v ∈ [−0,1 ; 1,1] ; mots proches (z < 5) forcés en bord (|u−0,5| > 0,3 ou |v−0,5| > 0,3) ; zone vide ≈ |u−0,5| < 0,24 et |v−0,45| < 0,14.
- Taille monde d'une lettre S = 0,356 × U(0,9 ; 1,15). Jitter vertical par lettre ±0,015 S. Encre par mot U(0,92 ; 1,08).
- Interlettrage fond : avance = largeur glyphe + 0,1 em (à rendre variable selon taille écran).
- Gris par profondeur : z > 16 → 0,20 ; 8–16 → 0,20→0,44 ; z < 8 → 0,44→0,26 (proche plus sombre, car flou). Atténuation × (1 − 0,6·sm(28,34,z)).
- Zone vide prototype : kw = 300·ui, kh = 120·ui, ui = clamp(W/1440 ; 0,6 ; 1,3), fondu sur ~70 px / ~44 px.
- Dérive lente par mot : v ∈ ±0,025 monde/s ×0,4. Caméra : avance 0,05/s (mode profondeur), oscillation 0,05·sin(0,11 t) en X, 0,03·sin(0,083 t+1) en Y.
- Parallaxe : ressort ω = 2,2, ζ = 0,85 ; amplitude 0,12 (X), 0,08 (Y) monde.
- Horizontal prototype : translation rigide 0,22 monde/s (→ à remplacer par le champ de courants sinusoïdal bidirectionnel).
- Bascule de mode : lissage exponentiel taux 1,2/s.
Lumière (prototype, à enrichir)
- Repos allumé : 0,55 (z ≤ 16), 0,42 (z > 16). Dim des éteintes : 0,62 (lissage 2,5/s).
- Onde : gaussienne centrée 0,24 s, largeur 0,24 s, amplitude 0,8, retard = 0,65 × distance normalisée + 0,05 s. Durée de vie 2,2 s.
- Extinction : 0,4 s. Traînée : copie floue étirée ×2,4 verticalement, alpha (L−0,35)·0,45, additive.
- Souffle de frappe : SR.v += 0,015 (ajout), 0,008 (effacement) → recul caméra transitoire.
Prénom central
- Hauteur de capitale = 0,04 H ; taille police = cap/0,65 ; interlettrage 0,45 em ; baseline cy + cap/2.
- Curseur 1,5 px × 2·cap ; clignotement période 1,1 s.
Fond
- #050505, grain 256² (v = 255·rand³, alpha 23/255), vignette radiale transparente à 52 % → #000 alpha 0,66 au bord, centrée (50 % ; 46 %).

## Référence (imageref.png, lecture visuelle seulement — chiffres à mesurer par l'agent mesures)
- ≈ 60 mots visibles, ≈ 5–6 proches très flous (Léa, Lucas, Thomas, Sarah, Élise, Nina), prénom central ≈ y 45 %, x 50 %, curseur visible.
- Traînées verticales sur lettres allumées ; lettres allumées nettement plus blanches que le reste.
- Contient accents + minuscules : ne pas comparer le texte.

## Décisions
- Vite 5 (Node 18.16 local).
- Écarts assumés vs prototype : z_f fixe 14 (pas de respiration), flou continu, avance par zoom exponentiel dans la tranche (pas de translation de caméra), police locale.

## Reste
Voir « Point de reprise » en tête de fichier.
