# Cahier des charges — trois versions du site (V1 directe · V2 équilibrée · V3 expressive)

Document de référence, rédigé le 17/10/2026 d'après l'audit UX en aveugle et les 12 décisions prises avec Maxence.
**Aucun code n'est modifié tant que ce document et `docs/plan-construction-3-versions.md` ne sont pas validés.**

## 0. Le principe

Le site vend « un prénom, un poème » : un acrostiche tapé à la machine à écrire par l'auteur (ETERNEL), posté en France, **39 € envoi compris**. On construit **trois versions parallèles** qui ne diffèrent que par leur *straightforwardness* (à quel point chaque geste est dit explicitement), pour mesurer laquelle convertit le mieux sans perdre l'âme du site.

| | V1 — directe | V2 — équilibrée | V3 — expressive |
|---|---|---|---|
| Idée | un site de vente conventionnel, tout est dit | le rituel est gardé, chaque étape est explicite | l'existant presque intact, corrections minimales |
| Adresse | `singulies.com/v1/` | `singulies.com/v2/` | `singulies.com/v3/` |
| Base technique | nouveau front en DOM (sans 3D) | moteur actuel + couche explicite | moteur actuel + corrections |

Règles communes aux trois : une adresse propre au bout de l'URL (`/v1/`, `/v2/`, `/v3/`), **stockage navigateur séparé** (clés préfixées par version), **statistiques séparées** (chemins préfixés), **noindex**. Le paiement est **à la fin** dans les trois (après la réponse, l'adresse et l'email, avant le scellement) : la seule différence entre versions reste la straightforwardness.

Parcours actuel (rappel) : intro animée → saisie du prénom → aperçu avec carrousel → RECEVOIR → tirage d'une carte question du jeu SINGULIES → réponse (ou PASSER : thème libre, puis improvisation) → adresse écrite sur une enveloppe 3D → POSTER → email → TERMINER → MERCI. Paiement actuel : rien n'est débité, l'auteur envoie ensuite un lien PayPal (temporaire).

---

## 1. Correctifs communs aux trois versions (décision 0)

Chaque ligne = un constat dans le code actuel, et le correctif attendu partout.

| # | Constat | Correctif |
|---|---|---|
| C1 | Le retour depuis l'enveloppe mène à `/merci?reserve=1` (`src/main.js:63`, `src/alt/merci.js:84`). | Le retour ramène à la carte, **réponse conservée**. |
| C2 | RECEVOIR crée une commande locale marquée « reserve » et envoie `alt/reserve` (`src/alt/offre.js:334`) ; `alt/paye` part dès `paidHere` (`offre.js:158`, `merci.js:86`) — avant qu'il soit vrai. | Plus de commande locale marquée reserve/paid au clic. `reserve` et `paye` ne partent **que quand c'est vrai** (demande réellement envoyée / paiement réellement confirmé). |
| C3 | « l'enveloppe est partie. ton email, puis COMMANDER » s'affiche avant l'envoi réel (`src/cards/mount.js:345`) ; le bouton final s'appelle TERMINER à l'écran mais COMMANDER pour les lecteurs d'écran (`mount.js:318`). | Rien n'annonce l'envoi avant qu'il soit fait. **Un seul nom** pour le bouton final, identique à l'écran et pour les lecteurs d'écran. |
| C4 | Tab est bloqué sur l'accueil (`src/main.js:599` : Tab bascule le mode du champ) et sur l'enveloppe ; il faut cliquer pour commencer. | Tab n'est plus intercepté ; on peut **commencer à taper sans cliquer**. |
| C5 | Un prénom tronqué à 22 caractères, un caractère refusé (écritures non latines) disparaissent **sans message**. Le code postal n'est pas vérifié : « ABC » est accepté (`src/sheet/envelope.js:102`, simple longueur ≤ 10). | Signaler la troncature et le refus. Code postal : **5 chiffres, France** (la règle existe déjà dans `src/epure/epure.js:354`). |
| C6 | PASSER efface un thème déjà écrit — **confirmé le 17/10 par la commande de test** : l'email reçu dit « improvisation (sur le prénom) » et ne contient pas le thème écrit avant PASSER. | PASSER **ne supprime jamais** un thème écrit (il devient « continuer »). |
| C7 | COMMANDER du jeu SINGULIES ne fait rien (`src/jeu/game.js:47`). | Devient **« me prévenir »** (le jeu sort bientôt), avec une **liste d'attente par email**. |
| C8 | Paiement : aucun débit, lien PayPal envoyé à la main. | Page de paiement **Stripe en mode test**, visible seulement en test (adresse ou réglage spécial), **qu'on peut passer**, prête à être activée pour tous. PayPal est temporaire. Apple Pay et Google Pay prévus : **un seul domaine** (`singulies.com`) est à enregistrer chez Stripe, les trois versions en profitent. |
| C9 | **Email de confirmation envoyé à la personne** (modèle EmailJS `template_lryyumd`) : son **objet** arrive en anglais avec une variable vide, « Order Confirmed #! » — l'objet n'est pas dans le dépôt, il se règle dans EmailJS. Le corps parle de « réservation, pas encore payée » (libellé interne) alors que `confirmMode` (`src/app/send.js`) prévoit « commande notée, réf. … ». | Objet en français avec la référence (« ton poème : HELENE-55jzt2 »), corps cohérent avec `confirmMode`. À corriger dans EmailJS (action de Maxence), puis à vérifier par un envoi réel. |

Filtre actuel du prénom, pour mémoire : tiret → espace (deux colonnes, voulu), apostrophe supprimée, ß → SS, écritures non latines refusées **sans message**, 22 caractères max.

---

## 2. Les 12 décisions, version par version

### Décision 1 — Arrivée
Constat : intro animée d'environ 11 s avant le menu ; pas de moyen évident de commencer ; consigne absente.

| V1 | V2 | V3 |
|---|---|---|
| Pas d'intro. Titre, promesse **avec le prix**, champ « ton prénom », bouton « continuer ». Le nuage de prénoms en fond. | Intro d'environ 3 s, qu'on passe par une touche ou un toucher. Puis la ligne tapée à la machine « écris un prénom », **frappe sans clic**, menu visible en atténué. Pas d'intro pour le visiteur qui revient. | Intro actuelle (≈ 11 s avant le menu), mais **toute touche la passe** et la frappe démarre ; le visiteur qui revient la saute ; la consigne apparaît après quelques secondes sans frappe. |

### Décision 2 — Saisie du prénom
Constat : la machine **ne tape aucun accent** ; l'aperçu reste en majuscules sans accents. Validation automatique actuelle trop rapide (« CAM » validé après ≈ 7 s). Refus et troncature silencieux.
Dans les trois versions, l'aperçu **le dit** (V1 une phrase, V2 une ligne tapée, V3 une mention discrète).

| V1 | V2 | V3 |
|---|---|---|
| Un champ **avec libellé** ; validation par bouton ou Entrée seulement ; message pour les caractères refusés ou la limite de 22 ; lien « modifier le prénom » dans l'aperçu. | Frappe dans le nuage ; « continuer → » dès la première lettre ; **pas de validation automatique** ; refus expliqués par une phrase tapée ; toucher le prénom dans l'aperçu permet de le corriger. | Validation automatique **gardée**, mais à partir de **2 lettres** et après une **pause plus longue** ; « pas ton prénom ? touche-le » ; refus signalés comme en V2. |

### Décision 3 — Aperçu, prix et promesse

| V1 | V2 | V3 |
|---|---|---|
| La liste de ce qu'on reçoit, visible en 4 lignes (feuille A4 tapée une fois · question du jeu · enveloppe scellée à la cire · carte mystère et fil) ; prix, envoi en France compris, « posté sous 7 jours » ; ligne sur le paiement ; bouton « commander · 39 € » ; exemples dans une section titrée « exemples : d'autres prénoms ». | Carrousel gardé, avec **cibles de 44 px**, glissement au doigt, **titre visible par diapositive** ; « d'autres prénoms » marqué « exemples » et **fermable par un ✕ visible** ; ligne discrète sur le paiement ; bouton RECEVOIR gardé. | L'existant, plus la **ligne sur le paiement** et une étiquette « exemple ». |

**Variable commune « ligne sur le paiement »** :
- tant que c'est PayPal : « rien n'est débité maintenant : je t'envoie le lien de paiement par email » (sans délai affiché) ;
- quand Stripe passe en réel : une phrase précise du type « paiement par carte, Apple Pay ou Google Pay, après l'adresse ».

### Décision 4 — Offrir et date
Celui qui offre peut ajouter son nom (« de la part de ») **et** un mot court facultatif (**300 caractères au plus, ajustable**). **Le poème part toujours à l'adresse du destinataire.**

| V1 | V2 | V3 |
|---|---|---|
| Deux boutons « pour moi / pour offrir » après le prénom ; les textes passent à « son poème », « réponds en pensant à elle / à lui » ; date facultative avec calendrier (si elle tombe à moins de 10 jours, un message propose d'écrire à l'auteur) ; champs « de la part de » et « un mot ». | Un signe discret « pour offrir ? » ; une carte « pour quand ? » ; une carte « de la part de qui ? un mot ? » ; « à qui je l'envoie ? » visible sur l'enveloppe. | Seulement la ligne sur l'enveloppe « à qui je l'envoie ? pour offrir, mets son adresse » ; une ligne facultative « de la part de » ; pour une date, la confirmation renvoie vers CONTACT avec la **référence déjà remplie**. |

### Décision 5 — Carte et réponse
**Retirer une carte : sans limite dans les trois versions.**

| V1 | V2 | V3 |
|---|---|---|
| Question en texte lisible ; réponse sur plusieurs lignes avec bouton « continuer » ; trois choix explicites : « une autre question », « je préfère choisir mon thème », « laisse Eternel improviser ». | Rituel gardé ; **l'effet machine n'efface jamais de lettre** ; réponse sur plusieurs lignes ; « envoyer → » ; « tirer une autre carte » ; PASSER explicites (« passer : choisir mon thème », puis « passer : laisse-moi improviser ») ; PASSER devient « continuer » dès qu'un thème est écrit. | Corrections minimales : plusieurs lignes, un signe en plus d'Entrée, PASSER qui devient « continuer » ; toucher le paquet retire une carte. |

### Décision 6 — Enveloppe et adresse
**Saisie d'adresse assistée dans les trois versions**, avec la Base Adresse Nationale : on tape la rue, le site propose l'adresse complète, un choix remplit rue, code postal et ville. La saisie libre reste possible ; le choix se fait au clavier (flèches + Entrée). À ajouter à la page de confidentialité (les caractères tapés partent vers un service tiers).

> **Service vérifié le 17/10/2026** : la BAN est servie par la **Géoplateforme de l'IGN** : `https://data.geopf.fr/geocodage/search/?q=…&autocomplete=1` (et `/completion/`). Réponse 200, CORS ouvert (`access-control-allow-origin: *`), **aucune clé**, limite 50 requêtes/s par IP. L'ancien `api-adresse.data.gouv.fr` répond encore (200) mais c'est la voie migrée : on utilise la nouvelle.

| V1 | V2 | V3 |
|---|---|---|
| Formulaire classique avec libellés, champs de 44 px, ordre de Tab, remplissage automatique, vérification immédiate, « France uniquement ». | L'écriture sur l'enveloppe est gardée, avec **cibles de 44 px**, indications lisibles, **Tab entre les champs**, erreurs tapées à la machine. | L'enveloppe actuelle, avec Tab, cibles agrandies, indications lisibles, **vérification au clic sur POSTER**. |

### Décision 7 — Email, paiement, confirmation
Le paiement est **à la fin** (après réponse, adresse, email ; avant le scellement). **Le paiement conditionne l'envoi.** Deux chemins à l'enveloppe :
- **avec un wallet** : un bouton Apple Pay / Google Pay qui paie **et** fournit adresse et email ; l'enveloppe s'écrit alors toute seule, tapée à la machine, puis elle est scellée. *À vérifier :* l'adresse complète n'est sans doute transmise qu'**après l'autorisation** du paiement (le code actuel la lit déjà après paiement : `walletOut`, `src/alt/offre.js`) — confirmer par un essai réel en mode test.
- **à la main** : adresse et email, paiement par carte, puis scellement.

| V1 | V2 | V3 |
|---|---|---|
| L'email dans le formulaire ; un **récapitulatif modifiable** ; le paiement ; une confirmation avec la **référence**, la suite en **3 étapes** (paiement, frappe sous 7 jours, La Poste) et le contact. | L'email **sur la tranche** de l'enveloppe ; un récapitulatif feuille + enveloppe, modifiable au toucher ; une carte « 39 € · payer » ; le scellement après le paiement ; une confirmation tapée avec la référence et 3 lignes sur la suite. | Email, puis paiement, puis scellement ; la confirmation actuelle avec **une ligne en plus** sur le paiement et le délai. |

Plus tard : tester un **paiement express** (Apple Pay qui remplit l'adresse) dans une seule version, une fois des chiffres de référence disponibles.

### Décision 8 — Navigation
**L'historique se fait par étape dans les trois versions** : le retour du navigateur ramène à l'étape précédente, sans rien perdre.

| V1 | V2 | V3 |
|---|---|---|
| Bouton « ← retour » ; barre d'étapes « 1 prénom · 2 question · 3 adresse · 4 paiement » ; menu toujours visible (☰ seul sur mobile) ; À propos, Questions et Contact deviennent de **vraies pages** ; bandeau « reprendre ta commande pour … ? ». | Flèche ‹ ; 4 petits repères de progression ; menu atténué mais visible ; sur mobile, le nom de la page plus le ☰ ; les sections ont leur adresse (`#questions`) et le retour les ferme ; une ligne tapée propose de reprendre. | Pas d'indicateur d'étape ; **barre mobile corrigée** (aujourd'hui coupée en « MOIS », « MES L… ») ; les sections ont leur adresse ; la reprise se fait sans rien annoncer. |

### Décision 9 — Confiance
**Uniquement des preuves réelles, attribuées et avec l'accord des personnes.** Les 4 exemples (Julie, Isabelle, Anaïs, Marysol) sont de vrais poèmes envoyés : **faire confirmer l'accord pour les prénoms**. Maxence a des vidéos de rue et un compteur réel ; **pas de numérotation des poèmes**.

| V1 | V2 | V3 |
|---|---|---|
| Bloc « qui écrit » (extrait de rue, compteur, lien Instagram @e.t.ernel) ; bande rassurante avant le paiement (« La Poste · si l'enveloppe se perd je refais le poème · paiement sécurisé ») ; 3 questions de FAQ dépliables (délai, paiement, offrir) ; lien vers les conditions près du bouton. | La vidéo de la machine devient un moment du rituel ; « écrit et tapé par moi, aucun programme » ; la même bande rassurante, en discret ; un signe « ? » par étape qui ouvre la question de FAQ correspondante ; un extrait de rue dans la galerie ; le compteur en total tapé à la machine. | Seulement « si l'enveloppe se perd, je refais » et le lien vers les conditions près du paiement ; le compteur dans À propos. |

### Décision 10 — Pages secondaires
Les autres offres (lettre, livres, jeu) n'apparaissent qu'**après** la commande, jamais avant le paiement.

| V1 | V2 | V3 |
|---|---|---|
| Pages classiques. Lettre : 4 lignes, prix, liste d'attente, email dans la page. Livres : côte à côte, « acheter sur Amazon ↗ ». Jeu : description et « me prévenir ». Contact : formulaire classique, email et Instagram visibles. | Carrousels gardés (44 px, glissement, titres) ; lien Amazon signalé comme **externe** ; le jeu passe à « me prévenir » ; la carte de contact a des libellés. | Tel quel, avec le bouton du jeu en « me prévenir » et des cibles agrandies. |

### Décision 11 — Accessibilité
**Socle commun : WCAG 2.2 niveau AA sur tout ce qui sert à agir** — contraste 4,5:1, cibles de 44 px, parcours entier au clavier avec focus visible, libellés pour lecteurs d'écran, **aucune information portée seulement par la texture machine**. Le décor peut rester en faible contraste.

| V1 | V2 | V3 |
|---|---|---|
| AA partout ; la 3D n'est jamais nécessaire pour commander ; une page statique en mouvement réduit. | En mouvement réduit : pas d'intro, des fondus à la place de la 3D. | L'apparence reste la même ; seuls les éléments sur lesquels on agit gagnent en contraste ; l'intro est sautée en mouvement réduit. |

Avant de construire : **mesurer le chargement et la fluidité du site actuel** sur un téléphone moyen en 4G, pour fixer des objectifs chiffrés (voir le plan, phase 0).

### Décision 12 — Les trois versions elles-mêmes
Trois adresses au bout de l'URL (`singulies.com/v1/`, `/v2/`, `/v3/` — *révisé le 17/10 : à l'origine trois sous-domaines*), stockage navigateur et statistiques séparés, `noindex`. Détail technique dans `docs/plan-construction-3-versions.md`.

---

## 3. Questions ouvertes

1. ~~**Accord des prénoms** Julie, Isabelle, Anaïs, Marysol~~ — **réglé le 17/10** : Maxence confirme les accords (sur parole).
2. ~~**Compteur réel**~~ — **reporté** (Maxence, 18/10 : pas de compteur pour le moment) ; il viendra avec un chiffre exact, sa date et ce qu'il compte.
3. **Comment les visiteurs arrivent sur chaque version** : le lien en bio Instagram est unique. Répartition aléatoire (petit Worker sur le domaine principal) ? liens différents selon la story/vidéo ? à décider avant la phase de test.
4. **Longueur du « mot »** pour offrir : 300 caractères proposés, à ajuster après essai.
5. **Délai affiché** : « posté sous 7 jours » (V1) contre « dans la semaine » aujourd'hui (`DELAI` dans `src/alt/config.js`) — harmoniser. La ligne PayPal reste sans délai.
6. **Stripe réel** : dépend du SIRET / statut. Tant qu'il manque, PayPal temporaire et ligne de paiement « rien n'est débité ».
7. **Obligation européenne d'accessibilité** (directive 2019/882) : elle exempte probablement les micro-entreprises de services — **à vérifier plus tard** (Maxence, 17/10) ; on vise l'AA de toute façon.
8. **GoatCounter** : le plan gratuit est prévu pour un usage non commercial. Le site **ne vend pas encore** (Maxence, 17/10) : à revoir au passage au paiement réel (Stripe).
9. **Liste d'attente du jeu** : où l'email est gardé (proposition : même base D1 que les commandes), et mise à jour de la page de confidentialité.
10. **Média « machine »** : une vidéo à feuille noire, sans ruban, éclairage rasant, caméra fixe est toujours à filmer (déjà noté dans `CLAUDE.md`).

## 4. Points en suspens à régler (hérités de l'audit)

- **Commande de test réelle envoyée pendant l'audit** (HELENE-55jzt2, nom TEST AUDIT, code postal ABC, test-audit@example.com) : **vérifiée le 17/10** — l'email arrivé à l'auteur dit « improvisation (sur le prénom) » sans le thème : **le bug C6 est confirmé** ; le code postal « ABC » est bien passé (C5). L'email de confirmation à `test-audit@example.com` est revenu en erreur (le domaine example.com ne reçoit pas de courrier) : normal pour une fausse adresse. Reste à supprimer la commande côté suivi (`commandes.html`, si la base D1 est reliée) — par Maxence.
- **Les statistiques GoatCounter contiennent les passages de l'audit** : les nouveaux chemins préfixés par version (`v1/…`) démarreront propres ; l'ancien tableau reste pollué pour la période de l'audit.
- **Obligation d'accessibilité** : voir question 7.

## 5. Médias

**Reçus le 17/10 :**
- **Cinq vidéos TikTok** de @e.t.ernel, sur le principe « acrostiche écrit à un inconnu » : SUZANNE (`…/video/7499134726918130966`, titre « écriture de poème à une inconnue »), ADELINE (`…7687927040628051232`), ISABELLE (`…7686924779785440544`), MARYSOL (`…7683572139525459233`), ISABELLE bis (`…7689880594007788832`). Je n'ai pu lire que leurs métadonnées (titre, format vertical 576 × 1024), pas les regarder : durée, lisibilité sans le son et droit à l'image restent à juger par Maxence.
- **Trois photos** : les mains sur la machine, gros plan sur le mécanisme avec la feuille bleue (« it was never about love »), le tatouage ETERNEL sur la main ; un portrait en clair-obscur. Rangées localement dans `ressources/medias/` (non versionnées, non publiées).

**Sélection proposée (2 à 4 extraits, à confirmer) :**
1. **SUZANNE** — la plus claire : « à une inconnue », la preuve du principe ;
2. **MARYSOL** et **ISABELLE** (une des deux) — ils correspondent à des exemples déjà montrés sur le site (continuité : « ce poème est devenu cette feuille ») ;
3. **ADELINE** en réserve.

Pour les placer sur le site, il faut les **fichiers MP4 d'origine** (sans filigrane TikTok), 10 à 30 s, moins de 8 Mo chacun — à exporter depuis le téléphone ou le montage, pas depuis TikTok. On les héberge nous-mêmes (pas de lecteur TikTok intégré : il ajouterait des scripts et cookies tiers).

**Encore attendus :** le chiffre exact du compteur avec sa date et ce qu'il compte ; les liens des posts Instagram si on les cite.
