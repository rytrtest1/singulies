// La liste d'attente (« me prévenir », décision 0 C7) : le jeu SINGULIES sort bientôt ; plus tard, la lettre mensuelle.
// L'email part vers le Worker (route POST /attente, base D1), jamais ailleurs. Rien d'autre que l'email, la liste et
// la version n'est envoyé. `?envoi=0` (essais) : rien ne part.
import { PAIEMENT_URL } from '../alt/config.js';
import { EMAIL_RE, rememberEmail } from '../app/storage.js';
import { VERSION } from './version.js';

export const LISTES = ['jeu', 'lettre'];

// → { ok: true } | { ok: false, code: 'email' | 'liste' | 'reseau' | 'refuse', message }
export async function inscrireAttente({ email, liste = 'jeu', appel = (...a) => fetch(...a), url = PAIEMENT_URL } = {}) {
  const mail = String(email ?? '').trim();
  if (!EMAIL_RE.test(mail)) return { ok: false, code: 'email', message: 'cet email ne semble pas valable.' };
  if (!LISTES.includes(liste)) return { ok: false, code: 'liste', message: 'liste inconnue.' };
  rememberEmail(mail);
  let essai = false; try { essai = new URLSearchParams(location.search).get('envoi') === '0'; } catch { /* */ }
  if (essai) return { ok: true, essai: true };
  if (!url) return { ok: false, code: 'reseau', message: 'je ne peux pas te prévenir pour l’instant : écris-moi sur Instagram, @e.t.ernel.' };
  try {
    const r = await appel(url.replace(/\/$/, '') + '/attente', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, liste, version: VERSION, site: '' }),   // « site » : le piège à robots, toujours vide
    });
    if (!r.ok) return { ok: false, code: 'refuse', message: 'ça n’a pas marché : réessaie dans un instant.' };
    return { ok: true };
  } catch { return { ok: false, code: 'reseau', message: 'pas de réseau : réessaie dans un instant.' }; }
}
