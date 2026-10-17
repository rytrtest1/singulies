# Phase 0 — mise en place (17/10/2026)

Trois chantiers : (A) les adresses des trois versions (simplifié : rien à créer), (B) ce que je te demande (médias, accords, nettoyage), (C) la mesure du site actuel (résultats : `docs/mesures/RESULTATS.md`).

## A. Adresses des trois versions — rien à créer (révisé le 17/10)

Décision du 17/10 : plutôt que trois sous-domaines (trois projets Cloudflare Pages + DNS), les versions vivent au bout de l'adresse : **`singulies.com/v1/`, `/v2/`, `/v3/`**, dans le projet Pages actuel. **Tu n'as donc rien à faire dans Cloudflare pour la phase 0** ; le dossier de construction (`dist/v1`, `dist/v2`, `dist/v3`), le `noindex` et les clés de stockage préfixées font partie de la phase 1 (voir `docs/plan-construction-3-versions.md`, §2).
Côté Stripe (plus tard, phase 4) : un seul domaine à enregistrer pour Apple Pay / Google Pay, `singulies.com`.

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
