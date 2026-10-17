# Verdict de la réunion du 17/10 — le meilleur des deux mondes

> **Correction de Maxence, après la réunion** : personne ne s'est plaint d'un site lourd, lent ou qui bogue. La question
> était seulement **un juste milieu entre l'aisance d'usage (straightforward) et l'esthétique, le poétique**. Or trois
> décisions ci-dessous reposaient d'abord sur la performance (les arguments de Lucas) : **supprimer le champ de
> prénoms** (4–3, la bascule de Lucas et de Jade), **la cire en vidéo plutôt qu'en direct**, **aucune 3D**. Ce qui est
> appliqué (`epure.html`) : tout ce qui sert l'aisance est gardé (prix et RECEVOIR à l'arrivée, aucun geste caché, pour
> toi / pour quelqu'un, la carte qu'on retourne, la voix de Sami, l'adresse sur l'enveloppe, une ligne par objet) ; **le
> champ de prénoms revient, vivant, derrière la feuille**, et les lettres du prénom s'y allument quand on tape (l'option
> d'Inès, de Karim et de Jade). La cire reste une vidéo rendue par le moteur : à l'écran, c'est la même image.

Sept participants (Inès, DA · Karim, conversion mobile · Jade, 23 ans · Martine, 56 ans · Lucas, performance · Céleste, interaction · Sami, poète de rue), deux tours : propositions (`t1-*.md`) → points à trancher (`catalogue.md`) → votes et objections (`t2-*.md`, `t2-votes.md`). Ce sont des simulations : rien ici ne remplace cinq vraies personnes devant leur téléphone.

## En une phrase
**La page de la version épurée, avec seulement deux moments vivants — le prénom qui se pose en colonne sur la feuille, et la cire qui scelle l'enveloppe à la fin — plus le geste du jeu (une carte qu'on retourne d'un toucher) et les mains d'Eternel, une fois, sans un mot.** Le monde 3D (champ de prénoms, vol des lettres, vitrine, bandeaux, cérémonie) sort du chemin d'achat.

## Pourquoi
- Le site actuel montre le prix au mieux à **12–20 s** (1,5 s de noir, ETERNEL, le prénom, 6,6 s de vol et de montée), après des gestes que rien n'annonce. Dans le navigateur de TikTok, l'écran noir se lit « lien cassé » (Jade, Martine). Estimation de Karim : 30 à 50 % de départs avant de voir ce qui est vendu.
- Ce qui touche vraiment, tout le monde l'a nommé : **voir son prénom devenir une colonne sur la feuille noire**. Ça ne demande ni 3D ni attente.
- Le reste « prouve » (vitrine en 4 étapes, « l'exemplaire unique », mécanisme en boucle, centaines de prénoms) — c'est exactement le reproche fait au site. Sami : « la vidéo en bio a déjà fait la preuve ; le site n'a plus qu'à tenir la promesse ».

## Les décisions (votes)
| | Décision | Voix |
|---|---|---|
| Champ de prénoms | **supprimé** du parcours (il dit « en série » ; et il coûte le premier écran) | 4–3 (les 3 autres : un fond pâle et léger) |
| La fin | **la cire qui se forme, en vidéo courte** (≈ 1,5 s, < 80 Ko), puis « c'est noté » | 7–0 |
| La question | **une carte face cachée, « touche la carte », elle se retourne** (0,6 s) ; « une autre » discret ; plus de mélange du paquet | 7–0 |
| Pour qui | **« c'est pour toi, ou pour quelqu'un ? »** après RECEVOIR, qui adapte la question et les textes | 5–2 |
| Explications | **une ligne tapée par objet** (la carte, l'enveloppe, la cire), plus de grille d'images ni de « comment I II III » | 4–2–1 |
| Les mains | **sous la feuille, dans le premier écran**, une seule fois, après la dernière lettre ; jamais le mécanisme en boucle | 6–1 |
| Voix de la carte réponse | **celle de Sami** : « réponds ici » · « ta réponse, c'est de ça que parlera le poème » · « je préfère ne rien dire » → « alors j'écris à partir de CLEMENCE, seulement » | 4–3 (les 3 autres gardent l'idée rassurante, et adoptent la phrase) |

## Le parcours qui en sort
1. **0 s** — ETERNEL sur son fil, la feuille noire, un curseur qui respire, « écris le prénom » tapé. Sous la feuille : **RECEVOIR**, **39 € tout compris** (en Garamond, il flotte). Une ligne lisible : qui je suis · conditions · contact.
2. **On tape** — chaque lettre se pose dans la colonne et trace sa ligne de fil sous les yeux (≈ 0,1–0,2 s par lettre). RECEVOIR reste au-dessus du clavier. La phrase dessous devient « un poème pour CLEMENCE. je le tape une fois, à la machine, et je te l'envoie. »
3. **Clavier fermé** — les mains d'Eternel sur la machine, 1,75 s, une fois, puis l'image reste. Sans légende.
4. **En descendant** (pour qui doute) — trois vrais poèmes envoyés ; trois lignes tapées : la carte de ta question · une enveloppe noire, scellée à la cire · (la carte mystère : retirée ou à revoir) ; qui t'écrit ; les questions.
5. **RECEVOIR** — « c'est pour toi, ou pour quelqu'un ? » (deux choix ; pour quelqu'un : son prénom est déjà là, la question se pose « pour elle / lui »).
6. **La carte** — face cachée, « touche la carte » ; elle se retourne ; « réponds ici » sur la carte vierge ; « je préfère ne rien dire ».
7. **L'enveloppe** — l'adresse s'y écrit à mesure (vrais champs, autoremplissage), puis l'email sur le même écran ; RESERVER.
8. **La cire** se forme (vidéo 1,5 s), « c'est noté » tapé, la référence, et ce qui se passe ensuite.

Prix et bouton : **0 s**. Commande : **≈ 60 s**, 2 touchers avant le formulaire, 2 animations qui comptent.

## Ce que ça demande de changer dans `epure.html`
- Retirer : la grille « ce que tu reçois », « comment I II III », la carte mystère (ou la revoir), le prix en Courier.
- Ajouter : la vidéo des mains sous la feuille (`machine-7.mp4`, partie « mains » seulement, une fois) ; la ligne qui je suis · conditions · contact ; RECEVOIR au-dessus du clavier ; « pour toi / pour quelqu'un » ; la carte face cachée qui se retourne (images rendues par le moteur : dos + face, même lampe, avec ombre) ; la vidéo de la cire à rendre (`tools/` : la scène du cachet, 1,5 s, < 80 Ko) ; la voix de Sami sur la carte réponse.
- Garder tel quel : la feuille et la colonne qui se coud, l'adresse sur l'enveloppe, une seule page, aucun geste caché.
- Le site actuel (3D) peut rester ailleurs, pour qui veut « entrer dans le monde d'Eternel », chargé après coup et jamais sur le chemin d'achat (Lucas : seulement si WebGL2, mémoire suffisante, hors navigateur intégré).

## Objections à respecter (contre les acquis)
- **Mesurer le « moins d'1 s »** (Lucas) : feuille ≤ 60 Ko, polices préchargées, rien avant le premier affichage, temps d'affichage envoyé au compteur.
- **Images sous la même lampe** (Inès) : sinon un retournement CSS fait tourner une image, pas une carte.
- **Les mains sans plaidoyer** (Sami) : ni légende, ni « vraiment tapé », jamais le mot IA.

## Hors de la réunion, à décider par Maxence
- **Le paiement par email plus tard** est, pour Martine, la première cause de fuite (« un lien de paiement par mail, c'est ce qu'on nous dit de ne jamais cliquer »). Payer sur le site dès le SIRET ; d'ici là, écrire noir sur blanc d'où viendra le lien (« un lien PayPal à mon nom, sous 24 h ; jamais d'autre adresse »).
- **Une date** (« posté le … ») pour les cadeaux, plutôt que « dans la semaine ».
- **Lisibilité** : rien sous 12 px, rien de plus pâle que ≈ 55 %.

## Le test qui tranche
Deux liens en bio (ou répartition 50/50 par `?v=`) pendant 1 à 2 semaines, ≈ 300 arrivées par version. Entonnoir GoatCounter : arrivée → première lettre → RECEVOIR → carte retournée → RESERVER ; plus le temps jusqu'au premier affichage et la part des cartes réponse remplies (alerte sous 40 %). La nouvelle version gagne si elle fait au moins 1,5 × plus de RESERVER par arrivée — sinon c'est l'offre (prix, preuve, paiement) qu'il faut revoir, pas le site. Et cinq personnes réelles, dont deux de plus de 50 ans qui offrent, sans aide.
