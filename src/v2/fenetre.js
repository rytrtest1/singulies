// Une carte posée par-dessus la page (V2) : fond noir, focus rendu à la fermeture, Échap, Tab qui ne sort pas.
// Échap est pris ici (en capture) : la flèche ← de la cérémonie ne doit pas reculer en même temps.
import './v2.css';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fenetre({ label, classe = '', fermable = true, auFermer = null } = {}) {
  const avant = document.activeElement;
  const voile = document.createElement('div'); voile.className = 'v2-voile';
  const carte = document.createElement('div'); carte.className = 'v2-carte ' + classe;
  carte.setAttribute('role', 'dialog'); carte.setAttribute('aria-modal', 'true'); carte.setAttribute('aria-label', label || '');
  voile.appendChild(carte); document.body.appendChild(voile);
  let ferme = false;
  const fermer = (raison = 'x') => {
    if (ferme) return; ferme = true;
    removeEventListener('keydown', clavier, true);
    voile.classList.remove('on'); setTimeout(() => voile.remove(), 460);
    try { if (avant && avant.isConnected && typeof avant.focus === 'function') avant.focus({ preventScroll: true }); } catch { /* */ }
    if (auFermer) auFermer(raison);
  };
  const focalisables = () => [...carte.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent !== null || e === document.activeElement);
  function clavier(e) {
    if (!voile.isConnected) return;
    if (e.key === 'Escape' && fermable) { e.preventDefault(); e.stopImmediatePropagation(); fermer('echap'); return; }
    if (e.key === 'Tab') {
      const f = focalisables(); if (!f.length) return;
      const a = f.indexOf(document.activeElement), suivant = e.shiftKey ? (a <= 0 ? f.length - 1 : a - 1) : (a === f.length - 1 ? 0 : a + 1);
      if (a === -1 || (e.shiftKey && a === 0) || (!e.shiftKey && a === f.length - 1)) { e.preventDefault(); f[suivant].focus(); }
    }
  }
  addEventListener('keydown', clavier, true);
  if (fermable) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'v2-x'; x.setAttribute('aria-label', 'Fermer'); x.textContent = '✕';
    x.addEventListener('click', () => fermer('croix')); carte.appendChild(x);
  }
  voile.addEventListener('pointerdown', e => { if (fermable && e.target === voile) fermer('voile'); });
  requestAnimationFrame(() => voile.classList.add('on')); setTimeout(() => voile.classList.add('on'), 30);   // (pas seulement requestAnimationFrame : suspendu en arrière-plan)
  // remplace le contenu (sans la croix)
  const vider = () => { [...carte.children].forEach(c => { if (!c.classList.contains('v2-x')) c.remove(); }); };
  const contenu = html => { vider(); carte.insertAdjacentHTML('beforeend', html); const f = carte.querySelector('[autofocus], input, textarea, .v2-btn.fort'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 60); };
  return { voile, carte, fermer, contenu, ouverte: () => !ferme };
}
