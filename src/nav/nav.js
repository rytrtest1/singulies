// Les pages, reliées par le fil (11/10, Maxence : « pas de menu, tout est relié »). En haut, le nom de la page où l'on
// est (UN PRENOM UN POEME), et de part et d'autre, reliés à lui par un bout de fil cousu, les noms des pages voisines
// (MES LIVRES à gauche, UN POEME PAR MOIS à droite…) qui se perdent dans le noir aux bords : on devine qu'il y a une
// suite sur les côtés. Les pages forment une boucle (le fil fait le tour). Sur ordinateur, les objets des pages voisines
// attendent sur les côtés, plus petits, en fondu (comme les stories voisines) ; sur téléphone, on en voit le bord, et
// une seule fois, l'objet esquisse le geste (il glisse un peu, revient). Aller à une page : toucher son nom ou son objet,
// ou faire glisser l'objet de la page (il suit le doigt). La transition : l'objet part du côté opposé, le fil coulisse,
// le nom suivant vient au centre, et la page d'arrivée fait entrer son objet de l'autre côté (sessionStorage 'sg.nav').
import { paintThread } from '../alt/stitch.js';
import { count } from '../app/count.js';

export const PAGES = [
  { id: 'poeme', label: 'UN PRENOM UN POEME', href: 'alt.html', img: 'exemples/julie.jpg' },
  { id: 'lettre', label: 'UN POEME PAR MOIS', href: 'lettre.html', img: 'simple/enveloppe-dos.jpg' },
  { id: 'jeu', label: 'LE JEU', href: 'jeu.html', img: 'simple/portail-jeu.jpg' },
  { id: 'livres', label: 'MES LIVRES', href: 'livres.html', img: 'simple/portail-livres.jpg' },
];
const K_NAV = 'sg.nav';
const ring = i => PAGES[((i % PAGES.length) + PAGES.length) % PAGES.length];

const CSS = `
.nv { position: fixed; z-index: 26; left: 0; right: 0; top: 0; height: calc(48px + env(safe-area-inset-top)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv.on { opacity: 1; }
.nv-in { position: absolute; left: 0; right: 0; bottom: 0; height: 44px; overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--nv-m, 22%), #000 calc(100% - var(--nv-m, 22%)), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 var(--nv-m, 22%), #000 calc(100% - var(--nv-m, 22%)), transparent 100%); }
.nv-track { position: absolute; left: 50%; top: 0; height: 44px; display: flex; align-items: center; gap: var(--nv-gap, 34px); white-space: nowrap;
  will-change: transform; }
.nv-track.anim { transition: transform .62s cubic-bezier(.45,.05,.25,1); }
.nv-l { position: relative; z-index: 1; display: block; margin: 0; padding: 14px 0; border: 0; background: none; cursor: pointer; text-decoration: none;
  font: 500 var(--nv-fs, 12px)/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; margin-right: -.3em; color: #ece8e0; opacity: .4;
  transition: opacity .5s; -webkit-tap-highlight-color: transparent; }
.nv-l.cur { opacity: .9; cursor: default; }
.nv-l.far { opacity: 0; }   /* (les voisins des voisins : seulement pendant que le fil coulisse) */
.nv.on .nv-l { pointer-events: auto; }
.nv-l:not(.cur):hover, .nv-l:not(.cur):focus-visible { opacity: .75; outline: none; }
.nv-th { position: absolute; left: 0; top: 0; pointer-events: none; }
/* les objets des pages voisines */
.nv-side { position: fixed; z-index: 19; top: var(--nv-cy, 42%); height: min(var(--nv-sh, 46vh), 32vh); display: block; transform: translateY(-50%);
  opacity: 0; pointer-events: none; transition: opacity .8s ease, translate .62s cubic-bezier(.45,.05,.25,1); -webkit-tap-highlight-color: transparent; }
.nv-side img { display: block; height: 100%; width: auto; pointer-events: none; }
.nv-side.l { right: calc(50% + var(--nv-sx, max(270px, 19vw))); -webkit-mask-image: linear-gradient(to left, #000 35%, transparent); mask-image: linear-gradient(to left, #000 35%, transparent); }
.nv-side.r { left: calc(50% + var(--nv-sx, max(270px, 19vw))); -webkit-mask-image: linear-gradient(to right, #000 35%, transparent); mask-image: linear-gradient(to right, #000 35%, transparent); }
.nv.on.side ~ .nv-side { opacity: .42; pointer-events: auto; cursor: pointer; }
.nv.on.side ~ .nv-side:hover { opacity: .75; }
/* téléphone : on ne voit que le bord des objets voisins */
@media (max-width: 760px) {
  .nv-side { height: var(--nv-sh, 34vh); }
  .nv-side.l { right: calc(100% - 16px); -webkit-mask-image: none; mask-image: none; }
  .nv-side.r { left: calc(100% - 16px); -webkit-mask-image: none; mask-image: none; }
  .nv.on.side ~ .nv-side { opacity: .34; }
}
@media (prefers-reduced-motion: reduce) { .nv-track.anim, .nv-side { transition-duration: .01s; } }
`;

// opts : { current (id), base, show() (le bandeau), side() (les objets voisins), stage() (les éléments de l'objet de la
//   page, qui partent sur le côté et suivent le doigt), center() (px : le centre vertical de l'objet), onLeave(dir) }
export function installNav(opts) {
  const base = opts.base || './';
  const ci = PAGES.findIndex(p => p.id === opts.current);
  if (ci < 0) return null;
  if (!document.getElementById('nv-style')) { const st = document.createElement('style'); st.id = 'nv-style'; st.textContent = CSS; document.head.appendChild(st); }
  const url = p => { const u = new URL(base + p.href, document.baseURI), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); return u.href; };

  // l'arrivée : venue d'une page voisine par le fil (moins de 6 s)
  let arrived = 0;
  try { const a = JSON.parse(sessionStorage.getItem(K_NAV) || 'null'); if (a && a.to === opts.current && Date.now() - a.at < 6000) arrived = a.dir; sessionStorage.removeItem(K_NAV); } catch { /* */ }

  const root = document.createElement('nav'); root.className = 'nv'; root.setAttribute('aria-label', 'Les pages');
  const inner = document.createElement('div'); inner.className = 'nv-in';
  const track = document.createElement('div'); track.className = 'nv-track';
  const th = document.createElement('canvas'); th.className = 'nv-th'; th.setAttribute('aria-hidden', 'true');
  // deux voisins de chaque côté (pendant que le fil coulisse, le suivant est déjà là)
  const items = [-2, -1, 0, 1, 2].map(d => {
    const p = ring(ci + d), a = document.createElement('a');
    a.className = 'nv-l' + (d === 0 ? ' cur' : Math.abs(d) > 1 ? ' far' : ''); a.textContent = p.label; a.href = url(p); a.dataset.d = d;
    if (d === 0) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', e => { e.preventDefault(); if (d) go(Math.sign(d) * Math.min(1, Math.abs(d)), d); });
    track.appendChild(a);
    return a;
  });
  track.prepend(th);
  inner.appendChild(track); root.appendChild(inner);
  const sides = [-1, 1].map(d => {
    const p = ring(ci + d), a = document.createElement('a');
    a.className = 'nv-side ' + (d < 0 ? 'l' : 'r'); a.href = url(p); a.setAttribute('aria-label', p.label.toLowerCase());
    const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = new URL(base + p.img, document.baseURI).href; a.appendChild(im);
    a.addEventListener('click', e => { e.preventDefault(); go(d); });
    return a;
  });
  document.body.append(root, ...sides);

  // ---- mise en page : le nom courant au centre ; le fil cousu entre chaque nom ----
  let centers = [], X = 0;
  const setX = (x, anim) => { X = x; track.classList.toggle('anim', !!anim); track.style.transform = `translateX(${(-x).toFixed(1)}px)`; };
  function layout() {
    const mobile = innerWidth < 520;
    root.style.setProperty('--nv-fs', mobile ? '11px' : '12px');
    root.style.setProperty('--nv-gap', mobile ? '30px' : '40px');
    root.style.setProperty('--nv-m', mobile ? '14%' : '24%');
    const tr = track.getBoundingClientRect();
    const boxes = items.map(a => { const r = a.getBoundingClientRect(); const ls = parseFloat(getComputedStyle(a).letterSpacing) || 0; return { l: r.left - tr.left, r: r.right - tr.left - ls, y: r.top - tr.top + r.height / 2 }; });
    centers = boxes.map(b => (b.l + b.r) / 2);
    setX(centers[2], false);
    // le fil : un bout cousu entre deux noms voisins (il sort d'un trou après le nom, rentre dans un trou avant le suivant)
    const w = tr.width || track.scrollWidth, H = 44, dpr = Math.min(3, window.devicePixelRatio || 1);
    th.width = Math.round(w * dpr); th.height = H * dpr; th.style.width = w + 'px'; th.style.height = H + 'px';
    const x = th.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, H);
    const cap = parseFloat(getComputedStyle(items[2]).fontSize) * 0.33;
    for (let i = 0; i < boxes.length - 1; i++) paintThread(x, boxes[i].r + 7, boxes[i + 1].l - 7, boxes[i].y - cap * 0.05 + 0.5, 11 + i * 7);
  }
  const ro = new ResizeObserver(layout); ro.observe(track);
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();

  // ---- visible quand la page le dit ----
  const place = () => {
    const c = opts.center ? opts.center() : null;
    if (c) for (const s of sides) s.style.setProperty('--nv-cy', c.y + 'px'), s.style.setProperty('--nv-sh', c.h + 'px');
  };
  let shown = false, leaving = false;
  const tick = () => {
    if (leaving) return;
    const on = !!opts.show?.(), side = on && !!(opts.side ? opts.side() : true);
    if (on !== shown) { shown = on; root.classList.toggle('on', on); if (on) layout(); }
    root.classList.toggle('side', side);
    if (side) place();
  };
  setInterval(tick, 200); tick();

  // ---- aller à une page voisine ----
  const stage = () => (opts.stage ? opts.stage() : []).filter(Boolean);
  function go(dir, d = dir) {
    if (leaving) return;
    leaving = true;
    const p = ring(ci + d);
    count('nav/' + p.id);
    try { sessionStorage.setItem(K_NAV, JSON.stringify({ to: p.id, dir: Math.sign(d), at: Date.now() })); } catch { /* */ }
    // le fil coulisse : le nom suivant vient au centre
    setX(centers[2 + d], true);
    items.forEach((a, i) => { a.classList.toggle('cur', i === 2 + d); a.classList.toggle('far', Math.abs(i - 2 - d) > 1); });
    // l'objet part du côté opposé ; l'objet voisin glisse vers le centre et s'efface
    for (const el of stage()) {
      el.style.transition = 'translate .6s cubic-bezier(.55,0,.7,.4), opacity .5s ease .08s';
      el.style.translate = `${(-Math.sign(d) * Math.max(innerWidth * 0.75, 320)).toFixed(0)}px 0`; el.style.opacity = '0';
    }
    const s = sides[d < 0 ? 0 : 1];
    s.style.transition = 'translate .6s cubic-bezier(.45,.05,.25,1), opacity .6s ease';
    s.style.translate = `${(-Math.sign(d) * innerWidth * 0.28).toFixed(0)}px 0`; s.style.opacity = '0';
    sides[d < 0 ? 1 : 0].style.opacity = '0';
    opts.onLeave?.(Math.sign(d));
    setTimeout(() => { location.href = url(p); }, 560);
  }
  // revenu par le bouton retour (page rendue par le cache) : tout reprend sa place
  addEventListener('pageshow', e => {
    if (!e.persisted || !leaving) return;
    leaving = false;
    for (const el of stage()) { el.style.transition = 'none'; el.style.translate = ''; el.style.opacity = ''; }
    for (const s of sides) { s.style.transition = 'none'; s.style.translate = ''; s.style.opacity = ''; }
    items.forEach((a, i) => { a.classList.toggle('cur', i === 2); a.classList.toggle('far', Math.abs(i - 2) > 1); });
    setX(centers[2], false); tick();
  });

  // ---- l'objet suit le doigt (glisser horizontalement) ----
  function swipe(el) {
    let x0 = null, y0 = 0, t0 = 0, horiz = null, id = null;
    const follow = dx => {
      const k = dx * 0.9;
      for (const s of stage()) { s.style.transition = 'none'; s.style.translate = `${k.toFixed(1)}px 0`; }
      const span = (centers[3] - centers[1]) / 2 || 200;
      setX(centers[2] - dx / Math.max(innerWidth, 1) * span, false);
    };
    const release = (dx, v) => {
      if (Math.abs(dx) > Math.min(90, innerWidth * 0.22) || (Math.abs(dx) > 30 && Math.abs(v) > 0.45)) { go(dx < 0 ? 1 : -1); return; }
      for (const s of stage()) { s.style.transition = 'translate .45s cubic-bezier(.2,.7,.3,1)'; s.style.translate = ''; }
      setX(centers[2], true);
    };
    el.addEventListener('pointerdown', e => { if (leaving || !shown) return; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); horiz = null; id = e.pointerId; }, { passive: true });
    el.addEventListener('pointermove', e => {
      if (x0 == null || e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (horiz == null && Math.hypot(dx, dy) > 10) horiz = Math.abs(dx) > 1.3 * Math.abs(dy);
      if (horiz) follow(dx);
    }, { passive: true });
    const up = e => {
      if (x0 == null || e.pointerId !== id) return;
      const dx = e.clientX - x0, v = dx / Math.max(1, performance.now() - t0); x0 = null;
      if (horiz) release(dx, v);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', e => { if (x0 != null && horiz) release(0, 0); x0 = null; });
  }

  // ---- l'arrivée : l'objet entre du côté d'où l'on vient ----
  function enter(els) {
    if (!arrived) return;
    for (const el of els.filter(Boolean)) {
      el.style.transition = 'none'; el.style.translate = `${(arrived * Math.max(innerWidth * 0.5, 260)).toFixed(0)}px 0`; el.style.opacity = '0';
      void el.offsetWidth;
      el.style.transition = 'translate .75s cubic-bezier(.2,.7,.3,1), opacity .6s ease';
      el.style.translate = ''; el.style.opacity = '';
    }
  }
  // ---- une seule fois (téléphone) : l'objet esquisse le geste, les voisins se montrent un peu plus ----
  function nudge() {
    try { if (sessionStorage.getItem('sg.nav.nudge')) return; sessionStorage.setItem('sg.nav.nudge', '1'); } catch { /* */ }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || leaving) return;
    const els = stage();
    const k = [[0, 0], [-26, 380], [0, 520]];
    let i = 0;
    const stepN = () => {
      if (leaving || i >= k.length) return;
      const [dx, ms] = k[i++];
      for (const el of els) { el.style.transition = `translate ${i === 1 ? 0 : ms}ms cubic-bezier(.45,.05,.25,1)`; el.style.translate = dx ? `${dx}px 0` : ''; }
      sides[1].style.transition = `translate ${ms}ms cubic-bezier(.45,.05,.25,1), opacity .8s`; sides[1].style.translate = dx ? `${dx}px 0` : '';
      setX(centers[2] - dx * 0.6, i > 1);
      if (i < k.length) setTimeout(stepN, i === 1 ? 30 : k[i - 1][1] + 120);
    };
    stepN();
  }
  return { go, swipe, enter, nudge, get arrived() { return arrived; }, get leaving() { return leaving; }, layout };
}
