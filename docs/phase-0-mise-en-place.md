# Phase 0 — mise en place (17/10/2026)

Trois chantiers : (A) les adresses des trois versions (simplifié : rien à créer), (B) ce que je te demande (médias, accords, nettoyage), (C) la mesure du site actuel (résultats : `docs/mesures/RESULTATS.md`).

## A. Adresses des trois versions — rien à créer (révisé le 17/10)

Décision du 17/10 : plutôt que trois sous-domaines (trois projets Cloudflare Pages + DNS), les versions vivent au bout de l'adresse : **`singulies.com/v1/`, `/v2/`, `/v3/`**, dans le projet Pages actuel. **Tu n'as donc rien à faire dans Cloudflare pour la phase 0** ; le dossier de construction (`dist/v1`, `dist/v2`, `dist/v3`), le `noindex` et les clés de stockage préfixées font partie de la phase 1 (voir `docs/plan-construction-3-versions.md`, §2).
Côté Stripe (plus tard, phase 4) : un seul domaine à enregistrer pour Apple Pay / Google Pay, `singulies.com`.

## B. Ce que je te demande (état au 17/10)

### B1. Nettoyage de l'audit — vérification faite
- La commande de test HELENE-55jzt2 est arrivée **sans le thème** : l'email dit « improvisation (sur le prénom) ». **Bug confirmé** (correctif C6).
- L'email de confirmation à `test-audit@example.com` est revenu en erreur : normal, `example.com` ne reçoit pas de courrier.
- **Nouveau constat (C9)** : l'email de confirmation arrive avec l'objet **« Order Confirmed #! »** (anglais, variable vide). L'objet se règle dans **EmailJS** (modèle `template_lryyumd`), pas dans le dépôt : à corriger par toi (par exemple « ton poème : {{ref}} »), je ne peux pas le faire.
- Reste à **supprimer la commande** dans `commandes.html` si la base D1 est reliée (sinon, il n'y a que des emails).
- Les statistiques GoatCounter de l'audit restent mélangées aux vraies ; les nouvelles versions écriront sous `v1/…`, `v2/…`, `v3/…` et démarrent propres.

### B2. Médias et preuves (décision 9)
- [x] **Accords** de Julie, Isabelle, Anaïs et Marysol : confirmés par Maxence.
- [x] **Cinq vidéos TikTok** et **trois photos** reçues (sélection proposée : `docs/cahier-des-charges-3-versions.md`, §5).
- [ ] **Les MP4 d'origine** des 2 à 4 vidéos retenues (sans filigrane, 10 à 30 s, moins de 8 Mo chacun, lisibles sans le son, droit à l'image respecté).
- [ ] **Le compteur** : le chiffre exact, **sa date**, et **ce qu'il compte**.
- [ ] *(si on les cite)* les liens des posts Instagram.
- [ ] *(rappel)* la vidéo de la machine sur **feuille noire**, sans ruban, éclairage rasant, caméra fixe, plan des mains plus long (déjà notée dans `CLAUDE.md`).

### B3. Reporté
- **Mesure de fluidité sur téléphone réel** : **tout à la fin, facultative** (Maxence, 17/10 : la fluidité n'est pas une préoccupation). Le protocole reste dans `docs/mesures/RESULTATS.md`.
- **GoatCounter, licence** : le site ne vend pas encore ; à revoir au passage au paiement réel.
- **Accessibilité, exemption micro-entreprise** : plus tard.

## C. Mesure du site actuel
Outil : `tools/mesure-chargement.mjs` (profil Moto G Power, CPU ×4, Fast 4G, première visite, Edge). Résultats et objectifs chiffrés proposés : `docs/mesures/RESULTATS.md`.
