// La visionneuse (18/10) : toucher un poème (ou une image de la galerie) le montre de plus près — la feuille entière,
// cadrée — et l'on passe au suivant ou au précédent en glissant de gauche à droite (le doigt, la souris tenue), avec les
// flèches (← →) ou les boutons ; Échap, ×, ou toucher à côté : on referme. Les images suivent le doigt, puis se posent.
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHEV = d => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
let open = null;

// items : [{ src (adresse absolue), alt }] ; start : l'indice montré d'abord ; rend { close }
export function ouvrirVisionneuse(items, start = 0) {
  if (open) return open;
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = 'vz'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-roledescription', 'carrousel'); root.setAttribute('aria-label', 'images');
  root.innerHTML = `<div class="vz-track">${items.map((it, i) => `<figure class="vz-s" aria-label="${i + 1} sur ${items.length}"><img src="${esc(it.src)}" alt="${esc(it.alt || '')}" draggable="false" decoding="async"></figure>`).join('')}</div>
    <button class="vz-x" type="button" aria-label="fermer">×</button>
    ${items.length > 1 ? `<button class="vz-n prev" type="button" aria-label="précédent">${CHEV('M15 5 L8 12 L15 19')}</button><button class="vz-n next" type="button" aria-label="suivant">${CHEV('M9 5 L16 12 L9 19')}</button><p class="vz-c" aria-live="polite"></p>` : ''}`;
  document.body.appendChild(root);
  document.body.classList.add('vz-on');
  const track = root.querySelector('.vz-track'), cnt = root.querySelector('.vz-c'), prev = root.querySelector('.prev'), next = root.querySelector('.next');
  let i = Math.max(0, Math.min(items.length - 1, start)), dx = 0, sx = null, st = 0, moved = false;
  const W = () => root.clientWidth;
  const place = (animate = true) => {
    track.style.transition = animate && !REDUCED ? 'transform .5s cubic-bezier(.22,.8,.25,1)' : 'none';
    track.style.transform = `translate3d(${(-i * W() + dx).toFixed(1)}px,0,0)`;
    if (cnt) cnt.textContent = `${i + 1} / ${items.length}`;
    if (prev) { prev.disabled = i === 0; next.disabled = i === items.length - 1; }
    root.querySelectorAll('.vz-s').forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
  };
  const go = k => { i = Math.max(0, Math.min(items.length - 1, k)); dx = 0; place(); };
  place(false);
  requestAnimationFrame(() => root.classList.add('on'));

  // glisser : l'image suit le doigt (avec une résistance au bout), un geste franc ou assez long change d'image
  root.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    sx = e.clientX; st = performance.now(); dx = 0; moved = false;
    try { root.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  root.addEventListener('pointermove', e => {
    if (sx == null) return;
    let d = e.clientX - sx;
    if ((i === 0 && d > 0) || (i === items.length - 1 && d < 0)) d *= 0.28;
    if (Math.abs(d) > 6) moved = true;
    dx = d; place(false);
  });
  const end = e => {
    if (sx == null) return;
    const d = e.clientX - sx, v = Math.abs(d) / Math.max(1, performance.now() - st); sx = null;
    if (moved && (Math.abs(d) > W() * 0.18 || v > 0.45)) go(i + (d < 0 ? 1 : -1)); else { dx = 0; place(); }
    // un toucher à côté de l'image (pas sur elle) ferme
    if (!moved && !e.target.closest('img')) close();
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', () => { sx = null; dx = 0; place(); });
  prev?.addEventListener('click', () => go(i - 1)); next?.addEventListener('click', () => go(i + 1));
  root.querySelector('.vz-x').addEventListener('click', () => close());
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(i - 1); }
  };
  addEventListener('keydown', key, true);
  const rs = () => place(false);
  addEventListener('resize', rs);
  root.querySelector('.vz-x').focus({ preventScroll: true });
  function close() {
    if (!open) return;
    open = null;
    removeEventListener('keydown', key, true); removeEventListener('resize', rs);
    document.body.classList.remove('vz-on');
    root.classList.remove('on');
    setTimeout(() => root.remove(), REDUCED ? 0 : 300);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  open = { close, go };
  return open;
}
