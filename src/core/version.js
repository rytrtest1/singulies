// La version du site : une constante de la construction (SG_VERSION, voir vite.config.js), jamais un paramètre
// d'adresse. '' = le site principal (singulies.com) ; '1' | '2' | '3' = singulies.com/v1/, /v2/, /v3/.
// Tout ce qui doit rester séparé entre les versions passe par ici : les clés du stockage du navigateur, les chemins
// des statistiques, la mention envoyée avec chaque commande.

export const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : '';
export const EST_VERSION = VERSION !== '';
// (18/10) V2 (équilibrée) : le moteur de V3 + une couche explicite (src/v2/) ; V3 : le moteur avec ses seules corrections
export const EST_V2 = VERSION === '2';
export const EST_V3 = VERSION === '3';

// Préfixe d'une clé du stockage du navigateur : le site principal garde ses clés d'origine (« singulies.name »), une
// version écrit « v2.singulies.name ». Les trois versions partagent la même origine (singulies.com) : sans ce préfixe,
// elles partageraient le prénom, l'email retenu, la commande en cours.
export const prefixe = (v = VERSION) => (v ? 'v' + v + '.' : '');
export const vk = (cle, v = VERSION) => prefixe(v) + cle;

// Chemin d'un événement de statistiques (GoatCounter) : « etape/prenom » devient « v2/etape/prenom ».
export const cheminStats = (chemin, v = VERSION) => (v ? 'v' + v + '/' : '') + String(chemin || '').replace(/^\/+/, '');

// Mention ajoutée aux emails et au suivi des commandes : l'auteur voit de quelle version vient une demande.
export const mentionVersion = (v = VERSION) => (v ? 'version ' + v : '');

// Choisit une valeur selon la version : choix({ 1: 'a', 2: 'b', 3: 'c' }, 'défaut du site principal')
export const choix = (parVersion, defaut, v = VERSION) => (v && Object.prototype.hasOwnProperty.call(parVersion, v) ? parVersion[v] : defaut);
