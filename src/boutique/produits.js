// Les produits de la boutique (18/10). Les textes viennent du site (offre.js, lettre/content.js, livres/content.js) ;
// ce qui n'y est pas encore dit est marqué PROVISOIRE, à relire par Maxence. Capitales sans accent pour ce qui flotte
// (titres, signes), minuscules avec accents pour ce qui est imprimé / tapé.
import { PRIX, DELAI, DELAI_COURT, RESERVATION } from '../alt/config.js';

export const AMAZON = { recueil: 'https://www.amazon.fr/dp/B0DS8RF83H', journal: 'https://www.amazon.fr/dp/B0BYGNDTWB' };

// media : { t: 'img' | 'video' | 'feuille', src, poster, alt, thumb }
export const PRODUITS = [
  {
    id: 'poeme', titre: 'UN PRENOM, UN POEME', prix: PRIX, unite: 'tout compris',
    accroche: 'un poème écrit avec ton prénom, tapé une seule fois à la machine à écrire et posté chez toi.',
    cartes: ['exemples/isabelle.jpg', 'simple/enveloppe-dos.jpg'],
    cta: 'COMMANDER',
    media: [
      { t: 'feuille', alt: 'La feuille noire où ton prénom s’écrit en colonne : une lettre par ligne, un fil cousu pour chaque vers.', thumb: 'simple/feuille.jpg' },
      { t: 'img', src: 'exemples/isabelle.jpg', alt: 'Un poème pour ISABELLE : son prénom en colonne, un vers par lettre, la carte de sa question posée sur la feuille.' },
      { t: 'img', src: 'exemples/marysol.jpg', alt: 'Un poème pour MARYSOL, tapé à la machine, avec la carte de sa question.' },
      { t: 'img', src: 'simple/enveloppe-dos.jpg', alt: 'L’enveloppe noire, fermée par un cachet de cire argenté.' },
      { t: 'video', src: 'vrai/machine-7.mp4', poster: 'epure/mains.jpg', alt: 'Les mains d’Eternel sur la machine à écrire.', thumb: 'epure/mains.jpg' },
    ],
    recoit: [
      'ton poème, tapé une fois à la machine, sur une feuille noire',
      'la carte de ta question, du jeu SINGULIES',
      'le tout dans une enveloppe noire, scellée à la cire',
    ],
    etapes: [
      ['écris le prénom', 'celui de la personne à qui le poème est destiné : le tien, ou celui de quelqu’un à qui tu l’offres. jusqu’à 22 lettres.'],
      ['réponds à une question', 'on tire une carte du jeu SINGULIES : sa question me dit de quoi parler. tu peux en tirer une autre, choisir ton thème, ou me laisser improviser.'],
      ['je l’écris, je le poste', 'je tape ton poème à la machine à écrire, une seule fois, et je te l’envoie par la poste. ' + DELAI + '.'],
    ],
    livraison: 'en france seulement pour l’instant. ' + DELAI + ', par la poste, en lettre ; compte ensuite quelques jours d’acheminement. si l’enveloppe se perd ou arrive abîmée, je refais le poème.',
    paiement: RESERVATION
      ? 'rien n’est débité sur le site : tu réserves, puis je t’écris pour le paiement (paypal).'
      : 'paiement par carte, apple pay ou google pay.',
  },
  {
    id: 'mois', titre: 'UN POEME PAR MOIS', prix: '9 €', unite: 'par mois',
    accroche: 'une lettre mensuelle, exclusive aux membres : un poème inédit au recto, mes pensées de création au verso.',
    cartes: ['simple/enveloppe-dos.jpg', 'simple/enveloppe.jpg'],
    cta: 'REJOINDRE',
    media: [
      { t: 'live', scene: 'enveloppe', p: 0, ph: 'simple/enveloppe-dos.jpg', thumb: 'simple/enveloppe-dos.jpg', alt: 'Des lettres noires scellées qui défilent, liées par un fil noir.', cap: 'une lettre mensuelle\nexclusive aux membres' },
      { t: 'live', scene: 'enveloppe', p: 1, ph: 'simple/enveloppe-dos.jpg', thumb: 'simple/enveloppe.jpg', alt: 'Une feuille noire sort d’une enveloppe : un poème inédit au recto, mes pensées au verso.', cap: 'un poème inédit au recto\nmes pensées de création au verso' },
      { t: 'live', scene: 'enveloppe', p: 2, ph: 'simple/enveloppe-dos.jpg', thumb: 'epure/cire.jpg', alt: 'L’enveloppe noire, fermée par un cachet de cire argenté.', cap: 'le tout dans une enveloppe\nscellée à la cire' },
      { t: 'live', scene: 'enveloppe', p: 3, ph: 'simple/enveloppe-dos.jpg', thumb: 'simple/enveloppe-dos.jpg', alt: 'Une enveloppe parmi d’autres : celle d’une personne tirée au sort.', cap: 'chaque mois une personne tirée au sort\nreçoit l’original' },
    ],
    recoit: [
      'un poème inédit, au recto d’une feuille noire',
      'mes pensées de création au verso',
      'le tout dans une enveloppe scellée à la cire',
      'chaque mois, une personne tirée au sort reçoit l’original, tapé à la machine',
    ],
    etapes: [
      ['tu rejoins', 'laisse ton email : les premières lettres partent bientôt, je t’écris quand la première est prête.'],
      ['je l’écris', 'un poème par mois, tapé une fois à la machine puis imprimé.'],
      ['il arrive chez toi', '9 € par mois, port compris, résiliable.'],
    ],
    livraison: 'port compris, en france. les premières lettres partent bientôt.',
    paiement: 'rien n’est débité pour l’instant : c’est une liste d’attente. je t’écris quand la première lettre est prête.',
  },
  {
    id: 'livres', titre: 'MES LIVRES', prix: '9,90 €', unite: 'sur amazon', depuis: true,
    accroche: 'de l’ombre à la lumière, une danse introspective entre âme et chair, entre amour et trahison.',
    cartes: ['livres/livre.jpg', 'livres/couverture.jpg'],
    cta: 'LE LIRE SUR AMAZON',
    variantes: [
      { id: 'recueil', nom: 'PENSEES POETIQUES', prix: '9,90 €', href: AMAZON.recueil, format: 'broché · 12,7 × 20,3 cm', accroche: 'de l’ombre à la lumière, une danse introspective entre âme et chair, entre amour et trahison.' },
      { id: 'journal', nom: 'JOURNAL', prix: '18,99 €', href: AMAZON.journal, format: 'broché · 15,2 × 22,9 cm', accroche: 'chaque pensée de chaque jour d’une année, du cœur gelé à la floraison sentimentale, l’art exutoire dans la solitude noire.' },
    ],
    media: [
      { t: 'live', scene: 'livre', p: 0, variant: 0, ph: 'livres/livre.jpg', thumb: 'livres/livre.jpg', alt: 'Pensées poétiques : couverture noire, un cadre fin, le titre en capitales.' },
      { t: 'live', scene: 'livre', p: 1, variant: 1, ph: 'livres/livre.jpg', thumb: 'livres/couverture.jpg', alt: 'Journal : couverture noire, le titre en capitales.' },
      { t: 'img', src: 'livres/couverture.jpg', variant: 0, alt: 'La couverture de Pensées poétiques.', thumb: 'livres/couverture.jpg' },
    ],
    recoit: ['un livre broché, encre blanche sur papier noir', 'vendu et expédié par amazon'],
    etapes: [],
    livraison: 'les livres sont vendus et expédiés par amazon : prix, délais et retours sont ceux d’amazon.',
    paiement: 'tu achètes sur amazon, le bouton t’y emmène.',
  },
  {
    id: 'jeu', titre: 'LE JEU', prix: 'bientôt', unite: '',
    accroche: 'SINGULIES : un paquet de cartes noires, une question sur chacune. on tire, on répond, on passe à une autre.',
    cartes: ['simple/dos.jpg', 'simple/portail-jeu.jpg'],
    cta: 'ME PREVENIR',
    media: [
      { t: 'deck', ph: 'simple/dos.jpg', thumb: 'simple/dos.jpg', alt: 'Le paquet du jeu SINGULIES : touche-le, une carte se retourne sur une question.', cap: 'touche le paquet :\nune carte se retourne' },
      { t: 'img', src: 'simple/portail-jeu.jpg', alt: 'SINGULIES, le jeu.' },
      { t: 'img', src: 'simple/vierge.jpg', alt: 'Une carte du jeu, vierge.' },
    ],
    recoit: ['un paquet de cartes noires', 'une question sur chaque carte'],
    etapes: [],
    livraison: 'le jeu n’est pas encore en vente. laisse ton email : je te préviens quand il sort.',
    paiement: 'pas de prix pour l’instant.',
    essai: 'jeu.html',
  },
];

export const produit = id => PRODUITS.find(p => p.id === id);
export { PRIX, DELAI, DELAI_COURT, RESERVATION };
