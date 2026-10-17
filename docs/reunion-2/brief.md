# Réunion du 17/10 — le meilleur des deux mondes

## La question
Maxence (le poète, nom d'artiste **Eternel**) vend **« un prénom, un poème »** : un acrostiche sur le prénom de la personne, écrit par lui, **tapé une seule fois à la machine à écrire** sur une feuille noire, posté dans une enveloppe noire scellée à la cire, avec la carte de la question du jeu SINGULIES. **39 € tout compris, posté dans la semaine.** En ce moment : **réservation** (rien n'est payé sur le site, il envoie ensuite un lien de paiement) en attendant son SIRET.

**L'avis global sur le site actuel** : « le site en fait trop, comme si je cherchais à prouver quelque chose ; ça ralentit et ça complique l'expérience ». Une **version épurée** a été faite (modèle : la boutique simple supergirlreject.myshopify.com, mais dans la direction artistique d'Eternel).

**À trouver : le meilleur des deux mondes** — un parcours qui garde ce qui touche et ce qui fait la signature d'Eternel, et retire ce qui ralentit, complique ou « prouve ».

## Le public (contraintes non négociables)
- ≈ 95 % sur téléphone, arrivée par le lien en bio Instagram / TikTok (**navigateur intégré** de l'app), juste après une vidéo où Eternel tape à la machine, dans la rue, un acrostiche sur le prénom d'un inconnu. Eternel est connu (nom d'artiste), « Singuliés » ne l'est pas.
- Beaucoup veulent **leur** poème ; une partie veut **l'offrir**.
- Soupçon d'IA à désamorcer : **jamais laisser croire qu'une machine / un programme écrit le poème**. Voix : tutoiement, minuscules, « je » = Eternel, concret, aucun mot de vente.
- Direction artistique : fond noir uni (6/255), EB Garamond en capitales espacées pour ce qui « flotte » (prénoms, ETERNEL, signes RECEVOIR / PASSER…), Courier (machine à écrire) en minuscules pour ce qui est imprimé sur un objet. Pas de couleur, pas de photo de stock, pas de néon, pas de particules. Le « fil cousu » (un fil noir de coton qui souligne les signes et forme les lignes à écrire) est une signature récente.

## Version A — le site actuel (`index.html`, WebGL)
Captures : `captures/site-*.png` (390 × 844), planche `captures/planche-site.jpg`.
1. **Écran noir ≈ 1,5 s** (chargement), puis un **champ de prénoms en 3D** qui défile en profondeur (des centaines de prénoms flous / nets, perspective), **ETERNEL se tape au centre** puis s'efface ; un curseur seul. Rien ne dit quoi faire (on comprend en touchant ; un indice grisé PRENOM existe mais est désactivé ; un logo SINGULIES calligraphié en prénoms en fond).
2. On tape son prénom : il s'écrit au centre ; **les lettres du champ identiques à celles du prénom s'allument** (ondes de lumière).
3. Entrée (ou clavier fermé) : **les lettres allumées du champ volent** vers le prénom (≈ 2 s), le prénom pivote en colonne et **dérive jusqu'à une feuille A4 noire en 3D** ; la colonne s'y pose, des lignes en fil cousu se tracent. ≈ 6,6 s de Entrée au premier texte.
4. **La page de l'offre** : en haut ETERNEL sur son fil, ←, menu ≡, un bandeau de pages (UN PRENOM UN POEME · MES LIVRES · UN POEME PAR MOIS) qu'on fait glisser ; la feuille au centre ; « l'exemplaire unique de ton poème / tapé à la machine à écrire » se tape, **une vidéo des mains d'Eternel et du mécanisme de la machine** paraît en fondu sous le texte ; RECEVOIR + « 39 € tout compris · posté dans la semaine » ; SINGULIES en bas.
5. **La vitrine** : en faisant défiler / glisser, l'objet raconte 4 étapes en 3D (la feuille · la carte question arrive · l'enveloppe avale la feuille, rabat, cire, cachet · une carte mystère et un fil) avec des points de navigation ; toucher l'objet = vue rapprochée + fiche. Plus bas : d'autres poèmes (feuilles 3D à ouvrir), qui t'écrit, questions dans le menu.
6. **RECEVOIR (réservation)** : un paquet de cartes 3D se mélange, « tire une carte » ; on tire → une question ; on écrit sa réponse sur une carte (ou PASSER → carte blanche, ou improvisation) ; la carte se pose sur la feuille, la feuille entre dans l'enveloppe, l'expéditeur se tape, on **écrit l'adresse sur l'enveloppe 3D**, POSTER, le cachet de cire se forme de près, l'enveloppe bascule, sa tranche devient le champ de l'email, TERMINER, récapitulatif (+ le jeu en relais).
- Points forts relevés jusqu'ici : saisissant, cohérent, « on est dans le monde d'Eternel », le prénom qui devient colonne est le moment fort ; le geste de tirer une carte = le jeu de la vidéo.
- Points faibles : temps d'attente (noir initial, vol des lettres, montée), rien n'explique au départ, beaucoup de gestes cachés (glisser l'objet, points, bandeau qu'on glisse, toucher l'objet), anciens iPhone en difficulté (WebGL lourd), le prix et ce qu'on achète n'arrivent qu'après le rituel, beaucoup de pages et de menus.

## Version B — la version épurée (`epure.html`, sans WebGL)
Captures : `captures/epure-*.png`, planche `captures/planche-epure.jpg`.
1. **Une seule page.** En haut : ETERNEL sur son fil, 4 ancres (POEMES · PAR MOIS · LIVRES · QUESTIONS).
2. **La feuille noire (image rendue par le moteur) occupe le premier écran** ; un curseur qui respire et « écris ton prénom » tapé à la machine ; on touche la feuille, **le prénom s'écrit directement en colonne**, chaque lettre ouvre une ligne en fil cousu. Dessous, tapé : « un poème écrit pour CLEMENCE, tapé à la machine et posté chez toi. » ; **RECEVOIR** ; « 39 € tout compris · posté dans la semaine ». Tout est là dès la première seconde.
3. En défilant : CE QUE TU RECOIS (4 objets : la feuille tapée, la carte question, l'enveloppe cachetée, la carte mystère ; légendes tapées) · COMMENT (I, II, III) · DES PRENOMS, DES POEMES (4 exemples réels) · AUSSI (un poème par mois, mes livres) · QUI T'ECRIT · QUESTIONS · ECRIS-MOI.
4. **RECEVOIR** : une page par-dessus : le prénom, la question du jeu tapée sur la vraie carte (« une autre question »), la réponse écrite sur une carte vierge (facultative : vide = improvisation), **l'adresse s'écrit sur l'enveloppe** à mesure qu'on remplit des lignes, l'email, RESERVER → l'enveloppe cachetée, « c'est noté » tapé, la référence.
- Points forts : immédiat, compréhensible, rapide, marche partout ; garde la feuille, le fil, la machine.
- Points faibles probables : perd le saisissement (le champ de prénoms, le vol des lettres, la 3D vivante, le tirage de carte, le cachet qui se forme) ; plus « site de vente » ; les objets sont des images fixes ; la question n'est plus un geste de jeu mais un formulaire.

## Ce qu'on vous demande (tour 1)
Depuis votre point de vue (votre fiche ci-dessous), écrivez dans `docs/reunion-2/t1-<votre-id>.md` (≤ 500 mots, en français) :
1. **Garder de A** (3 choses max, et pourquoi elles comptent pour la vente ou pour la marque).
2. **Garder de B** (3 choses max).
3. **Retirer** (ce qui doit disparaître des deux, sans regret).
4. **Votre parcours idéal**, écran par écran, du lien en bio jusqu'à « c'est noté » (5 à 8 écrans, une ligne chacun, avec le temps qu'il faut pour voir le prix et le bouton).
5. **Le risque principal** de votre proposition, et comment le mesurer.
Soyez concrets (citez les captures), tranchez, ne recopiez pas le brief. Vous pouvez regarder le code (`src/`, `CLAUDE.md`) si utile, mais ce n'est pas nécessaire.
