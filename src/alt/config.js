// Version alternative (10/10) : le prénom avant de payer, la question après. À remplir par Maxence.

export const PRIX = '30 €';                 // port compris
// posté le lundi suivant (jamais le jour même : un lundi → le lundi d'après), en toutes lettres : « lundi 12 octobre »
export function lundiSuivant(d = new Date()) {
  const x = new Date(d); x.setDate(x.getDate() + (((8 - x.getDay()) % 7) || 7));
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
export const ENVOI = lundiSuivant();

// Lien de paiement Stripe (Payment Link). Vide = paiement simulé (on va directement à merci.html).
// Dans Stripe, « Après le paiement » → « Rediriger vers votre site » :
//   https://rytrtest1.github.io/singulies/merci.html?session={CHECKOUT_SESSION_ID}
// et cocher « collecter l'adresse de livraison » (France) + l'email. Le prénom part dans client_reference_id.
export const STRIPE = '';

// Les vraies photos (dans public/vrai/). Une photo absente : un cadre « à remplacer » en mode test, rien sinon.
// Format conseillé : 1080 × 1350 (4:5), lumière du jour, fond noir mat, sans flash.
// Ordre : 1) le poème fini (ce qu'on reçoit) 2) la machine et tes mains (un humain l'écrit) 3) l'enveloppe et la cire
// (l'objet qui arrive). Vidéo : .mp4 H.264, 4:5, 4–6 s, muette, < 1,5 Mo, + une image fixe (poster).
export const PHOTOS = [
  { src: 'vrai/feuille.jpg', alt: 'Un poème tapé à la machine sur une feuille noire', legende: 'le poème de camille, posté le 3 octobre',
    todo: 'la feuille finie, vue de face, le prénom en colonne bien lisible (avec l’accord de la personne)' },
  { src: 'vrai/machine.mp4', poster: 'vrai/machine.jpg', alt: 'Les mains d’Eternel tapent un poème à la machine', legende: 'tapé ici, lettre par lettre',
    todo: '5 s de tes mains qui tapent, la feuille qui avance (extrait d’une de tes vidéos)' },
  { src: 'vrai/enveloppe.jpg', alt: 'L’enveloppe noire fermée par un cachet de cire', legende: 'fermé à la cire, posté chez toi',
    todo: 'l’enveloppe fermée, le cachet en lumière rasante (ou 4 s de la cire qui se pose : enveloppe.mp4)' },
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
