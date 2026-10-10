// Version alternative (10/10) : le prénom avant de payer, la question après. À remplir par Maxence.

export const PRIX = '30 €';                 // port compris
// posté le lundi suivant (jamais le jour même : un lundi → le lundi d'après) ; on n'écrit que la date : « 12 octobre »
export function lundiSuivant(d = new Date()) {
  const x = new Date(d); x.setDate(x.getDate() + (((8 - x.getDay()) % 7) || 7));
  return x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
// (10/10) la feuille se cadre au-dessus de ce qui viendra sous elle : RECEVOIR, la description, le prix (px, sans la
// marge du bas de l'iPhone)
export const SHEET_INSET = 188;
export const ENVOI = lundiSuivant();   // (plus affiché : voir DELAI)
// (10/10) aucun délai affiché (Maxence) ; s'il revient : « je le tape et le poste sous 3 jours »
export const DELAI = '';

// (10/10) RÉSERVATION SANS PAIEMENT, en attendant le SIRET : RECEVOIR → l'enveloppe (l'adresse) → RÉSERVER → la carte,
// la réponse, la feuille, l'enveloppe part, l'email → c'est noté. Rien n'est débité, aucun appel à Stripe ; la demande
// part par email marquée « réservation, à payer » avec sa référence, et je t'envoie ensuite le lien de paiement
// (si STRIPE est rempli, la demande porte déjà le lien prérempli : référence + email). false → le paiement Stripe.
// ?paiement=stripe (ou ?paiement=faux) : le paiement, même en réservation (essais).
export const RESERVATION = true;

// Lien de paiement Stripe (Payment Link). Vide = paiement simulé (on va directement à merci.html).
// Dans Stripe, « Après le paiement » → « Rediriger vers votre site » :
//   https://rytrtest1.github.io/singulies/merci.html?session={CHECKOUT_SESSION_ID}
// et cocher « collecter l'adresse de livraison » (France) + l'email. Le prénom part dans client_reference_id.
export const STRIPE = '';

// Paiement DANS la page (10/10, recommandé) : le formulaire Stripe monte du bandeau, on ne quitte pas le site.
// STRIPE_PK : ta clé publique (pk_test_… pour les essais, pk_live_… pour de vrai) — publique par nature, sans danger ici.
// PAIEMENT_URL : l'adresse de ta fonction Cloudflare (serveur/paiement.js, mode d'emploi : serveur/LISEZ-MOI.md),
// ex. 'https://singulies-paiement.toncompte.workers.dev'. Les deux remplis → le panneau ; sinon le lien STRIPE ;
// sinon le paiement simulé. ?paiement=faux : le panneau avec un faux formulaire (pour voir le geste).
export const STRIPE_PK = 'pk_test_51UOqM7JWcAJxKpWbnzcJ2SYCvrqPxhvbZQ3yVKLVSRDAn0MiyH0KAfdfXrPwnMSGoaqy5tgojasLhqA26GUTyGEz00Bh2SNESQ';   // clé publiable (test) : publique par nature
export const PAIEMENT_URL = 'https://singulies.rytrtest1.workers.dev';

// Les vraies photos (dans public/vrai/). Une photo absente : un cadre « à remplacer » en mode test, rien sinon.
// Format conseillé : 1080 × 1350 (4:5), lumière du jour, fond noir mat, sans flash.
// Vidéo : .mp4 H.264, 4:5, 4–6 s, muette, < 1,5 Mo, + une image fixe (poster).
// Ordre : 1) tes mains qui tapent (un humain l'écrit) 2) l'enveloppe 3) le cachet (l'objet qui arrive)
export const PHOTOS = [
  { src: 'vrai/machine.mp4', poster: 'vrai/machine.jpg', alt: 'Les mains d’Eternel tapent un poème à la machine', legende: 'tapé ici, lettre par lettre',
    todo: '5 s de tes mains qui tapent, la feuille qui avance (extrait d’une de tes vidéos)' },
  { src: 'vrai/enveloppe.jpg', alt: 'L’enveloppe noire, le poème glissé dedans', legende: 'glissé dans une enveloppe noire',
    todo: 'l’enveloppe noire, fermée ou la feuille qu’on glisse dedans' },
  { src: 'vrai/cachet.jpg', alt: 'Le cachet de cire sur l’enveloppe', legende: 'fermé à la cire, posté chez toi',
    todo: 'le cachet de cire de près, en lumière rasante' },
];

// Les photos des acrostiches déjà envoyés (avec l'accord des personnes) : elles remplacent les exemples du défilé
// sous la feuille (exemples.js). Format : la feuille entière, de face, 4:5 ou A5 ; la carte question posée dessus.
// Exemple : ['vrai/acrostiche-1.jpg', 'vrai/acrostiche-2.jpg', 'vrai/acrostiche-3.jpg']
export const ACROSTICHES = [];

// Le prénom tapé sur une VRAIE feuille photographiée (au lieu de la feuille dessinée par le moteur).
// Photo d'une feuille vierge prise bien à plat, de face ; zone = où taper, en % de la photo.
// Exemple : { src: 'vrai/feuille-vierge.jpg', ratio: 1080 / 1440, zone: { left: 22, top: 17, width: 62, height: 66 } }
export const FEUILLE_PHOTO = null;

export const LIENS = {
  jeu: './jeu',
  livres: 'https://www.amazon.fr/dp/B0DS8RF83H',
  instagram: 'https://www.instagram.com/e.t.ernel/',
};
