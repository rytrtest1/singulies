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
- **Point de fuite et prénom au centre (50 % x, 50 % y)** (03/10 : à 45 %, le bas de l'écran, plus grand, paraissait toujours plus peuplé ; au centre, haut et bas s'équilibrent sans correction — mesuré sur 12 tirages), fov ≈ 48° ; **portrait = exactement le champ du paysage (16:9) recadré au centre, prénom au milieu** (03/10). Ce modèle unique pilote perspective, taille, flou, mouvement, parallaxe.
- Chaque lettre = quad instancié projeté dans le shader. Rotation du mot ψ = κ·atan(|X|/z), κ ≈ 0,8 : l'extrémité extérieure est la plus proche, dans les 4 quadrants.
- Flou : atlas SDF, flou continu par lettre et par image, σ_écran ∝ |1/z − 1/z_f|, **mise au point au fond (z_f = 34)** : plus un mot est proche, plus il est flou, progressivement (cohérence globale, 03/10) ; K = 0,055, plafond 0,11 em. **Jamais de gain de luminosité dû au flou** : fondu entre lettre nette et vrai flou pré-calculé (03/10). Jamais de niveaux discrets, jamais de pulsation de netteté, jamais d'apparition brusque (naissance/mort en fondu ≥ 4 s).
- Anti-chevauchement : tri loin→proche ; boîtes qui se recouvrent → **seules les lettres recouvertes du mot le plus lointain s'effacent** (jusqu'à −92 %, bord doux, dès 0,6 em avant le contact ; lissage par lettre ≈ 0,6–0,9 s, à l'aller comme au retour) ; profondeurs voisines (écart < 30 %) → poussée de séparation ≈ 1 px/s, filtrée ≈ 1,8 s.
- **Luminosité croissante avec la profondeur** : avant-plan le plus sombre, fond le plus clair (gris 0,10 → 0,36 ; repos des allumées 0,36 → 0,55), 03/10.
- Zone vide autour du prénom par fondu des mots, jamais par masque qui coupe.
- Fond uni très sombre (6/255) + vignette du prototype ; **grain retiré** (jugé « cheap », 03/10), `?grain=1` pour le revoir ; `?grain=0` → noir pur.

## Mouvement
- Boucle infinie, composition **stationnaire**, **flux continu** (décision Maxence 03/10) : un mot naît **seulement petit au fond** (z ≈ 30–34, fondu ≥ 4 s), la caméra avance (vitesse d'approche ≈ 0,05·√(z/12) monde/s : **les mots proches défilent plus vite**, parallaxe réelle) et un mot **ne disparaît qu'en quittant l'écran**. Portrait : voir « Rendu ». Répartition visée proche 2,8–4,6 / moyenne 6–14 / lointaine 16–32 ≈ 8/42/50 %, obtenue par la géométrie du flux. État initial = champ « vécu » ≈ 700 s avant ouverture. ≈ 5–6 mots proches visibles (premier plan insuffisant = défaut).
- **Mode par défaut : mélange** (03/10) = la caméra avance + nappes latérales très douces au repos (20 % de l'amplitude : l'avance reste lisible) ; un mot sorti sur le côté renaît au fond. Modes purs `?mode=profondeur` (avance seule) et `?mode=horizontal` (nappes seules, sortie d'un côté → retour par l'autre à même profondeur). Tab ou double-clic : mélange → profondeur → horizontal (bascule progressive, taux 1,2/s).
- Horizontal : v_monde = A·sin(k·Y + φ(t)) (A = 0,12 monde/s, k = 0,85, φ = 0,06·t + 0,8·sin(0,011·t)) ; en horizontal pur la profondeur est figée ; nappes gauche et droite simultanées, cisaillement doux, pas de bande rigide. v_écran = f·v/z. Sortie d'un côté → réapparition de l'autre à même profondeur.
- Le champ écoute : à chaque frappe, léger souffle de caméra + ralentissement du courant ≈ 1 s.
- Parallaxe pointeur = translation caméra (jamais rotation seule), ressort amorti, retard ≈ 0,8 s. **Pas de demande d'accès au mouvement du téléphone** (03/10) : parallaxe à la souris seulement. **Molette (ordinateur, vers le haut = reculer, un cran ≈ ±4) / glisser vertical d'un doigt (téléphone, doigt vers le bas = avancer) = avancer ou reculer dans le champ** — un même facteur accélère l'avance et les courants (jusqu'à ×16 / ×−10), retour doux. **Reculer = le temps remonte** : un mot récent s'efface comme il était apparu, un mot revenu au fond « ressort » par un bord, les courants s'inversent ; `touch-action: pinch-zoom` (le zoom par pincement reste disponible). Portrait : courant ×2. Pas de dérive propre des mots ni d'oscillation de caméra notables (masquaient la perspective). Le point de fuite suit le prénom quand le clavier le fait remonter. `?debug=1` : croix au point de fuite.
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
- Un seul élément focalisable, **autocomplete="given-name" par défaut** (suggestion du prénom par le clavier ; `?auto=0` → off), autocorrect="off", enterkeyhint="done", font-size ≥ 16 px, pinch-zoom autorisé. **Entrée = confirmer** (clavier fermé, aucune transition) ; remplissage automatique ou mot entier inséré d'un coup par le clavier (≥ 2 lettres, hors collage ; après la fin de composition) = confirmé + clavier fermé ; sur téléphone, champ en lecture seule une fois confirmé (le clavier ne peut pas se rouvrir), levée au toucher ; une fois confirmé, le champ natif passe à opacité 0 (aucun rectangle de sélection / surlignage) en restant focalisable ; normal dès qu'il reprend le focus. Entrée ignorée pendant composition. Échap ou flèche discrète (zone 44 px) = retour, prénom conservé. Rechargement (même pendant le fondu) restaure l'état validé.
- Clavier mobile : si le prénom serait couvert, il remonte en douceur ; variation de hauteur due au clavier = aucune reconstruction.
- Visiteur qui revient : prénom en localStorage, lettres déjà allumées à l'arrivée (sans onde), prénom déjà confirmé (toucher le prénom pour repartir). Échap/flèche efface le prénom mémorisé, le prénom reste affiché et confirmé (pas de clavier sur téléphone).

## Saisie alternative « roue » (`?saisie=roue`, essai 03/10 — jugée trop complexe, idée gardée ; idée « cueillir les lettres du champ » gardée aussi)
- Pas de clavier virtuel : défilement vertical = lettre en cours (inertie, aimantation), voisines visibles au-dessus/au-dessous (pâles, plus petites), position « espace » figurée par un point ; glisser à gauche = lettre suivante, à droite = retour ; double toucher ou Entrée = valider. Ordinateur : molette, flèches, touches lettres.
- Avant le premier toucher, la roue tourne lentement seule (invitation) sans rien écrire dans le modèle. Le texte va dans le même modèle (même validation, même lumière).

## Saisie à la voix (`?saisie=voix`, essai 03/10)
- Invitation « DIS OU ECRIS TON PRENOM » (seul texte d'interface, exception voulue par Maxence ; sans accent affiché). Micro demandé à son apparition seulement. Refus → l'invitation s'efface, le curseur apparaît. Accord → spectre audio en direct (traits fins en miroir, analyse locale) ; le prénom dit s'écrit (« je m'appelle… » retiré, 3 mots max). Taper au clavier coupe la voix et rend le micro.
- **La reconnaissance vocale du navigateur passe par les serveurs d'Apple/Google** : contraire à « zéro appel réseau », à trancher avant toute mise en production.

## Suggestion du prénom (par défaut depuis le 03/10)
- Impossible de lire l'identité depuis le navigateur. Le champ se déclare `autocomplete="given-name"` : le clavier du téléphone (fiche contact) ou le navigateur propose le prénom, un toucher le remplit, le clavier se ferme (la page ne voit le prénom qu'après ce toucher : pas d'affichage grisé possible avant).

## Idées pour plus tard (ne pas faire sans demande)
- **Son de frappe** (03/10 : non pour le moment). Le jour où il y aura du son : sur remplissage automatique, ne pas remplir le prénom d'un coup — le mémoriser, puis le **taper lettre par lettre à la place de l'utilisateur, avec un bruit de frappe**.

## Validation
- **Passage à la suite** (04/10) : on ne devine jamais comment continuer — soit c'est évident, soit c'est automatique. Une fois le prénom confirmé : petit signe discret sous le prénom (flèche ou symbole) = aller à la suite ; **sans toucher pendant 10 s → passage automatique**. Retour en arrière toujours possible (flèche discrète).
- **Transition** : les lettres allumées du fond voyagent jusqu'au prénom central et s'y superposent (elles le « rechargent »), le champ s'éteint petit à petit autour ; puis le prénom remonte dans la partie supérieure, **toujours horizontal**, et le jeu de cartes apparaît dessous, au centre.
- La **colonne de l'acrostiche est réservée à la fin** (enveloppe, l'objet) — plus utilisée ici.
- Sortie : `window.onNameValidated(name)` + événement `singulies:name-validated`, sans réseau.

## Scène 2 — les cartes questions (04/10, plan en cours)
- Pratique réelle : on tire **une** carte ; si elle ne plaît pas, on en tire une autre, jusqu'à satisfaction ; sinon thème libre ; sinon improvisation depuis le prénom. (Pas de « tirer 3, garder 1 ».)
- Disposition : **le paquet de cartes, et dessous une carte noire vierge avec le curseur.** Trois possibilités, toutes visibles d'emblée : écrire librement sur la carte vierge (thème libre) ; **toucher le paquet = piocher** (la question apparaît retournée sur le dessus du paquet) et y répondre sur la carte vierge ; **toucher la question = la défausser** (on repioche) ; **« passer » = improvisation, sans confirmation ni message** pour l'instant. Flèche discrète = retour. Jamais écrire « champ libre » ni « surprends-moi ».
- Carte réelle (relevé 04/10, détail dans ETAT.md) : paysage 87 × 52 mm, logo gaufré au dos et en creux au recto, frappe pica, double interligne. Coupures de lignes **calculées automatiquement** (équilibrées, ≤ 24 car.). **Clavier ouvert : seule la carte sur laquelle on écrit reste visible.**
- **Prénom en haut de la scène 2 : en retrait** (gris, pas blanc). Quand on tape la réponse ou le thème libre, **les lettres du prénom présentes dans ce qu'on tape s'éclairent** (comme les lettres en retrait de l'accueil : allumage organique, bruit intérieur), puis reviennent au repos.
- Cartes : le plus noires possible ; **les cartes s'inclinent** vers la souris / selon le mouvement du téléphone (le paquet d'un bloc, la carte vierge de son côté) : c'est ce mouvement qui fait vivre ombres et lumière ; la lampe suit aussi (manière 1 : elle tourne et monte/descend, ampleur réglable), jamais sa force ; **la carte en focus** (question en haut, réponse en bas) est immobile au repos et seule sensible à l'inclinaison / la souris ; **la carte en attente** respire légèrement (vie organique) et est baissée pour que le focus se lise (04/10). Repli sans gyroscope : le doigt qui glisse. Gyroscope : sur iPhone, demande système au premier toucher (contredit « pas de demande d'accès au mouvement » du 03/10 — en essai, à confirmer par Maxence). **Le prénom réagit à la même lumière** (lettres plus claires du côté d'où elle vient, cohérence). Défausser = repiocher automatiquement.
- Écriture sur la carte vierge : le texte ne dépasse jamais le cadre du texte des cartes questions ; **3 lignes visibles au plus** ; au-delà, la ligne du haut disparaît **d'un coup** (une ligne laisse place à une autre, pas d'estompage) ; glisser pour relire, même comportement ligne à ligne.
- Casse : **questions et textes en minuscules, avec tous les accents et la ponctuation, sans aucune majuscule**. Seuls les prénoms (et éventuellement les indications courtes comme PASSER, et SINGULIES) sont en majuscules.
- Fabrication (hybride retenu) : une carte 3D dans la caméra du champ (épaisseur, vrai retournement). **Dos = scan pro d'une vraie carte** ; gaufrage = logo SS-cœur extrudé à une hauteur cohérente avec un gaufrage de papier, **très discret et élégant, comme en vrai** (lumière rasante). Masque du logo tiré d'une image haute résolution (pas besoin de vectoriel).
- Texte : question déjà écrite (pas de frappe lettre par lettre pour l'instant). **Blanc, pas parfait** : encre blanche au papier carbone, comme les vraies cartes. Taille et mise en page = celles des vraies cartes (échantillon fourni par Maxence). Frappes organiques : atlas de vraies frappes scannées (variantes par lettre), jamais deux lettres identiques.

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
5. Mode horizontal bidirectionnel + bascule (v1 faite 03/10).
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
