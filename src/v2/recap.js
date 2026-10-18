// V2, décision 7 : avant le paiement, un récapitulatif de la feuille et de l'enveloppe, modifiable au toucher, et une carte
// « 39 € · payer ». Rend 'payer' | 'reponse' | 'adresse' | null (refermé : on reste sur l'enveloppe).
import { fenetre, esc } from './fenetre.js';
import { PRIX } from '../alt/config.js';
import { LIGNE_PAIEMENT } from '../core/paiement.js';
import { lire } from '../core/offrir.js';

const court = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const frDate = iso => { const [a, m, j] = String(iso).split('-'); return j + '/' + m + '/' + a; };

export function recap({ name, kind = 'reponse', text = '', question = '', fields = {}, payer = true } = {}) {
  return new Promise(fini => {
    let choix = null;
    const f = fenetre({ label: 'Récapitulatif de ta commande', classe: 'v2-rec', auFermer: () => fini(choix) });
    const f0 = fields || {};
    const adresse = [[f0.prenom, f0.nom].filter(Boolean).join(' '), f0.rue, f0.cplt, [f0.cp, f0.ville].filter(Boolean).join(' ')].map(x => String(x || '').trim()).filter(Boolean);
    const o = lire();
    const feuille = kind === 'reponse' ? (question ? esc(question) + '\n' : '') + '« ' + esc(court(text, 160)) + ' »'
      : kind === 'theme' ? 'ton thème : ' + esc(court(text, 160))
      : 'j’improvise à partir du prénom';
    const offert = o.offrir ? [o.quand ? 'pour le ' + frDate(o.quand) : '', o.dela ? 'de la part de ' + o.dela : '', o.mot ? 'avec un mot' : ''].filter(Boolean).join(' · ') : '';
    f.contenu(`<h2>ta commande</h2>
      <p class="v2-nom" style="text-align:center">${esc(name)}</p>
      <dl>
        <dt>la feuille</dt>
        <dd class="v2-ligne"><span>l’acrostiche ${esc(name)}, tapé une seule fois à la machine<br><span style="color:#b9b4aa">${feuille}</span></span><button type="button" class="v2-lien" data-m="reponse" aria-label="Modifier ma réponse">modifier</button></dd>
        <dt>l’enveloppe</dt>
        <dd class="v2-ligne"><span>${adresse.length ? adresse.map(esc).join('<br>') : 'pas encore d’adresse'}</span><button type="button" class="v2-lien" data-m="adresse" aria-label="Modifier l’adresse">modifier</button></dd>
        ${offert ? `<dt>offert</dt><dd>${esc(offert)}</dd>` : ''}
      </dl>
      <p class="v2-prix">${esc(PRIX)}, envoi en France compris.<br>${esc(LIGNE_PAIEMENT)}</p>
      <div class="v2-acts"><button type="button" class="v2-btn fort" data-m="payer">${esc(PRIX)} · ${payer ? 'payer' : 'commander'}</button></div>
      <div class="v2-acts"><button type="button" class="v2-btn discret" data-m="x">‹ revenir</button></div>`);
    f.carte.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { const m = b.dataset.m; choix = m === 'x' ? null : m; f.fermer('choix'); }));
  });
}
