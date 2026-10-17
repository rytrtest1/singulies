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

## 2. Sous-domaines, isolation, noindex

**Hébergement : trois projets Cloudflare Pages reliés au même dépôt**, chacun avec sa variable `VERSION` et sa commande `VERSION=n npm run build`, et un domaine personnalisé : `1.singulies.com`, `2.singulies.com`, `3.singulies.com`.
- Pourquoi trois projets plutôt qu'un seul : déploiement et retour arrière indépendants, aperçus séparés, aucun routage par nom d'hôte à maintenir. Un seul projet avec routage serait plus fragile pour un gain nul.
- DNS : un enregistrement CNAME par sous-domaine (rien à acheter). Un nom commençant par un chiffre est valide.
- `singulies.com` (domaine principal) **continue de servir l'existant** pendant tout l'essai ; `unprenomunpoeme.com` reste une redirection.
- À confirmer côté Cloudflare (non visible depuis le dépôt) : la configuration exacte du projet `singulies` actuel, et que le `wrangler.toml` de la racine (qui décrit le Worker de paiement) ne gêne pas les nouveaux projets Pages — sinon, le déplacer.
- Le workflow GitHub Pages (copie sur `rytrtest1.github.io`) : le laisser tel quel (il publie la version actuelle) ou l'arrêter ; décision à prendre, sans urgence.

**Stockage séparé** : `localStorage` / `sessionStorage` sont déjà isolés par nom d'hôte, donc `1.` et `2.` ne partagent rien. Par prudence, on préfixe aussi les clés (`v1.singulies.*`) et **on ne pose aucun cookie sur `.singulies.com`** (un cookie de domaine serait partagé). Aujourd'hui le site n'en pose aucun.

**noindex, en trois couches** : `<meta name="robots" content="noindex,nofollow">` dans chaque page, en-tête `X-Robots-Tag: noindex, nofollow` (fichier `_headers` de Pages), et `robots.txt` avec `Disallow: /`. Pas de `sitemap.xml`, pas de `canonical` ni d'`og:url` vers les sous-domaines, et **aucun lien d'une version vers une autre**. Pas d'aperçu de lien (`og:image`) utile : les liens sont partagés à la main.

**Worker de paiement / commandes** : la variable `SITE` (origines autorisées, CORS et `retour`) doit lister les trois sous-domaines (et les `*.pages.dev` d'aperçu, le cas échéant). La table `commandes` reçoit une colonne **`version`** ; `commandes.html` l'affiche ; l'email envoyé à l'auteur indique aussi la version (paramètre ajouté au modèle EmailJS).

## 3. La variable de paiement et Stripe en mode test

`src/core/paiement.js` expose :
- `MODE_PAIEMENT` = `'paypal'` (aujourd'hui) | `'stripe'` (plus tard, pour tous). Réglé par une variable de build/Cloudflare, **un seul endroit** pour les trois versions.
- `LIGNE_PAIEMENT` = la phrase affichée, dérivée du mode (voir décision 3). Une seule source de vérité : les trois versions l'affichent, personne ne la réécrit.
- `stripeTestVisible()` : vrai seulement si `?test=1` (retenu dans `sessionStorage`) **ou** si le déploiement est marqué test (variable de build). Dans ce cas, le panneau Stripe (clés `pk_test_…` déjà dans `src/alt/config.js`, Worker existant) apparaît **avec un bouton « passer (test) »** qui continue sans payer. Sinon, comportement PayPal (aucun débit).
- Passage au réel = changer `MODE_PAIEMENT` et les clés `pk_live_…` / `sk_live_…` (secret dans Cloudflare) ; rien d'autre à réécrire.

**Apple Pay / Google Pay** — à faire dans le tableau de bord Stripe, **par domaine et par mode (test, puis réel)** : enregistrer `1.singulies.com`, `2.singulies.com`, `3.singulies.com` et `singulies.com` (Paramètres → Moyens de paiement → Domaines). Selon la méthode, Stripe peut demander de **servir un fichier de validation Apple** sous `/.well-known/` sur chaque domaine : à vérifier au moment de l'enregistrement et à ajouter à `public/` (commun aux trois builds). Google Pay n'exige pas de fichier de domaine. Le test réel d'Apple Pay demande un appareil Apple avec une vraie carte (Stripe la traite en test).
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
| **0 — Préparer** | Mesurer le site actuel (chargement, fluidité). Vérifier la commande de test HELENE-55jzt2 puis la supprimer. Demander les médias et accords à Maxence. Créer les 3 projets Pages et les DNS avec une page provisoire noindex. | validation du plan | oui : mesure, médias et DNS vont ensemble |
| **1 — Socle** | `src/core/`, build `VERSION`, noindex, stockage préfixé, `stats.js`, `paiement.js`, filtre prénom + messages, adresse BAN + code postal, liste d'attente + route Worker `/attente`, colonne `version`, tests Vitest | phase 0 (build/DNS) | **non** : une seule main, tout le monde en dépend |
| **2a — V3** | correctifs communs C1–C8 dans le moteur et dans la version « simple », puis les corrections propres à V3 | phase 1 | oui, avec 2c |
| **2b — V2** | par-dessus V3 : intro courte, flèche ‹, repères, cartes « pour quand ? », récapitulatif, PASSER explicites, etc. | **2a terminée** : V2 et V3 modifient les mêmes fichiers (`main.js`, `offre.js`, `sheet.js`, `mount.js`) | non avec 2a ; oui avec 2c |
| **2c — V1** | nouvelle app DOM `src/v1/` : pages, formulaire, calendrier, récapitulatif, FAQ, bande rassurante | phase 1 | **oui, totalement** : elle ne touche que `src/v1/` |
| **3 — Accessibilité** | AA : contrastes des éléments d'action, cibles 44 px, Tab/focus, libellés, mouvement réduit ; axe-core dans Playwright + passage manuel clavier et lecteur d'écran | 2a, 2b, 2c | en partie (V1 dès qu'elle existe) |
| **4 — Paiement** | panneau Stripe test visible en test, « passer », ligne de paiement, Apple Pay / Google Pay sur les 4 domaines, adresse du wallet | phase 1 + les trois fronts | dans chaque version dès que son parcours est stable |
| **5 — Confiance et contenu** | médias de rue, compteur, Instagram, accords des prénoms, FAQ, pages À propos / Questions / Contact | médias de Maxence | dès réception, indépendamment du code |
| **6 — Recette et mise en ligne** | test de bout en bout par version (`tests/e2e`), essai téléphone réel, mesures comparées aux budgets, déploiement des trois sous-domaines | tout ce qui précède | non |
| **7 — Essai** | décider comment le trafic est réparti (question ouverte n°3), lire les entonnoirs, trancher | phase 6 | — |

**Sessions en parallèle** : V1 (2c) est la seule vraie pièce indépendante — à confier à une session à part, en dossier de travail isolé (worktree). V3 puis V2 s'enchaînent dans une même session (mêmes fichiers). Les médias et l'accord des prénoms (phase 5) avancent côté Maxence pendant tout ce temps.

Estimation de taille relative (pas en jours) : socle **M** · V3 **M** (le plus gros morceau est de reporter chaque correctif dans la version simple) · V2 **L** · V1 **L** · accessibilité **M** · paiement **S–M** · recette **M**.

## 6. Risques à connaître

- **Dette « version simple »** : chaque correctif du parcours 3D est à refaire dans `src/simple/simple.js` (960 l.). C'est déjà la règle du projet ; elle pèse surtout sur la phase 2a.
- **Fichiers énormes** (`main.js` 1277 l., `offre.js` 945 l., `sheet.js` 1097 l.) : V2 greffée sur V3 doit rester une couche chargée à part, sinon le moteur devient illisible.
- **Retour d'historique par étape** (décision 8) dans un parcours 3D à horloge réversible : le plus délicat techniquement ; prévoir un essai dès la phase 2a (V3, la plus simple).
- **Cloudflare / wrangler** : voir §2 ; à confirmer avant de créer les projets.
- **Charge de test** : le service d'adresse limite à 50 req/s par IP ; on fait une pause de ~300 ms entre deux frappes avant d'appeler.
- **Statistiques** : l'essai n'a de sens que si le trafic est réparti à peu près également entre les versions ; sinon, des ordres de grandeur seulement.

## 7. Ce que je propose comme première décision

Valider l'**architecture** du §1 (un noyau commun, V3 puis V2 sur le moteur, V1 en front DOM neuf) — c'est la décision dont tout le reste dépend. Ensuite, dans l'ordre : phase 0 (mesure + DNS + médias), puis le socle.
