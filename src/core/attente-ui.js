// Le petit panneau « me prévenir » (décision 0, C7) : le jeu sort bientôt, on laisse son email, il part vers la liste
// d'attente (src/core/attente.js). Commun à la scène du jeu (3D) et à sa version simple ; ouvert par-dessus la page,
// fermé par la croix, Échap ou, une fois l'email envoyé, par la croix aussi. Champ de 16 px (pas de zoom sur iPhone),
// boutons de 44 px, focus visible, annoncé aux lecteurs d'écran (role="dialog", message en role="status").
import { count } from '../app/count.js';
import { knownEmail } from '../app/storage.js';
import { inscrireAttente } from './attente.js';

const CSS = `
.sg-wait { position: fixed; left: 50%; bottom: max(28px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(92vw, 26em); box-sizing: border-box;
  padding: 18px 18px 14px; background: #0f0f0e; border: 1px solid #3a3733; box-shadow: 0 10px 40px rgba(0,0,0,.7); z-index: 60;
  font: 15px/1.55 'SG Machine', 'Courier New', monospace; color: #e6e2da; }
.sg-wait p { margin: 0 0 12px; padding-right: 36px; }
.sg-wait input { display: block; width: 100%; box-sizing: border-box; min-height: 44px; padding: 8px 10px; font: 16px/1.4 'SG Machine', 'Courier New', monospace;
  color: #fff; background: #060606; border: 1px solid #5a564f; border-radius: 0; -webkit-appearance: none; appearance: none; }
.sg-wait button { min-height: 44px; min-width: 44px; margin-top: 10px; padding: 0 14px; border: 1px solid #5a564f; background: transparent; color: #fff; cursor: pointer;
  font: 500 14px/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; }
.sg-wait .sg-wait-x { position: absolute; top: 4px; right: 4px; margin: 0; border: 0; font-size: 22px; letter-spacing: 0; }
.sg-wait :focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.sg-wait [hidden] { display: none !important; }
.sg-wait .sg-wait-msg { margin-top: 10px; min-height: 1.5em; color: #f0d9b5; }
`;

// liste : 'jeu' | 'lettre' ; rend { fermer } (une seule fenêtre à la fois)
let ouverte = null;
export function ouvrirAttente({ liste = 'jeu', titre = 'le jeu sort bientôt. laisse ton email : je te préviens, et c’est tout.', apresFermeture } = {}) {
  if (ouverte) { ouverte.input.focus(); return ouverte; }
  if (!document.getElementById('sg-wait-style')) { const st = document.createElement('style'); st.id = 'sg-wait-style'; st.textContent = CSS; document.head.appendChild(st); }
  const avant = document.activeElement;
  const box = document.createElement('div'); box.className = 'sg-wait'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Me prévenir');
  box.innerHTML = '<p></p><input type="email" name="email" autocomplete="email" inputmode="email" aria-label="Ton email" placeholder="ton email">' +
    '<button type="button" class="sg-wait-ok">ENVOYER</button><button type="button" class="sg-wait-x" aria-label="Fermer">×</button>' +
    '<div class="sg-wait-msg" role="status" aria-live="polite"></div>';
  box.querySelector('p').textContent = titre;
  document.body.appendChild(box);
  const input = box.querySelector('input'), ok = box.querySelector('.sg-wait-ok'), msg = box.querySelector('.sg-wait-msg'), x = box.querySelector('.sg-wait-x');
  input.value = knownEmail() || '';
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  addEventListener('keydown', esc, true);
  function fermer() {
    removeEventListener('keydown', esc, true); box.remove(); ouverte = null;
    if (avant && avant.focus) avant.focus({ preventScroll: true });
    if (apresFermeture) apresFermeture();
  }
  async function envoyer() {
    ok.disabled = true; msg.textContent = '…';
    const r = await inscrireAttente({ email: input.value, liste });
    ok.disabled = false;
    if (r.ok) { count('attente/' + liste); msg.textContent = 'c’est noté : je t’écris quand le jeu sort.'; input.hidden = true; ok.hidden = true; x.focus(); }
    else { msg.textContent = r.message; if (r.code === 'email') input.focus(); }
  }
  ok.addEventListener('click', envoyer);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); envoyer(); } });
  x.addEventListener('click', fermer);
  input.focus({ preventScroll: true });
  ouverte = { fermer, input };
  return ouverte;
}
