# Plan de construction — trois versions (proposition à valider)

Complète `docs/cahier-des-charges-3-versions.md`. **Rien n'est construit tant que ce plan n'est pas validé, décision par décision.**
Constat de départ (code lu le 17/10/2026) : Vite multi-pages (`vite.config.js`), moteur WebGL2 (`src/main.js` 1277 l., `src/sheet/sheet.js`, `src/cards/mount.js`), la page du poème dans `src/alt/` (`offre.js` 945 l.), une version « simple » sans WebGL (`src/simple/`) qui doit recevoir toute évolution du parcours 3D (règle de `CLAUDE.md`), une version épurée DOM (`src/epure/`), un Worker Cloudflare (`serveur/paiement.js` + `commandes.js`, base D1), EmailJS (`src/app/send.js`), GoatCounter (`src/app/count.js`). Déploiement : projet Cloudflare Pages `singulies` ; un workflow GitHub Pages (`.github/workflows/pages.yml`) publie aussi une copie.

---

## 1. Architecture : un code, trois façades (pas trois bases)

**Recommandation : un seul dépôt, un noyau commun, trois entrées.** Trois copies divergeraient dès le premier correctif (les 9 correctifs communs de la décision 0 seraient à faire trois fois, plus la version « simple »).

```
src/core/            ← NOUVEAU, partagé par les trois versions
  version.js         VERSION ('1'|'2'|'3'), table des réglages par version
  prenom.js          filtre + messages (accents, 22 car., refus)  — réutilise src/input et tests/unit/normalize
  adresse.js         complétion BAN (Géoplateforme) + validation code postal 5 chiffres
  paiement.js        MODE_PAIEMENT, ligne sur le paiement, accès Stripe (test/réel)
  commande.js        envoi (EmailJS + POST /commande), états vrais reserve/paye
  attente.js         liste d'attente « me prévenir » (jeu), réutilisable pour la lettre
  stats.js           count() préfixé par version, entonnoir commun
  stockage.js        clés préfixées par version
  textes/            textes communs (ligne paiement, FAQ, bande rassurante, conditions)
src/v1/              ← NOUVEAU front DOM, page par page, sans WebGL
src/alt/ + main.js   ← moteur actuel : sert V2 et V3
  (V3 = flags minimaux ; V2 = V3 + couche explicite chargée seulement si VERSION === '2')
```

- **V3** = l'existant + les correctifs communs + ses petites corrections. C'est la version la moins risquée : on la fait en premier.
- **V2** = V3 + une couche « explicite » (flèche ‹, repères, cartes « pour quand ? », récapitulatif, etc.) activée par `VERSION === '2'`. Pour éviter un fouillis de `if`, chaque différence de comportement vit dans un module chargé dynamiquement (`src/v2/…`), les différences de texte dans une table `src/core/version.js`.
- **V1** = nouvelle application DOM : titre, formulaire, calendrier, récapitulatif, pages À propos / Questions / Contact. Elle n'utilise du moteur que le nuage de prénoms en fond (décoratif, désactivable). **Point de départ possible : `src/epure/`** (une boutique d'une page sans WebGL déjà écrite, avec la vérification du code postal et l'envoi) — on récupère ses morceaux, mais V1 est page-par-page avec étapes et retour, ce que l'épure n'est pas.
- **La version « simple » (sans WebGL)** : elle reste le repli de V2 et V3. Chaque correctif commun touchant le parcours 3D est reporté dedans (règle existante). Coût à budgéter : environ **+30 %** sur chaque correctif du parcours.

Le choix de la version se fait **au build** (`VERSION=1|2|3`, variable lue par Vite) — pas par un paramètre d'URL — pour qu'une page n'embarque que ce dont elle a besoin (poids V1 minimal) et qu'aucune version ne puisse déborder sur l'autre.

## 2. Adresses, isolation, noindex (révisé le 17/10 : un chemin dans l'URL, plus de sous-domaines)

**Les trois versions vivent sous le même domaine, au bout de l'adresse** : `singulies.com/v1/`, `singulies.com/v2/`, `singulies.com/v3/` (on peut préférer `/1/`, `/2/`, `/3/` : seul le nom du dossier change). **Un seul projet Cloudflare Pages** (le projet `singulies` actuel), un seul déploiement, **aucun DNS à créer**.
- **Build** : `npm run build` produit, en plus du site actuel à la racine (inchangé), trois dossiers `dist/v1`, `dist/v2`, `dist/v3`, chacun construit avec sa variable `VERSION` (trois passages de Vite, `outDir` différent). V1 n'embarque donc toujours que ce dont elle a besoin.
- **Le code est déjà prêt pour un sous-dossier** : `vite.config.js` a `base: './'` et les liens passent par `document.baseURI` (le site a déjà été publié ainsi sur `rytrtest1.github.io/singulies/`). À faire en phase 1 : relire les quelques adresses absolues restantes (`public/404.html` utilise `/`, `/favicon-32.png`) et les aperçus de liens.
- `singulies.com` (racine) **continue de servir l'existant**, `unprenomunpoeme.com` reste une redirection.
- Le workflow GitHub Pages (copie sur `rytrtest1.github.io`) : à laisser, il publie tout `dist/`.

**Stockage séparé — le point qui change.** Avec des sous-domaines, `localStorage` / `sessionStorage` étaient isolés d'office ; **sur un même domaine, les trois versions les partagent**. On compense : **toutes les clés sont préfixées par la version** (`v1.singulies.*`, via `src/core/stockage.js`) — le prénom, l'email retenu, la commande en attente, tout. Aucun cookie n'est posé (aujourd'hui aucun), donc rien d'autre à séparer. Un test automatique vérifiera qu'aucune clé n'est écrite sans préfixe.

**noindex, en trois couches** : `<meta name="robots" content="noindex,nofollow">` dans chaque page, en-tête `X-Robots-Tag: noindex, nofollow` sur `/v1/*`, `/v2/*`, `/v3/*` (fichier `_headers` de Pages), et `robots.txt` avec `Disallow: /v1/`, `/v2/`, `/v3/`. Aucun lien d'une version vers une autre ni depuis le site principal, pas dans `sitemap.xml`, pas de `canonical` ni d'`og:url` sur ces pages.

**Worker de paiement / commandes** : **rien à changer pour les origines** — `SITE` contient déjà `https://singulies.com`. La table `commandes` reçoit une colonne **`version`** ; `commandes.html` l'affiche ; l'email envoyé à l'auteur indique aussi la version (paramètre ajouté au modèle EmailJS). Le retour de Stripe doit revenir **dans la bonne version** (`retour` = l'adresse de la version).

**Compromis assumés** (comparé aux sous-domaines) : une version défectueuse part dans le même déploiement que les autres (on ne peut pas en déployer une seule à part, mais chaque dossier est construit séparément et on peut revenir en arrière avec Git) ; les adresses se devinent (inoffensif : noindex, rien d'indexé) ; il faut surveiller le préfixe des clés de stockage (test automatique).

## 3. La variable de paiement et Stripe en mode test

`src/core/paiement.js` expose :
- `MODE_PAIEMENT` = `'paypal'` (aujourd'hui) | `'stripe'` (plus tard, pour tous). Réglé par une variable de build/Cloudflare, **un seul endroit** pour les trois versions.
- `LIGNE_PAIEMENT` = la phrase affichée, dérivée du mode (voir décision 3). Une seule source de vérité : les trois versions l'affichent, personne ne la réécrit.
- `stripeTestVisible()` : vrai seulement si `?test=1` (retenu dans `sessionStorage`) **ou** si le déploiement est marqué test (variable de build). Dans ce cas, le panneau Stripe (clés `pk_test_…` déjà dans `src/alt/config.js`, Worker existant) apparaît **avec un bouton « passer (test) »** qui continue sans payer. Sinon, comportement PayPal (aucun débit).
- Passage au réel = changer `MODE_PAIEMENT` et les clés `pk_live_…` / `sk_live_…` (secret dans Cloudflare) ; rien d'autre à réécrire.

**Apple Pay / Google Pay** — à faire dans le tableau de bord Stripe, **par mode (test, puis réel)** : enregistrer **un seul domaine, `singulies.com`** (Paramètres → Moyens de paiement → Domaines) ; les trois versions en profitent. Selon la méthode, Stripe peut demander de **servir un fichier de validation Apple** sous `/.well-known/` à la **racine** du domaine : à vérifier au moment de l'enregistrement et à ajouter à `public/`. Google Pay n'exige pas de fichier de domaine. Le test réel d'Apple Pay demande un appareil Apple avec une vraie carte (Stripe la traite en test).
**Adresse du wallet** : le formulaire de l'Express Checkout Element ne livre l'adresse complète qu'à la confirmation du paiement ; l'enveloppe se remplit donc **après** le paiement (le code actuel fait déjà ainsi). À confirmer par un essai sur appareil réel pendant la phase 4.

## 4. Mesure : un entonnoir par version

`count()` (GoatCounter) reçoit le préfixe de version : tous les chemins deviennent `v1/…`, `v2/…`, `v3/…`. Un seul tableau de bord, trois jeux de chiffres propres (les anciens chemins ne sont pas touchés).

Entonnoir commun (mêmes noms dans les trois, pour pouvoir comparer) :

`arrivee` → `prenom-commence` → `prenom-valide` → `apercu-vu` → `recevoir` (clic) → `question-tiree` → `reponse-donnee` (ou `passer-theme`, `passer-improvise`) → `adresse-commencee` → `adresse-valide` → `email-donne` → `paiement-ouvert` → `paiement-passe-test` / `paye` → `confirmation-vue`.

À côté : `question-retiree` (nombre de cartes tirées), `offrir-choisi`, `date-demandee`, `erreur/<type>` (caractère refusé, code postal, adresse BAN non trouvée…), `retour-arriere/<étape>`, `attente-jeu`, `aide/<question>` (V2), `source/<insta|tiktok|…>` (existant, via `?v=` — à renommer pour ne pas entrer en conflit avec la variable de version).
**Règle de la décision 0 respectée** : `recevoir` est un clic, `reserve` et `paye` ne partent que sur confirmation réelle (demande envoyée / paiement confirmé par le Worker).

**Mesure de performance (phase 0)** : avant de construire, relever sur le site actuel, sur un profil « téléphone moyen en 4G » (Moto G Power / Chrome, CPU ralenti ×4, réseau Fast 4G ; idéalement un vrai téléphone en débogage USB) : poids transféré, LCP, INP, TBT, temps avant la première frappe possible, images/s pendant l'intro et l'enveloppe, mémoire. Outils : Lighthouse en ligne de commande + un script Playwright (`tools/` a déjà des scripts de mesure) ; le sous-agent `mesures` peut s'en charger. Les chiffres fixent les budgets de V1 (léger) et V2/V3 (pas pires que l'existant).

## 5. Ordre des étapes

| Phase | Contenu | Dépend de | Parallélisable |
|---|---|---|---|
| **0 — Préparer** | Mesurer le site actuel (chargement, fluidité). Vérifier la commande de test HELENE-55jzt2 puis la supprimer. Demander les médias et accords à Maxence. ~~Créer les 3 projets Pages et les DNS~~ (plus nécessaire : une seule adresse, voir §2). | validation du plan | oui : mesure et médias vont ensemble |
| **1 — Socle** | `src/core/`, build `VERSION`, noindex, stockage préfixé, `stats.js`, `paiement.js`, filtre prénom + messages, adresse BAN + code postal, liste d'attente + route Worker `/attente`, colonne `version`, tests Vitest | phase 0 (build/DNS) | **non** : une seule main, tout le monde en dépend |
| **2a — V3** | correctifs communs C1–C8 dans le moteur et dans la version « simple », puis les corrections propres à V3 | phase 1 | oui, avec 2c |
| **2b — V2** | par-dessus V3 : intro courte, flèche ‹, repères, cartes « pour quand ? », récapitulatif, PASSER explicites, etc. | **2a terminée** : V2 et V3 modifient les mêmes fichiers (`main.js`, `offre.js`, `sheet.js`, `mount.js`) | non avec 2a ; oui avec 2c |
| **2c — V1** | nouvelle app DOM `src/v1/` : pages, formulaire, calendrier, récapitulatif, FAQ, bande rassurante | phase 1 | **oui, totalement** : elle ne touche que `src/v1/` |
| **3 — Accessibilité** | AA : contrastes des éléments d'action, cibles 44 px, Tab/focus, libellés, mouvement réduit ; axe-core dans Playwright + passage manuel clavier et lecteur d'écran | 2a, 2b, 2c | en partie (V1 dès qu'elle existe) |
| **4 — Paiement** | panneau Stripe test visible en test, « passer », ligne de paiement, Apple Pay / Google Pay sur le domaine, adresse du wallet | phase 1 + les trois fronts | dans chaque version dès que son parcours est stable |
| **5 — Confiance et contenu** | médias de rue, compteur, Instagram, accords des prénoms, FAQ, pages À propos / Questions / Contact | médias de Maxence | dès réception, indépendamment du code |
| **6 — Recette et mise en ligne** | test de bout en bout par version (`tests/e2e`), mesures de chargement comparées aux budgets, déploiement des trois versions | tout ce qui précède | non |
| **7 — Essai** | décider comment le trafic est réparti (question ouverte n°3), lire les entonnoirs, trancher | phase 6 | — |
| **8 — Facultatif, en tout dernier** | mesure de fluidité sur téléphone réel (protocole dans `docs/mesures/RESULTATS.md`) — Maxence, 17/10 : pas une priorité | tout | — |

**Sessions en parallèle** : V1 (2c) est la seule vraie pièce indépendante — à confier à une session à part, en dossier de travail isolé (worktree). V3 puis V2 s'enchaînent dans une même session (mêmes fichiers). Les médias et l'accord des prénoms (phase 5) avancent côté Maxence pendant tout ce temps.

Estimation de taille relative (pas en jours) : socle **M** · V3 **M** (le plus gros morceau est de reporter chaque correctif dans la version simple) · V2 **L** · V1 **L** · accessibilité **M** · paiement **S–M** · recette **M**.

## 6. Risques à connaître

- **Dette « version simple »** : chaque correctif du parcours 3D est à refaire dans `src/simple/simple.js` (960 l.). C'est déjà la règle du projet ; elle pèse surtout sur la phase 2a.
- **Fichiers énormes** (`main.js` 1277 l., `offre.js` 945 l., `sheet.js` 1097 l.) : V2 greffée sur V3 doit rester une couche chargée à part, sinon le moteur devient illisible.
- **Retour d'historique par étape** (décision 8) dans un parcours 3D à horloge réversible : le plus délicat techniquement ; prévoir un essai dès la phase 2a (V3, la plus simple).
- **Cloudflare / wrangler** : le `wrangler.toml` de la racine décrit le Worker de paiement ; vérifier qu'il ne gêne pas le build Pages (il n'a pas posé de problème jusqu'ici).
- **Un seul déploiement** : un build qui échoue pour une version bloque aussi la publication du site principal ; la commande de build doit donc isoler les erreurs de `v1/v2/v3` (et la CI les teste avant de fusionner).
- **Charge de test** : le service d'adresse limite à 50 req/s par IP ; on fait une pause de ~300 ms entre deux frappes avant d'appeler.
- **Statistiques** : l'essai n'a de sens que si le trafic est réparti à peu près également entre les versions ; sinon, des ordres de grandeur seulement.

## 7. Ce que je propose comme première décision

Valider l'**architecture** du §1 (un noyau commun, V3 puis V2 sur le moteur, V1 en front DOM neuf) — c'est la décision dont tout le reste dépend. Ensuite, dans l'ordre : phase 0 (mesure + DNS + médias), puis le socle.
