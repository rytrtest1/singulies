# Paiement dans la page — mise en route (≈ 20 min)

Le site reste sur GitHub Pages. Seule cette petite fonction (`paiement.js`) tourne ailleurs, chez Cloudflare (gratuit) :
elle garde ta **clé secrète** Stripe et crée le paiement. La clé secrète ne va **jamais** dans le site ni dans ce dépôt.

## 1. Stripe (mode test d'abord)
1. Crée ton compte sur stripe.com et reste en **mode test** (interrupteur en haut du tableau de bord).
2. **Développeurs → Clés API** : note la **clé publiable** `pk_test_…` (publique, sans danger) et garde la **clé secrète**
   `sk_test_…` pour l'étape 2 — tu la colleras toi-même, ne l'envoie à personne (ni à Claude).
3. **Paramètres → Moyens de paiement** : active cartes, Apple Pay, Google Pay et, si proposé, PayPal.
4. **Paramètres → Moyens de paiement → Domaines** : ajoute `singulies.com` et `www.singulies.com` (nécessaire pour Apple Pay dans la page).
5. Rien à régler côté apparence : le panneau de paiement est dessiné par le site (noir, Garamond, machine) ; les champs
   de Stripe (adresse, carte, Apple Pay / Google Pay) y sont habillés aux mêmes couleurs et polices.

## 2. Cloudflare Workers
**Si tu as relié le dépôt GitHub** (Workers → Importer un dépôt) : Cloudflare ne doit construire que le dossier `serveur`
(sinon il essaie de déployer tout le site Vite et échoue). Dans ton Worker → **Paramètres → Build** :
- **Dossier racine** (Root directory) : `serveur`
- **Commande de build** : vide
- **Commande de déploiement** : `npx wrangler deploy`

Puis **Paramètres → Variables et secrets → Ajouter** : `STRIPE_SECRET_KEY`, type **Secret**, ta clé `sk_test_…`
(`SITE` et `PRIX_CENTIMES` sont déjà dans `serveur/wrangler.toml`). Relance le déploiement (Déploiements → Réessayer).
Ensuite, chaque publication sur GitHub redéploie la fonction toute seule.

**Sinon, sans GitHub** : Workers & Pages → Créer → **Commencer avec « Hello World »**, nomme-le, déploie ; **Modifier le
code** : remplace tout par `serveur/paiement.js`, Déployer ; puis Variables et secrets : `STRIPE_SECRET_KEY` (Secret),
`SITE` = `https://singulies.com,https://www.singulies.com`, `PRIX_CENTIMES` = `3900`.

Dans les deux cas, note l'adresse du Worker, du genre `https://singulies.toncompte.workers.dev`.

## 3. Le site
Dans `src/alt/config.js`, remplis (ou donne-les moi — ces deux-là sont publics) :
```js
export const STRIPE_PK = 'pk_test_…';
export const PAIEMENT_URL = 'https://singulies-paiement.toncompte.workers.dev';
```
Puis publication. COMMANDER ouvre le panneau avec les vrais champs Stripe (test) : carte d'essai `4242 4242 4242 4242`,
date future, n'importe quel code.

## 4. Passer en vrai
Mêmes étapes avec les clés **live** (`pk_live_…` dans le site, `sk_live_…` dans Cloudflare), une fois le compte Stripe
vérifié (SIRET / statut artiste-auteur, banque). Stripe Tax n'est pas activé : à décider avec un comptable.

## Où voir les commandes
Stripe → **Paiements** : chaque paiement porte le prénom (`prenom`) et la référence (`ref`, aussi dans
`client_reference_id`), l'adresse de livraison et l'email. La demande (question, réponse) t'arrive par email comme avant,
avec la même référence.

---

# Suivi des commandes — mise en route (≈ 15 min, une seule fois)

Chaque demande faite sur le site est maintenant **aussi** gardée dans une petite base chez Cloudflare (D1, gratuite),
en plus de l'email qui t'arrive comme avant. La page **singulies.com/commandes.html** les liste (les plus récentes
d'abord), avec leur statut : **reçue → paiement envoyé → payée → tapée → postée**. Tant que la base n'est pas reliée,
le site marche exactement comme avant (seul l'email part).

## 1. Créer la base
Cloudflare → **Stockage et bases de données → D1** → **Créer une base de données** → nom : `singulies-commandes` → Créer.
Sur sa page, copie l'**identifiant** (Database ID, du genre `1a2b3c4d-…`). Il n'est pas secret.

## 2. La relier au Worker
Dans `serveur/wrangler.toml` **et** dans `wrangler.toml` (à la racine), tout en bas : enlève les `#` des quatre lignes
`[[d1_databases]]`, `binding`, `database_name`, `database_id`, et colle l'identifiant à la place de
`colle-ici-l-identifiant`. (Ou donne l'identifiant à Claude, il le fait.) La table se crée toute seule au premier appel.

Si tu veux les liens PayPal tout prêts : mets ton lien PayPal.me dans `PAYPAL = "https://paypal.me/tonnom"` (même
fichier). La page en fait `https://paypal.me/tonnom/39EUR`.

## 3. Le mot de passe de la page
Cloudflare → ton Worker **singulies** → **Paramètres → Variables et secrets → Ajouter** :
nom `ADMIN_TOKEN`, type **Secret**, valeur : un long mot de passe que toi seul connais (au moins 12 caractères ; par
exemple quatre mots au hasard). Il ne va **jamais** dans le dépôt ni dans un message.

## 4. Déployer
Publie sur GitHub (le Worker se redéploie seul), ou Déploiements → Réessayer. Puis ouvre
**singulies.com/commandes.html**, tape le mot de passe : il reste gardé dans ce navigateur (bouton « sortir » pour l'oublier).

## Ce que fait la page
- **filtre** par statut ; « essais » montre aussi les demandes de test (site local, paiement simulé).
- **statut** : un toucher le change. Passer à **postée** propose d'envoyer « ton poème est posté » à la personne.
- **note** : gardée dès que tu quittes le champ. **facture** : un numéro, pour plus tard (pas de facture sans SIRET).
- **copier l'adresse** : prête à écrire sur l'enveloppe (code postal et ville en capitales).
- **copier le lien paypal** (si `PAYPAL` est rempli) ; **copier un lien stripe** (si la clé Stripe est dans Cloudflare) :
  un paiement Stripe de 39 € au nom de la commande, valable 24 h.
- **voir la feuille** : la demande rendue par le site (feuille, carte, enveloppe).

## L'email « ton poème est posté »
Sans rien faire : passer une commande à « postée » ouvre ta messagerie avec l'email déjà écrit (à envoyer toi-même).
Pour qu'il parte tout seul, dans le style des autres emails : EmailJS → **Email Templates → Create New Template**, mode
code, colle tout `ressources/email-poste.html`, puis : To Email `{{to_email}}`, From Name `ETERNEL`, Reply To ton adresse,
Sujet `{{prenom}} — ton poème est posté`. Enregistre, et donne son identifiant (`template_…`) à Claude : il va dans
`EMAILJS.poste` (src/app/send.js).

## Essayer sur l'ordinateur (pour Claude)
`npx wrangler@3 dev --local --port 8787` avec une configuration qui ajoute la base `DB`, `ADMIN_TOKEN` et
`SITE = "http://localhost:5199"` ; le site avec `?envoi=local` (aucun email, la commande seule vers ce Worker local) ;
la page `commandes.html?api=local`. Sous Windows, `--persist-to` doit être un chemin court (sinon SQLite refuse d'ouvrir).
