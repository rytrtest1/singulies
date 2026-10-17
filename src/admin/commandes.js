// Suivi des commandes (17/10) : la page d'Eternel. Liste, statut, note, numéro de facture (pour plus tard), adresse
// prête pour l'enveloppe, liens de paiement (PayPal, Stripe), email « ton poème est posté ».
// La fonction Cloudflare (serveur/commandes.js) garde les commandes ; le mot de passe reste dans ce navigateur.
// ?api=local : la fonction lancée sur cet ordinateur (npx wrangler dev, port 8787).
import { PAIEMENT_URL } from '../alt/config.js';
import { EMAILJS, params } from '../app/send.js';

const API = new URLSearchParams(location.search).get('api') === 'local' ? 'http://localhost:8787' : PAIEMENT_URL;
const K_TOK = 'singulies.admin';
const STATUTS = [['recue', 'reçue'], ['paiement', 'paiement envoyé'], ['payee', 'payée'], ['tapee', 'tapée'], ['postee', 'postée']];
const MODES = { reservation: 'réservation (à payer)', paye: 'payée sur le site', simule: 'paiement simulé', poste: 'par la poste', direct: 'en direct', essai: 'essai sans adresse' };
const GENRES = { reponse: 'une question du jeu', theme: 'carte blanche', improvisation: 'improvisation', lien: 'cadeau : la personne offerte répondra' };

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let tok = ''; try { tok = localStorage.getItem(K_TOK) || ''; } catch { /* */ }
let config = { paypal: '', prix: 3900, stripe: false };

function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 1800); }
function msg(t) { $('msg').textContent = t || ''; }
async function copy(t, what) {
  try { await navigator.clipboard.writeText(t); toast(what + ' copié'); }
  catch { prompt('copie :', t); }
}

async function api(path, body) {
  const r = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(); throw new Error('mot de passe refusé'); }
  if (!r.ok) throw new Error(data.error || 'erreur ' + r.status);
  return data;
}

// l'adresse comme on l'écrit sur l'enveloppe : la dernière ligne (code postal, ville) en capitales
function envelope(c) {
  const l = String(c.adresse || '').split('\n').filter(Boolean);
  if (l.length) l[l.length - 1] = l[l.length - 1].toUpperCase();
  return l.join('\n');
}
const euros = () => (config.prix / 100).toFixed(config.prix % 100 ? 2 : 0) + 'EUR';
const date = s => { try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return s; } };
const mailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');

// « ton poème est posté » : le modèle EmailJS si Maxence l'a créé (EMAILJS.poste), sinon un email tout prêt dans
// sa messagerie (même texte que ressources/email-poste.html)
const POSTE_TXT = p => `${p.toLowerCase()},\n\nton poème est parti.\nje l’ai tapé à la machine, une seule fois,\nglissé dans l’enveloppe noire, scellée à la cire.\nil est à la poste depuis aujourd’hui ;\nil arrive chez toi d’ici quelques jours.\n\n- ETERNEL -`;
async function mailPoste(c) {
  if (!mailOk(c.email)) { toast('pas d’email pour cette commande'); return false; }
  if (!confirm('envoyer « ton poème est posté » à ' + c.email + ' ?')) return false;
  if (EMAILJS.poste) {
    const p = params({ name: c.prenom, kind: 'note' });
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: EMAILJS.service, template_id: EMAILJS.poste, user_id: EMAILJS.key,
        template_params: { prenom: p.prenom, prenom_html: p.prenom_html, ref: c.ref, email_base: p.email_base, to_email: c.email } }),
    });
    if (!r.ok) { toast('email non parti (' + r.status + ')'); return false; }
  } else {
    location.href = 'mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent(c.prenom + ' — ton poème est posté') + '&body=' + encodeURIComponent(POSTE_TXT(c.prenom));
  }
  return true;
}

function card(c) {
  const box = el('div', 'cmd' + (c.essai ? ' essai' : ''));
  const tete = el('div', 'tete');
  tete.append(el('span', 'prenom', c.prenom), el('span', 'meta', c.ref + ' · ' + date(c.cree)));
  box.append(tete);
  box.append(el('div', 'meta', [MODES[c.mode] || c.mode, GENRES[c.genre] || c.genre, c.cadeau ? 'cadeau' : '', c.essai ? 'essai' : '', c.version ? 'version ' + c.version : '', c.de_la_part ? 'de la part de ' + c.de_la_part : ''].filter(Boolean).join(' · ')));
  if (c.question) { box.append(el('div', 'lbl', 'question'), el('div', 'txt', c.question)); }
  if (c.reponse) { box.append(el('div', 'lbl', c.genre === 'theme' ? 'thème' : 'réponse'), el('div', 'txt', c.reponse)); }
  if (c.adresse) { box.append(el('div', 'lbl', 'adresse'), el('div', 'txt', envelope(c))); }
  if (c.email || c.contact) {
    box.append(el('div', 'lbl', 'contact'));
    const m = c.email || c.contact, a = el('a', '', m); a.href = (mailOk(m) ? 'mailto:' : 'tel:') + m; box.append(a);
  }

  box.append(el('div', 'lbl', 'statut'));
  const st = el('div', 'statuts');
  for (const [k, t] of STATUTS) {
    const b = el('button', c.statut === k ? 'on' : '', t);
    b.onclick = async () => {
      if (k === c.statut) return;
      // postée : l'email à la personne (une seule fois, sauf si l'on insiste)
      const mail = k === 'postee' && mailOk(c.email) && (!c.poste_mail || confirm('l’email « posté » est déjà parti le ' + date(c.poste_mail) + '. le renvoyer ?'));
      try {
        const sent = mail ? await mailPoste(c) : false;
        const { commande } = await api('/admin/commande', { ref: c.ref, statut: k, posteMail: sent || undefined });
        box.replaceWith(card(commande)); toast(t + (sent ? ' · email parti' : ''));
      } catch (e) { toast(e.message); }
    };
    st.append(b);
  }
  box.append(st);
  if (c.poste_mail) box.append(el('div', 'meta', 'email « posté » : ' + date(c.poste_mail)));

  box.append(el('div', 'lbl', 'note'));
  const note = el('textarea'); note.value = c.note || ''; note.rows = 2;
  note.onchange = async () => { try { await api('/admin/commande', { ref: c.ref, note: note.value }); c.note = note.value; toast('note gardée'); } catch (e) { toast(e.message); } };
  box.append(note);

  // numéro de facture : pour plus tard (pas de SIRET, pas de facture pour l'instant)
  box.append(el('div', 'lbl', 'facture (plus tard)'));
  const fr = el('div', 'row'), fac = el('input'); fac.value = c.facture || ''; fac.placeholder = 'numéro'; fac.setAttribute('aria-label', 'numéro de facture');
  fac.onchange = async () => { try { await api('/admin/commande', { ref: c.ref, facture: fac.value }); toast('facture gardée'); } catch (e) { toast(e.message); } };
  fr.append(fac); box.append(fr);

  const ac = el('div', 'actions');
  if (c.adresse) { const b = el('button', '', 'copier l’adresse'); b.onclick = () => copy(envelope(c), 'adresse'); ac.append(b); }
  if (config.paypal) { const b = el('button', '', 'copier le lien paypal'); b.onclick = () => copy(config.paypal.replace(/\/+$/, '') + '/' + euros(), 'lien paypal'); ac.append(b); }
  if (config.stripe) {
    const b = el('button', '', 'copier un lien stripe');
    b.onclick = async () => { try { b.disabled = true; const { url } = await api('/admin/lien-stripe', { ref: c.ref }); await copy(url, 'lien stripe (24 h)'); } catch (e) { toast(e.message); } finally { b.disabled = false; } };
    ac.append(b);
  }
  if (c.lien && /^https:\/\//.test(c.lien)) { const a = el('a', '', 'voir la feuille'); a.href = c.lien; a.target = '_blank'; a.rel = 'noopener'; a.style.alignSelf = 'center'; ac.append(a); }
  box.append(ac);
  return box;
}

async function load() {
  msg('…');
  try {
    const st = $('filtre').value;
    const { commandes } = await api('/admin/commandes' + (st ? '?statut=' + st : ''));
    const list = $('essais').checked ? commandes : commandes.filter(c => !c.essai);
    $('liste').replaceChildren(...list.map(card));
    $('compte').textContent = list.length + (list.length > 1 ? ' commandes' : ' commande');
    msg(list.length ? '' : 'aucune commande');
  } catch (e) { msg(e.message); }
}
async function enter() {
  $('login').classList.remove('on'); $('app').hidden = false;
  try { config = await api('/admin/config'); } catch (e) { msg(e.message); return; }
  if (!config.base) { msg('la base n’est pas encore reliée (serveur/LISEZ-MOI.md)'); return; }
  load();
}
function logout() {
  tok = ''; try { localStorage.removeItem(K_TOK); } catch { /* */ }
  $('app').hidden = true; $('login').classList.add('on'); $('tok').value = ''; $('tok').focus();
}
$('go').onclick = () => { tok = $('tok').value.trim(); if (!tok) return; try { localStorage.setItem(K_TOK, tok); } catch { /* */ } enter(); };
$('tok').onkeydown = e => { if (e.key === 'Enter') $('go').click(); };
$('filtre').onchange = load; $('essais').onchange = load; $('rafraichir').onclick = load;
$('sortir').onclick = logout;
if (tok) enter(); else logout();
