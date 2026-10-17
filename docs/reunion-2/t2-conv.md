# Tour 2 — Karim (conversion mobile, `conv`)

- **Q1 : b.** Je change d'avis, convaincu par Lucas. Un canvas 2D d'environ 40 prénoms, dessiné après la feuille et mis en pause hors de l'écran, ne retarde ni le prix ni RECEVOIR. Il garde la signature d'Eternel pour un coût quasi nul.
- **Q2 : b.** Je change d'avis, toujours à cause de Lucas. La cire en direct suppose du WebGL, ce qui contredit l'acquis 5. Une vidéo de 1,5 s de moins de 80 Ko montre le même geste et ne plante sur aucun téléphone.
- **Q3 : a.** Un toucher de 0,6 s, c'est le geste de la vidéo. Pour Martine, ajouter « touche la carte » dessus, et la retourner seule au bout de 2 s si personne ne touche.
- **Q4 : a.** Un toucher de plus coûte environ 5 %. Laisser la personne qui offre ne pas savoir quoi écrire ni à quoi répondre coûte bien davantage, et ce choix adapte la question.
- **Q5 : b.** Je change d'avis, convaincue par Inès : on donne la même réponse à « qu'est-ce que je reçois », en trois lignes tapées au lieu de deux écrans d'images à faire défiler.
- **Q6 : a.** La preuve doit être vue par ceux qui hésitent dans le premier écran, pas seulement par ceux qui descendent. Prévoir une image fixe si la lecture automatique est bloquée, ce qui arrive en mode économie d'énergie sur iPhone.
- **Q7 : b.** Le mot « facultatif », clair et rassurant, fait passer un écran sans hésiter. Jade et Martine me l'ont confirmé.

## Objection (acquis 1 et 2)
Le premier écran tient à 0 s, mais il casse dès que le clavier s'ouvre. Sur 844 px, il en reste environ 400 de visible dans le navigateur intégré, et RECEVOIR et le prix passent sous le clavier pendant la frappe. Dès la deuxième lettre, il faut garder RECEVOIR fixé au-dessus du clavier (`visualViewport`), sinon on perd ceux qui ne pensent pas à fermer le clavier.
