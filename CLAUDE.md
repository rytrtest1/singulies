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
- Seules les lettres saisies s'allument (un prénom identique en fond est OK). Rapport allumé/éteint ≈ 3–4, maintenu après l'onde ; **les lettres éteintes gardent la même opacité qu'un prénom soit saisi ou non** (05/10 : l'ancienne baisse de −40 % retirée).
- Anneau de résonance : niveau de repos des allumées décroît avec la distance au prénom central ; les plus vifs forment un anneau autour.
- Paramètres par lettre tirés à la naissance : retard, attaque ≈ 0,5–1,4 s, décroissance ≈ 1,4–6 s (lent, décision Maxence 03/10), intensité, souffle de repos (2 sinus non synchronisés : phase+fréquence), graine de la lumière intérieure.
- Propagation : front **de l'arrière-plan vers l'avant-plan** (≈ 4 s du fond au premier plan ; la première lettre au fond se remarque en ≈ 0,4 s, 05/10), bord irrégulier par bruit spatial doux, petit retard propre par lettre. Après l'onde, descente progressive vers le repos, sans chute.
- Effacement : extinction du plus loin vers le centre, durée propre 0,25–0,6 s. **Effacée pendant son allumage, une lettre rembobine depuis là où elle en était** (onde figée, aucune ne s'allume pour s'éteindre aussitôt ; une lettre pas encore atteinte reste éteinte), 05/10.
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
- Visiteur qui revient : prénom en localStorage, tapé à la machine à l'arrivée (voir « Frappe automatique »), prénom déjà confirmé (toucher le prénom pour repartir). Échap/flèche efface le prénom mémorisé, le prénom reste affiché et confirmé (pas de clavier sur téléphone).

## Saisie alternative « roue » (`?saisie=roue`, essai 03/10 — jugée trop complexe, idée gardée ; idée « cueillir les lettres du champ » gardée aussi)
- Pas de clavier virtuel : défilement vertical = lettre en cours (inertie, aimantation), voisines visibles au-dessus/au-dessous (pâles, plus petites), position « espace » figurée par un point ; glisser à gauche = lettre suivante, à droite = retour ; double toucher ou Entrée = valider. Ordinateur : molette, flèches, touches lettres.
- Avant le premier toucher, la roue tourne lentement seule (invitation) sans rien écrire dans le modèle. Le texte va dans le même modèle (même validation, même lumière).

## Saisie à la voix (`?saisie=voix`, essai 03/10)
- Invitation « DIS OU ECRIS TON PRENOM » (seul texte d'interface, exception voulue par Maxence ; sans accent affiché). Micro demandé à son apparition seulement. Refus → l'invitation s'efface, le curseur apparaît. Accord → spectre audio en direct (traits fins en miroir, analyse locale) ; le prénom dit s'écrit (« je m'appelle… » retiré, 3 mots max). Taper au clavier coupe la voix et rend le micro.
- **La reconnaissance vocale du navigateur passe par les serveurs d'Apple/Google** : contraire à « zéro appel réseau », à trancher avant toute mise en production.

## Suggestion du prénom (par défaut depuis le 03/10)
- Impossible de lire l'identité depuis le navigateur. Le champ se déclare `autocomplete="given-name"` : le clavier du téléphone (fiche contact) ou le navigateur propose le prénom, un toucher le remplit, le clavier se ferme (la page ne voit le prénom qu'après ce toucher : pas d'affichage grisé possible avant).

## Idées pour plus tard (ne pas faire sans demande)
- **Son de frappe** (03/10 : non pour le moment). Le jour où il y aura du son, l'ajouter à la frappe automatique ci-dessous.

## Mémoire du prénom
- **Pour l'instant le prénom n'est jamais retenu** (04/10) : accueil toujours vide, rechargement = accueil vide. `?memoire=1` réactive la mémoire (visiteur qui revient, rechargement → cartes) ; à remettre par défaut quand le site sera en ligne pour de vrai.

## Frappe automatique du prénom (04/10)
- Visiteur qui revient : son prénom **se tape tout seul à l'arrivée, lettre par lettre, comme à la machine** (≈ 0,09–0,19 s par lettre, plus après un espace), la lumière du champ suit la frappe (ondes normales). Remplacent l'ancien « lettres déjà allumées sans onde ».
- Prénom proposé par le clavier / remplissage automatique : même frappe lettre par lettre à partir de ce qui était déjà écrit (le modèle a tout le prénom tout de suite). Toute frappe réelle coupe l'animation. Pas pendant la transition ni en mouvement réduit.

## Validation
- **Passage à la suite** (05/10) : on ne devine jamais comment continuer — soit c'est évident, soit c'est automatique. **Toucher le prénom = la suite** (confirmé ou non) ; Entrée confirme, 2e Entrée = la suite ; **automatique dès que la dernière lettre allumée a atteint sa clarté, et jamais moins de 3 s après le dernier geste** (toucher, glisser, clic, molette, touche ; un simple mouvement de souris ne compte pas). **Le clavier ne sort que si l'on touche la zone du curseur / du prénom** (ailleurs : rien — plus tard, toucher un prénom du champ ouvrira son acrostiche) ; sur ordinateur, une touche de lettre rend le focus au champ. Retour en arrière toujours possible (flèche discrète).
- **Transition (v2 04/10, `src/transition/recharge.js`)** — trois temps séparés : 1) **recharge** : le prénom baisse (0,62) ; **toutes les lettres allumées** du champ (celles du prénom, ≤ 140) se détachent une à une, du fond vers l'avant, **telles qu'elles sont (profondeur, flou, clarté, lumière intérieure, inclinaison)**, et volent dans le monde du champ (même shader, vraie perspective) jusqu'à la même lettre du prénom en **devenant progressivement comme elle** (nettes, droites, à sa taille et sa clarté), départ doux, arrivée franche (absorbée), légère courbe ; la lettre du prénom se recharge à chaque arrivée. Une lettre qui va partir **garde exactement sa clarté jusqu'à son départ** et sa copie reprend sa clarté de cet instant (sinon flash : baisse puis remontée). **Le champ continue d'avancer et de défiler pendant toute la transition** (les mots s'éteignent en mouvement). Pendant ce temps **les lettres grises s'éteignent (des bords vers le prénom) et ont complètement disparu à la dernière arrivée** (≈ 5 s). **Par défaut (Maxence 04/10, dernier choix) : la lettre entière part**, avec sa clarté, son flou, sa profondeur, et devient progressivement la lettre du prénom. Variantes : `?transition=lumiere` = seule la lumière part (la lettre reste, grise, et s'éteint) ; `?transition=energie` = flux d'énergie : la lumière floue et bruitée de chaque lettre s'étire en filament qui ondoie et coule jusqu'à la lettre du prénom, puis s'y vide (la lettre source se vide peu à peu ; mélange MAX, aucune surbrillance). **Toutes** les lettres allumées visibles, fond, milieu **et premier plan** (pas de plafond qui écarte le premier plan : en paysage ≈ 125 lettres). 2) **repos** (≥ 0,6 s) : le prénom seul ; **la scène des cartes se prépare à ce moment-là** (textures, shaders : seul instant lourd, rien ne bouge — corrige l'à-coup vu sur PC), le réseau ayant été préchargé dès le départ. **Le canvas des cartes est invisible dès sa création** (un canvas WebGL neuf est noir : il masquait l'accueil pendant le chargement = la coupure « la page recharge »). 3) **montée** (1,9 s) : la caméra descend, le prénom monte à sa place de la scène des cartes (**même coupure que sur l'accueil : 2 lignes restent 2 lignes** — seule l'acrostiche, à la fin, le met en colonne), gris en retrait (0,42), vignette effacée ; puis **relais** (0,6 s) au pixel près (écart ≤ 2 px), le paquet arrive du fond. Mouvement réduit : fondus seulement. Échec des cartes → fondu au noir.
- **Flèche « suite » retirée pour l'instant (04/10, `?fleche=1` pour la revoir)** ; quand elle reviendra : fine **flèche vers la droite** (cohérente avec la flèche retour vers la gauche) sous le prénom confirmé (opacité 0,32, zone 44 px, après 1,2 s) ; 2e Entrée ou toucher le prénom = même effet ; **passage automatique dès que la dernière lettre allumée du champ a atteint sa clarté** (prénom confirmé ; ≈ 6 s après la dernière lettre ajoutée). Rechargement après le départ → directement les cartes. Flèche retour du paquet → l'accueil, prénom confirmé.
- La **colonne de l'acrostiche est réservée à la fin** (enveloppe, l'objet) — plus utilisée ici.
- Sortie : `window.onNameValidated(name)` + événement `singulies:name-validated`, sans réseau.

## Scène 2 — retours du 05/10 (font foi sur ce qui suit)
- **Glisser la question à gauche = la suivante, à droite = la précédente** (cartes déjà vues : elles reviennent de leur côté ; avancer de nouveau rejoue l'ordre) ; l'esquisse du geste montre aussi la droite quand une précédente existe.
- **Chaque question garde sa propre réponse** (rien ne passe d'une carte à l'autre ; le champ natif est resynchronisé à chaque changement de carte).
- **La carte blanche se prend en la glissant vers le haut** (ou en la touchant).
- **Plus de gyroscope** (aucune autorisation demandée) : inclinaison à la souris / au doigt + **respiration** permanente, discrète, de la lumière et de la carte en focus.
- Prénom : les lettres tapées dans la réponse s'allument **comme sur l'accueil** (attaque 0,35–0,85 s, descente 1,6–3,6 s, force propre, clarté qui circule à l'intérieur).
- **PASSER** : 3 s après que la carte blanche a pris la place du paquet, toujours visible ; clavier ouvert : entre le bas de la carte et le haut du clavier.

## Scène 2 — les cartes questions (04/10, plan en cours)
- Pratique réelle : on tire **une** carte ; si elle ne plaît pas, on en tire une autre, jusqu'à satisfaction ; sinon thème libre ; sinon improvisation depuis le prénom. (Pas de « tirer 3, garder 1 ».)
- **Question (04/10)** : le paquet reste **à sa place d'origine** (centre, 42 %) et tire pour la personne (la carte se soulève, se retourne en l'air, se pose sur le paquet, question visible). Puis une **carte réponse** (taille normale, même papier, **sans logo**) **glisse de dessous la question et ne dépasse que d'une ligne** (la ligne centrée dans la bande, avec un blanc d'interligne au-dessus et en dessous) : le curseur y apparaît et **le clavier s'ouvre tout seul** ; on écrit dans cette bande, la question reste visible au-dessus, même clavier ouvert (les lignes précédentes passent sous la question) (iPhone : Safari ne l'ouvre que dans la foulée d'un geste → dans le parcours final, le toucher qui mène aux cartes ; en essai, le premier toucher). **Entrée / « terminé »** : la carte réponse **sort en dessous** et montre ses **3 premières lignes** ; **molette ou glissé vertical** pour faire défiler, toujours 3 lignes visibles. **Texte toujours au même endroit, centré** : question = bloc centré sur la carte ; réponse = bloc de 3 lignes centré, même marge sur toutes les cartes. **Une autre** : le **coin supérieur droit se corne au bout de 5 s** (très petit, 8 mm ; il se soulève de temps en temps comme une page qu'on va tourner, puis retombe) — le toucher, ou glisser la question de côté, ou toucher le paquet (la réponse en cours est effacée). **PASSER, toujours visible en dessous** : sur une question → la carte réponse monte au centre (**thème libre**) ; ensuite → **la fin** (improvisation). **Donner** : le petit signe sous la réponse → le prénom s'allume en entier, la scène s'éteint, fondu au noir ; sortie `window.onCardChosen` + `singulies:card-chosen` ({ name, kind: reponse | theme | improvisation, text, id }), sans réseau. Clavier ouvert : **les cartes gardent leur taille** ; la question et la bande d'écriture au milieu de la partie visible, le prénom au-dessus. Flèche discrète = retour. Jamais écrire « champ libre » ni « surprends-moi ».
- **Déroulé (04/10, v13)** : d'abord **seulement le jeu de cartes** (arrivée en fondu depuis le fond) ; la question tirée, la carte réponse dépasse de sous le paquet (elle y reste quand on repioche), texte aligné sur la marge de la question, focus sur elle quand elle est sortie. Une autre question : glisser la question de côté (elle esquisse le geste d'elle-même), toucher le paquet. **Après une première question passée**, la **carte blanche** monte du bas de l'écran, à moitié visible, **« carte blanche » tapé à la machine en son centre**, et **sautille de temps en temps** (touche-moi). **La toucher** : elle fait un tour sur elle-même et **prend la place du paquet** (qui recule et se fond dans le fond) ; on y écrit ; **retour** (flèche discrète en haut à gauche) = le paquet revient. **PASSER** (majuscules) n'apparaît que sur la carte blanche (après 3 s sans frappe, vide) : pont vers la scène suivante (improvisation). **Arrivées et départs : fondu vers la couleur du fond, jamais vers le noir** (pas de rectangle plus noir que le fond).
- **Fin de scène (04/10, provisoire)** : réponse → elle se glisse sous la question (paire, 1 s), puis la carte **descend doucement et se fond dans le fond** (pas de recul / dézoom : jugé laid) ; carte blanche → idem seule ; le paquet se fond sur place ; le prénom s'allume lettre à lettre. **Suite (autre conversation)** : le prénom devient l'acrostiche — en colonne sur une feuille noire A5 — avec la carte question dessous, **réponse visible par défaut, la toucher la retourne (question)**.
- Carte réelle (relevé 04/10, détail dans ETAT.md) : paysage 87 × 52 mm, logo gaufré au dos et en creux au recto, frappe pica, double interligne. Coupures de lignes **calculées automatiquement** (équilibrées, ≤ 24 car.). **Clavier ouvert : seule la carte sur laquelle on écrit reste visible.**
- **Prénom en haut de la scène 2 : en retrait** (gris, pas blanc). Quand on tape la réponse ou le thème libre, **les lettres du prénom présentes dans ce qu'on tape s'éclairent** (comme les lettres en retrait de l'accueil : allumage organique, bruit intérieur), puis reviennent au repos.
- Cartes : le plus noires possible ; **les cartes s'inclinent** vers la souris / selon le mouvement du téléphone (le paquet d'un bloc, la carte vierge de son côté) : c'est ce mouvement qui fait vivre ombres et lumière ; la lampe suit aussi (manière 1 : elle tourne et monte/descend, ampleur réglable), jamais sa force ; **la carte en focus** (question en haut, réponse en bas) est immobile au repos et seule sensible à l'inclinaison / la souris ; **la carte en attente** respire légèrement (vie organique) et est baissée pour que le focus se lise (04/10). Repli sans gyroscope : le doigt qui glisse. Gyroscope : sur iPhone, demande système au premier toucher (contredit « pas de demande d'accès au mouvement » du 03/10 — en essai, à confirmer par Maxence). **Le prénom réagit à la même lumière** (lettres plus claires du côté d'où elle vient, cohérence). Défausser = repiocher automatiquement.
- Écriture (réponse ou thème libre) : frappe à la machine, minuscules, accents gardés ; les mots ne bougent jamais une fois tapés (retour à la ligne quand le mot ne tient plus) ; **3 lignes visibles au plus** ; au-delà, la ligne du haut disparaît **d'un coup** (sous la question pour la feuille) ; (à faire : glisser pour relire, ligne à ligne).
- Inclinaison, point zéro : souris **sur la carte** = carte parfaitement droite (elle s'incline quand la souris s'en éloigne) ; téléphone : zéro = tenue normale de lecture (≈ 50° vers l'arrière).
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
