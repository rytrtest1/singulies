# T1 — notes condensées (Céleste, Jade, Théo, Victor, Nina)

## Céleste (poète)
1. **La question d'abord** — une carte tirée avant même de savoir ce qu'on vend ; réponse → pour qui → prénom/acrostiche → « ta réponse sera le thème » → prix → Stripe. S. (Risque : questions trop intimes en ouverture → en choisir de douces.)
2. **Le poème secret** (aud.) — tu offres, c'est l'autre qui répond via un lien WhatsApp (« quelqu'un veut savoir… »), donne son adresse ; l'acheteur ne lit jamais la réponse. M. **Coup de cœur.**
3. **La fournée** — feuille tapée avec les prénoms du mois (initiales), lignes libres ; tu prends la tienne ; elle passe « réservé ». M.
4. **Le mur de la rue** — fil vertical de vraies feuilles données dans la rue (photos), « et le tien ? ». S site / L contenu.
5. **L'heure de la machine** (aud.) — séance en direct réservée (12 places, dimanche 20 h), replay, feuille par la poste. L.
6. **Le jeu d'abord** — question du jour gratuite, partager, « veux-tu que j'en fasse un poème ? ». S.

## Jade (public)
1. **Écris un prénom** — ouverture = champ, acrostiche + vers floutés, barre fixe « je l'écris pour toi · 64 € ». S.
2. **La question du jour** (aud.) — même question pour tous, façon BeReal ; voir 3 réponses anonymes ; « 1 284 ont répondu ». M/L.
3. **Quelqu'un pense à toi** (aud.) — j'offre une question choisie parmi 3 ; lien WhatsApp « quelqu'un t'a posé une question… » ; il répond + adresse. L. **Coup de cœur** (ouvrir avec le n°1, glisser la vraie vidéo).
4. **Story d'Eternel** — 4 écrans façon story : vidéo, photo d'un vrai poème, prénom/acrostiche, prix → paiement. M.
5. **La fournée** — drop numéroté, grille de carrés (initiales). S.
6. **Tire une carte** — paquet, tirage, partage en story 9:16 ; « je peux écrire un poème sur ta réponse » ; jeu en vente. M.

## Théo (ingénieur)
1. **La page prénom** — la version retenue en une page HTML < 100 Ko, Payment Link. S.
2. **Le cadeau à ouvrir** (aud.) — l'acheteur paie en 30 s ; le destinataire vit le site immersif (champ, paquet, question, adresse). M (lien signé + webhook → petit serveur, Cloudflare Worker). **Coup de cœur.**
3. **La fournée** (aud.) — 30 places le 1er du mois annoncées en vidéo ; complet → email / suivre. S (stock Payment Link).
4. **La question du jour** — entrée par une question gratuite, partage `q/<id>`, puis le poème. S.
5. **Le mur des poèmes** (aud.) — défilement TikTok de poèmes réels, « le mien ». M + temps de Maxence.
6. **Le message** — fil de messages pré-écrits par Eternel (« salut. c'est quoi ton prénom ? »). S. Risque : chatbot = soupçon d'IA.
Notes : Payment Link (marche dans les webviews), pas de WebGL sur le chemin du paiement, localStorage peu fiable, UTM par vidéo.

## Victor (luxe)
1. **La fournée du mois** — « fournée n°7 · 100 · 41 restent », vidéo 6 s, prénom/acrostiche ; numéro tapé au dos de l'enveloppe (collection). S.
2. **Le cadeau à date** — « à qui j'écris ? », ton mot, date de réception, son adresse. M.
3. **La cérémonie après paiement** (aud.) — page limpide qui vend ; APRÈS paiement, le site 3D devient le déballage/rituel (champ, question, feuille, enveloppe, adresse). Bande-annonce de 5 s sur la page. M. **Coup de cœur** (avec la fournée en vitrine).
4. **La question d'abord** (aud.) — le jeu en appât gratuit, le poème est la réponse payante. S.
5. **Le poème filmé** (aud.) — chaque poème livré avec la vidéo de sa frappe (QR gaufré dans l'enveloppe). M.
6. **Le registre des enveloppes** — registre vivant des poèmes partis (n° 214 · C. · Lyon · parti hier), photos réelles. M.

## Nina (croissance)
1. **La suite de la vidéo** — une page par vidéo : « elle, c'était léa. et toi ? » ; mesure par vidéo (/v/12). S.
2. **Regarde-le s'écrire** (aud.) — option poème + vidéo de sa frappe (79 € vs 59 €), filigrane @e.t.ernel, repartage. M. **Coup de cœur** (greffé sur le n°1).
3. **Le poème mystère** (aud.) — offrir sans qu'il le sache ; QR dans l'enveloppe → « quelqu'un t'a fait écrire ceci » → expérience 3D de réception → « à qui l'offrirais-tu ? ». M.
4. **Une question par jour** — fil vertical de questions (glisser), répondre, envoyer ; ou acheter le jeu. S.
5. **La fournée** (aud.) — 100/mois, ouverture en live, compteur + date de fermeture ; « tu seras le 63e » ; liste d'attente. S.
6. **Poème en direct sur rendez-vous** — créneau, live privé, 149 €, haut de gamme. M.

## Anne (psy de l'intime)
1. **La feuille qui attend** — prénom → colonne + lignes vides « ces lignes, je les tape pour toi. 64 € » → question facultative → Stripe → « je t'écris avant le [date] ». S.
2. **L'invitation scellée** (aud.) — tu offres ; la personne répond en privé (« personne d'autre ne lira ta réponse, pas même [prénom] ») ; repli : thème de l'acheteur ou impro au bout de 10 j. M. **Coup de cœur.**
3. **La question d'abord** — « réponds pour toi, rien n'est envoyé » ; puis « veux-tu que j'en fasse ton poème ? » ; réponse transmise OU gardée pour soi. S/M.
4. **Le champ des vrais prénoms** (aud.) — le champ infini = vrais poèmes envoyés ; « 4 LEA ont déjà le leur » ; ton prénom y entre le jour de l'envoi. M (WebGL, consentement).
5. **Le jeu à deux** — passe le téléphone, 3 questions à voix haute, « offre-lui le poème de sa réponse ». M.
6. **Le témoin** — 20 s filmées des mains qui tapent ta première lettre, envoyées par email le jour J. M (charge L).
Frein n°1 selon Anne : la pudeur (répondre à une question d'amour devant un écran).

## Malik (game designer)
1. **Tire d'abord** — le paquet de dos, « touche le paquet » → question (3 tirages max) → réponse → prénom/acrostiche → photo d'une vraie feuille, 64 €, places → pour moi/offrir → Stripe. S.
2. **Pose-la-lui** (aud.) — « à qui veux-tu poser une question ? » ; tu tires sa question (choix parmi 3) ; tu paies ; lien « quelqu'un veut que je t'écrive. réponds-moi. » ; > 7 j sans réponse → poème sur le prénom seul. M. **Coup de cœur.**
3. **La fournée** — grille de 100 enveloppes, cachetées avec initiale ou vides ; tu touches la tienne ; elle se cachette dans la grille. M.
4. **Le fil de la machine** (aud.) — fil vertical de frappes filmées ; la 4e est vide avec un curseur « et toi ? ». M.
5. **Une carte par jour** (aud.) — Wordle intime « jour 12/73 », réponses gardées, « tes réponses font déjà un thème ». M.
6. **Le jeu sur la table** — téléphone à plat, carte lisible dans les deux sens, à deux ; offrir le poème de cette question. S.
