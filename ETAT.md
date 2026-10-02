# ETAT.md — SINGULIÉS accueil

## Étape courante : 2 terminée (squelette + saisie). Prochaine : 3 (champ de mots).

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
- **Fond** : px>5 = 59 % vs 91,6 % réf → grain trop contrasté (rand³). Viser plancher ≈ 7/255 + bruit fin, moyenne ≈ 8.
- « Jamais plus petit que le fond » : à imposer en étape 3 (taille du prénom ≥ taille des mots du plan moyen).
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
Tout (étapes 2 → 7).
