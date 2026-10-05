// Envoi de la demande à Maxence par email (EmailJS, appel direct à leur API : aucune dépendance).
// Seule exception à « zéro appel réseau » : l'instant où la personne poste l'enveloppe (ou choisit « en direct »).
// Une demande qui n'a pas pu partir (pas de réseau) est gardée et renvoyée au retour du réseau / à la visite suivante.
// ?envoi=0 : rien n'est envoyé (essais).
import QUESTIONS from '../cards/questions.json';

const EMAILJS = { service: 'service_8wqf489', template: 'template_arafuuh', key: 'XreMhhJCN9l5J6V5J' };   // identifiants publics (aucun secret)
const K_PENDING = 'singulies.pending';
const OFF = (() => { try { return new URLSearchParams(location.search).get('envoi') === '0'; } catch { return false; } })();
const ready = () => !OFF && EMAILJS.service && EMAILJS.template && EMAILJS.key;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { reponse: 'une question du jeu', theme: 'carte blanche', improvisation: 'improvisation (sur le prénom)' };

// paramètres du modèle EmailJS (voir ressources/email-demande.html) ; *_html : à insérer avec {{{ }}}
export function params(d) {
  const q = d.kind === 'reponse' ? (QUESTIONS.find(x => x.id === d.id)?.q || '') : '';
  const name = (d.name || '').toUpperCase();
  return {
    prenom: name,
    colonne_html: [...name].map(c => c === ' ' ? '&nbsp;' : esc(c)).join('<br>'),
    genre: KIND[d.kind] || d.kind || '',
    question: q.toLowerCase(),
    reponse: d.kind === 'reponse' ? d.text || '' : '',
    theme: d.kind === 'theme' ? d.text || '' : '',
    mode: d.mode === 'direct' ? 'en direct' : 'par la poste',
    adresse_html: (d.address || []).map(esc).join('<br>'),
    adresse: (d.address || []).join('\n'),
    date: new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
  };
}

async function post(p) {
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: EMAILJS.service, template_id: EMAILJS.template, user_id: EMAILJS.key, template_params: p }),
  });
  if (!r.ok) throw new Error('emailjs ' + r.status);
}
const load = () => { try { return JSON.parse(localStorage.getItem(K_PENDING) || '[]'); } catch { return []; } };
const save = a => { try { a.length ? localStorage.setItem(K_PENDING, JSON.stringify(a)) : localStorage.removeItem(K_PENDING); } catch { /* */ } };

let flushing = false;
async function flush() {
  if (!ready() || flushing) return;
  flushing = true;
  let a = load();
  while (a.length) {
    try { await post(a[0]); a = a.slice(1); save(a); } catch (e) { console.warn('envoi', e); break; }
  }
  flushing = false;
}
export function send(detail) {
  if (OFF) return;
  save([...load(), params(detail)]);
  flush();
}

// la page : les demandes partent quand l'enveloppe est postée, ou quand on choisit « en direct »
export function installSend() {
  addEventListener('singulies:address', e => send(e.detail));
  addEventListener('singulies:order', e => { if (e.detail?.mode === 'direct') send(e.detail); });
  addEventListener('online', flush);
  flush();
}
