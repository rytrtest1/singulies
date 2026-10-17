# Phase 0 — mise en place (17/10/2026)

Trois chantiers : (A) les trois projets Cloudflare Pages et leurs sous-domaines, (B) ce que je te demande (médias, accords, nettoyage), (C) la mesure du site actuel (résultats : `docs/mesures/RESULTATS.md`).

## A. Trois projets Cloudflare Pages + DNS (à faire dans ton tableau de bord, ≈ 10 min)

État vérifié le 17/10 : `1.`, `2.` et `3.singulies.com` **n'existent pas encore** dans le DNS ; `singulies.com` est bien servi par Cloudflare (la zone y est). Je n'ai pas accès à ton compte Cloudflare : ces étapes sont les tiennes.

Pour **chaque** version n (1, 2, 3) : Cloudflare → **Workers & Pages → Créer → Pages → Se connecter à Git** → le dépôt `rytrtest1/singulies`.

| Réglage | Valeur |
|---|---|
| Nom du projet | `singulies-v1` (puis `-v2`, `-v3`) |
| Branche de production | `main` |
| Dossier racine | *(vide)* |
| Commande de build | *(la commande provisoire ci-dessous — on la remplacera en phase 1)* |
| Dossier de sortie | `dist` |
| Variable d'environnement | `VERSION` = `1` (puis `2`, `3`) |

**Commande de build provisoire** (une page « en construction », qui ne publie PAS le site actuel et n'est pas indexable) :

```
mkdir -p dist && printf '<!doctype html><meta charset=utf-8><meta name=robots content="noindex,nofollow"><meta name=viewport content="width=device-width"><title>en construction</title><body style="background:#060606;color:#aaa;font:16px sans-serif;display:grid;place-items:center;height:100vh;margin:0">en construction' > dist/index.html && printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > dist/_headers && printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
```

Puis, dans chaque projet : **Domaines personnalisés → Configurer** → `1.singulies.com` (puis `2.`, `3.`). Comme la zone est chez Cloudflare, l'enregistrement CNAME se crée tout seul.
Vérification : `https://1.singulies.com` affiche « en construction » ; `https://1.singulies.com/robots.txt` répond `Disallow: /`.

Pourquoi cette commande provisoire : un projet Pages relié à Git qui construit `main` publierait **le site actuel** sous `1.`, `2.` et `3.` (contenu en double, indexable). En phase 1, je remplace seulement la commande de build par `VERSION=$VERSION npm run build` — rien à recréer.

À ne pas toucher : le projet `singulies` actuel (domaine principal) et le Worker de paiement.
Plus tard (phase 4) : ajouter les trois sous-domaines à la variable `SITE` du Worker et les enregistrer dans Stripe (Apple Pay / Google Pay).

## B. Ce que je te demande

### B1. Nettoyage de l'audit
1. Ouvre `commandes.html` (ou ta boîte mail) : la commande de test **HELENE-55jzt2** (nom TEST AUDIT, code postal ABC, test-audit@example.com) est-elle arrivée **avec le thème** que l'audit avait écrit avant de cliquer sur PASSER ? Réponds-moi oui/non — c'est ce qui confirme le bug « PASSER efface le thème ».
2. Puis **supprime cette commande**.
3. Les statistiques GoatCounter de la période de l'audit sont mélangées aux vraies ; les nouvelles versions écriront sous `v1/…`, `v2/…`, `v3/…` : elles démarrent propres.

### B2. Médias et preuves (décision 9)
- [ ] **2 à 4 extraits de rue verticaux** (10 à 30 s), en **MP4**, **moins de 8 Mo chacun**, **lisibles sans le son**, avec le **droit à l'image respecté** (accord des personnes filmées).
- [ ] **Les liens des posts Instagram** concernés.
- [ ] **Le compteur** : le chiffre exact, **sa date**, et **ce qu'il compte** (poèmes envoyés ? prénoms ? depuis quand ?).
- [ ] **Les accords** de Julie, Isabelle, Anaïs et Marysol pour que leur prénom et leur poème soient montrés en exemple (un message écrit suffit).
- [ ] *(option)* **Une photo** de toi ou de tes mains (à la machine, de préférence).
- [ ] *(rappel)* la vidéo de la machine sur **feuille noire**, sans ruban, éclairage rasant, caméra fixe, plan des mains plus long (déjà notée dans `CLAUDE.md`).

### B3. Deux points à vérifier de ton côté
- **GoatCounter** : le plan gratuit est destiné à un usage non commercial ; le site vend maintenant. À vérifier dans leurs conditions (sinon : plan payant, ou autre outil sans cookie).
- **Accessibilité** : l'obligation européenne exempte probablement les micro-entreprises de services ; à vérifier (on vise AA de toute façon).

## C. Mesure du site actuel
Outil : `tools/mesure-chargement.mjs` (profil Moto G Power, CPU ×4, Fast 4G, première visite, Edge). Résultats et objectifs chiffrés proposés : `docs/mesures/RESULTATS.md`.
