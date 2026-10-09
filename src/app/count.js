// Le compteur (09/10, revue de l'audit, cas 23) : des totaux anonymes, jour par jour — combien de personnes arrivent
// à chaque étape, quelles questions sont tirées / passées / répondues, d'où l'on vient (la plateforme : ?v=insta,
// ?v=tiktok, à mettre dans chaque bio), quels téléphones ont besoin de la version simple. Jamais un texte, jamais
// un prénom, une réponse ou une adresse ; aucun cookie, aucun identifiant ; « Ne pas suivre » est respecté.
// Service : GoatCounter (gratuit, sans cookie : il ne compte que des passages). COUNTER = null : rien ne part.
// Pour l'activer : créer un compte sur goatcounter.com (code « eternel », par exemple), puis
//   COUNTER = 'https://eternel.goatcounter.com/count'
export const COUNTER = null;

const Q = new URLSearchParams(location.search);
const OFF = !COUNTER || Q.get('envoi') === '0' || navigator.doNotTrack === '1' || window.doNotTrack === '1';
const sent = new Set();
// un passage : chemin lisible dans le tableau de bord (« etape/question », « q/12/passee »…) ; once : une fois par visite
export function count(path, { once = true } = {}) {
  if (OFF || !path) return;
  if (once && sent.has(path)) return;
  sent.add(path);
  try {
    const u = new URL(COUNTER);
    u.searchParams.set('p', '/' + path.replace(/^\/+/, ''));
    u.searchParams.set('e', 'true');                        // un événement, pas une page
    u.searchParams.set('rnd', Math.random().toString(36).slice(2));
    const img = new Image(); img.referrerPolicy = 'no-referrer'; img.src = u.href;
  } catch { /* */ }
}

// la page : l'arrivée (et d'où), puis les étapes, d'après les événements du site
export function installCount(page) {
  if (OFF) return;
  const v = (Q.get('v') || 'direct').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'direct';
  count('arrivee/' + (page || 'accueil'));
  count('source/' + v);
  addEventListener('singulies:name-validated', () => count('etape/prenom'));
  addEventListener('singulies:question', e => { const d = e.detail || {}; if (Number.isFinite(d.id) && d.action) count(`q/${d.id}/${d.action}`); });
  addEventListener('singulies:card-chosen', e => {
    const d = e.detail || {};
    count('etape/' + ({ reponse: 'reponse', theme: 'carte-blanche', improvisation: 'improvisation' }[d.kind] || 'reponse'));
    if (d.kind === 'reponse' && Number.isFinite(d.id)) count(`q/${d.id}/repondue`);
  });
  addEventListener('singulies:order', () => count('etape/enveloppe'));
  addEventListener('singulies:address', () => count('etape/commande'));
  addEventListener('singulies:simple', e => count('telephone/version-simple-' + ((e.detail && e.detail.where) || 'suite')));
}
