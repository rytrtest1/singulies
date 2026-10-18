// La feuille de la fiche « un prénom, un poème » (18/10) : le champ de personnalisation, comme un aperçu de gravure sur
// une boutique — on écrit le prénom, il se pose en colonne sur la feuille noire, un fil cousu par vers. Même géométrie
// et mêmes matières que la version épurée (epure.js), sans le champ de prénoms ni les mains.
import { stitch, paintThread } from '../alt/stitch.js';
import { norm } from '../basique/basique.js';

// en cqw, l'unité de la feuille (100 = sa largeur, 139,4 = sa hauteur)
const G = { top: 24.5, x0: 28.7, x1: 86.2, lhMax: 7, room: 104, gap: 0.6 };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// host : l'élément où poser la feuille ; input : le champ de prénom (un vrai <input>, ailleurs dans la fiche)
export function mountFeuille(host, input, { onChange = () => {}, invite = 'écris le prénom' } = {}) {
  host.innerHTML = `<div class="paper"><div class="sheet"><canvas class="rules" aria-hidden="true"></canvas><div class="col" aria-hidden="true"></div>
    <span class="cur" aria-hidden="true"></span><span class="inv" aria-hidden="true"></span></div></div>`;
  const sheet = host.querySelector('.sheet'), col = host.querySelector('.col'), cur = host.querySelector('.cur'), inv = host.querySelector('.inv'), rules = host.querySelector('.rules');
  inv.textContent = invite;
  let shown = '';
  const born = new Map();
  let lay = { rows: [], lh: G.lhMax, next: 0 };

  function layout(s) {
    const L = [...s.trimEnd()];
    const units = L.reduce((u, c) => u + (c === ' ' ? G.gap : 1), 0);
    const lh = Math.min(G.lhMax, G.room / Math.max(units + 1, 1));
    let y = 0;
    const rows = L.map(c => { const r = { c, y }; y += c === ' ' ? lh * G.gap : lh; return r; });
    if (s.endsWith(' ') && L.length) y += lh * G.gap;
    return { rows, lh, next: y };
  }
  function render() {
    const s = norm(input.value);
    if (s === shown) return place();
    shown = s;
    lay = layout(s);
    const kids = [...col.children];
    let keep = 0;
    while (keep < kids.length && keep < lay.rows.length && kids[keep].dataset.c === lay.rows[keep].c) keep++;
    kids.slice(keep).forEach(k => k.remove());
    for (const k of [...born.keys()]) if (k >= keep) born.delete(k);
    lay.rows.slice(keep).forEach((r, j) => {
      const b = document.createElement('b');
      b.dataset.c = r.c; b.textContent = r.c === ' ' ? '' : r.c;
      if (r.c !== ' ') { b.className = 'in'; born.set(keep + j, performance.now() + j * 40); }
      col.appendChild(b);
    });
    place(); onChange(s);
  }
  function place() {
    const { rows, lh, next } = lay;
    [...col.children].forEach((b, i) => {
      const r = rows[i]; if (!r) return;
      Object.assign(b.style, { top: (G.top + r.y) + 'cqw', fontSize: (lh * 0.9) + 'cqw', lineHeight: lh + 'cqw', height: lh + 'cqw' });
    });
    const full = shown.trimEnd().length >= 22;
    Object.assign(cur.style, { top: (G.top + next + lh * 0.1) + 'cqw', height: (lh * 0.8) + 'cqw' });
    cur.classList.toggle('off', full || (document.activeElement !== input && !!shown.trim()));
    inv.style.top = (G.top + lh * 0.36) + 'cqw';
    inv.style.opacity = shown.trim() ? 0 : 1;
    sew();
  }
  let sewRaf = 0;
  function sew() {
    cancelAnimationFrame(sewRaf);
    const W = sheet.clientWidth, H = sheet.clientHeight, cq = W / 100, dpr = Math.min(3, devicePixelRatio || 1);
    if (!W) return;
    if (rules.width !== Math.round(W * dpr)) { rules.width = Math.round(W * dpr); rules.height = Math.round(H * dpr); }
    const x = rules.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const now = performance.now();
    let more = false;
    lay.rows.forEach((r, i) => {
      if (r.c === ' ') return;
      const t0 = born.get(i), p = REDUCED || t0 == null ? 1 : Math.max(0, Math.min(1, (now - t0 - 90) / 420));
      if (p < 1) more = true;
      if (p <= 0) return;
      const e = 1 - Math.pow(1 - p, 3), a = G.x0 * cq, b = a + (G.x1 - G.x0) * cq * e;
      if (b - a > 6) paintThread(x, a, b, (G.top + r.y + lay.lh * 0.8) * cq, 11 + i * 7, null, { g0: i * 37, sag: 0.3 });
    });
    if (more) sewRaf = requestAnimationFrame(sew);
  }
  const ro = new ResizeObserver(() => sew());
  ro.observe(sheet);
  input.addEventListener('input', render);
  input.addEventListener('focus', place);
  input.addEventListener('blur', place);
  // toucher la feuille = écrire dessus (le clavier s'ouvre dans le même geste)
  sheet.addEventListener('click', () => input.focus({ preventScroll: true }));
  render();
  document.fonts?.ready?.then(() => { place(); });
  return { get name() { return shown.trim(); }, refresh: render, destroy() { ro.disconnect(); cancelAnimationFrame(sewRaf); input.removeEventListener('input', render); } };
}

export { stitch };
