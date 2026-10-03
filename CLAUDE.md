# SINGULIÉS — écran d'accueil (phase visuel + interaction)

Périmètre : ouverture de la page → saisie du prénom → validation → écran noir. **Hors périmètre** : serveur, enregistrement, RGPD. **Phase de tests : RGPD et appels réseau des essais (voix) non pris en compte pour l'instant** (03/10).
Reprise de session : lire ce fichier + `ETAT.md`. Ne pas relire le prototype ni la référence en entier (constantes déjà extraites dans ETAT.md).

## Ressources (`ressources/`)
- `imageref.png` : image cible 1672×941 (= « reference.png » de la consigne). Elle montre des accents et des minuscules : **seule la composition/luminance compte**, pas le texte.
- `SINGULIÉS — mouvement.html` : prototype Canvas 2D (= « mon-rendu/singulies-mouvement.html »). Fixe comportement + look ; réécrire en WebGL2, ne pas copier. Ne jamais lire `plus-tard/`.

## Stack
- Vite + JS sans framework, un canvas, **WebGL2 uniquement**. Pas de repli de rendu : sans WebGL2 → écran noir, saisie + validation fonctionnelles, pas d'animation.
- Aucune dépendance sans gain mesuré (tiny-sdf ou EDT maison autorisé).
- Police EB Garamond ou Cormorant Garamond en local + licence OFL. **Zéro appel réseau à l'exécution.**
- Node local = 18.16 → Vite 5.x (Vite 6+ exige Node 20).

## Rendu — une seule caméra
- Point de fuite ≈ (50 % x, 45 % y), fov ≈ 48° ; **portrait = exactement le champ du paysage (16:9) recadré au centre, prénom au milieu** (03/10). Ce modèle unique pilote perspective, taille, flou, mouvement, parallaxe.
- Chaque lettre = quad instancié projeté dans le shader. Rotation du mot ψ = κ·atan(|X|/z), κ ≈ 0,8 : l'extrémité extérieure est la plus proche, dans les 4 quadrants.
- Flou : atlas SDF, flou continu par lettre et par image, σ_écran ∝ |1/z − 1/z_f|, **mise au point au fond (z_f = 34)** : plus un mot est proche, plus il est flou, progressivement (cohérence globale, 03/10) ; K = 0,055, plafond 0,11 em. **Jamais de gain de luminosité dû au flou** : fondu entre lettre nette et vrai flou pré-calculé (03/10). Jamais de niveaux discrets, jamais de pulsation de netteté, jamais d'apparition brusque (naissance/mort en fondu ≥ 4 s).
- Anti-chevauchement : tri loin→proche ; boîtes qui se recouvrent → le plus lointain s'efface (jusqu'à −86 %, lissé 1,2–1,8 s) ; profondeurs voisines (écart < 30 %) → poussée de séparation ≈ 1 px/s, filtrée ≈ 1,8 s.
- **Luminosité croissante avec la profondeur** : avant-plan le plus sombre, fond le plus clair (gris 0,10 → 0,36 ; repos des allumées 0,36 → 0,55), 03/10.
- Zone vide autour du prénom par fondu des mots, jamais par masque qui coupe.
- Fond uni très sombre (6/255) + vignette du prototype ; **grain retiré** (jugé « cheap », 03/10), `?grain=1` pour le revoir ; `?grain=0` → noir pur.

## Mouvement
- Boucle infinie, composition **stationnaire**, **flux continu** (décision Maxence 03/10) : un mot naît **seulement petit au fond** (z ≈ 30–34, fondu ≥ 4 s), la caméra avance (vitesse d'approche ≈ 0,05·√(z/12) monde/s : **les mots proches défilent plus vite**, parallaxe réelle) et un mot **ne disparaît qu'en quittant l'écran**. Portrait : voir « Rendu ». Répartition visée proche 2,8–4,6 / moyenne 6–14 / lointaine 16–32 ≈ 8/42/50 %, obtenue par la géométrie du flux. État initial = champ « vécu » ≈ 700 s avant ouverture. ≈ 5–6 mots proches visibles (premier plan insuffisant = défaut).
- Modes profondeur / horizontal. Bascule progressive : Tab ou double-clic ; `?mode=horizontal`.
- Horizontal : v_monde = A·sin(k·Y + φ(t)), φ dérive lentement ; nappes gauche et droite simultanées, cisaillement doux, pas de bande rigide. v_écran = f·v/z. Sortie d'un côté → réapparition de l'autre à même profondeur.
- Le champ écoute : à chaque frappe, léger souffle de caméra + ralentissement du courant ≈ 1 s.
- Parallaxe pointeur = translation caméra (jamais rotation seule), ressort amorti, retard ≈ 0,8 s. **Pas de demande d'accès au mouvement du téléphone** (03/10) : parallaxe à la souris seulement. **Molette (ordinateur, vers le haut = reculer, un cran suffit) / glisser vertical d'un doigt (téléphone, doigt vers le bas = avancer) = avancer ou reculer dans le champ**, retour doux ; `touch-action: pinch-zoom` (le zoom par pincement reste disponible). Portrait : courant ×2. Pas de dérive propre des mots ni d'oscillation de caméra notables (masquaient la perspective). Le point de fuite suit le prénom quand le clavier le fait remonter. `?debug=1` : croix au point de fuite.
- `prefers-reduced-motion` : image fixe, ondes en simples fondus, pas de parallaxe.

## Lumière — organique, jamais copié-collé
- Seules les lettres saisies s'allument (un prénom identique en fond est OK). Rapport allumé/éteint ≈ 3–4, maintenu après l'onde ; lettres éteintes ≈ −40 % tant qu'un prénom est saisi.
- Anneau de résonance : niveau de repos des allumées décroît avec la distance au prénom central ; les plus vifs forment un anneau autour.
- Paramètres par lettre tirés à la naissance : retard, attaque ≈ 0,5–1,4 s, décroissance ≈ 1,4–6 s (lent, décision Maxence 03/10), intensité, souffle de repos (2 sinus non synchronisés : phase+fréquence), graine de la lumière intérieure.
- Propagation : front lent **de l'arrière-plan vers l'avant-plan** (≈ 5–6 s du fond au premier plan), bord irrégulier par bruit spatial doux, petit retard propre par lettre. Après l'onde, descente progressive vers le repos, sans chute.
- Effacement : extinction du plus loin vers le centre, durée propre 0,25–0,6 s.
- **Pas de traînée ni de déformation par lettre** (abandonnées 03/10 : trop d'effort pour peu de résultat). Pas de mise au point sur les lettres allumées (distrait du prénom, 03/10). **Une clarté lente circule à l'intérieur** des lettres allumées (bruit en coordonnées du glyphe). Pas de halo sur le prénom central.

## Texte
- Aucun accent, nulle part. Uniquement A–Z. Tiret → espace ; apostrophes et tout autre caractère supprimés.
- Majuscules par défaut ; `?case=lower` → capitale initiale (Lea, Chloe). Le fond suit la casse.
- ≈ 200 prénoms courants en France, origines variées, sans accents.
- Interlettrage variable : plus d'air pour les petits mots lointains, moins pour les grands proches.
- Prénom central : net, 2 lignes max (coupure aux espaces), ≥ 28 px mobile, interlettrage ≈ 0,45 em. **Portrait : plus petit et resserré** (capitale ≈ 5,5 % de la largeur, largeur ≤ 72 %, sauf si cela couperait un mot). Curseur : trait fin accordé à la typographie (≈ 0,028 em), de la ligne de base à un peu au-dessus des capitales, extrémités effilées, au milieu de l'interlettrage ; respiration douce (pas de clignotement sec) tant qu'aucune touche n'a été tapée, puis disparaît définitivement.

## Saisie (zéro erreur)
- 22 caractères max, pas d'espace en tête, espaces multiples fusionnés.
- Modèle interne (texte, curseur, sélection) = source de vérité ; le champ natif ne fait que recevoir les événements. Jamais de réécriture pendant une composition IME ; normaliser à la fin.
- Cas à tester : « Léa » → LEA ; « Clémence-Rose123! » → CLEMENCE ROSE ; touche é réelle ; menu d'accents ; dictée ; IME ; collage de 26 lettres (tronqué à 22 + annonce vocale) ; insertion au milieu ; sélection + frappe ; effacement ; annuler/rétablir.
- Un seul élément focalisable, **autocomplete="given-name" par défaut** (suggestion du prénom par le clavier ; `?auto=0` → off), autocorrect="off", enterkeyhint="done", font-size ≥ 16 px, pinch-zoom autorisé. **Entrée = confirmer** (clavier fermé, aucune transition) ; remplissage automatique = confirmé + clavier fermé ; une fois confirmé, le champ natif passe à opacité 0 (aucun rectangle de sélection / surlignage) en restant focalisable ; normal dès qu'il reprend le focus. Entrée ignorée pendant composition. Échap ou flèche discrète (zone 44 px) = retour, prénom conservé. Rechargement (même pendant le fondu) restaure l'état validé.
- Clavier mobile : si le prénom serait couvert, il remonte en douceur ; variation de hauteur due au clavier = aucune reconstruction.
- Visiteur qui revient : prénom en localStorage, lettres déjà doucement allumées à l'arrivée. Échap/flèche efface le prénom mémorisé.

## Saisie alternative « roue » (`?saisie=roue`, essai 03/10 — jugée trop complexe, idée gardée ; idée « cueillir les lettres du champ » gardée aussi)
- Pas de clavier virtuel : défilement vertical = lettre en cours (inertie, aimantation), voisines visibles au-dessus/au-dessous (pâles, plus petites), position « espace » figurée par un point ; glisser à gauche = lettre suivante, à droite = retour ; double toucher ou Entrée = valider. Ordinateur : molette, flèches, touches lettres.
- Avant le premier toucher, la roue tourne lentement seule (invitation) sans rien écrire dans le modèle. Le texte va dans le même modèle (même validation, même lumière).

## Saisie à la voix (`?saisie=voix`, essai 03/10)
- Invitation « DIS OU ECRIS TON PRENOM » (seul texte d'interface, exception voulue par Maxence ; sans accent affiché). Micro demandé à son apparition seulement. Refus → l'invitation s'efface, le curseur apparaît. Accord → spectre audio en direct (traits fins en miroir, analyse locale) ; le prénom dit s'écrit (« je m'appelle… » retiré, 3 mots max). Taper au clavier coupe la voix et rend le micro.
- **La reconnaissance vocale du navigateur passe par les serveurs d'Apple/Google** : contraire à « zéro appel réseau », à trancher avant toute mise en production.

## Suggestion du prénom (par défaut depuis le 03/10)
- Impossible de lire l'identité depuis le navigateur. Le champ se déclare `autocomplete="given-name"` : le clavier du téléphone (fiche contact) ou le navigateur propose le prénom, un toucher le remplit, le clavier se ferme (la page ne voit le prénom qu'après ce toucher : pas d'affichage grisé possible avant).

## Validation
- **Passage à la suite** (03/10, à affiner) : une fois le prénom confirmé, **toucher le prénom (ou Entrée à nouveau) fait pivoter ses lettres en colonne** (amorce de l'acrostiche : trajectoires courbes, retard propre 0,07 s/lettre, 1,1 s), tenue 1,4 s, puis fondu au noir.
- (Idée initiale, non faite : les lettres allumées du fond volent vers le prénom central.)
- Sortie : `window.onNameValidated(name)` + événement `singulies:name-validated`, sans réseau. Ensuite écran noir.

## Performance
- Qualité adaptative : budget dépassé → baisser la résolution, puis le nombre de mots. Pause onglet caché. Reconstruction propre après perte de contexte WebGL.
- La seconde de noir d'ouverture sert à charger la police et construire l'atlas : la première image visible est définitive.

## Contraintes générales
Aucun texte d'interface, slogan, contenu commercial, photo, vidéo, particules, néon, couleur, effet tunnel. Le prénom central est prioritaire. Ne rien déclarer « validé » sans preuve.

## Organisation
- Sous-agents (`.claude/agents/`) : **mesures** (haiku) — captures, chiffres vs référence, stationnarité, chevauchements, FPS ; rend un tableau, pas d'analyse. **tests** (sonnet) — lance et corrige tests de saisie + unitaires. Leur déléguer ces tâches.
- Session principale : architecture, shaders, réglages visuels.
- Fin de chaque étape : mettre à jour `ETAT.md` (fait, chiffres, décisions, reste).
- Réponses courtes : résultats, chiffres, fichiers modifiés, questions.

## Méthode (une étape à la fois, arrêt + preuves à la fin de chacune)
1. Lecture, compréhension, plan, risques. Pas de code avant accord.
2. Squelette WebGL2, police, atlas SDF, fond, prénom central, saisie complète + tests.
3. Champ de mots : caméra, perspective, flou continu, tranches stationnaires, anti-chevauchement.
4. Lumière organique, anneau, lumière intérieure, champ qui écoute.
5. Mode horizontal bidirectionnel + bascule.
6. Validation (vol des lettres), retour, restauration, visiteur qui revient, mouvement réduit, deux casses.
7. Performance adaptative, mesures, nettoyage.

## Preuves à chaque étape
- Captures 1672×941 et 390×844 : vide, LEA, CLEMENCE ROSE, 22 caractères.
- Vs `imageref.png` : part de pixels > 5, > 20, > 80 ; luminance moyenne ; position du prénom.
- Stationnarité : mots visibles + répartition par tranche à t0, 10, 20, 30 min (± 10 %).
- Nombre de chevauchements nets visibles.
- FPS, draw calls, mémoire GPU — préciser que l'environnement sans GPU ≠ téléphone.
- Liste explicite du non-vérifié (téléphones réels, Safari, lecteurs d'écran).

## Fin de phase
Test sans consigne : 5 personnes sur mobile. Comprennent-elles qu'il faut écrire ? Si non, on en reparle avant d'ajouter quoi que ce soit.
