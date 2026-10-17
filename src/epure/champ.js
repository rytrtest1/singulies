// Le champ de prénoms, derrière la feuille (17/10, Maxence : « un juste milieu entre l'aisance et le poétique ») : la
// signature du site, gardée vivante dans la version épurée. Des prénoms en perspective, plus clairs au fond, plus
// sombres et flous devant, qui avancent lentement vers nous (point de fuite au centre de la feuille) ; quand on tape le
// prénom, ses lettres s'allument dans le champ, du fond vers l'avant, puis restent un peu plus claires.
// Canvas 2D (le premier écran reste une page, pas une scène) : flou par l'ombre portée (marche partout).
import { NAMES } from '../field/names.js';

const LIST = (Array.isArray(NAMES) ? NAMES : String(NAMES).trim().split(/\s+/)).filter(Boolean);
const N = 64, Z0 = 4.2, Z1 = 34, ZF = 30, FOV = 48 * Math.PI / 180, CAP = 0.36;   // taille d'une capitale (monde)
const rnd = (a, b) => a + Math.random() * (b - a);
const pickName = () => LIST[Math.floor(Math.random() * LIST.length)];

export function mountChamp(cv, { center, reduced = false } = {}) {
  const x = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, f = 1, cx = 0, cy = 0, raf = 0, last = 0, running = false, visible = true;
  const widths = new Map();                       // largeur de chaque lettre à 100 px (Garamond)
  const words = [];
  let lit = new Set(), litAt = 0;

  function charW(c) {
    let w = widths.get(c);
    if (w == null) { x.font = '500 100px "SG Garamond", Georgia, serif'; w = x.measureText(c).width; widths.set(c, w); }
    return w;
  }
  function spawn(w, fresh) {
    w.name = pickName();
    w.z = fresh ? rnd(26, Z1) : Z0 + Math.pow(Math.random(), 0.7) * (Z1 - Z0);
    // dans le cône de vue (un peu au-delà des bords : ils y entrent en avançant)
    const tx = Math.tan(FOV / 2) * (W / H) * 1.15, ty = Math.tan(FOV / 2) * 1.1;
    w.x = rnd(-tx, tx) * w.z; w.y = rnd(-ty, ty) * w.z;
    w.born = fresh ? performance.now() : -1e9;
    w.l = new Float32Array(w.name.length);        // lumière de chaque lettre
    w.on = new Float64Array(w.name.length).fill(Infinity);   // instant où elle s'allume
    w.seed = Math.random();
    if (lit.size) schedule(w, performance.now());
  }
  // l'onde : du fond vers l'avant (≈ 4 s), un petit retard propre à chaque lettre
  function schedule(w, now) {
    for (let i = 0; i < w.name.length; i++) {
      if (!lit.has(w.name[i])) { w.on[i] = Infinity; continue; }
      if (w.on[i] !== Infinity) continue;
      w.on[i] = now + ((Z1 - w.z) / (Z1 - Z0)) * 3600 + w.seed * 380 + i * 40;
    }
  }
  function setName(s) {
    const next = new Set(String(s).replace(/[^A-Z]/g, ''));
    for (const w of words) for (let i = 0; i < w.name.length; i++) if (!next.has(w.name[i])) w.on[i] = Infinity;
    lit = next; litAt = performance.now();
    for (const w of words) schedule(w, litAt);
    wake();
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    f = (H / 2) / Math.tan(FOV / 2);
    const c = center ? center() : [W / 2, H / 2];
    cx = c[0]; cy = c[1];
    if (!words.length) for (let i = 0; i < N; i++) { const w = {}; words.push(w); spawn(w, false); }
    draw(0);
  }

  function draw(dt) {
    const now = performance.now();
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    x.textBaseline = 'alphabetic';
    // loin → proche
    words.sort((a, b) => b.z - a.z);
    for (const w of words) {
      // la caméra avance : les mots proches défilent plus vite (parallaxe réelle)
      if (dt) w.z -= dt * 0.11 * Math.sqrt(w.z / 12);
      const s = f / w.z, px = cx + w.x * s, py = cy + w.y * s, size = CAP * s / 0.7;
      if (w.z < Z0 || px < -W * 0.4 || px > W * 1.4 || py < -H * 0.3 || py > H * 1.3) { spawn(w, true); continue; }
      // gris par profondeur (devant le plus sombre), naissance en fondu (4 s)
      const depth = (w.z - Z0) / (Z1 - Z0);
      const base = 0.14 + 0.24 * depth;
      const fade = Math.min(1, (now - w.born) / 4000) * Math.min(1, (w.z - Z0) / 1.2);
      const blur = Math.min(size * 0.14, 0.055 * f * Math.abs(1 / w.z - 1 / ZF));
      // l'interlettrage : plus d'air pour les petits mots lointains
      const ls = size * (0.16 + 0.3 * depth);
      let wd = 0; for (const c of w.name) wd += charW(c) * size / 100 + ls; wd -= ls;
      let cxw = px - wd / 2;
      x.font = `500 ${size.toFixed(2)}px "SG Garamond", Georgia, serif`;
      for (let i = 0; i < w.name.length; i++) {
        const c = w.name[i];
        if (reduced) w.l[i] = w.on[i] !== Infinity ? 1 : 0;
        else if (dt) { const target = now >= w.on[i] ? 1 : 0; w.l[i] += (target - w.l[i]) * Math.min(1, dt / (target ? 0.7 : 2.2)); }
        // allumée : jusqu'à ≈ 3 × plus claire, une clarté qui respire un peu
        const glow = w.l[i] * (0.55 + 0.08 * Math.sin(now / 900 + w.seed * 9 + i));
        const v = Math.min(1, base + glow * (0.75 - base * 0.6));
        const g = Math.round(6 + (v * 255 - 6) * 0.62);
        const col = `rgba(${g},${g},${g},${fade.toFixed(3)})`;
        if (blur > 0.6) {
          // flou : l'ombre portée d'une lettre dessinée hors du cadre (marche dans tous les navigateurs)
          x.shadowColor = col; x.shadowBlur = blur * dpr; x.shadowOffsetX = 10000 * dpr; x.fillStyle = col;
          x.fillText(c, cxw - 10000, py);
          x.shadowBlur = 0; x.shadowOffsetX = 0;
        } else { x.fillStyle = col; x.fillText(c, cxw, py); }
        cxw += charW(c) * size / 100 + ls;
      }
    }
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (reduced) { draw(0.016); return; }
    if (!running || raf || !visible || document.hidden) return;
    last = 0; raf = requestAnimationFrame(frame);
  }
  function start() { running = true; wake(); }
  function stop() { running = false; cancelAnimationFrame(raf); raf = 0; }

  new ResizeObserver(resize).observe(cv);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(cv);
  document.addEventListener('visibilitychange', wake);
  document.fonts && document.fonts.ready.then(() => { widths.clear(); draw(0); });
  resize();
  if (!reduced) start();
  return { setName, start, stop, resize };
}
