# Tour 2 — Lucas (perf) : votes

- **Q1 : a** (je change d'avis). Sami m'a convaincu : des centaines de prénoms disent « en série », alors que la feuille dit « exemplaire unique ». En plus, ça retire la dernière boucle d'animation permanente du premier écran (batterie, navigateur intégré).
- **Q2 : b.** Une cire « en direct » de près, c'est le moment le plus cher du site (maillage fin, WebGL), donc contraire à l'acquis 5. Une vidéo de 1,5 s, < 80 Ko, avec une image fixe en repli, donne le même geste sans aucun risque.
- **Q3 : a.** Un retournement en CSS 3D sur une image déjà rendue : 0,6 s, 60 i/s même sur un iPhone X, quelques lignes de code.
- **Q4 : a.** Un choix d'un toucher, sans coût technique, qui évite une adresse ambiguë et un texte faux pour celle ou celui qui offre.
- **Q5 : b.** Trois lignes tapées ne pèsent rien ; une grille d'images, si, et elle redit ce que la feuille montre déjà.
- **Q6 : a.** Avec `preload="none"`, une image d'attente et `playsinline muted`, chargée après la dernière lettre : elle ne retarde jamais le premier écran.
- **Q7 : b.** Indifférent techniquement ; pour qui hésite, « facultatif » est le mot le plus clair.

## Objection (acquis 1)
« Moins d'1 s » n'est tenable dans le navigateur intégré d'Instagram que si on le budgète : l'image de la feuille ≤ 60 Ko (WebP/AVIF), EB Garamond et Courier réduites aux A–Z et minuscules accentuées (≈ 20 Ko chacune) et préchargées, aucun script avant le premier affichage. Sinon on aura un saut de police ou une feuille qui arrive après le texte. Il faut le mesurer (LCP envoyé au compteur), pas le supposer.
