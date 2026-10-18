// Version 1 (directe) : un site de vente conventionnel, en DOM, sans WebGL. Le noyau (prénom, adresse, paiement, envoi,
// statistiques) vient de src/core/ et src/app/. Une adresse par étape (#/apercu, #/question…) : le retour du navigateur
// ramène d'une étape sans rien perdre ; un en-tête et un menu toujours visibles, une barre « 1 prénom · 2 question · 3 adresse ·
// 4 paiement », un bouton « ← retour ». Voir docs/cahier-des-charges-3-versions.md.
import { VERSION } from '../core/version.js';
import { siteFonts } from '../app/fonts.js';
import { installCount } from '../app/count.js';
import { installSend } from '../app/send.js';
import { retour as statRetour } from '../core/stats.js';
import { etat, avance, recommencer, aCommande, ROUTES_FLUX, ETAPES } from './etat.js';
import { creerVues } from './vues.js';
import { creerPages } from './pages.js';

document.documentElement.dataset.version = VERSION;
siteFonts('./');
installCount('v1');
installSend();

const main = document.getElementById('principal');
const menu = document.getElementById('menu');
const barre = document.getElementById('barre');
const retourBtn = document.getElementById('retour');
const etapesEl = document.getElementById('etapes');
const repriseEl = document.getElementById('reprise');
const annonceEl = document.getElementById('annonce');
const annonce = t => { annonceEl.textContent = ''; setTimeout(() => { annonceEl.textContent = t; }, 40); };

const go = r => { const h = '#/' + (r || ''); if (location.hash === h || (!r && (location.hash === '' || location.hash === '#'))) render(); else location.hash = h; };
const vues = creerVues({ main, go, annonce, base: './' });
const pages = creerPages({ main, annonce });

const TITRES = {
  '': 'un prénom, un poème', apercu: 'ton poème', question: 'la question', adresse: 'l’adresse', paiement: 'le récapitulatif', confirmation: 'merci',
  'a-propos': 'à propos', questions: 'questions', contact: 'contact', lettre: 'un poème par mois', livres: 'mes livres', jeu: 'le jeu',
};
const PAGES_DE_BASE = [['a-propos', 'à propos'], ['questions', 'questions'], ['contact', 'contact']];
const PAGES_APRES = [['lettre', 'un poème par mois'], ['livres', 'mes livres'], ['jeu', 'le jeu']];   // seulement une fois la commande faite (décision 10)

const route = () => (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
let nettoyer = null, sauts = 0, derniere = null, premiere = true;

// le menu : toujours visible ; les autres offres n'y paraissent qu'après la commande
function menuHtml(r) {
  const liste = [...PAGES_DE_BASE, ...(aCommande() ? PAGES_APRES : [])];
  menu.innerHTML = liste.map(([k, t]) => `<a href="#/${k}"${r === k ? ' aria-current="page"' : ''}>${t}</a>`).join('');
}
const menuBtn = document.querySelector('.menu-bouton');
menuBtn.addEventListener('click', () => { const o = menu.classList.toggle('ouvert'); menuBtn.setAttribute('aria-expanded', String(o)); });
menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('ouvert'); menuBtn.setAttribute('aria-expanded', 'false'); } });
addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('ouvert')) { menu.classList.remove('ouvert'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); } });
document.querySelector('.saut').addEventListener('click', e => { e.preventDefault(); main.focus(); });

// la barre d'étapes : seulement pendant la commande
function barreHtml(r) {
  const i = ETAPES.findIndex(([, rs]) => rs.includes(r));
  barre.hidden = i < 0;
  if (i < 0) return;
  etapesEl.innerHTML = ETAPES.map(([nom], k) => `<li class="${k === i ? 'ici' : k < i ? 'fait' : ''}"${k === i ? ' aria-current="step"' : ''}><b aria-hidden="true">${k + 1}</b><span>${nom}</span></li>`).join('');
  etapesEl.setAttribute('aria-label', 'Étape ' + (i + 1) + ' sur 4 : ' + ETAPES[i][0]);
  retourBtn.hidden = r === '';
}
retourBtn.addEventListener('click', () => {
  statRetour(route() || 'prenom');
  if (sauts > 0) { history.back(); return; }
  const i = ROUTES_FLUX.indexOf(route()); go(ROUTES_FLUX[Math.max(0, i - 1)] ?? '');
});

// reprendre ta commande pour … ?
function reprise(r) {
  const E = etat();
  const ok = r === '' && E.prenom && !E.fait && E.loin >= 1;
  repriseEl.hidden = !ok;
  if (!ok) return;
  repriseEl.innerHTML = `<span>reprendre ta commande pour ${E.prenom.replace(/[<>&]/g, '')} ?</span><button type="button" data-a="oui">reprendre</button><button type="button" data-a="non">recommencer</button>`;
  repriseEl.querySelector('[data-a="oui"]').addEventListener('click', () => go(ROUTES_FLUX[Math.min(E.loin, 4)]));
  repriseEl.querySelector('[data-a="non"]').addEventListener('click', () => { recommencer(); import('../core/offrir.js').then(m => m.effacer()); go(''); render(); });
}

// les garde-fous : on ne saute pas une étape
function garde(r) {
  const E = etat();
  if (['apercu', 'question', 'adresse', 'paiement'].includes(r) && !E.prenom) return '';
  if (['adresse', 'paiement'].includes(r) && E.kind === 'reponse' && !(E.texte || '').trim()) return 'question';
  if (['adresse', 'paiement'].includes(r) && E.kind === 'theme' && !(E.theme || '').trim()) return 'question';
  if (r === 'paiement' && !(E.adr.rue && E.adr.cp && E.adr.ville && E.email)) return 'adresse';
  if (r === 'confirmation' && !E.fait) return '';
  return null;
}

function render() {
  let r = route();
  const g = garde(r);
  if (g !== null) { history.replaceState(null, '', '#/' + g); r = g; }
  if (r === '' && etat().fait) { recommencer(); import('../core/offrir.js').then(m => m.effacer()); }
  if (nettoyer) { try { nettoyer(); } catch { /* */ } nettoyer = null; }
  document.getElementById('menu').classList.remove('ouvert');
  const VUES = ['accueil', 'apercu', 'question', 'adresse', 'paiement', 'confirmation'];
  const fn = r === '' ? vues.accueil : VUES.includes(r) ? vues[r] : pages[r];
  if (!fn) { history.replaceState(null, '', '#/'); r = ''; }
  main.className = '';
  window.scrollTo(0, 0);
  const vue = fn || vues.accueil;
  nettoyer = vue() || null;
  if (ROUTES_FLUX.includes(r)) avance(r);
  menuHtml(r); barreHtml(r); reprise(r);
  document.title = 'ETERNEL — ' + (TITRES[r] || TITRES['']) + ' (version 1)';
  if (!premiere || r !== '') { const h = main.querySelector('h1'); if (h) h.focus({ preventScroll: true }); annonce(TITRES[r] || ''); }
  premiere = false; derniere = r;
}
addEventListener('hashchange', () => { sauts++; render(); });
addEventListener('pageshow', e => { if (e.persisted) render(); });

// un retour de Stripe (3-D Secure, PayPal) : ?session=… dans l'adresse = payé ; la demande part maintenant
{
  const s = new URLSearchParams(location.search).get('session');
  if (s && etat().prenom && !etat().fait) { history.replaceState(null, '', location.pathname + '#/paiement'); vues.terminer({ session: s.replace(/[^A-Za-z0-9_]/g, '') }); }
  else render();
}
