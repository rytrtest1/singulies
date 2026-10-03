# ETAT.md — SINGULIÉS accueil

## Étape courante : 3 terminée (champ de mots). Prochaine : 4 (lumière organique).

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
Étapes 4 → 7. Dépôt GitHub rytrtest1/singulies : remote `origin` ajouté, push à faire par Maxence (`git push -u origin main`).
