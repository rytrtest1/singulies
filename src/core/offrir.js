// « Pour offrir » (décision 4) : celui qui offre peut dire POUR QUAND il le veut, signer (« de la part de ») et ajouter un mot
// court. Le poème part TOUJOURS à l'adresse du destinataire ; rien de tout cela ne fait partie de l'adresse. Gardé le temps de
// la visite (clé préfixée par version), il voyage avec la commande (email, suivi : colonnes de_la_part, mot, quand).
import { vk } from './version.js';

export const MOT_MAX = 300, DELA_MAX = 80;
const K = vk('singulies.offrir');
const VIDE = { offrir: false, quand: '', dela: '', mot: '' };

// La date : jj/mm/aaaa ou aaaa-mm-jj, à partir d'aujourd'hui seulement ; « urgent » si moins de 10 jours (l'auteur doit être prévenu)
export function analyserDate(valeur, aujourdhui = new Date()) {
  const v = String(valeur || '').trim();
  if (!v) return { ok: true, vide: true, iso: '', jours: null, urgent: false };
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v), j, mo, a;
  if (m) { a = +m[1]; mo = +m[2]; j = +m[3]; } else if ((m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})$/.exec(v))) { j = +m[1]; mo = +m[2]; a = +m[3]; } else return { ok: false, message: 'la date : jour, mois, année.' };
  const d = new Date(a, mo - 1, j);
  if (d.getFullYear() !== a || d.getMonth() !== mo - 1 || d.getDate() !== j) return { ok: false, message: 'cette date n’existe pas.' };
  const t0 = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const jours = Math.round((d - t0) / 86400000);
  if (jours < 0) return { ok: false, message: 'cette date est passée.' };
  const iso = a + '-' + String(mo).padStart(2, '0') + '-' + String(j).padStart(2, '0');
  return { ok: true, vide: false, iso, jours, urgent: jours < 10 };
}

export function nettoyer(o = {}) {
  return {
    offrir: !!o.offrir,
    quand: /^\d{4}-\d{2}-\d{2}$/.test(o.quand || '') ? o.quand : '',
    dela: String(o.dela || '').replace(/\s+/g, ' ').trim().slice(0, DELA_MAX),
    mot: String(o.mot || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MOT_MAX),
  };
}
export function lire() { try { return { ...VIDE, ...nettoyer(JSON.parse(sessionStorage.getItem(K) || '{}')) }; } catch { return { ...VIDE }; } }
export function ecrire(o) { const n = nettoyer({ ...lire(), ...o }); try { sessionStorage.setItem(K, JSON.stringify(n)); } catch { /* */ } return n; }
export function effacer() { try { sessionStorage.removeItem(K); } catch { /* */ } }
// ce qui part avec la commande
export const pourCommande = () => { const o = lire(); return o.offrir ? { dela: o.dela, mot: o.mot, quand: o.quand } : { dela: '', mot: '', quand: '' }; };
