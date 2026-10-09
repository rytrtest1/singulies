// Version alternative (10/10) : le prénom avant de payer, la question après. À remplir par Maxence.

export const PRIX = '64 €';                 // port compris
export const ENVOI = '24 octobre';          // date de la prochaine fournée (« posté le … »)

// Lien de paiement Stripe (Payment Link). Vide = paiement simulé (on va directement à merci.html).
// Dans Stripe, « Après le paiement » → « Rediriger vers votre site » :
//   https://rytrtest1.github.io/singulies/merci.html?session={CHECKOUT_SESSION_ID}
// et cocher « collecter l'adresse de livraison » (France) + l'email. Le prénom part dans client_reference_id.
export const STRIPE = '';

// Les vraies photos (dans public/vrai/). Une photo absente : un cadre « à remplacer » en mode test, rien sinon.
// Format conseillé : 1080 × 1350 (4:5), lumière du jour, fond noir mat, sans flash.
export const PHOTOS = [
  { src: 'vrai/feuille.jpg', alt: 'Un poème tapé à la machine sur une feuille noire', legende: 'le poème de camille, posté le 3 octobre',
    todo: 'la feuille finie, vue de face, le prénom en colonne bien lisible (avec l’accord de la personne)' },
  { src: 'vrai/enveloppe.jpg', alt: 'L’enveloppe noire fermée par un cachet de cire', legende: 'fermée à la cire, comme chaque envoi',
    todo: 'l’enveloppe noire fermée, le cachet de cire en lumière rasante' },
  { src: 'vrai/machine.jpg', alt: 'Les mains d’Eternel sur la machine à écrire', legende: 'tapé ici, lettre par lettre',
    todo: 'tes mains sur les touches, la feuille dans la machine (ou 6 s de vidéo : vrai/machine.mp4)' },
];

// Le prénom tapé sur une VRAIE feuille photographiée (au lieu de la feuille dessinée par le moteur).
// Photo d'une feuille vierge prise bien à plat, de face ; zone = où taper, en % de la photo.
// Exemple : { src: 'vrai/feuille-vierge.jpg', ratio: 1080 / 1440, zone: { left: 22, top: 17, width: 62, height: 66 } }
export const FEUILLE_PHOTO = null;

export const LIENS = {
  jeu: './jeu',
  livres: 'https://www.amazon.fr/dp/B0DS8RF83H',
  instagram: 'https://www.instagram.com/e.t.ernel/',
};
