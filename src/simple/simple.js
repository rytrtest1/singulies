// La version simple (09/10). Maxence : « pas de façon flemmarde mais bien pensée de bout en bout, par respect pour
// ceux qui en pâtissent, et activée seulement quand nécessaire ». Tout le parcours sans WebGL : le même monde (le noir,
// EB Garamond, la machine à écrire), les mêmes mots, le même ordre, les mêmes gestes. Les objets sont ceux du site,
// rendus une fois en images par le vrai moteur (tools/simple-assets.mjs → public/simple/ ; les cartes questions de
// l'email, public/email/q/) ; le mouvement est confié au navigateur (fondus, glissés, retournements en CSS 3D).
// Quand : sans WebGL2 (téléphone ancien, Safari en panne de WebGL), ou quand une scène 3D n'a pas pu se monter
// (mémoire) — scène par scène : si le champ de prénoms marche, on le garde. ?simple=1 : tout en simple ;
// ?simple=suite : le vrai champ de prénoms, puis la suite en simple (essais).
import QUESTIONS from '../cards/questions.json';
import { NAMES } from '../field/names.js';
import { ITEMS, LINKS, JEU_LINK } from '../portal/items.js';
import { FIELDS, ADDR, SENDER, ENV, STAMP, STAMPED, fieldsReady, fieldsOut } from '../sheet/envelope.js';
import { handName } from '../text/accents.js';

const Q = new URLSearchParams(location.search);
export const SIMPLE = Q.get('simple') === '1' ? 'all' : Q.get('simple') === 'suite' ? 'suite' : null;
const NOADDR = Q.get('adresse') === '0' || ['merci', 'pour'].includes(document.documentElement.dataset.page);   // merci.html, pour.html : l'adresse est chez Stripe
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches;
const url = p => new URL(p, document.baseURI).href;
const clamp = (a, b, x) => Math.min(b, Math.max(a, x));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// ---- les cartes, la feuille, l'enveloppe : proportions des images (l'objet occupe `f` de la largeur, centré) ----
const IMG = { card: { w: 900, h: 550, f: 0.86, mm: 87 }, sheet: { w: 800, h: 1100, f: 0.92, mm: 148 }, env: { w: 1000, h: 760, f: 0.9, mm: 229 } };
const SHEET = { w: 148, h: 210 };                         // la feuille A5 (comme sheet.js)
const COL = 34, C_POSE = { x: 26, y: -SHEET.h / 2 + 15 - 26, rz: -0.07 };   // colonne de l'acrostiche, carte posée (mm)
const PITCH = 2.54, TYPE_MM = 2.54 / 0.6;                 // la machine : pas (mm), corps (mm)
const qImg = id => url('email/q/' + id + '.jpg');

// ---- polices, styles ----
let fontsP = null;
function fonts() {
  if (fontsP) return fontsP;
  const ff = [
    new FontFace('SG Machine', `url(${url('fonts/CourierPrime-latin.woff2')})`, { unicodeRange: 'U+0000-00FF, U+2000-206F' }),
    new FontFace('SG Machine', `url(${url('fonts/CourierPrime-latin-ext.woff2')})`, { unicodeRange: 'U+0100-024F, U+0152-0153' }),
    new FontFace('SG Garamond', `url(${url('fonts/EBGaramond-500.woff2')})`, { weight: '500' }),
  ];
  fontsP = Promise.all(ff.map(f => f.load().then(x => document.fonts.add(x)).catch(() => {})));
  return fontsP;
}
const CSS = `
.sp-root { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 30; background: #060606; color: rgb(174,174,174);
  overflow: hidden; touch-action: pinch-zoom; -webkit-tap-highlight-color: transparent; opacity: 0; transition: opacity .9s ease;
  font: 16px/1.6 'SG Machine', 'Courier New', monospace; -webkit-user-select: none; user-select: none; }
.sp-root.on { opacity: 1; }
.sp-stage { position: absolute; inset: 0; perspective: 1600px; }
.sp-card { position: absolute; left: 0; top: 0; transform-style: preserve-3d; will-change: transform; transition: opacity .6s ease; }
.sp-card img { position: absolute; inset: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  pointer-events: none; -webkit-user-drag: none; }
.sp-card img.back { transform: rotateY(180deg); }
.sp-name { position: absolute; left: 16px; right: 16px; text-align: center; white-space: pre; pointer-events: none;
  font: 500 32px/1.25 'SG Garamond', Georgia, serif; letter-spacing: .45em; padding-left: .45em; color: rgb(174,174,174); }
.sp-name span { transition: color 2.4s ease; }
.sp-name span.lit { color: rgb(238,238,238); transition: color .45s ease; }
.sp-title { position: absolute; left: 0; right: 0; text-align: center; font: 500 32px/1 'SG Garamond', Georgia, serif;
  letter-spacing: .45em; padding-left: .45em; color: rgb(158,158,158); pointer-events: none; }
.sp-title span { opacity: 0; }
.sp-title span.on { opacity: 1; }
.sp-btn { position: absolute; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; font-size: 1px; cursor: pointer; outline: none; }
.sp-btn:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
.sp-sign { position: absolute; left: 0; right: 0; text-align: center; font: 500 14px/44px 'SG Garamond', Georgia, serif; letter-spacing: .4em;
  padding: 0 0 0 .4em; margin: 0; border: 0; background: transparent; color: #fff; opacity: 0; transition: opacity 1.2s; pointer-events: none; cursor: pointer; }
.sp-sign.on { opacity: .62; pointer-events: auto; }
.sp-sign .sp-sub { display: block; margin-top: -10px; font-size: 13px; line-height: 1.2; letter-spacing: .04em; padding-left: 0; opacity: .55; }
.sp-sign.on:hover { opacity: .85; }
.sp-back { position: absolute; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center; color: #fff; opacity: 0; transition: opacity .8s; pointer-events: none;
  border: 0; background: transparent; padding: 0; cursor: pointer; z-index: 3; }
.sp-back.on { opacity: .62; pointer-events: auto; }
.sp-write { position: absolute; margin: 0; padding: 0; border: 0; outline: none; resize: none; background: transparent; overflow: hidden;
  font: 16px/1.7 'SG Machine', 'Courier New', monospace; color: rgb(222,222,222); caret-color: rgba(255,255,255,.8); text-transform: lowercase;
  -webkit-user-select: text; user-select: text; -webkit-appearance: none; border-radius: 0; }
.sp-write::placeholder { color: rgba(255,255,255,.3); text-transform: none; }
.sp-curl { position: absolute; width: 22px; height: 22px; opacity: 0; transition: opacity 1s; pointer-events: none;
  background: linear-gradient(225deg, #060606 0 49%, rgba(255,255,255,.16) 50%, rgba(30,30,30,1) 72%); border-radius: 0 3px 0 0; }
.sp-curl.on { opacity: 1; }
.sp-letter { position: absolute; left: 0; top: 0; font: 500 20px/1 'SG Garamond', Georgia, serif; color: rgb(214,214,214); white-space: pre;
  will-change: transform; pointer-events: none; }
.sp-type { position: absolute; white-space: pre; font-family: 'SG Machine', 'Courier New', monospace; color: rgba(255,255,255,.62); pointer-events: none; }
.sp-type span { display: inline-block; }
.sp-field { position: absolute; margin: 0; padding: 0; border: 0; outline: none; background: transparent; border-radius: 0; -webkit-appearance: none;
  font: 16px/1 'SG Machine', 'Courier New', monospace; color: rgb(226,226,226); caret-color: rgba(255,255,255,.8);
  -webkit-user-select: text; user-select: text; }
.sp-field::placeholder { color: rgba(255,255,255,.26); }
.sp-field:-webkit-autofill, .sp-field:autofill { -webkit-text-fill-color: rgb(226,226,226); -webkit-box-shadow: 0 0 0 1000px transparent inset;
  transition: background-color 99999s 0s; }
.sp-under { position: absolute; white-space: pre; overflow: hidden; font-family: 'SG Machine', 'Courier New', monospace; color: rgba(255,255,255,.4); pointer-events: none; }
.sp-mail { position: absolute; left: 50%; width: 190px; transform: translateX(-50%); opacity: 0; transition: opacity 1.1s; }
.sp-mail.on { opacity: 1; }
.sp-mail input { display: block; width: 100%; box-sizing: border-box; text-align: center; font: 16px/1.5 'SG Machine', 'Courier New', monospace;
  color: rgb(214,214,214); background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.3); border-radius: 0; padding: 4px 0;
  outline: none; -webkit-appearance: none; caret-color: rgba(255,255,255,.7); -webkit-user-select: text; user-select: text; }
.sp-mail input::placeholder { color: transparent; transition: color .8s; }
.sp-mail.ready input::placeholder { color: rgba(255,255,255,.3); }   /* (10/10) « email » une fois l'enveloppe disparue */
.sp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@keyframes sp-bob { 0%, 100% { translate: 0 0; } 18% { translate: 0 -14px; } 36% { translate: 0 0; } 50% { translate: 0 -5px; } 64% { translate: 0 0; } }
`;
function css() {
  if (document.getElementById('sp-style')) return;
  const s = document.createElement('style'); s.id = 'sp-style'; s.textContent = CSS; document.head.appendChild(s);
}
function el(tag, cls, parent, html) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e;
}
const BACK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

// une racine plein écran qui suit la partie visible (clavier ouvert : visualViewport)
function makeRoot(cls) {
  css(); fonts();
  const root = el('div', 'sp-root ' + (cls || ''), document.body);
  const stage = el('div', 'sp-stage', root);
  const sr = el('div', 'sp-sr', root); sr.setAttribute('aria-live', 'polite');
  const vv = window.visualViewport;
  const size = { W: innerWidth, H: innerHeight, top: 0, kb: 0 };
  const fit = () => {
    size.W = innerWidth; size.H = vv ? vv.height : innerHeight; size.top = vv ? vv.offsetTop : 0;
    size.kb = vv ? Math.max(0, innerHeight - vv.height) : 0;
    root.style.top = size.top + 'px'; root.style.height = size.H + 'px';
  };
  fit();
  const timers = new Set();
  const api = {
    root, stage, size,
    say: t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); },
    later: (f, ms) => { const id = setTimeout(() => { timers.delete(id); f(); }, ms); timers.add(id); return id; },
    clear: () => { for (const id of timers) clearTimeout(id); timers.clear(); },
    onResize: null,
    show: () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on'))),
    remove: () => { api.clear(); removeEventListener('resize', onR); vv?.removeEventListener('resize', onR); vv?.removeEventListener('scroll', onR); root.remove(); },
  };
  const onR = () => { fit(); api.onResize?.(); };
  addEventListener('resize', onR); vv?.addEventListener('resize', onR); vv?.addEventListener('scroll', onR);
  return api;
}

// ---- une carte : deux faces ; pose = { x, y (centre, px), w (largeur de l'image), r (deg), ry (deg), z (px), s } ----
function makeCard(parent, front, back = url('simple/dos.jpg')) {
  const c = el('div', 'sp-card', parent);
  const f = el('img', 'front', c); f.src = front; f.alt = ''; f.decoding = 'async';
  const b = el('img', 'back', c); b.src = back; b.alt = ''; b.decoding = 'async';
  c.pose = null;
  return c;
}
const tf = p => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) translateZ(${p.z || 0}px) rotate(${p.r || 0}deg) rotateY(${p.ry || 0}deg) scale(${p.s ?? 1})`;
function setPose(c, p) {
  c.pose = { ...p };
  c.style.width = p.w + 'px'; c.style.height = (p.w * IMG.card.h / IMG.card.w) + 'px';
  c.style.transform = tf(p);
}
// d'une pose à l'autre (par des poses intermédiaires) ; rend une promesse ; mouvement réduit : fondu seulement
function move(c, to, { dur = 900, via = [], easing = 'cubic-bezier(.3,.6,.2,1)' } = {}) {
  const from = c.pose || to;
  setPose(c, to);
  if (REDUCED || !c.animate) return Promise.resolve();
  const frames = [from, ...via, to].map(p => ({ transform: tf({ ...to, ...p, w: to.w }) }));
  c.getAnimations?.().forEach(a => a.cancel());
  return c.animate(frames, { duration: dur, easing }).finished.catch(() => {});
}
// glisser : renvoie { dx, dy } à la fin d'un geste sur un élément (ou un toucher : dx = dy = 0)
// capture : le doigt reste à l'élément (une carte qu'on glisse) ; jamais sur toute la page (elle volerait les clics)
function gesture(target, { onMove, onEnd, capture = true } = {}) {
  let s = null;
  target.addEventListener('pointerdown', e => { s = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; if (capture) try { target.setPointerCapture(e.pointerId); } catch { /* */ } });
  target.addEventListener('pointermove', e => { if (s && e.pointerId === s.id) onMove?.(e.clientX - s.x, e.clientY - s.y); });
  const end = e => { if (!s || e.pointerId !== s.id) return; const d = { dx: e.clientX - s.x, dy: e.clientY - s.y, dt: performance.now() - s.t }; s = null; onEnd?.(d); };
  target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
}
// le prénom, comme partout : EB Garamond, capitales espacées ; deux mots trop larges : deux lignes ; une lettre = un span
function nameEl(parent, name, W) {
  const n = el('div', 'sp-name', parent);
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const maxW = Math.min(W - 32, 760);
  let fs = clamp(22, 40, W * 0.055 / 0.65);
  const fill = lines => { n.textContent = ''; lines.forEach((l, i) => { if (i) n.appendChild(document.createTextNode('\n')); for (const ch of l) { const sp = el('span', '', n); sp.textContent = ch; } }); };
  // largeur réelle du texte (le bloc, lui, fait toute la largeur) : des lettres extrêmes, ligne la plus longue
  const textW = () => { let w = 0; for (const sp of n.querySelectorAll('span')) { const r = sp.getBoundingClientRect(); w = Math.max(w, r.right); } const f = n.querySelector('span')?.getBoundingClientRect(); return f ? w - Math.min(...[...n.querySelectorAll('span')].map(x => x.getBoundingClientRect().left)) : 0; };
  n.style.fontSize = fs + 'px'; fill([words.join(' ')]);
  if (textW() > maxW && words.length > 1) fill([words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]);
  while (textW() > maxW && fs > 14) { fs *= 0.92; n.style.fontSize = fs + 'px'; }
  n.fs = fs;
  // les lettres tapées qui sont dans le prénom s'éclairent, puis reviennent au repos
  n.light = ch => { const c = plain(ch); for (const sp of n.querySelectorAll('span')) if (sp.textContent === c) { sp.classList.add('lit'); setTimeout(() => sp.classList.remove('lit'), 700); } };
  return n;
}
// tapé à la machine, frappe par frappe (chaque caractère a son appui, son petit décalage) ; promesse à la fin
function typeInto(elm, text, { ch = 85, nl = 260, later = setTimeout } = {}) {
  elm.textContent = '';
  return new Promise(res => {
    let i = 0;
    const step = () => {
      if (i >= text.length) { res(); return; }
      const c = text[i++];
      if (c === '\n') elm.appendChild(document.createElement('br'));
      else {
        const sp = el('span', '', elm); sp.textContent = c;
        const h = Math.sin((i + 1) * 12.9898 + c.charCodeAt(0) * 78.233) * 43758.5453, r = k => { const x = Math.sin(h * (k + 1)) * 9999; return x - Math.floor(x); };
        sp.style.opacity = (0.72 + 0.28 * r(1)).toFixed(2);
        sp.style.transform = `translate(${((r(2) - 0.5) * 0.06).toFixed(3)}em, ${((r(3) - 0.5) * 0.08).toFixed(3)}em) rotate(${((r(4) - 0.5) * 1.6).toFixed(2)}deg)`;
      }
      if (REDUCED) step(); else later(step, c === '\n' ? nl : ch * (0.75 + 0.5 * Math.random()));
    };
    step();
  });
}

// ===================================================================================================================
// le portail : ETERNEL tapé, les quatre cartes données du haut vers le bas
// opts : { onReady, onPoem, onJeu } — même interface que portal.js (show, hide)
export function mountSimplePortal(opts = {}) {
  const R = makeRoot('sp-portal');
  const { root, stage, size } = R;
  const title = el('div', 'sp-title', root);
  for (const ch of 'ETERNEL') el('span', '', title).textContent = ch;
  title.setAttribute('aria-label', 'ETERNEL'); title.setAttribute('role', 'heading');
  const cards = ITEMS.map((it, i) => {
    const c = makeCard(stage, url('simple/portail-' + it.id + '.jpg'), url('simple/bientot.jpg'));
    const b = el('button', 'sp-btn', root); b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-label', it.label);
    return { ...it, i, c, b, r: it.id === 'jeu' ? 0 : (Math.random() - 0.5) * 3, busy: false };   // le paquet trône, droit
  });
  let placed = false, gone = false;
  function layout() {
    const { W, H } = size, portrait = W < H * 1.1;
    const fsT = clamp(26, 46, Math.min(W, 820) * 0.112);
    title.style.fontSize = fsT + 'px'; title.style.top = Math.round(H * 0.07) + 'px';
    const top = H * 0.07 + fsT * 1.6, avail = H - top - H * 0.04;
    let cw, pos;
    if (portrait) {
      // (09/10, soir) les trois cartes plus serrées ; le paquet entier, en bas, au milieu
      cw = Math.min(W * 0.96, avail / (2 * 0.47 + 0.611 + 0.2 + 0.611));
      pos = cards.map((c, k) => k === 3 ? { x: W / 2, y: top + avail - cw * 0.31 } : { x: W / 2 + (k % 2 ? 1 : -1) * cw * 0.02, y: top + cw * 0.3 + k * cw * 0.47 });
    } else {
      cw = Math.min(W * 0.42, (avail / 2) / 0.62);
      pos = cards.map((c, k) => ({ x: W / 2 + (k % 2 ? 0.5 : -0.5) * cw * 0.93, y: top + cw * 0.31 + Math.floor(k / 2) * cw * 0.6 }));
    }
    cards.forEach((c, k) => {
      c.home = { ...pos[k], w: cw, r: c.r, ry: c.flipped ? 180 : 0 };
      if (placed) setPose(c.c, c.home);
      const vw = cw * IMG.card.f, vh = vw * 52 / 87;
      Object.assign(c.b.style, { left: (pos[k].x - vw / 2) + 'px', top: (pos[k].y - vh / 2) + 'px', width: vw + 'px', height: vh + 'px' });
    });
  }
  R.onResize = layout;
  layout();
  // la donne : ETERNEL se tape, les cartes arrivent du fond, du haut vers le bas, chacune glisse sous la précédente
  fonts().then(() => {
    layout();
    title.querySelectorAll('span').forEach((s, i) => R.later(() => s.classList.add('on'), REDUCED ? 0 : 200 + i * 140 + Math.random() * 60));
    cards.forEach((c, k) => {
      setPose(c.c, { ...c.home, y: c.home.y + 60, s: 0.92 }); c.c.style.opacity = 0;
      c.c.style.zIndex = String(10 - k);
      R.later(() => { c.c.style.opacity = 1; move(c.c, c.home, { dur: 1100 }); }, REDUCED ? 0 : 500 + k * 260);
    });
    placed = true;
    R.later(() => opts.onReady?.(), REDUCED ? 100 : 500 + 4 * 260 + 1100);
  });
  R.show();
  function choose(c) {
    if (gone || c.busy) return;
    if (c.id === 'poeme') { api.hide(); opts.onPoem?.(); return; }
    if (c.id === 'jeu') { opts.onJeu?.(); return; }
    const link = LINKS[c.id];
    if (link) { location.href = link; return; }
    // lien d'attente : la carte se retourne (« bientôt »), puis revient
    c.busy = true; c.flipped = true;
    move(c.c, { ...c.home, ry: 180 }, { dur: 900, via: [{ ...c.home, ry: 90, z: 60, s: 1.04 }] });
    R.later(() => { c.flipped = false; move(c.c, { ...c.home, ry: 0 }, { dur: 900, via: [{ ...c.home, ry: 90, z: 60, s: 1.04 }] }).then(() => { c.busy = false; }); }, 3100);
  }
  cards.forEach(c => {
    c.b.addEventListener('click', () => choose(c));
    c.b.addEventListener('pointerdown', () => { if (c.home) c.c.style.transform = tf({ ...c.home, s: 0.985 }); });
    c.b.addEventListener('pointerup', () => { if (c.home && !c.busy) c.c.style.transform = tf(c.home); });
  });
  const api = {
    readyFired: false, simple: true,
    show() { gone = false; root.style.pointerEvents = ''; root.classList.add('on'); cards.forEach(c => { c.b.disabled = false; }); },
    hide() { gone = true; root.classList.remove('on'); root.style.pointerEvents = 'none'; cards.forEach(c => { c.b.disabled = true; }); },
    remove: () => R.remove(),
  };
  return api;
}

// ===================================================================================================================
// le champ de prénoms, allégé (sans WebGL) : des prénoms qui naissent petits au centre et s'approchent, nets, en gris
// (plus sombres de près, comme le vrai champ) ; leurs lettres qui sont dans le prénom tapé s'éclairent doucement.
// getLit() : les lettres tapées (A–Z). Dessin plat (canvas 2D) — c'est ce que faisait le tout premier prototype.
export function startNames2D(canvas, getLit) {
  const cx = canvas.getContext('2d');
  if (!cx) return { stop() {} };
  const pool = shuffle([...NAMES]);
  const N = 34, LIFE = 70;                              // s pour aller du centre au bord
  let W = 1, H = 1, R = 1, dpr = 1, raf = 0, last = performance.now(), T = 0, stopped = false;
  const words = Array.from({ length: N }, (_, i) => ({ name: pool[i % pool.length], a: Math.random() * Math.PI * 2, age: LIFE * (i / N + Math.random() / N), lit: [] }));
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; R = Math.hypot(W, H) / 2;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  resize(); addEventListener('resize', resize);
  const smooth = (a, b, x) => { const t = clamp(0, 1, (x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function draw(now) {
    if (stopped) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = '#060606'; cx.fillRect(0, 0, W, H);
    const lit = new Set(plain(getLit() || '').replace(/[^A-Z]/g, ''));
    cx.textBaseline = 'middle';
    for (const w of words) {
      if (!REDUCED) w.age += dt;
      if (w.age > LIFE) { w.age -= LIFE; w.name = pool[(Math.random() * pool.length) | 0]; w.a = Math.random() * Math.PI * 2; }
      const u = w.age / LIFE, k = Math.pow(u, 2.2);                 // perspective : lent au loin, plus vite de près
      const r = R * (0.05 + 1.05 * k), size = 7 + 30 * k;
      const x = W / 2 + Math.cos(w.a) * r * (W / (2 * R)) * 1.4, y = H / 2 + Math.sin(w.a) * r * (H / (2 * R)) * 1.1;
      // naissance en fondu au loin, effacé autour du prénom, sortie par les bords
      const alpha = smooth(0, 0.08, u) * smooth(0.75, 1.25, Math.hypot((x - W / 2) / (W * 0.42), (y - H / 2) / (H * 0.16))) * (1 - smooth(0.9, 1, u));
      if (alpha < 0.01) continue;
      const g = 92 - 66 * k;                                          // plus sombre de près (le vrai champ : 92 → 26)
      cx.font = `500 ${size.toFixed(1)}px 'SG Garamond', Georgia, serif`;
      const sp = size * (0.25 - 0.12 * k), chars = [...w.name];
      let wd = -sp; const adv = chars.map(c => { const m = cx.measureText(c).width; wd += m + sp; return m; });
      let px = x - wd / 2;
      chars.forEach((c, i) => {
        w.lit[i] = (w.lit[i] || 0) + ((lit.has(c) ? 1 : 0) - (w.lit[i] || 0)) * Math.min(1, dt * (lit.has(c) ? 1.6 : 0.5));
        const v = Math.round(g + (140 - g) * w.lit[i]);
        cx.fillStyle = `rgba(${v},${v},${v},${alpha.toFixed(3)})`;
        cx.fillText(c, px, y);
        px += adv[i] + sp;
      });
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return { stop() { stopped = true; cancelAnimationFrame(raf); removeEventListener('resize', resize); } };
}

// ===================================================================================================================
// la suite, de bout en bout : cartes → feuille → enveloppe → email → COMMANDER
// opts : { name (A–Z), onDone(detail) (le portail), onExit() (retour depuis le paquet : l'accueil) }
export function mountSimpleFlow(opts) {
  const name = String(opts.name || '').toUpperCase();
  const R = makeRoot('sp-flow');
  const { root, stage, size } = R;
  const nm = nameEl(root, name, size.W);
  const back = el('button', 'sp-back', root, BACK_SVG); back.type = 'button'; back.setAttribute('aria-label', 'Retour');
  let stageName = 'cards', lastGesture = performance.now();
  const touched = () => { lastGesture = performance.now(); };
  root.addEventListener('pointerdown', touched, true); root.addEventListener('keydown', touched, true);

  // ---------------- 1. les cartes ----------------
  const order = shuffle(QUESTIONS.map(q => q.id));
  let next = 0, seq = [], cur = -1, discards = 0, mode = 'q', backHintDone = false, passReady = false, blankShownAt = 0;
  // PASSER : sur la carte blanche prise (3 s), ou 3,5 s après que la carte blanche est apparue (10/10), réponse vide
  const passOn = () => pass.classList.toggle('on', stageName === 'cards' && !ta.value.trim() && ((mode === 'free' && passReady) || (mode === 'q' && blankShownAt > 0 && performance.now() - blankShownAt > 3500)));
  const answers = {};
  const deck = [0, 1, 2].map(k => makeCard(stage, url('simple/dos.jpg')));
  let q = null;                                           // { id, c, curl }
  const ansCard = makeCard(stage, url('simple/vierge.jpg'));
  const blank = makeCard(stage, url('email/q/blanche.jpg'), url('simple/dos.jpg'));
  const ta = el('textarea', 'sp-write', root);
  Object.assign(ta, { spellcheck: false, rows: 3 });
  ta.setAttribute('autocapitalize', 'none'); ta.setAttribute('autocomplete', 'off'); ta.setAttribute('autocorrect', 'off');
  ta.setAttribute('enterkeyhint', 'done'); ta.placeholder = 'réponds ici';
  const deckBtn = el('button', 'sp-btn', root); deckBtn.type = 'button'; deckBtn.textContent = 'une autre question'; deckBtn.setAttribute('aria-label', 'une autre question');
  const prevBtn = el('button', 'sp-btn', root); prevBtn.type = 'button'; prevBtn.textContent = 'la question précédente'; prevBtn.setAttribute('aria-label', 'la question précédente');
  const blankBtn = el('button', 'sp-btn', root); blankBtn.type = 'button'; blankBtn.textContent = 'carte blanche'; blankBtn.setAttribute('aria-label', 'carte blanche : écrire le thème de ton poème');
  const pass = el('button', 'sp-sign', root, 'PASSER<span class="sp-sub"></span>'); pass.type = 'button'; pass.setAttribute('aria-label', 'Passer : j’improvise à partir de ' + name);
  pass.querySelector('.sp-sub').textContent = '(j’improvise à partir de ' + name + ')';
  const curl = el('div', 'sp-curl', root);
  let L = null;                                            // disposition des cartes
  function layoutCards() {
    const { W, H } = size;
    nm.style.top = Math.round(H * 0.075) + 'px';
    const nameBot = H * 0.075 + nm.offsetHeight;
    const cw = Math.min(W * 0.96, 560, (H * 0.34) / (IMG.card.h / IMG.card.w));
    const ch = cw * IMG.card.h / IMG.card.w;
    const qy = Math.max(nameBot + ch * 0.5 + 8, H * 0.36), ay = qy + ch * 0.86;
    L = { cw, ch, qy, ay, x: W / 2, vis: cw * IMG.card.f, visH: cw * IMG.card.f * 52 / 87 };
    deck.forEach((d, k) => setPose(d, { x: W / 2 + (k - 1) * 1.2, y: qy - (k - 1) * 1.6, w: cw, r: (k - 1) * 0.6, ry: 180 }));
    if (q && !q.anim) setPose(q.c, { x: W / 2, y: qy, w: cw, r: q.r });
    if (mode === 'q') setPose(ansCard, { x: W / 2, y: ay, w: cw, r: 0.4 });
    placeBlank();
    // la zone d'écriture sur la carte (réponse, ou carte blanche au centre)
    const wy = mode === 'free' ? qy : ay;
    Object.assign(ta.style, { left: (W / 2 - L.vis * 0.4) + 'px', top: (wy - L.visH * 0.3) + 'px', width: (L.vis * 0.8) + 'px', height: (L.visH * 0.62) + 'px' });
    const box = (b, x, y, w, h) => Object.assign(b.style, { left: (x - w / 2) + 'px', top: (y - h / 2) + 'px', width: w + 'px', height: h + 'px' });
    box(deckBtn, W / 2, qy, L.vis, L.visH);
    box(prevBtn, 22, qy, 44, 44);
    box(blankBtn, W / 2, H - L.visH * 0.25, L.vis, L.visH * 0.5);
    Object.assign(curl.style, { left: (W / 2 + L.vis / 2 - 22) + 'px', top: (qy - L.visH / 2) + 'px' });
    // (10/10) sur une question : centré entre la question (et sa bande de réponse) et la carte blanche
    pass.style.top = (mode === 'free' ? Math.min(qy + L.visH / 2 + 18, H - 52) : ((qy + L.visH / 2 + L.visH * 0.35) + (H - L.visH * 0.72)) / 2 - 30) + 'px';
  }
  function placeBlank() {
    if (!L) return;
    const { W, H } = size;
    if (mode === 'free') return;
    const shown = discards > 0;
    setPose(blank, { x: W / 2, y: shown ? H - L.visH * 0.22 : H + L.ch, w: L.cw, r: -0.6, ry: 0 });
    blankBtn.hidden = !shown;
    if (shown && !blankShownAt) { blankShownAt = performance.now(); R.later(passOn, 3600); }
  }
  function draw(id, from = 'deck', dir = -1) {
    const old = q;
    const c = makeCard(stage, qImg(id));
    c.style.zIndex = '4';
    q = { id, c, r: (Math.random() - 0.5) * 1.2, at: performance.now(), anim: true, curlOn: false, nudges: 0 };
    const home = { x: size.W / 2, y: L.qy, w: L.cw, r: q.r, ry: 0 };
    if (from === 'deck') {
      setPose(c, { ...home, ry: 180, r: 0 });
      move(c, home, { dur: 1050, via: [{ ...home, x: home.x + L.cw * 0.12, y: home.y - L.ch * 0.25, ry: 90, z: 90, s: 1.06 }] }).then(() => { q.anim = false; });
    } else {
      setPose(c, { ...home, x: home.x - dir * size.W, r: -dir * 12 });
      move(c, home, { dur: 700 }).then(() => { q.anim = false; });
    }
    if (old) leave(old, dir);
    ta.value = answers[id] || '';
    const text = QUESTIONS.find(x => x.id === id)?.q || '';
    ta.setAttribute('aria-label', text); R.say(text);
    window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action: 'tiree' } }));
    curl.classList.remove('on');
  }
  function leave(o, dir) {
    if (dir < 0 && stageName === 'cards') window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id: o.id, action: 'passee' } }));
    move(o.c, { ...o.c.pose, x: o.c.pose.x + dir * size.W * 1.1, y: o.c.pose.y - 10, r: dir * 14 }, { dur: 650, easing: 'cubic-bezier(.5,0,.7,.4)' }).then(() => o.c.remove());
  }
  function nextQ() {
    if (mode !== 'q' || (q && q.anim)) return;
    if (q) answers[q.id] = ta.value;
    discards++; backHintDone = backHintDone || false;
    if (cur < seq.length - 1) { cur++; draw(seq[cur], 'side', -1); }
    else { if (next >= order.length) next = 0; const id = order[next++]; seq.length = cur + 1; seq.push(id); cur = seq.length - 1; leaveAndDraw(id); }
    placeBlank(); touched();
  }
  function leaveAndDraw(id) { const old = q; q = null; if (old) leave(old, -1); R.later(() => { draw(id, 'deck'); }, REDUCED ? 0 : 280); }
  function prevQ() {
    if (mode !== 'q' || cur <= 0 || (q && q.anim)) return;
    if (q) answers[q.id] = ta.value;
    cur--; draw(seq[cur], 'side', 1); touched();
  }
  function takeBlank() {
    if (mode !== 'q' || discards < 1) return;
    if (q) answers[q.id] = ta.value;
    mode = 'free'; touched();
    const home = { x: size.W / 2, y: L.qy, w: L.cw, r: 0, ry: 0 };
    blank.style.zIndex = '6';
    move(blank, { ...home, ry: 360 }, { dur: 1200, via: [{ ...home, y: (home.y + size.H) / 2, ry: 180, z: 80, s: 1.05 }] }).then(() => { setPose(blank, home); });
    for (const d of [...deck, ansCard, ...(q ? [q.c] : [])]) d.style.opacity = 0;
    blankBtn.hidden = true; curl.classList.remove('on');
    ta.value = answers.blank || ''; ta.placeholder = 'le thème de ton poème';
    ta.setAttribute('aria-label', 'carte blanche : le thème de ton poème'); R.say('carte blanche. écris le thème de ton poème.');
    layoutCards();
    passReady = false;
    R.later(() => { passReady = true; passOn(); }, 3000);
  }
  function leaveBlank() {
    if (mode !== 'free') return;
    answers.blank = ta.value; mode = 'q'; passOn();
    for (const d of [...deck, ansCard, ...(q ? [q.c] : [])]) d.style.opacity = 1;
    ta.placeholder = 'réponds ici';
    if (q) { ta.value = answers[q.id] || ''; ta.setAttribute('aria-label', QUESTIONS.find(x => x.id === q.id)?.q || 'Réponse'); }
    blank.style.zIndex = '';
    layoutCards();
  }
  // gestes : glisser la question (gauche = la suivante, droite = la précédente) ; toucher le paquet = une autre ;
  // la carte blanche : la toucher ou la glisser vers le haut
  gesture(deckBtn, {
    onMove: (dx) => { if (q && !q.anim && mode === 'q') q.c.style.transform = tf({ ...q.c.pose, x: q.c.pose.x + dx, r: q.r + dx * 0.02 }); },
    onEnd: ({ dx, dy }) => {
      if (!q || mode !== 'q') return;
      if (dx < -50) nextQ(); else if (dx > 50 && cur > 0) prevQ();
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) nextQ();
      else setPose(q.c, q.c.pose);
    },
  });
  deckBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextQ(); } });
  prevBtn.addEventListener('click', prevQ);
  gesture(blankBtn, { onEnd: ({ dx, dy }) => { if (dy < -30 || (Math.abs(dx) < 8 && Math.abs(dy) < 8)) takeBlank(); } });
  blankBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); takeBlank(); } });
  // l'esquisse « suivante » (deux fois, avant toute question passée), puis le coin corné ; une fois une question
  // passée, une seule fois « précédente » ; le coin corné dès que la carte est posée
  const hint = setInterval(() => {
    if (stageName !== 'cards' || mode !== 'q' || !q || q.anim || document.activeElement === ta && ta.value) return;
    const idle = (performance.now() - Math.max(q.at, lastGesture)) / 1000;
    const nudge = d => { q.c.animate?.([{ transform: tf(q.c.pose) }, { transform: tf({ ...q.c.pose, x: q.c.pose.x + d * L.cw * 0.07, r: q.r + d * 0.8 }) }, { transform: tf(q.c.pose) }], { duration: 1700, easing: 'ease-in-out' }); };
    if (discards === 0) {
      if (q.nudges < 2 && idle > 5 + q.nudges * 7) { q.nudges++; if (!REDUCED) nudge(-1); }
      if (q.nudges >= 2 && idle > 5 + 9.2) curl.classList.add('on');
    } else {
      if (idle > 0.6) curl.classList.add('on');
      if (!backHintDone && cur > 0 && idle > 4) { backHintDone = true; if (!REDUCED) nudge(1); }
    }
  }, 250);
  // écrire : les lettres du prénom tapées s'éclairent ; Entrée (ou « OK », clavier fermé avec une réponse) = la suite
  let prevVal = '';
  ta.addEventListener('input', () => {
    if (/[\r\n]/.test(ta.value)) { ta.value = ta.value.replace(/[\r\n]+/g, ' ').trimEnd(); give(); return; }
    const v = ta.value; if (v.length > prevVal.length) nm.light(v[v.length - 1]); prevVal = v;
    passOn();
    touched();
  });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); give(); } });
  let tapAt = 0; root.addEventListener('pointerdown', e => { if (e.target !== ta) tapAt = performance.now(); }, true);
  ta.addEventListener('blur', () => { if (TOUCH && ta.value.trim() && stageName === 'cards') setTimeout(() => { if (performance.now() - tapAt > 400 && document.activeElement !== ta) give(); }, 250); });
  pass.addEventListener('click', () => { if (pass.classList.contains('on')) choose({ kind: 'improvisation', text: '' }); });
  function give() {
    if (stageName !== 'cards') return;
    const text = ta.value.trim();
    if (!text) return;
    if (mode === 'free') choose({ kind: 'theme', text });
    else if (q) choose({ kind: 'reponse', text, id: q.id });
  }
  let chosen = null;
  function choose(d) {
    if (chosen) return;
    chosen = { name, ...d };
    ta.blur();
    try { if (typeof window.onCardChosen === 'function') window.onCardChosen(chosen); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent('singulies:card-chosen', { detail: chosen }));
    toSheet();
  }

  // ---------------- 2. la feuille : le prénom devient l'acrostiche ----------------
  const sheetLayer = el('div', '', stage); Object.assign(sheetLayer.style, { position: 'absolute', inset: '0', opacity: '0', transition: 'opacity 1s' });
  const sheetImg = el('img', '', sheetLayer); sheetImg.src = url('simple/feuille.jpg'); sheetImg.alt = '';
  Object.assign(sheetImg.style, { position: 'absolute', pointerEvents: 'none' });
  let sheetCard = null, letters = [], rules = [], sig = null, S = null;
  function sheetGeom() {
    const { W, H } = size;
    const top = H * 0.06, avail = H - top - H * 0.05;
    const hasCard = !!sheetCard;
    const totalMM = SHEET.h / 2 + (hasCard ? -C_POSE.y + 26 + 4 : SHEET.h / 2);
    const s = Math.min((W * 0.92) / SHEET.w, avail / totalMM);
    const cx = W / 2, cy = top + (SHEET.h / 2) * s;
    return { s, cx, cy, left: cx - SHEET.w / 2 * s, right: cx + SHEET.w / 2 * s };
  }
  const toPx = (g, xmm, ymm) => ({ x: g.cx + xmm * g.s, y: g.cy - ymm * g.s });
  // (10/10) la colonne centrée sur la feuille : la largeur d'une lettre (EB Garamond 500) pour la centrer sur l'axe
  const mctx = document.createElement('canvas').getContext('2d');
  const letterW = (ch, fs) => { mctx.font = `500 ${fs}px "SG Garamond", Georgia, serif`; return mctx.measureText(ch || 'M').width; };
  function layoutSheet() {
    if (!S) return;
    const g = sheetGeom(); S.g = g;
    const iw = SHEET.w * g.s / IMG.sheet.f, ih = iw * IMG.sheet.h / IMG.sheet.w;
    Object.assign(sheetImg.style, { left: (g.cx - iw / 2) + 'px', top: (g.cy - ih / 2) + 'px', width: iw + 'px', height: ih + 'px' });
    if (sheetCard) { const p = toPx(g, C_POSE.x, C_POSE.y); S.cardPose = { x: p.x, y: p.y, w: 87 * g.s / IMG.card.f, r: -C_POSE.rz * 180 / Math.PI, ry: 0 }; if (S.cardPlaced) setPose(sheetCard, S.cardPose); }
    const wMax = Math.max(0, ...S.lines.filter(Boolean).map(ln => letterW(ln.el && ln.el.textContent, ln.cap * g.s / 0.65)));
    S.lines.forEach((ln, k) => {
      if (!ln) return;
      ln.fs = ln.cap * g.s / 0.65;
      const p = toPx(g, -SHEET.w / 2 + COL, ln.base), wl = letterW(ln.el && ln.el.textContent, ln.fs);
      ln.to = { x: p.x + (wMax - wl) / 2, y: p.y - ln.cap * g.s * 1.0 };   // centrée sur l'axe de la colonne ; haut de la capitale (le span a une hauteur de ligne d'1 em)
      if (ln.el && ln.landed) { ln.el.style.fontSize = ln.fs + 'px'; ln.el.style.transform = `translate(${ln.to.x}px, ${ln.to.y - ln.fs * 0.12}px)`; }
      if (ln.rule) {
        const x0 = p.x + wMax + PITCH * 1.2 * g.s, x1 = g.right - COL * g.s, fsR = TYPE_MM * g.s;   // colonne + lignes centrées (marges égales)
        Object.assign(ln.rule.style, { left: x0 + 'px', top: (p.y - fsR * 0.95) + 'px', fontSize: fsR + 'px', letterSpacing: (PITCH * g.s - fsR * 0.6) + 'px' });
        ln.rule.dataset.n = String(Math.max(4, Math.floor((x1 - x0) / (PITCH * g.s))));
      }
    });
    if (sig) { const fsS = TYPE_MM * g.s, p = toPx(g, -SHEET.w / 2 + COL, S.sigY); Object.assign(sig.style, { left: p.x + 'px', top: (p.y - fsS * 0.95) + 'px', fontSize: fsS + 'px', letterSpacing: (PITCH * g.s - fsS * 0.6) + 'px' }); }
  }
  function toSheet() {
    stageName = 'sheet'; touched();
    clearInterval(hint); curl.classList.remove('on'); pass.classList.remove('on');
    for (const b of [deckBtn, prevBtn, blankBtn]) b.hidden = true;
    ta.style.display = 'none';
    // la carte choisie se pose sur la feuille (question, ou carte blanche) ; improvisation : la feuille seule
    const src = chosen.kind === 'reponse' ? q?.c : chosen.kind === 'theme' ? blank : null;
    for (const d of [...deck, ansCard, blank, ...(q ? [q.c] : [])]) if (d !== src) d.style.opacity = 0;
    if (src) { sheetCard = src; src.style.zIndex = '8'; src.style.opacity = 1; }
    // l'acrostiche (même mise en page que la vraie feuille)
    const chars = [...name], n = chars.length, lead = n > 1 ? Math.min(10.5, 148 / (n - 1)) : 10.5, cap = Math.min(6.4, lead * 0.6), yc = sheetCard ? -6 : 0;
    S = { lines: chars.map((ch, k) => ch === ' ' ? null : { ch, k, cap, base: yc + ((n - 1) / 2 - k) * lead - cap / 2 }), lead };
    S.sigY = (yc + ((n - 1) / 2 - (n - 1)) * lead - cap / 2) - Math.max(lead * 1.6, 14);   // (10/10) sous le poème, avec de l'air
    sheetLayer.style.opacity = '1';
    layoutSheet();
    if (sheetCard) { const from = sheetCard.pose, to = S.cardPose; move(sheetCard, to, { dur: 1500, via: [{ ...from, ...to, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, w: to.w, z: 70, s: 1.04 }] }).then(() => { if (S) S.cardPlaced = true; }); }
    // les lettres quittent le prénom en haut, l'une après l'autre, et descendent dans leur ligne (par la droite)
    const spans = [...nm.querySelectorAll('span')];
    let li = 0;
    S.lines.forEach((ln, k) => {
      if (!ln) return;
      const span = spans[li++], from = span?.getBoundingClientRect();
      const e = el('div', 'sp-letter', root); e.textContent = ln.ch;
      ln.el = e; ln.span = span;
      const fs0 = nm.fs, f = from ? { x: from.left, y: from.top - R.size.top + (from.height - fs0) / 2 } : { x: size.W / 2, y: 40 };
      e.style.fontSize = fs0 + 'px'; e.style.transform = `translate(${f.x}px, ${f.y}px)`;
      const at = REDUCED ? 0 : 400 + k * 270;
      R.later(() => {
        const to = { x: ln.to.x, y: ln.to.y - ln.fs * 0.12 }, side = { x: to.x + 28 * S.g.s, y: to.y };
        if (e.animate && !REDUCED) e.animate([
          { transform: `translate(${f.x}px, ${f.y}px)`, fontSize: fs0 + 'px' },
          { transform: `translate(${side.x}px, ${(f.y + to.y) / 2}px)`, fontSize: (fs0 + ln.fs) / 2 + 'px', offset: 0.55 },
          { transform: `translate(${side.x}px, ${to.y}px)`, fontSize: ln.fs + 'px', offset: 0.8 },
          { transform: `translate(${to.x}px, ${to.y}px)`, fontSize: ln.fs + 'px' },
        ], { duration: 1350, easing: 'ease-in-out' });
        e.style.fontSize = ln.fs + 'px'; e.style.transform = `translate(${to.x}px, ${to.y}px)`;
        if (span) { span.style.transition = 'none'; span.style.opacity = '0'; }
        ln.landed = true;
        // la ligne à écrire, tapée à la machine, une fois la lettre posée
        R.later(() => {
          const r = el('div', 'sp-under', root); ln.rule = r; layoutSheet();
          const N = +r.dataset.n || 20; let i = 0;
          const tick = () => { r.textContent = '_'.repeat(++i); if (i < N) R.later(tick, REDUCED ? 0 : 550 / N); };
          tick();
        }, REDUCED ? 0 : 1350 + 120);
      }, at);
    });
    nm.style.transition = 'opacity 1.2s'; R.later(() => { nm.style.opacity = '0'; }, 400 + Math.max(0, li - 1) * 270 + 300);
    // la signature, frappe par frappe, une fois les lignes tracées ; puis l'enveloppe (jamais moins de 3 s après le dernier geste)
    const sigAt = REDUCED ? 300 : 400 + Math.max(0, li - 1) * 270 + 1350 + 120 + 550 + 500;
    R.later(() => { sig = el('div', 'sp-type', root); layoutSheet(); typeInto(sig, '- ETERNEL -', { later: R.later }); }, sigAt);
    const lab = name + ' : ton prénom en colonne, une lettre par ligne du poème, ' + chars.filter(c => c !== ' ').join(', ') + '.';
    R.say(lab);
    const ready = sigAt + 11 * 85 + 1800;
    const goEnv = () => { if (stageName !== 'sheet') return; if (performance.now() - lastGesture < 3000) { R.later(goEnv, 400); return; } toEnvelope(); };
    R.later(goEnv, ready);
  }
  // glisser vers le haut = l'enveloppe tout de suite
  gesture(root, { capture: false, onEnd: ({ dy }) => { if (stageName === 'sheet' && dy < -60 && sig) toEnvelope(); } });

  // ---------------- 3. l'enveloppe : l'adresse, POSTER ----------------
  const envLayer = el('div', '', stage); Object.assign(envLayer.style, { position: 'absolute', left: '0', top: '0', transformStyle: 'preserve-3d', opacity: '0', transition: 'opacity 1.1s' });
  const envBox = el('div', '', envLayer); Object.assign(envBox.style, { position: 'absolute', left: '0', top: '0', transformStyle: 'preserve-3d' });
  // le devant (et tout ce qu'on y écrit) est une face : elle se cache quand l'enveloppe se retourne
  const face = el('div', '', envBox);
  const envBack = el('img', '', envBox); envBack.src = url('simple/enveloppe-dos.jpg'); envBack.alt = '';
  for (const f of [face, envBack]) Object.assign(f.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: 'none' });
  envBack.style.transform = 'rotateY(180deg)';
  const envFront = el('img', '', face); envFront.src = url('simple/enveloppe.jpg'); envFront.alt = '';
  Object.assign(envFront.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
  const sender = el('div', 'sp-type', face);
  const stamp = el('img', '', face); stamp.src = url('simple/tampon.png'); stamp.alt = '';
  Object.assign(stamp.style, { position: 'absolute', opacity: '0', pointerEvents: 'none', transition: 'opacity .25s, transform .25s', mixBlendMode: 'screen' });
  const form = el('form', '', root); form.setAttribute('autocomplete', 'on'); form.setAttribute('aria-label', 'Adresse'); form.addEventListener('submit', e => e.preventDefault());
  const hints = {}, prefill = { prenom: handName(name).slice(0, 15) };   // le prénom du destinataire, déjà écrit
  const inputs = {}, unders = {}, typed = {};
  for (const d of FIELDS) {
    const u = el('div', 'sp-under', face); u.textContent = '_'.repeat(Math.min(d.chars, 30)); unders[d.id] = u;
    const f = el('input', 'sp-field', form);
    Object.assign(f, { type: 'text', spellcheck: false, name: d.ac, placeholder: hints[d.id] || d.hint });
    f.setAttribute('autocomplete', d.ac); f.setAttribute('inputmode', d.im); f.setAttribute('autocapitalize', d.cap); f.setAttribute('autocorrect', 'off');
    f.setAttribute('aria-label', d.label); f.setAttribute('enterkeyhint', d === FIELDS[FIELDS.length - 1] ? 'done' : 'next'); f.maxLength = d.chars;
    if (prefill[d.id]) f.value = prefill[d.id];
    f.style.display = 'none'; inputs[d.id] = f;
  }
  const poster = el('button', 'sp-sign', root, 'POSTER'); poster.type = 'button';
  let E = null;                                            // { s (px/mm), ox, oy (coin haut-gauche de l'enveloppe, px) }
  function envGeom() {
    const { W, H } = size;
    const whole = Math.min((W * 0.9) / ENV.w, (H * 0.62) / ENV.h);
    if (whole * TYPE_MM >= 13 || stageName === 'posted') return { s: whole, ox: W / 2 - ENV.w * whole / 2, oy: H * 0.46 - ENV.h * whole / 2, whole: true };
    // téléphone : de près, le bloc d'adresse au milieu de la partie visible (comme la vraie enveloppe)
    const s = Math.min((W - 28) / 104, 4.2), ax = ADDR.x + 50, ay = ADDR.y + 2 * ADDR.lead;
    return { s, ox: W / 2 - ax * s, oy: size.H * (size.kb > 40 ? 0.45 : 0.42) - ay * s, whole: false };
  }
  function layoutEnv() {
    if (!E) return;
    const g = envGeom(); E.g = g;
    const iw = ENV.w * g.s / IMG.env.f, ih = iw * IMG.env.h / IMG.env.w;
    E.imgOff = { x: (iw - ENV.w * g.s) / 2, y: (ih - ENV.h * g.s) / 2, iw, ih };
    const bx = g.ox - E.imgOff.x, by = g.oy - E.imgOff.y;
    Object.assign(envBox.style, { width: iw + 'px', height: ih + 'px', transform: `translate(${bx}px, ${by}px)` });
    const fs = TYPE_MM * g.s, ls = PITCH * g.s - fs * 0.6;
    const at = (mmx, mmy) => ({ x: E.imgOff.x + mmx * g.s, y: E.imgOff.y + mmy * g.s });
    const sp = at(SENDER.x, SENDER.y);
    Object.assign(sender.style, { left: sp.x + 'px', top: (sp.y - fs * 0.95) + 'px', fontSize: fs + 'px', letterSpacing: ls + 'px', lineHeight: (SENDER.lead * g.s) + 'px', color: 'rgba(255,255,255,.66)' });
    const st = at(ENV.w - STAMP.x, STAMP.y), sd = 2 * (STAMP.r + 1.5) * g.s;
    Object.assign(stamp.style, { left: (st.x - sd / 2) + 'px', top: (st.y - sd / 2) + 'px', width: sd + 'px', height: sd + 'px' });
    // les champs : chacun sur sa ligne (police ≥ 16 px : l'iPhone ne zoome pas), souligné à la machine
    const fsF = Math.max(16, fs), lsF = PITCH * g.s - fsF * 0.6;
    FIELDS.forEach(d => {
      const p = at(ADDR.x + (d.col || 0) * PITCH, ADDR.y + d.line * ADDR.lead), u = unders[d.id], f = inputs[d.id];
      Object.assign(u.style, { left: p.x + 'px', top: (p.y - fs * 0.62) + 'px', fontSize: fs + 'px', letterSpacing: ls + 'px' });
      if (typed[d.id]) Object.assign(typed[d.id].style, { left: p.x + 'px', top: (p.y - fs * 0.97) + 'px', fontSize: fs + 'px', letterSpacing: ls + 'px' });
      Object.assign(f.style, { left: (bx + p.x) + 'px', top: (by + p.y - fsF * 1.05) + 'px', width: (d.chars * PITCH * g.s + 8) + 'px', height: (fsF * 1.3) + 'px', fontSize: fsF + 'px', letterSpacing: Math.max(-1.5, lsF) + 'px' });
    });
    const pb = at(ADDR.x + 15 * PITCH, ENV.h);
    poster.style.top = Math.min(by + pb.y + 14, size.H - 50) + 'px';
    poster.style.left = (bx + pb.x - 60) + 'px'; poster.style.right = 'auto'; poster.style.width = '160px';
  }
  function toEnvelope() {
    if (stageName !== 'sheet') return;
    stageName = 'env'; touched();
    const ord = { name, kind: chosen.kind, id: chosen.id, text: chosen.text, mode: 'poste' };
    try { if (typeof window.onOrder === 'function') window.onOrder(ord); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent('singulies:order', { detail: ord }));
    // la feuille (et la carte) s'en vont vers le bas, dans l'enveloppe qui monte du fond
    for (const e of [sheetLayer, sig, ...S.lines.filter(Boolean).flatMap(l => [l.el, l.rule])]) if (e) { e.style.transition = 'opacity .9s, transform 1.1s'; e.style.opacity = '0'; }
    if (sheetCard) { sheetCard.style.transition = 'opacity .9s'; sheetCard.style.opacity = '0'; }
    E = {}; layoutEnv();
    const base = envBox.style.transform;
    envBox.style.transform = base + ' translateY(' + (size.H * 0.35) + 'px) scale(.9)';
    R.later(() => { envLayer.style.opacity = '1'; envBox.style.transition = REDUCED ? '' : 'transform 1.4s cubic-bezier(.25,.7,.2,1)'; envBox.style.transform = base; }, REDUCED ? 0 : 500);
    R.later(() => {
      if (NOADDR) { typeInto(sender, SENDER.lines.join('\n'), { ch: 55, nl: 280, later: R.later }).then(() => R.later(post, 600)); return; }
      typeInto(sender, SENDER.lines.join('\n'), { ch: 55, nl: 280, later: R.later });
      for (const d of FIELDS) inputs[d.id].style.display = '';
      envBox.style.transition = '';
      R.say('l’enveloppe. écris l’adresse où envoyer ton poème, puis POSTER.');
      if (!TOUCH) inputs[FIELDS.find(d => !inputs[d.id].value)?.id || 'nom'].focus({ preventScroll: true });
    }, REDUCED ? 0 : 1900);
  }
  const vals = () => Object.fromEntries(FIELDS.map(d => [d.id, inputs[d.id].value.replace(/\s{2,}/g, ' ').replace(/^\s+/, '')]));
  const canPost = () => stageName === 'env' && fieldsReady(vals());
  for (const d of FIELDS) {
    const f = inputs[d.id];
    f.addEventListener('input', () => { poster.classList.toggle('on', canPost()); touched(); });
    f.addEventListener('change', () => poster.classList.toggle('on', canPost()));
    f.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      const i = FIELDS.indexOf(d);
      if (i < FIELDS.length - 1) inputs[FIELDS[i + 1].id].focus({ preventScroll: true }); else { f.blur(); if (canPost()) post(); }
    });
    f.addEventListener('focus', () => R.later(layoutEnv, 350));
  }
  // remplissage automatique sans événement (Safari) : on relit les champs
  const autoFill = setInterval(() => { if (stageName === 'env') poster.classList.toggle('on', canPost()); }, 500);
  poster.addEventListener('pointerdown', e => e.preventDefault());
  poster.addEventListener('click', () => { if (canPost()) post(); });
  let detail = null;
  function post() {
    if (stageName !== 'env') return;
    stageName = 'posted'; touched();
    const f = vals();
    detail = { name, kind: chosen.kind, id: chosen.id, text: chosen.text, mode: 'poste', ...fieldsOut(f), fields: f, ...(NOADDR ? { test: true } : {}) };
    for (const d of FIELDS) { inputs[d.id].blur(); inputs[d.id].style.display = 'none'; const u = unders[d.id]; if (!f[d.id]) u.style.opacity = '0'; }
    // ce qu'on a tapé reste écrit sur l'enveloppe (à la machine)
    FIELDS.forEach(d => { if (!f[d.id]) return; const t = el('div', 'sp-type', face); t.textContent = f[d.id]; t.style.color = 'rgba(240,240,240,.85)'; typed[d.id] = t; });
    layoutEnv();
    poster.classList.remove('on');
    if (!NOADDR) try { localStorage.setItem('singulies.draft', JSON.stringify(detail)); } catch { /* */ }
    // le coup de tampon, puis l'enveloppe entière : elle se retourne (le cachet), bascule sur sa tranche et part
    R.later(() => { if (NOADDR || !STAMPED) return; stamp.style.transform = `rotate(${(Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 25)}deg) scale(1.12)`; stamp.style.opacity = '0.9'; R.later(() => { stamp.style.transform = stamp.style.transform.replace('scale(1.12)', 'scale(1)'); }, 120); }, REDUCED ? 0 : 450);
    R.later(() => {
      envBox.style.transition = REDUCED ? '' : 'transform 1.1s cubic-bezier(.3,.6,.2,1)';
      layoutEnv();                                         // la vue recule : l'enveloppe entière
      const base = envBox.style.transform;
      R.later(() => { envBox.style.transform = base + ' rotateY(180deg)'; }, REDUCED ? 0 : 1150);
      R.later(() => { envBox.style.transformOrigin = '50% 100%'; envBox.style.transform = base + ' rotateY(180deg) rotateX(84deg)'; }, REDUCED ? 0 : 2900);
      R.later(() => { envLayer.style.transition = 'opacity 1s'; envLayer.style.opacity = '0'; askMail(); }, REDUCED ? 0 : 4300);
    }, REDUCED ? 0 : 1100);
  }

  // ---------------- 4. l'email, puis COMMANDER ----------------
  function askMail() {
    stageName = 'mail';
    if (NOADDR) { finish(''); return; }
    const box = el('div', 'sp-mail', root);
    const nm2 = nameEl(box, name, size.W); Object.assign(nm2.style, { position: 'absolute', left: '50%', right: 'auto', bottom: 'calc(100% + 30px)', transform: 'translateX(-50%)' });
    const inp = el('input', '', box);
    Object.assign(inp, { type: 'email', spellcheck: false, placeholder: 'email', name: 'email' });
    inp.setAttribute('autocomplete', 'email'); inp.setAttribute('inputmode', 'email'); inp.setAttribute('autocapitalize', 'none'); inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('enterkeyhint', 'done'); inp.setAttribute('aria-label', 'Ton email');
    const go = el('button', 'sp-sign', root, 'COMMANDER'); go.type = 'button';
    const place = () => { const y = size.H * (size.kb > 40 ? 0.55 : 0.52); box.style.top = (y - 30) + 'px'; go.style.top = Math.min(y + 22, size.H - 50) + 'px'; };
    R.onResize = place; place();
    R.later(() => box.classList.add('on'), 200);
    R.later(() => { box.classList.add('ready'); if (!TOUCH) inp.focus({ preventScroll: true }); }, REDUCED ? 0 : 1100);   // l'enveloppe s'est fondue
    R.say('l’enveloppe est partie. ton email, puis COMMANDER.');
    const ok = () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim());
    inp.addEventListener('input', () => go.classList.toggle('on', ok()));
    const done = () => { if (!ok()) return; inp.blur(); go.classList.remove('on'); box.classList.remove('on'); finish(inp.value.trim()); };
    go.addEventListener('pointerdown', e => e.preventDefault());
    go.addEventListener('click', done);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done(); } });
  }
  let finished = false;
  function finish(c) {
    if (finished) return; finished = true;
    const out = { ...detail, contact: c, email: c, tel: '' };
    try { localStorage.removeItem('singulies.draft'); } catch { /* */ }
    try { if (typeof window.onAddress === 'function') window.onAddress(out); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent('singulies:address', { detail: out }));
    R.later(() => { root.classList.remove('on'); }, 600);
    R.later(() => opts.onDone?.(out), 1500);
  }

  // ---------------- retour ----------------
  back.addEventListener('click', () => {
    if (stageName === 'cards') { if (mode === 'free') leaveBlank(); else { R.remove(); clearInterval(hint); clearInterval(autoFill); opts.onExit?.(); } return; }
    if (stageName === 'env') {                            // l'enveloppe se défait : la feuille revient (l'adresse est gardée)
      stageName = 'sheet'; poster.classList.remove('on');
      for (const d of FIELDS) inputs[d.id].style.display = 'none';
      envLayer.style.opacity = '0';
      for (const e of [sheetLayer, sig, ...S.lines.filter(Boolean).flatMap(l => [l.el, l.rule])]) if (e) e.style.opacity = '1';
      if (sheetCard) sheetCard.style.opacity = '1';
      touched(); R.later(() => { if (stageName === 'sheet') toEnvelope(); }, 5000);
      return;
    }
    if (stageName === 'sheet') {                          // la feuille s'efface : les cartes reviennent
      stageName = 'cards'; chosen = null; R.clear();
      sheetLayer.style.opacity = '0'; sig?.remove(); sig = null;
      for (const l of S.lines) if (l) { l.el?.remove(); l.rule?.remove(); }
      for (const sp of nm.querySelectorAll('span')) sp.style.opacity = '';
      S = null; sheetCard = null; nm.style.opacity = '1';
      for (const d of [...deck, ansCard, ...(q ? [q.c] : [])]) { d.style.opacity = mode === 'free' ? 0 : 1; d.style.zIndex = d === q?.c ? '4' : ''; }
      blank.style.opacity = 1; ta.style.display = ''; for (const b of [deckBtn, prevBtn]) b.hidden = false;
      layoutCards(); placeBlank();
    }
  });
  back.classList.add('on');

  R.onResize = () => { if (stageName === 'cards') layoutCards(); else if (stageName === 'sheet') layoutSheet(); else if (stageName === 'env' || stageName === 'posted') layoutEnv(); };
  layoutCards();
  fonts().then(() => { layoutCards(); });
  R.show();
  // le premier tirage
  R.later(() => { const id = order[next++]; seq.push(id); cur = 0; draw(id, 'deck'); }, REDUCED ? 0 : 900);
  return { remove: () => { clearInterval(hint); clearInterval(autoFill); R.remove(); } };
}

// ===================================================================================================================
// le jeu (v2, comme src/jeu/jeu.js) : le paquet tire une question pour toi ; toucher le paquet ou glisser à gauche =
// une autre, à droite = la précédente ; PARTAGER (sous la carte, à une place fixe, une fois le temps de lire la première
// question) ; COMMANDER (en bas, toujours là). Question partagée (opts.firstQ + opts.answer, lien jeu?q=…) : sous elle,
// la carte réponse, curseur seul ; PARTAGER une fois quelque chose écrit (question + réponse) ; ensuite le jeu seul.
export function mountSimpleJeu(opts = {}) {
  window.dispatchEvent(new CustomEvent('singulies:simple', { detail: { where: 'jeu' } }));
  const R = makeRoot('sp-jeu');
  const { root, stage, size } = R;
  const ev = (id, action) => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action } }));
  const back = el('button', 'sp-back on', root, BACK_SVG); back.type = 'button'; back.setAttribute('aria-label', 'Retour');
  const deck = [0, 1, 2, 3].map(() => makeCard(stage, url('simple/dos.jpg')));
  const known = id => QUESTIONS.some(x => x.id === id);
  let answering = opts.firstQ != null && !!opts.answer && known(opts.firstQ);
  const ansCard = answering ? makeCard(stage, url('simple/vierge.jpg')) : null;
  const ta = answering ? el('textarea', 'sp-write', root) : null;
  if (ta) {
    Object.assign(ta, { spellcheck: false, rows: 3 });
    ta.setAttribute('autocapitalize', 'none'); ta.setAttribute('autocomplete', 'off'); ta.setAttribute('autocorrect', 'off');
    ta.setAttribute('enterkeyhint', 'done');
    ta.addEventListener('input', () => { ta.value = ta.value.replace(/\n/g, ' '); place(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ta.blur(); } });
  }
  const deckBtn = el('button', 'sp-btn', root); deckBtn.type = 'button'; deckBtn.textContent = 'une autre question'; deckBtn.setAttribute('aria-label', 'une autre question');
  const shareEl = el('button', 'sp-sign', root, 'PARTAGER'); shareEl.type = 'button'; shareEl.setAttribute('aria-label', 'Partager cette question, pour la poser à quelqu’un');
  const buyEl = el('button', 'sp-sign', root, 'COMMANDER'); buyEl.type = 'button'; buyEl.setAttribute('aria-label', 'Commander le jeu SINGULIES');
  shareEl.style.transition = 'opacity 1.4s, top .8s ease';
  const order = shuffle(QUESTIONS.map(x => x.id).filter(id => id !== opts.firstQ));
  if (opts.firstQ != null && known(opts.firstQ)) order.unshift(opts.firstQ);
  const seq = [];
  let k = 0, cur = -1, q = null, L = null, busy = false, shareReady = false;
  function layout() {
    const { W, H } = size;
    const cw = Math.min(W * 0.96, 560, (H * 0.36) / (IMG.card.h / IMG.card.w)), ch = cw * IMG.card.h / IMG.card.w;
    const vis = cw * IMG.card.f, visH = vis * 52 / 87;
    const y = size.kb > 40 ? Math.max(visH * 0.6 + 52, H * 0.4 - (answering ? visH * 0.45 : 0)) : H * 0.38;
    L = { cw, ch, y, ay: y + ch * 0.86, vis, visH };
    deck.forEach((d, i) => setPose(d, { x: W / 2 + (i - 1.5), y: L.y - (i - 1.5) * 1.6, w: cw, r: (i - 1.5) * 0.5, ry: 180 }));
    if (q && !q.anim) setPose(q.c, { x: W / 2, y: L.y, w: cw, r: q.r });
    if (ansCard) setPose(ansCard, { x: W / 2, y: L.ay, w: cw, r: 0.4 });
    if (ta) Object.assign(ta.style, { left: (W / 2 - vis * 0.4) + 'px', top: (L.ay - visH * 0.3) + 'px', width: (vis * 0.8) + 'px', height: (visH * 0.62) + 'px' });
    Object.assign(deckBtn.style, { left: (W / 2 - vis / 2) + 'px', top: (L.y - visH / 2) + 'px', width: vis + 'px', height: visH + 'px' });
    buyEl.style.top = (H - 60) + 'px';
    buyEl.classList.toggle('on', size.kb < 40);
    place();
  }
  // PARTAGER : sous la place de repos de la question (ou de la réponse), jamais attaché à la carte qui bouge
  function place() {
    if (!L) return;
    const { H } = size;
    const bottom = (answering ? L.ay : L.y) + L.visH / 2;
    shareEl.style.top = Math.min(bottom + 14, size.kb > 40 ? H - 54 : H - 108) + 'px';
    shareEl.classList.toggle('on', answering ? !!ta.value.trim() : shareReady);
  }
  R.onResize = layout; layout();
  function draw(id, dir) {
    busy = true;
    const old = q;
    const c = makeCard(stage, qImg(id)); c.style.zIndex = '4';
    q = { id, c, r: (Math.random() - 0.5) * 1.2, anim: true };
    const home = { x: size.W / 2, y: L.y, w: L.cw, r: q.r, ry: 0 };
    const done = () => { if (q && q.c === c) q.anim = false; busy = false; };
    if (dir === 0) {
      setPose(c, { ...home, ry: 180, r: 0 });
      move(c, home, { dur: 1050, via: [{ ...home, x: home.x + L.cw * 0.12, y: home.y - L.ch * 0.25, ry: 90, z: 90, s: 1.06 }] }).then(done);
    } else {
      setPose(c, { ...home, x: home.x - dir * size.W, r: -dir * 12 });
      move(c, home, { dur: 700 }).then(done);
    }
    const out = dir || -1;
    if (old) move(old.c, { ...old.c.pose, x: old.c.pose.x + out * size.W * 1.1, r: out * 14 }, { dur: 650 }).then(() => old.c.remove());
    const text = QUESTIONS.find(x => x.id === id)?.q || '';
    R.say(text); if (ta) ta.setAttribute('aria-label', text);
    ev(id, 'tiree');
    if (seq.length === 1 && dir === 0) R.later(() => { shareReady = true; place(); }, (REDUCED ? 0 : 1500) + 1200 + 45 * text.length);
  }
  function another() {
    if (busy) return;
    if (q) { if (answering) stopAnswering(); ev(q.id, 'passee'); }
    if (cur < seq.length - 1) { cur++; draw(seq[cur], -1); return; }
    seq.length = cur + 1; seq.push(order[k++ % order.length]); cur = seq.length - 1;
    draw(seq[cur], 0);
  }
  function prev() { if (busy || cur <= 0) return; if (answering) stopAnswering(); cur--; draw(seq[cur], 1); }
  // une fois partagée (ou la question passée), la carte réponse se fond : le jeu seul
  function stopAnswering() {
    answering = false; ta.blur(); ta.disabled = true;
    ta.style.transition = ansCard.style.transition = 'opacity .9s'; ta.style.opacity = ansCard.style.opacity = '0';
    R.later(() => { ta.remove(); ansCard.remove(); }, 1000);
    shareReady = true; layout();
  }
  gesture(deckBtn, {
    onMove: (dx) => { if (q && !q.anim) q.c.style.transform = tf({ ...q.c.pose, x: q.c.pose.x + dx, r: q.r + dx * 0.02 }); },
    onEnd: ({ dx, dy }) => {
      if (dx < -50) another(); else if (dx > 50 && cur > 0) prev();
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) another();
      else if (q) setPose(q.c, q.c.pose);
    },
  });
  deckBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); another(); } });
  function flash(b, txt) { const t = b.textContent; b.textContent = txt; R.later(() => { b.textContent = t; }, 1800); }
  async function share() {
    if (!q) return;
    const id = q.id, qt = (QUESTIONS.find(x => x.id === id)?.q || '').toLowerCase();
    const said = answering ? ta.value.trim() : '';
    if (answering && !said) return;
    const link = new URL('q/' + id, document.baseURI).href;      // sa page porte la vignette de la question
    const text = '« ' + qt + ' »\n' + (said ? '— ' + said + '\n\n' : '') + 'une question de SINGULIES, le jeu d’Eternel';
    ev(id, said ? 'repondue' : 'partagee');
    ta?.blur();
    const done = () => { if (answering) stopAnswering(); };
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text, url: link }); done(); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + link); flash(shareEl, 'LIEN COPIÉ'); } catch { flash(shareEl, link); }
    done();
  }
  shareEl.addEventListener('click', share);
  buyEl.addEventListener('click', () => { if (JEU_LINK) { location.href = JEU_LINK; return; } flash(buyEl, 'BIENTÔT'); });
  back.addEventListener('click', () => { ta?.blur(); root.classList.remove('on'); R.later(() => { R.remove(); opts.onBack?.(); }, 700); });
  addEventListener('keydown', function esc(e) {
    if (!document.body.contains(root)) { removeEventListener('keydown', esc); return; }
    if (e.key === 'Escape') { removeEventListener('keydown', esc); back.click(); }
  });
  R.show();
  fonts().then(layout);
  R.later(another, REDUCED ? 0 : 900);
  return { remove: () => R.remove() };
}
