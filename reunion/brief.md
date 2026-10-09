# Brief commun — la grande réunion (09/10)

## La question
**Quelle est la meilleure version « grand public » du site d'ETERNEL — un site que n'importe qui comprend — qui garde tout le bon du site actuel et tire le bon d'un site simple ?** On n'évalue pas des pages existantes : on **épuise les possibles intéressants**, puis on élit le meilleur.

## Le projet
- **ETERNEL** (Maxence, seul) est un poète de rue. Vidéos Instagram/TikTok : il demande son prénom à un inconnu, lui pose une question tirée de son jeu de cartes, et lui tape sur une machine à écrire un **acrostiche** de son prénom (chaque lettre ouvre un vers).
- Ce qu'il vend en ligne : **ton acrostiche** (ou celui de quelqu'un à qui tu l'offres), tapé à la machine sur une feuille A5 noire, avec la carte de ta question (ta réponse = le thème du poème), dans une enveloppe noire au cachet de cire, **par la poste**. Ensuite : le jeu de cartes **SINGULIES** (73 questions intimes, toutes sur l'amour, ex. « sais-tu te retenir d'aimer ? », « attends-tu parfois qu'on devine ? ») à vendre, une **lettre mensuelle** papier (abonnement), ses **livres** (Amazon).
- Identité : noir, encre blanche « au carbone », Courier (ce qui est imprimé sur un objet) et EB Garamond (ce qui flotte), minuscules, tutoiement, « je » = Eternel. Logo SS-cœur gaufré. ETERNEL = l'auteur ; SINGULIES = le jeu, le label.
- **Principe absolu** : ne jamais laisser croire qu'une machine/IA compose le poème. La valeur : une personne, celle de la vidéo, écrit pour toi.

## Le public
≈ 95 % téléphone, arrivée par le **lien en bio Instagram/TikTok** (navigateur intégré), juste après une vidéo. Connaissent Eternel, pas la marque. Aussi : liens partagés (WhatsApp), gens qui n'ont jamais vu la vidéo. Cas d'usage probable n°1 : **offrir**.

## Contraintes
- Solo, ≤ 100 poèmes par mois environ (30–45 min par poème). Prix envisagé 59–69 € port compris. Site statique (GitHub Pages), un assistant de code fait le développement. Paiement à brancher (Stripe envisagé).

## Le site actuel (le « bon » à garder)
Une expérience immersive WebGL très soignée, sans aucun texte d'interface : ETERNEL tapé lettre à lettre ; un portail de cartes 3D (« un prénom, un poème / par la poste », « une lettre chez toi, chaque mois », « mes livres », le paquet « SINGULIES / le jeu ») ; un **champ infini de prénoms flottants** où les lettres de TON prénom s'allument quand tu le tapes ; puis les lettres allumées volent vers ton prénom ; le **paquet tire une question** pour toi, une carte réponse glisse dessous, tu écris ; la carte se retourne et se pose sur une **feuille A5 noire** ; ton prénom descend en **colonne d'acrostiche** comme le chariot d'une machine ; la feuille se glisse dans une **enveloppe**, cachet de cire qui se pose ; tu tapes l'adresse sur l'enveloppe ; elle part. Captures : `captures/simple/1-portail.png` … `15-email.png`.
Ses défauts pour le grand public : on ne comprend pas qu'on peut acheter, aucun prix, gestes cachés, long (~15 écrans), lourd dans le navigateur d'Instagram.

## Déjà appris (réunion précédente, à respecter ou à dépasser en connaissance de cause)
- Le moment le plus fort : **taper son prénom et voir l'acrostiche se former**. Personne sur le marché ne fait ça.
- Payer **tout de suite** (pas « je te réponds par email ») ; paiement hébergé (Stripe) ; Apple Pay incertain dans les navigateurs intégrés.
- Il manque partout une **preuve humaine** (vraie vidéo, vraies photos d'un poème fini).
- **Rareté vraie** (fournées), cadeau (mot, date), un seul produit en vitrine.
- Le candidat de référence (« version retenue ») : page noire, vidéo courte + prénom → acrostiche en direct, prix/délai/places, pour moi/offrir, question légère, Stripe, photos réelles, le site 3D en entrée secondaire.
- Marché : poètes à la machine vendent surtout par fiche produit + paiement direct (30–60 $ bas, ~100 $ milieu, 300 $ haut de gamme) ; aucun francophone connu ne vend en ligne.

## Fichiers utiles (facultatif)
`C:\Users\maxen\Documents\Claude Code\SINGULIES_WEB\` : `REUNION-BASIQUE.md` (réunion précédente), `captures\simple\*.png` (site actuel), `captures\basique\*.png` (les 3 essais simples), `src\cards\questions.json` (les 73 questions).
