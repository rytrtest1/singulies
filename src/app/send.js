// Envoi de la demande à Maxence par email (EmailJS, appel direct à leur API : aucune dépendance).
// Seule exception à « zéro appel réseau » : l'instant où la personne poste l'enveloppe (ou choisit « en direct »).
// Une demande qui n'a pas pu partir (pas de réseau) est gardée et renvoyée au retour du réseau / à la visite suivante.
// ?envoi=0 : rien n'est envoyé (essais).
import { vk, VERSION, mentionVersion } from '../core/version.js';
import QUESTIONS from '../cards/questions.json';
import { encodeDemande } from '../demande/lien.js';
import LETTERS from '../../public/email/l/tailles.json';
import { STRIPE, PAIEMENT_URL } from '../alt/config.js';
import { rememberEmail } from './storage.js';
import { count } from './count.js';

export const EMAILJS = { service: 'service_8wqf489', template: 'template_cuh5tub', key: 'XreMhhJCN9l5J6V5J',   // identifiants publics (aucun secret)
  // confirmation envoyée à la personne (récapitulatif) : second modèle EmailJS, To = {{to_email}}
  // (ressources/email-confirmation.html)
  confirm: 'template_lryyumd',
  // (17/10) « ton poème est posté » : envoyé depuis commandes.html quand une commande passe à « postée » ;
  // troisième modèle EmailJS (ressources/email-poste.html), To = {{to_email}} — vide : la page ouvre un email tout prêt
  poste: '' };
const K_PENDING = vk('singulies.pending');
const ENVOI = (() => { try { return new URLSearchParams(location.search).get('envoi') || ''; } catch { return ''; } })();
const OFF = ENVOI === '0';
// (17/10) ?envoi=local : aucun email ; la commande seule, vers la fonction lancée sur cet ordinateur (wrangler dev)
const LOCAL = ENVOI === 'local';
const ready = () => !OFF && !LOCAL && EMAILJS.service && EMAILJS.template && EMAILJS.key;
// (10/10) merci.html : la commande payée (référence passée à Stripe, session) part avec la demande
let ORDER = null;
export function setOrder(o) { ORDER = o; }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { reponse: 'une question du jeu', theme: 'carte blanche', improvisation: 'improvisation (sur le prénom)',
  lien: 'en attente : la personne offerte répondra (lien envoyé)' };

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
// la commande payée : référence (client_reference_id dans Stripe) et session de paiement (adresse et email : dans Stripe)
function orderHtml(o, email) {
  if (!o) return '';
  // (10/10) réservation sans paiement : la référence, et le lien de paiement prérempli si STRIPE existe
  if (o.reserve) {
    let pay = '';
    if (STRIPE) try {
      const u = new URL(STRIPE); u.searchParams.set('client_reference_id', o.ref); u.searchParams.set('locale', 'fr');
      if (email) u.searchParams.set('prefilled_email', email);
      pay = '<br><a href="' + esc(u.href) + '" style="' + LINK + '">lien pour payer</a>';
    } catch { /* */ }
    return '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;"><span style="color:#8a8a8a;">réservation, pas encore payée</span><br>' + esc(o.ref) + pay + '</div>';
  }
  return '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;"><span style="color:#8a8a8a;">commande</span><br>' + esc(o.ref) + (o.simule ? ' · paiement simulé' : '') + (o.session ? '<br><span style="color:#8a8a8a;">stripe ' + esc(o.session) + '</span>' : '') + '<br><span style="color:#8a8a8a;">adresse et email : dans stripe</span></div>';
}
// (18/10, V3) « de la part de » : celui qui offre signe, dans le même bloc que le contact
function delaHtml(n) {
  if (!n) return '';
  return '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;"><span style="color:#8a8a8a;">de la part de</span><br>' + esc(n) + '</div>';
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
    // (10/10) un poème offert : « cadeau » ; la réponse de la personne offerte (pour.html) : « réponse du cadeau »
    mode: d.order && d.order.reserve ? 'réservation (à payer : lien à envoyer), réf. ' + d.order.ref + (d.order.gift ? ', cadeau' : '') + (d.beta ? ' (test)' : '')
      : d.order ? 'payé' + (d.order.simule ? ' (paiement simulé)' : '') + ', réf. ' + d.order.ref + (d.order.pour ? ', réponse de la personne offerte' : d.order.gift ? ', cadeau' : '') + (d.beta ? ' (test)' : '')
      : (d.mode === 'direct' ? 'en direct' : 'par la poste') + (d.test ? ' (essai, sans adresse)' : d.beta ? ' (test)' : ''),
    adresse_html: (d.address || []).map(l => quiet(esc(l))).join('<br>'),
    adresse: (d.address || []).join('\n'),
    contact: d.contact || '',
    contact_html: orderHtml(d.order, d.email) + delaHtml(d.dela) + (d.contact ? '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;">' + contactLinks(d.contact) + '</div>' : '') + betaHtml(d.beta),
    date: new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
    // la demande, rendue par le site (feuille, carte, enveloppe) : tout est dans le lien, après « # »
    lien: new URL('./demande.html', document.baseURI).href + '#' + encodeDemande(d),
    email_base: base,
    to_email: d.email || '',
    // (17/10) la version du site d'où vient la demande (vide sur le site principal) : modèle EmailJS, {{version}}
    version: mentionVersion(),
    dela: d.dela || '',
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
async function doFlush() {
  // relue à chaque tour : une demande ajoutée pendant l'envoi n'est pas écrasée
  for (let a = load(); a.length; a = load()) {
    try { await post(a[0]); save(load().slice(1)); } catch (e) { console.warn('envoi', e); break; }
  }
}
// une même demande ne part jamais deux fois (09/10 : double toucher, page rechargée au mauvais moment, brouillon
// renvoyé alors qu'elle était partie) : on garde 24 h une empreinte de chaque demande partie — un nombre, aucune donnée
const K_SENT = vk('singulies.sent'), DAY = 864e5;
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
const confirmMode = d => !d.order ? '' : d.order.reserve
  ? 'commande notée, réf. ' + d.order.ref + ' · je t’écris pour le paiement · une fois payé, je le poste dans la semaine'
  : 'commande payée, réf. ' + d.order.ref + ' · je le poste dans la semaine';
export function send(detail) {
  if (OFF) return;
  if (ORDER) detail = { ...detail, test: false, order: ORDER };
  if (seen(detail)) { console.warn('envoi : déjà partie'); return; }
  rememberEmail(detail.email);
  // (18/10, C2) dans les versions, la réservation n'est comptée que maintenant : la demande part pour de bon
  if (VERSION && detail.order && detail.order.reserve) count('alt/reserve');
  const p = params(detail), items = [{ tpl: EMAILJS.template, p }];
  // le récapitulatif à la personne, si elle a donné son email
  // (mêmes paramètres que la demande : prénom, question, réponse, et en mode test le prix et les retours)
  // (17/10, Maxence : « une réf. dans leur email aussi ») la ligne du bas du récapitulatif ({{mode}}) dit à la personne
  // où en est sa commande, avec sa référence — pas la note interne (« à payer : lien à envoyer »)
  if (EMAILJS.confirm && p.to_email) items.push({ tpl: EMAILJS.confirm, p: { ...p, mode: confirmMode(detail) || p.mode } });
  if (!LOCAL) save([...load(), ...items]);
  flush();
  commande(detail, p);
}

// (17/10) le suivi des commandes : la même demande est aussi gardée par la fonction Cloudflare (serveur/commandes.js),
// que la page commandes.html liste. File à part : un échec ici ne retient jamais l'email (gardée et renvoyée seulement
// si le réseau manque ; refusée par le serveur — base pas encore reliée — elle est abandonnée, l'email suffit)
const K_CMD = vk('singulies.pendingCmd');
const CMD_URL = LOCAL ? 'http://localhost:8787' : PAIEMENT_URL;
const loadCmd = () => { try { return JSON.parse(localStorage.getItem(K_CMD) || '[]'); } catch { return []; } };
const saveCmd = a => { try { a.length ? localStorage.setItem(K_CMD, JSON.stringify(a.slice(-10))) : localStorage.removeItem(K_CMD); } catch { /* */ } };
function commande(d, p) {
  if (!CMD_URL) return;
  const o = d.order || null;
  const body = {
    ref: o?.ref || '', prenom: d.name || '', genre: d.kind || '', questionId: d.kind === 'reponse' ? String(d.id ?? '') : '',
    question: p.question, reponse: d.text || '', adresse: d.address || [], email: d.email || '', contact: d.contact || '',
    mode: o ? (o.reserve ? 'reservation' : o.simule ? 'simule' : 'paye') : d.test ? 'essai' : d.mode === 'direct' ? 'direct' : 'poste',
    cadeau: !!(o && (o.gift || o.pour)), session: o?.session || '', lien: p.lien,
    essai: !!(d.test || o?.simule || d.beta || import.meta.env.DEV), site: '', version: VERSION, dela: d.dela || '',
  };
  saveCmd([...loadCmd(), body]);
  flushCmd();
}
let cmdBusy = false;
async function flushCmd() {
  if (cmdBusy || !CMD_URL || OFF) return;
  cmdBusy = true;
  try {
    for (let a = loadCmd(); a.length; a = loadCmd()) {
      let r;
      try { r = await fetch(CMD_URL + '/commande', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a[0]) }); }
      catch (e) { console.warn('commande', e); break; }                           // pas de réseau : on réessaiera
      if (!r.ok) console.warn('commande : ' + r.status);
      saveCmd(loadCmd().slice(1));
    }
  } finally { cmdBusy = false; }
}

// (11/10) un message du site (« me contacter ») ou une place réservée (« un poème par mois ») : le modèle des demandes
// (aucun nouveau modèle EmailJS), « genre » dit ce que c'est ; le message à la place du texte, l'email en lien
// d : { kind: 'message' | 'club', text?, email, name? } ; rend false si rien n'est parti (essais : ?envoi=0)
const NOTE = { message: 'message du site (me contacter)', club: 'liste d’attente : un poème par mois', clubOffert: 'liste d’attente : un poème par mois, à offrir' };
export function sendNote(d) {
  rememberEmail(d.email);
  if (OFF || LOCAL) return false;
  const p = params({ name: d.name || '', kind: 'note' });
  Object.assign(p, {
    genre: NOTE[d.kind] || d.kind, mode: NOTE[d.kind] || d.kind, prenom_html: p.prenom ? p.prenom_html : '', colonne_html: '',
    texte_html: d.text ? '<div style="padding:0 0 40px;">' + textHtml(d.text) + '</div>' : '',
    contact: d.email, contact_html: '<div style="padding:0 0 18px;font-size:14px;color:#d8d8d8;letter-spacing:1px;"><span style="color:#8a8a8a;">' + esc(NOTE[d.kind] || d.kind) + '</span><br>' + contactLinks(d.email) + '</div>',
    lien: 'mailto:' + d.email, to_email: '',   // (le bouton du mail : répondre)
  });
  save([...load(), { tpl: EMAILJS.template, p }]);
  flush();
  return true;
}

// la page : les demandes partent quand l'enveloppe est postée, ou quand on choisit « en direct »
export function installSend() {
  // une enveloppe postée puis la page fermée avant l'écran du contact : la demande part quand même (sans contact)
  try {
    const d = localStorage.getItem(vk('singulies.draft'));
    if (d) { localStorage.removeItem(vk('singulies.draft')); send(JSON.parse(d)); }
  } catch { /* */ }
  addEventListener('singulies:address', e => send(e.detail));
  addEventListener('singulies:direct', e => send(e.detail));          // « en direct » : une fois le contact tapé
  addEventListener('online', () => { flush(); flushCmd(); });
  flush(); flushCmd();
}
