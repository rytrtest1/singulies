// Envoi de la demande à Maxence par email (EmailJS, appel direct à leur API : aucune dépendance).
// Seule exception à « zéro appel réseau » : l'instant où la personne poste l'enveloppe (ou choisit « en direct »).
// Une demande qui n'a pas pu partir (pas de réseau) est gardée et renvoyée au retour du réseau / à la visite suivante.
// ?envoi=0 : rien n'est envoyé (essais).
import QUESTIONS from '../cards/questions.json';
import { encodeDemande } from '../demande/lien.js';
import LETTERS from '../../public/email/l/tailles.json';

export const EMAILJS = { service: 'service_8wqf489', template: 'template_cuh5tub', key: 'XreMhhJCN9l5J6V5J',   // identifiants publics (aucun secret)
  // confirmation envoyée à la personne (récapitulatif) : second modèle EmailJS, To = {{to_email}}
  // (ressources/email-confirmation.html)
  confirm: 'template_lryyumd' };
const K_PENDING = 'singulies.pending';
const OFF = (() => { try { return new URLSearchParams(location.search).get('envoi') === '0'; } catch { return false; } })();
const ready = () => !OFF && EMAILJS.service && EMAILJS.template && EMAILJS.key;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { reponse: 'une question du jeu', theme: 'carte blanche', improvisation: 'improvisation (sur le prénom)' };

// paramètres du modèle EmailJS (voir ressources/email-demande.html) ; *_html : à insérer avec {{{ }}}
// Gmail ne charge pas les polices du site : le prénom est composé d'images de lettres (EB Garamond, rendues une
// fois : tools/email-assets.mjs), la carte est l'image de la vraie carte (les 73 questions, la carte blanche)
const NAME_W = 288;                               // largeur max d'une ligne du prénom (px) : tient dans un téléphone de 320 px
function nameHtml(name, base) {
  const words = name.split(' ').filter(Boolean), lines = [];
  for (const w of words) { const l = lines[lines.length - 1]; if (l && (l + ' ' + w).length <= 11) lines[lines.length - 1] = l + ' ' + w; else lines.push(w); }
  const width = l => [...l].reduce((s, c) => s + (c === ' ' ? 22 : (LETTERS[c]?.[0] || 40)), 0);
  const k = Math.min(1, NAME_W / Math.max(1, ...lines.map(width)));
  return lines.map(l => '<div style="font-size:0;line-height:0;white-space:nowrap;padding:0 0 ' + Math.round(14 * k) + 'px ' + Math.round(18 * k) + 'px;">' +
    [...l].map(c => c === ' '
      ? '<span style="display:inline-block;width:' + Math.round(22 * k) + 'px;"></span>'
      : '<img src="' + base + 'l/' + c + '.png" width="' + Math.round(LETTERS[c][0] * k) + '" height="' + Math.round(40 * k) + '" alt="' + c + '" style="display:inline-block;border:0;vertical-align:top;">'
    ).join('') + '</div>').join('');
}
const textHtml = t => esc(t).replace(/\n/g, '<br>');
// email / numéro / adresse : Gmail et Mail en font des liens bleus, que l'astuce du mode sombre (différence)
// passait en orange (06/10). Liens posés par nous, à la couleur du texte ; l'adresse rendue non détectable
// (espace sans chasse entre les chiffres et devant les mots)
const LINK = 'color:#d8d8d8;text-decoration:none;';
const quiet = h => h.replace(/(\d)(?=\d)/g, '$1&#8203;').replace(/ /g, '&#8203; ');
function contactLinks(c) {
  return c.split(' · ').map(x => {
    const t = x.trim();
    if (/@/.test(t)) return '<a href="mailto:' + esc(t) + '" style="' + LINK + '">' + esc(t) + '</a>';
    return '<a href="tel:' + esc(t.replace(/[^\d+]/g, '')) + '" style="' + LINK + '">' + esc(t) + '</a>';
  }).join(' &nbsp;·&nbsp; ');
}
// mode test : les réponses des testeurs (prix de l'original, retours), dans le même bloc que le contact
function betaHtml(b) {
  if (!b || (!b.prix && !b.retours)) return '';
  const row = (k, v) => '<div style="padding:0 0 10px;"><span style="color:#8a8a8a;">' + k + '</span><br>' + (v ? esc(v) : '—') + '</div>';
  return '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;">' + row('prix de l’original', b.prix) + row('retours', b.retours) + '</div>';
}
export function params(d) {
  const q = d.kind === 'reponse' ? (QUESTIONS.find(x => x.id === d.id)?.q || '') : '';
  const name = (d.name || '').toUpperCase().replace(/[^A-Z ]/g, '');
  const base = new URL('./email/', document.baseURI).href;
  const carte = d.kind === 'reponse' && q ? base + 'q/' + d.id + '.jpg' : d.kind === 'theme' ? base + 'q/blanche.jpg' : '';
  return {
    prenom: name,
    prenom_html: nameHtml(name, base),
    // (les blancs vont avec les blocs : en improvisation, rien entre le prénom et l'adresse)
    carte_html: carte ? '<div style="padding:0 0 30px;"><img src="' + carte + '" width="340" alt="' + esc(q ? q.toLowerCase() : 'carte blanche') + '" style="display:block;border:0;width:100%;max-width:340px;height:auto;margin:0 auto;"></div>' : '',
    texte_html: (d.kind === 'reponse' || d.kind === 'theme') && d.text ? '<div style="padding:0 0 52px;">' + textHtml(d.text) + '</div>' : '',
    colonne_html: [...name].map(c => c === ' ' ? '&nbsp;' : esc(c)).join('<br>'),
    genre: KIND[d.kind] || d.kind || '',
    question: q.toLowerCase(),
    reponse: d.kind === 'reponse' ? d.text || '' : '',
    theme: d.kind === 'theme' ? d.text || '' : '',
    mode: (d.mode === 'direct' ? 'en direct' : 'par la poste') + (d.test ? ' (essai, sans adresse)' : d.beta ? ' (test)' : ''),
    adresse_html: (d.address || []).map(l => quiet(esc(l))).join('<br>'),
    adresse: (d.address || []).join('\n'),
    contact: d.contact || '',
    contact_html: (d.contact ? '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;">' + contactLinks(d.contact) + '</div>' : '') + betaHtml(d.beta),
    date: new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
    // la demande, rendue par le site (feuille, carte, enveloppe) : tout est dans le lien, après « # »
    lien: new URL('./demande.html', document.baseURI).href + '#' + encodeDemande(d),
    email_base: base,
    to_email: d.email || '',
  };
}

// un envoi en attente : { tpl, p } (anciens : les paramètres seuls → le modèle « nouvelle demande »)
async function post(item) {
  const tpl = item.tpl || EMAILJS.template, p = item.tpl ? item.p : item;
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: EMAILJS.service, template_id: tpl, user_id: EMAILJS.key, template_params: p }),
  });
  if (!r.ok) throw new Error('emailjs ' + r.status);
}
const load = () => { try { return JSON.parse(localStorage.getItem(K_PENDING) || '[]'); } catch { return []; } };
const save = a => { try { a.length ? localStorage.setItem(K_PENDING, JSON.stringify(a)) : localStorage.removeItem(K_PENDING); } catch { /* */ } };

let flushing = null;
function flush() {
  if (!ready()) return Promise.resolve();
  if (!flushing) flushing = doFlush().finally(() => { flushing = null; });
  return flushing;
}
// la page attend que les envois en cours soient partis (ou gardés) avant de se recharger
export const settled = () => flushing || Promise.resolve();
// demandes pas encore parties (pas de réseau) : la fin le dit (« ton enveloppe attend le réseau »)
export const pendingCount = () => (OFF ? 0 : load().length);
async function doFlush() {
  // relue à chaque tour : une demande ajoutée pendant l'envoi n'est pas écrasée
  for (let a = load(); a.length; a = load()) {
    try { await post(a[0]); save(load().slice(1)); } catch (e) { console.warn('envoi', e); break; }
  }
}
// une même demande ne part jamais deux fois (09/10 : double toucher, page rechargée au mauvais moment, brouillon
// renvoyé alors qu'elle était partie) : on garde 24 h une empreinte de chaque demande partie — un nombre, aucune donnée
const K_SENT = 'singulies.sent', DAY = 864e5;
function print(d) {
  const s = JSON.stringify([d.name, d.kind, d.id, d.text, d.address, d.email, d.mode, !!d.test, d.beta || null]);
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function seen(d) {
  const now = Date.now(), k = print(d);
  let a = []; try { a = JSON.parse(localStorage.getItem(K_SENT) || '[]').filter(x => now - x[1] < DAY); } catch { /* */ }
  if (a.some(x => x[0] === k)) return true;
  a.push([k, now]);
  try { localStorage.setItem(K_SENT, JSON.stringify(a.slice(-20))); } catch { /* */ }
  return false;
}
export function send(detail) {
  if (OFF) return;
  if (seen(detail)) { console.warn('envoi : déjà partie'); return; }
  const p = params(detail), items = [{ tpl: EMAILJS.template, p }];
  // le récapitulatif à la personne, si elle a donné son email
  // (sans les réponses du mode test : elles ne sont que pour Maxence)
  if (EMAILJS.confirm && p.to_email) items.push({ tpl: EMAILJS.confirm, p: { ...p, contact_html: params({ ...detail, beta: null }).contact_html, mode: params({ ...detail, beta: null }).mode } });
  save([...load(), ...items]);
  flush();
}

// la page : les demandes partent quand l'enveloppe est postée, ou quand on choisit « en direct »
export function installSend() {
  // une enveloppe postée puis la page fermée avant l'écran du contact : la demande part quand même (sans contact)
  try {
    const d = localStorage.getItem('singulies.draft');
    if (d) { localStorage.removeItem('singulies.draft'); send(JSON.parse(d)); }
  } catch { /* */ }
  addEventListener('singulies:address', e => send(e.detail));
  addEventListener('singulies:direct', e => send(e.detail));          // « en direct » : une fois le contact tapé
  addEventListener('online', flush);
  flush();
}
