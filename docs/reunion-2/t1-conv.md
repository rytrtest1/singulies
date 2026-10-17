# Tour 1 — Karim (conversion mobile, `conv`)

Mon critère : sur 100 personnes arrivées depuis la bio, combien touchent RECEVOIR, puis combien arrivent à « c'est noté ». Dans le navigateur intégré d'Instagram ou de TikTok, on a 3 s d'attention, le réseau est lent, l'autoremplissage est aléatoire et le geste retour ferme tout.

Version A aujourd'hui : 1,5 s de noir, ETERNEL tapé (≈ 2 s), le prénom à saisir, puis 6,6 s de vol et de montée. **Le prix apparaît au mieux vers 15–20 s** (site-5), après trois gestes que rien n'annonce. Version B : **le prix et RECEVOIR sont visibles à 0 s** (epure-1). À mon avis, A perd déjà 30 à 50 % des visiteurs avant même de montrer ce qui est vendu.

## 1. Garder de A
- **Le prénom qui devient colonne sur la feuille** (site-5). C'est l'aperçu du produit, avec son prénom à elle : c'est ce qui déclenche l'achat. Je le garde, mais à 0,6 s maximum, pas 6,6 s.
- **Tirer une carte** (site-7). Un seul toucher, et c'est le jeu de la vidéo : on retrouve ce qu'on vient de voir. Ce geste remplace avantageusement le formulaire « question ».
- **Le cachet qui se forme, mais après RESERVER.** Placé après la conversion, il ne coûte rien et c'est lui qui donne envie de faire une capture et de partager.

## 2. Garder de B
- **Feuille + prix + RECEVOIR dans le premier écran**, avec la feuille déjà affichée avant que la saisie commence.
- **Pas de WebGL dans le chemin d'achat.** Les anciens iPhone et les webviews lentes ne doivent jamais bloquer avant le prix.
- **L'adresse tapée qui s'écrit sur l'enveloppe** (epure-6), avec de vrais `<input>` (autocomplete, `inputmode`) : c'est concret, et le remplissage automatique marche quand il existe.

## 3. Retirer
- Le champ 3D de prénoms à l'arrivée, le noir initial, le vol des lettres.
- La vitrine à gestes cachés : glisser l'objet, points de navigation, toucher pour zoomer. Personne ne les trouve dans une webview.
- Le bandeau de pages qu'on fait glisser, et le menu ≡ dans le parcours d'achat.
- L'étape « la tranche devient le champ email » : c'est un écran de plus. L'email va sur le même écran que l'adresse.
- Tout changement d'URL ou de page pendant l'achat : avec le retour arrière, on perd le visiteur. On passe par des calques, et l'état est gardé en sessionStorage.

## 4. Parcours idéal (5 écrans)
1. **Arrivée (0 s)** : ETERNEL, la feuille noire, le curseur, « écris ton prénom » ; sous la feuille, une boucle muette de 3 s des mains sur la machine, puis RECEVOIR et « 39 € tout compris · posté dans la semaine ». **Prix et bouton : 0 s.**
2. **Prénom (≈ 5 s, environ 8 frappes)** : la colonne se pose lettre à lettre au fil de la frappe (fil cousu), la phrase se met à jour. RECEVOIR ne bouge pas.
3. **RECEVOIR → le paquet (≤ 0,3 s)** : « tire une carte », un toucher, la question se retourne (1 s). Réponse facultative, « une autre question », PASSER.
4. **Où je l'envoie (≈ 40 s)** : pour moi / pour offrir (un toucher), nom, adresse, code postal, ville, puis l'email, sur le même écran, qui s'écrivent sur l'enveloppe. RESERVER reste fixé au-dessus du clavier.
5. **C'est noté (2 s)** : le cachet se forme, la référence, « rien n'a été débité », un lien de partage vers une question du jeu.

Au total : 2 touchers avant le formulaire, environ 1 minute de bout en bout.

## 5. Risque principal et mesure
**On perd le saisissement qui fait partager, et donc du trafic à long terme.**

Pour le mesurer, on publie deux liens en bio, ou une répartition 50/50 aléatoire via `?v=`, pendant une semaine. Événements GoatCounter : arrivée → première frappe → RECEVOIR → RESERVER, plus le temps jusqu'à la première frappe.

Il faut environ 300 arrivées par version pour lire un écart de ×1,5. Si B fait au moins 1,5 fois plus de RESERVER par arrivée, on tranche. La version A n'est conservée que si elle convertit autant.
