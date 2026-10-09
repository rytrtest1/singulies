# Revue de l'audit GPT — nuit du 07 au 08/10

## En une phrase
L'audit a raison sur la fin du parcours, sur ce qu'on dit des données et sur le besoin de tester avec des inconnus. Mais il se trompe sur le fond : il croit que **la machine écrit le poème** (« une machine à transformer une personne en objet littéraire », « j'ai donné quelque chose de moi à une machine »). C'est l'inverse : le site est la lettre qu'on t'écrit, puis **c'est une personne qui écrit, à la machine à écrire**. En 2026, laisser croire qu'une machine compose le poème, c'est faire penser à l'IA, la pire chose à laisser croire. Ce qui a de la valeur ici, c'est qu'Eternel, celui de la vidéo, écrit pour toi. Tout ce qui suit découle de ce point.

---

## Ce que j'ai fait cette nuit (publié sur `main`, un commit par sujet)

| | Quoi | Où le voir | Pour revenir en arrière |
|---|---|---|---|
| 1 | **La toute fin.** Après le contact (ENVOYER ou PASSER) : sur le noir, le prénom (Garamond, comme partout), puis tapé à la machine : *je l'écris à la machine, / puis il part chez toi.* Pour « en direct » : *je t'écris.* Sans réseau, une ligne plus pâle : *ton enveloppe attend le réseau, / elle partira dès qu'il reviendra.* Toucher ou Entrée pour passer, sinon l'écran principal revient après ≈ 8 s. | le parcours complet, ou `scene-cartes.html?fin=poste&prenom=LEA` (aussi `fin=direct`, `fin=test`) | `git revert 3dd86ae` |
| 2 | **Aperçu du lien** (iMessage, WhatsApp, messages Instagram) : image ETERNEL + la carte « ton prénom, ton poème », rendue par le moteur des cartes (`public/og.jpg`, `tools/og-image.mjs`). Description, texte invisible pour les lecteurs d'écran, message sans JavaScript, pages d'essai et `demande.html` exclues des moteurs. **Confidentialité** : « le site ne garde rien sur toi » était faux (la demande attend dans le navigateur quand le réseau manque) → phrase exacte. | coller le lien dans une conversation | `git revert 0c37059` |
| 3 | **Sans WebGL2** (vieux téléphone, mémoire saturée) : avant, on tapait son prénom puis on restait sur un noir, sans issue. Maintenant : *ton téléphone n'arrive pas / à montrer la suite. / écris-moi ton prénom : @e.t.ernel* (lien). | `node tools/nogl-shot.mjs` → `captures/fin/nogl.png` | `git revert eb8a910` |

Vérifié (Chromium, captures `captures/fin/`) : la fin en 390 × 844 et 1280 × 800, un prénom long sur deux lignes, « en direct », sans réseau (l'envoi est coupé dans le navigateur de test, aucune demande n'est partie), sans WebGL. Les 45 tests unitaires passent. **Pas vérifié sur iPhone ni dans Instagram.**

Pourquoi ces mots :
- **« je l'écris à la machine »** : le prénom est juste au-dessus, donc « je l'écris » se lit aussi « j'écris LEA ». C'est exactement ce qu'est un acrostiche. Ça dit la vérité (une personne, une machine à écrire) et le délai, sans promettre de date.
- **« puis il part chez toi »** : l'audit proposait « il est parti ». C'est faux : à cet instant, rien n'est parti à part la demande. On dit ce qui va se passer, au futur proche. L'attente devient une promesse.
- **« je t'écris. »** (en direct) : à la fois « je te recontacte » et « je t'écris un poème ».
- **« ton enveloppe attend le réseau »** : l'état de l'envoi dit avec le vocabulaire de la scène (l'enveloppe qu'on vient de poster), et jamais « erreur ».

---

## L'audit, point par point

**Retenu (et fait)**
- §16 l'après-POSTER, retenu avec les mots corrigés (voir plus haut).
- §32 confidentialité : il avait vu juste sur l'affirmation trop absolue, c'est corrigé.
- §30 Open Graph / description, et §31 un repli quand WebGL manque (fait, en version minimale).
- §34 rendre l'état de l'envoi lisible sans jargon : fait (ligne « attend le réseau »).

**Retenu, mais c'est à toi de le faire**
- §36 le test à 5 inconnus sur téléphone, sans rien leur expliquer. C'est déjà la règle de fin de phase dans CLAUDE.md, et c'est plus utile que n'importe quel shader. Ajoute une question à sa liste : *« qui va écrire ton poème ? »* Si quelqu'un répond « l'ordinateur », on a un problème.
- §33 EmailJS : dans le tableau de bord, **restreindre les domaines autorisés** à `rytrtest1.github.io` (puis au futur domaine). Sans ça, n'importe qui peut remplir ta boîte avec la clé publique.

**Corrigé ou nuancé**
- §1–2, 43 « la machine » : voir plus haut. La bonne transformation n'est pas *moi → machine → objet* mais *moi → mon prénom → ma réponse → **lui** → mon poème → chez moi*.
- §8 les formules d'ouverture. *« Réponds. Je t'enverrai quelque chose. »* et *« Quelques minutes à l'écran. Quelque chose à garder. »* : « quelque chose » rend l'objet flou, alors que la personne sait déjà ce qu'elle veut (elle vient de voir la vidéo où tu tapes un acrostiche à un inconnu). La seconde est un slogan, et le site n'en a aucun : c'est sa force. *« Tu réponds ici. Tu le reçois chez toi. »* est la meilleure des quatre, mais elle explique. Ta carte **« ton prénom, ton poème »** dit déjà tout, avec le rythme d'un vers. Je n'y ai pas touché.
- §26 la grammaire des polices : l'audit met Courier Prime sur « l'action ». En réalité, sur le site, **Garamond = le prénom et ta voix** (ETERNEL, PASSER, POSTER, ENVOYER), **Courier = ce qui est tapé sur le papier** (questions, réponses, adresse, et maintenant la fin). La fin respecte cette grammaire : le prénom en Garamond, la phrase à la machine.
- §32 les données dans le lien (`demande.html#…`) : ce n'est pas une priorité absolue. Ce qui suit le `#` n'est jamais envoyé au serveur, et le lien n'existe que dans ton email, qui contient déjà les mêmes données en clair. Le seul risque, c'est de transférer cet email. On peut garder.
- §15 « où dois-je l'envoyer ? » avant l'adresse : c'est redondant. L'enveloppe, avec son bloc d'adresse en bas à droite, *est* la question. Pas ajouté.
- §21 « portail confus » : non. ETERNEL au-dessus, quatre cartes du même rang, le poème d'abord : c'est la page de l'auteur, un seul lien en bio. C'est cohérent.

**Écarté (pour l'instant), avec la raison**
- §27–28 refactoriser en `engine/ objects/ scenes/…` et centraliser les paramètres : ≈ 430 Ko de code réglé à l'œil, sans tests de bout en bout sur la feuille et l'enveloppe. Une refonte de nuit apporterait surtout des régressions que tu devrais repérer sur iPhone. `LOOK` (scene.js) et `SPEED` (sheet.js) regroupent déjà l'essentiel. On refactorise un fichier quand on y touche, pas avant.
- §29 qualité HIGH / MEDIUM / LOW : aucune mesure ne montre un problème de fluidité sur téléphone. Sans mesure sur un vrai iPhone dans Instagram, c'est de l'optimisation à l'aveugle.
- §35 / 37 analytics : la page de confidentialité promet « aucune mesure d'audience ». C'est un argument de marque, ne le sacrifie pas pour un entonnoir. Tes emails comptent déjà les demandes, et le test à 5 personnes montre où l'on décroche. Si un jour tu veux un seul chiffre (arrivées / postées), on en reparlera.
- §19 / 23 page « l'objet » avec photos : bonne idée **le jour où tu as les photos** (le jeu, une enveloppe réelle, un poème tapé). CLAUDE.md interdit les photos sur l'accueil, mais pas sur la page du jeu. À décider avec de vraies images.
- §24 QR « à ton tour » : c'est déjà ton idée d'origine (la carte à renvoyer avec le prénom écrit dessus). C'est de l'imprimé, pas du site.

---

## Ce que l'audit n'a pas vu (risques réels)

1. **Quota EmailJS.** Si tu es sur le plan gratuit : 200 emails par mois. Avec la confirmation à la personne activée, chaque demande compte double, donc ≈ 100 demandes par mois. Au-delà, l'envoi échoue : la demande reste dans le téléphone de la personne et ne repart qu'à sa prochaine visite (peut-être jamais). Une vidéo qui marche suffit à saturer. → Vérifie ton plan EmailJS avant la prochaine vidéo.
2. **L'interruption.** Sur iPhone, quitter Instagram un moment (pour chercher son code postal, répondre à un message) peut faire recharger la page. Tout ce qui précède POSTER est alors perdu : la question, la réponse, l'adresse. C'est probablement le premier endroit où l'on perd des gens sans le savoir. → Proposition : garder la progression dans l'onglet et reprendre à la bonne scène. C'est un vrai chantier (≈ une session) ; je ne l'ai pas lancé sans ton accord.
3. **Offrir.** Le site dit « ton prénom ». Beaucoup voudront un poème **pour quelqu'un** (une mère, un amour). Le parcours le permet déjà en douce (on tape le prénom de l'autre, son adresse sur l'enveloppe), mais rien ne le dit. C'est peut-être ton premier marché. À réfléchir, sans rien ajouter à l'accueil pour l'instant.
4. **Le paiement.** Rien n'est payé aujourd'hui (« par la poste » et « en direct » mènent à la demande). Le jour où tu factures, POSTER est le bon instant (un lien de paiement sans serveur suffit). Ce sera le seul vrai moment « commande », et il faudra l'écrire avec soin.

---

## Propositions de langage (rien n'est changé, c'est à toi de choisir)

| Où | Aujourd'hui | Proposition | Pourquoi |
|---|---|---|---|
| contact, après l'enveloppe | *ton email ou ton numéro, / pour te tenir au courant* | *ton email ou ton numéro, / pour te dire quand il part* | « tenir au courant », c'est le ton d'un service client. L'autre phrase dit exactement ce que la personne y gagne, parle de l'objet, et répond à la fin (« puis il part chez toi »). Elle t'engage à prévenir au départ. |
| la commande | *en direct* | à préciser : *en direct, devant toi* ? *en visio* ? | Je ne sais pas ce que « en direct » recouvre, et la personne non plus. Deux cartes, dont une ambiguë : c'est exactement le flottement que tu veux éviter. |
| le jeu | *le commander* | *l'avoir chez toi* | « commander », c'est le seul mot d'e-commerce du site. L'autre garde l'idée de l'objet qui arrive. |
| le jeu, sous le paquet | (rien) | *à poser à quelqu'un.* | Le jeu se joue à deux, et la page ne le dit pas. Quatre mots suffisent, tapés à la machine comme le reste. |
| enveloppe | *prénom nom* | inchangé | Clair, et ça marche aussi quand on offre. |

La voix du site, telle que je la lis (pour juger toute phrase future) : **tutoiement, minuscules, « je » = toi, phrases au présent ou au futur proche, aucun adjectif de vente, aucun point d'exclamation, des mots concrets (machine, enveloppe, réseau, chez toi) plutôt qu'abstraits (expérience, quelque chose, univers).** Les questions du jeu (*« As-tu gardé une place pour quelqu'un qui ne reviendra pas ? »*) donnent le diapason.

---

## Questions pour toi
1. La fin te convient-elle (les mots, la durée ≈ 8 s, le prénom au-dessus) ?
2. « pour te dire quand il part » : oui / non ?
3. Que veut dire « en direct » ?
4. On lance la **reprise après interruption** (risque n° 2) ?
5. Ton plan EmailJS et la restriction de domaine (risque n° 1) : fait ?

---

## Décisions de Maxence (revue cas par cas, 08–09/10) — ordre de code proposé

**Déjà fait pendant la revue** : cas 1 (carte « ton prénom ton poème, / par la poste »), cas 17 (relief sculpté seulement de profil ; iPhone X ≥ 30 i/s ; essais `?fps=1`, `?dpr=`, `?relief=0`, `?maille=`).

**1. Petits et sûrs**
- 11 — ETERNEL = l'auteur (onglet, vignette, expéditeur des emails) ; SINGULIES = le jeu, toujours en capitales, sans accent ; logo SS = le label (au dos, en marque).
- 6 — carte du jeu : *commander* ; écran de l'email : TERMINER → COMMANDER (le paiement viendra derrière).
- 20 — lien de demande : prénom, question, réponse seulement (plus d'adresse ni de contact).
- 21 — une même demande ne part jamais deux fois.
- 14, 15 — règles dans CLAUDE.md : logo = label (au dos, jamais un bouton ni un chargement) ; Courier = ce qui est imprimé sur un objet, Garamond = ce qui flotte au-dessus (noms, gestes).
- 8 — retirer `farewell` (la fin est celle de l'autre session).

**2. Le parcours du poème**
- 2a — le prénom au-dessus du champ de l'email, fixe jusqu'à la fin.
- 2b — invitation du champ « prénom nom » : le prénom accentué + « nom » en gris clair (*Léa nom*), sans pré-remplir.
- 3 — esquisse vers la gauche ×2 sur la première carte, puis le coin corné ; après un premier passage : plus jamais vers la gauche, une fois vers la droite (revenir), coin corné visible sans se soulever.
- 4 — *- ETERNEL -* tapé à la machine en bas de la feuille, calé à gauche sur la colonne de l'acrostiche.
- 16 + 5 — l'enveloppe dans son propre fichier, ses durées dans un seul tableau ; puis : adresse sur la face avant (rabat ouvert), le geste final = retournement, rabat, cachet qui s'écrase, départ (et le retour en arrière à l'envers).

**3. Fluidité** — 17 (suite) : préparer l'encre et les cartes avant les mouvements (à-coups de 250 ms).

**4. Accessibilité**
- 19 — lecteur d'écran : le champ de réponse porte la question ; chaque carte annoncée ; acrostiche et champs d'adresse nommés.
- 19 — **version simple de bout en bout** (portail, prénoms, cartes, feuille, enveloppe, email) : activée seulement si nécessaire, scène par scène (garder le vrai champ de prénoms si lui marche), mêmes mots / gestes / ordre, cartes rendues en images, mouvement en CSS ; `?simple=1`. **Plan détaillé à valider avant de coder.**

**5. Partage** — 18 : une adresse et une vignette par page partageable (accueil : ETERNEL + logo SS en fond ; poème : la feuille noire, ETERNEL en colonne et les lignes ; lettre : l'enveloppe et son cachet ; jeu : le paquet 3D, SINGULIES au-dessus, *le jeu* au dos de la carte du dessus).

**6. Mesure** — 23 : compteur anonyme sans cookie (étapes jour par jour ; par question tirée / passée / répondue ; par plateforme `?v=insta` / `?v=tiktok` ; par type de téléphone) + page de confidentialité. Outil à choisir avec Maxence (compte).

**7. Document** — 24 : feuille de test d'une page (lien en message Instagram, 2 personnes qui connaissent la vidéo + 3 non, questions de fin : *qu'est-ce que tu vas recevoir ?*, *qui va écrire ton poème ?*).

**Plus tard / hors code**
- 10 — shooting (ta copine) ; la page de l'objet **après COMMANDER** (poème : la révélation) ; story à la une « l'objet ».
- 6, 10 — page de vente du jeu après *commander* (photos, mesures, façons de jouer seul ou à plusieurs, l'histoire : *les questions que je pose aux inconnus dans la rue*), puis PAYER. Grammaire : COMMANDER, puis PAYER.
- 9 — b : une photo de l'enveloppe le jour où elle part (ton geste) ; c : l'email récapitulatif (créer le modèle EmailJS).
- 20 — chantier « table de travail » : écrire l'acrostiche dans la page du lien ; un lien partageable pour la personne, sans sa réponse par défaut ; vignette par poème avec le domaine.
- Version pro (à confirmer) : réglages EmailJS (domaines, plan), serveur, domaine, ne pas quitter COMMANDER tant que la demande n'est pas partie (22), remise en ordre complète du code (16).
- Écartés : 7 (rien au-dessus de l'enveloppe), 12 (rien sur la page 3D du jeu), 13 (QR « à ton tour »).
