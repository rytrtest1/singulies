# Paiement dans la page — mise en route (≈ 20 min)

Le site reste sur GitHub Pages. Seule cette petite fonction (`paiement.js`) tourne ailleurs, chez Cloudflare (gratuit) :
elle garde ta **clé secrète** Stripe et crée le paiement. La clé secrète ne va **jamais** dans le site ni dans ce dépôt.

## 1. Stripe (mode test d'abord)
1. Crée ton compte sur stripe.com et reste en **mode test** (interrupteur en haut du tableau de bord).
2. **Développeurs → Clés API** : note la **clé publiable** `pk_test_…` (publique, sans danger) et garde la **clé secrète**
   `sk_test_…` pour l'étape 2 — tu la colleras toi-même, ne l'envoie à personne (ni à Claude).
3. **Paramètres → Moyens de paiement** : active cartes, Apple Pay, Google Pay et, si proposé, PayPal.
4. **Paramètres → Moyens de paiement → Domaines** : ajoute `rytrtest1.github.io` (nécessaire pour Apple Pay dans la page).
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
`SITE` = `https://rytrtest1.github.io`, `PRIX_CENTIMES` = `3000`.

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
