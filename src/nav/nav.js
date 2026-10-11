// Les pages, reliées par le fil (11/10, Maxence : « pas de menu, tout est relié »). En haut, le nom de la page où l'on
// est (UN PRENOM UN POEME), et de part et d'autre, reliés à lui par un fil cousu, les noms des pages voisines (MES
// LIVRES à gauche, UN POEME PAR MOIS à droite…) qui se perdent dans le noir aux bords ; en bas, SINGULIES, sur un second
// fil, d'un bord à l'autre. Les deux fils respirent à peine (leur affaissement change très lentement, chaque bout à son
// rythme). Les pages forment une boucle. Ordinateur : les objets des pages voisines attendent sur les côtés, plus
// petits, en fondu ; téléphone : leur bord, et une fois l'objet esquisse le geste.
// (11/10, suite) UNE SEULE PAGE : aller à une page voisine ne recharge rien — l'objet de la page part du côté opposé
// pendant que celui de la page suivante entre de l'autre côté, le fil coulisse, l'adresse change (history). Les pages
// légères (un poème par mois, mes livres) sont montées dans le document ; le jeu aussi (sa scène). Une page que le
// document ne sait pas monter (le poème, depuis lettre.html) : on y va (rechargement), son objet entre à l'arrivée.
import { paintThread } from '../alt/stitch.js';
import { count } from '../app/count.js';

export const PAGES = [
  { id: 'poeme', label: 'UN PRENOM UN POEME', href: 'alt.html', img: 'exemples/julie.jpg' },
  { id: 'lettre', label: 'UN POEME PAR MOIS', href: 'lettre.html', img: 'simple/enveloppe-dos.jpg' },
  { id: 'jeu', label: 'LE JEU', href: 'jeu.html', img: 'simple/portail-jeu.jpg' },
  { id: 'livres', label: 'MES LIVRES', href: 'livres.html', img: 'simple/portail-livres.jpg' },
];
const K_NAV = 'sg.nav';
const mod = (i, n) => ((i % n) + n) % n;
const ring = i => PAGES[mod(i, PAGES.length)];
const idx = id => PAGES.findIndex(p => p.id === id);
// les pages que le document sait monter lui-même (src/nav/pages.js)
const MOUNTABLE = { lettre: 1, livres: 1, jeu: 1 };

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
.nv-l.far, .nv.solo .nv-l:not(.cur) { opacity: 0; pointer-events: none !important; }
.nv.on .nv-l { pointer-events: auto; }
.nv-l:not(.cur):hover, .nv-l:not(.cur):focus-visible { opacity: .75; outline: none; }
.nv-th { position: absolute; left: 0; top: 0; pointer-events: none; }
/* en bas : SINGULIES, sur son fil, d'un bord à l'autre */
.nv-foot { position: fixed; z-index: 26; left: 0; right: 0; bottom: 0; height: calc(40px + env(safe-area-inset-bottom)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv-foot.on { opacity: 1; }
.nv-foot canvas { position: absolute; left: 0; top: 0; }
.nv-foot span { position: absolute; left: 50%; top: 13px; transform: translateX(-50%); font: 500 10.5px/14px 'SG Garamond', Georgia, serif;
  letter-spacing: .34em; margin-right: -.34em; color: #ece8e0; opacity: .5; white-space: nowrap; }
/* le noir derrière le bandeau et le bas (les prénoms du champ s'y effacent, ne passent jamais dessous) */
.nv-shade { position: fixed; z-index: 25; left: 0; right: 0; pointer-events: none; opacity: 0; transition: opacity .7s ease; }
.nv-shade.t { top: 0; height: calc(104px + env(safe-area-inset-top)); background: linear-gradient(#060606 0, #060606 52%, rgba(6,6,6,0)); }
.nv-shade.b { bottom: 0; height: calc(96px + env(safe-area-inset-bottom)); background: linear-gradient(to top, #060606 0, #060606 48%, rgba(6,6,6,0)); }
.nv-shade.on { opacity: 1; }
/* les objets des pages voisines */
.nv-side { position: fixed; z-index: 19; top: var(--nv-cy, 42%); height: min(var(--nv-sh, 46vh), 32vh); display: block; transform: translateY(-50%);
  opacity: 0; pointer-events: none; transition: opacity .8s ease, translate .62s cubic-bezier(.45,.05,.25,1); -webkit-tap-highlight-color: transparent; }
.nv-side img { display: block; height: 100%; width: auto; pointer-events: none; }
.nv-side.l { right: calc(50% + var(--nv-sx, max(270px, 19vw))); -webkit-mask-image: linear-gradient(to left, #000 35%, transparent); mask-image: linear-gradient(to left, #000 35%, transparent); }
.nv-side.r { left: calc(50% + var(--nv-sx, max(270px, 19vw))); -webkit-mask-image: linear-gradient(to right, #000 35%, transparent); mask-image: linear-gradient(to right, #000 35%, transparent); }
.nv.on.side ~ .nv-side { opacity: .42; pointer-events: auto; cursor: pointer; }
.nv.on.side ~ .nv-side:hover { opacity: .75; }
@media (max-width: 760px) {
  .nv-side { height: var(--nv-sh, 34vh); }
  .nv-side.l { right: calc(100% - 16px); -webkit-mask-image: none; mask-image: none; }
  .nv-side.r { left: calc(100% - 16px); -webkit-mask-image: none; mask-image: none; }
  .nv.on.side ~ .nv-side { opacity: .34; }
}
@media (prefers-reduced-motion: reduce) { .nv-track.anim, .nv-side { transition-duration: .01s; } }
`;

// opts : { current (id de la page du document), base, host : la page du document { stage() (l'objet : il suit le doigt),
//   all() (tout ce qui part sur le côté ; défaut : stage), leave(), back() (elle revient) },
//   show() (le bandeau), side() (les objets voisins), solo() (seulement le nom de la page), foot() (SINGULIES en bas),
//   shade() (le noir derrière le haut et le bas), center() ({ y, h } px : l'objet, pour placer les voisins) }
export function installNav(opts) {
  const base = opts.base || './';
  const home = idx(opts.current);
  if (home < 0) return null;
  if (!document.getElementById('nv-style')) { const st = document.createElement('style'); st.id = 'nv-style'; st.textContent = CSS; document.head.appendChild(st); }
  const url = p => { const u = new URL(base + p.href, document.baseURI), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); return u.href; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // l'arrivée : venue d'une page voisine par le fil, en rechargeant (moins de 6 s)
  let arrived = 0;
  try { const a = JSON.parse(sessionStorage.getItem(K_NAV) || 'null'); if (a && a.to === opts.current && Date.now() - a.at < 6000) arrived = a.dir; sessionStorage.removeItem(K_NAV); } catch { /* */ }

  let cur = home;                            // la page qu'on regarde
  const pages = {};                          // id → page montée { stage(), all(), leave(), back(), foot }
  pages[opts.current] = opts.host || { stage: () => [] };

  const root = document.createElement('nav'); root.className = 'nv'; root.setAttribute('aria-label', 'Les pages');
  const inner = document.createElement('div'); inner.className = 'nv-in';
  const track = document.createElement('div'); track.className = 'nv-track';
  const th = document.createElement('canvas'); th.className = 'nv-th'; th.setAttribute('aria-hidden', 'true');
  inner.appendChild(track); root.appendChild(inner);
  const foot = document.createElement('div'); foot.className = 'nv-foot'; foot.setAttribute('aria-hidden', 'true');
  const fcv = document.createElement('canvas'), fsp = document.createElement('span'); fsp.textContent = 'SINGULIES';
  foot.append(fcv, fsp);
  const shadeT = document.createElement('div'), shadeB = document.createElement('div');
  shadeT.className = 'nv-shade t'; shadeB.className = 'nv-shade b';
  let items = [];
  // deux voisins de chaque côté (pendant que le fil coulisse, le suivant est déjà là)
  function build() {
    track.replaceChildren(th);
    items = [-2, -1, 0, 1, 2].map(d => {
      const p = ring(cur + d), a = document.createElement('a');
      a.className = 'nv-l' + (d === 0 ? ' cur' : Math.abs(d) > 1 ? ' far' : ''); a.textContent = p.label; a.href = url(p);
      if (d === 0) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', e => { e.preventDefault(); if (d) go(d); });
      track.appendChild(a);
      return a;
    });
  }
  const sides = [-1, 1].map(d => {
    const a = document.createElement('a'); a.className = 'nv-side ' + (d < 0 ? 'l' : 'r');
    const im = new Image(); im.alt = ''; im.decoding = 'async'; a.appendChild(im);
    a.addEventListener('click', e => { e.preventDefault(); go(d); });
    return a;
  });
  const setSides = () => sides.forEach((a, k) => { const p = ring(cur + (k ? 1 : -1)); a.href = url(p); a.setAttribute('aria-label', p.label.toLowerCase()); a.firstChild.src = new URL(base + p.img, document.baseURI).href; });
  document.body.append(shadeT, shadeB, root, foot, ...sides);
  build(); setSides();

  // ---- mise en page : le nom courant au centre ; le fil cousu entre chaque nom ----
  let centers = [], boxes = [], X = 0;
  const setX = (x, anim) => { X = x; track.classList.toggle('anim', !!anim); track.style.transform = `translateX(${(-x).toFixed(1)}px)`; };
  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  function layout() {
    const mobile = innerWidth < 520;
    root.style.setProperty('--nv-fs', mobile ? '11px' : '12px');
    root.style.setProperty('--nv-gap', mobile ? '30px' : '40px');
    root.style.setProperty('--nv-m', mobile ? '14%' : '24%');
    const tr = track.getBoundingClientRect();
    boxes = items.map(a => { const r = a.getBoundingClientRect(); const ls = parseFloat(getComputedStyle(a).letterSpacing) || 0; return { l: r.left - tr.left, r: r.right - tr.left - ls, y: r.top - tr.top + r.height / 2 }; });
    centers = boxes.map(b => (b.l + b.r) / 2);
    setX(centers[2], false);
    const w = Math.max(1, tr.width || track.scrollWidth), d = dpr();
    th.width = Math.round(w * d); th.height = 44 * d; th.style.width = w + 'px'; th.style.height = '44px';
    const fw = innerWidth, fh = 40;
    fcv.width = Math.round(fw * d); fcv.height = fh * d; fcv.style.width = fw + 'px'; fcv.style.height = fh + 'px';
    paint(performance.now() / 1000);
  }
  // ---- les deux fils respirent : l'affaissement de chaque bout change très lentement (6 à 9 s), sans jamais se répéter
  //      à l'identique (deux sinus non accordés), d'un pixel au plus ----
  const breath = (i, t) => 0.45 + 0.42 * Math.sin(t * 0.83 + i * 1.7) * (0.7 + 0.3 * Math.sin(t * 0.31 + i)) ;
  function paint(t) {
    if (!boxes.length) return;
    const d = dpr();
    { const x = th.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, th.width / d, 44);
      const cap = parseFloat(getComputedStyle(items[2]).fontSize) * 0.33;
      for (let i = 0; i < boxes.length - 1; i++) {
        const a = boxes[i].r + 7, b = boxes[i + 1].l - 7, L = b - a;
        if (L > 6) paintThread(x, a, b, boxes[i].y - cap * 0.05 + 0.5, 11 + i * 7, 1.25, { sag: reduced ? 0.45 : breath(i, t) * Math.min(1.6, L / 40), sag2: reduced ? 0 : 0.18 * Math.sin(t * 0.57 + i * 2.3) });
      }
    }
    { const x = fcv.getContext('2d'), fw = fcv.width / d, r = fsp.getBoundingClientRect(), y = 20, gapX = 9;
      x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, fw, 40);
      if (r.width) {
        const ls = parseFloat(getComputedStyle(fsp).letterSpacing) || 0, l = r.left - gapX, rr = r.right - ls + gapX;
        paintThread(x, -4, l, y, 53, 1.2, { holes: [false, true], sag: reduced ? 0.6 : 0.3 + 1.1 * breath(7, t), sag2: reduced ? 0 : 0.35 * Math.sin(t * 0.43 + 1) });
        paintThread(x, rr, fw + 4, y, 71, 1.2, { holes: [true, false], sag: reduced ? 0.6 : 0.3 + 1.1 * breath(9, t), sag2: reduced ? 0 : 0.35 * Math.sin(t * 0.47 + 4) });
      }
    }
  }
  let raf = 0, lastP = 0;
  const loop = now => {
    raf = 0;
    if (!(shown || footOn) || document.hidden || reduced) return;
    if (now - lastP > 40) { lastP = now; paint(now / 1000); }   // (≈ 25 images/s suffisent : le mouvement est lent)
    raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); };
  const ro = new ResizeObserver(layout); ro.observe(track);
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();

  // ---- visible quand la page le dit ----
  const place = () => {
    const c = opts.center ? opts.center() : null;
    if (c) for (const s of sides) s.style.setProperty('--nv-cy', c.y + 'px'), s.style.setProperty('--nv-sh', c.h + 'px');
  };
  let shown = false, footOn = false, busy = false;
  const atHome = () => cur === home;
  function tick() {
    if (busy) return;
    const pg = pages[ring(cur).id] || {};
    const on = atHome() ? !!opts.show?.() : true;
    const side = on && (atHome() ? !!(opts.side ? opts.side() : true) : !!(pg.side ? pg.side() : true));
    const solo = on && atHome() && !!opts.solo?.();
    const f = atHome() ? !!opts.foot?.() : !!pg.foot;
    const sh = atHome() ? !!opts.shade?.() : !!pg.foot;
    if (on !== shown) { shown = on; root.classList.toggle('on', on); if (on) layout(); }
    if (f !== footOn) { footOn = f; foot.classList.toggle('on', f); if (f) layout(); }
    root.classList.toggle('side', side && !solo);
    root.classList.toggle('solo', solo);
    shadeT.classList.toggle('on', sh && on); shadeB.classList.toggle('on', sh && f);
    if (side) place();
    if (shown || footOn) wake();
  }
  setInterval(tick, 200); tick();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // ---- les pages : celle du document (host), les autres montées à la demande (pages.js), gardées ----
  const loading = {};
  function ensure(id) {
    if (pages[id]) return Promise.resolve(pages[id]);
    if (!MOUNTABLE[id]) return Promise.resolve(null);
    if (!loading[id]) loading[id] = import('./pages.js').then(m => m.mountPage(id, { base, reduced, nav: api }))
      .then(p => { if (p) pages[id] = p; delete loading[id]; return p; })
      .catch(e => { console.warn('page', id, e); delete loading[id]; return null; });
    return loading[id];
  }
  // (préparées à un moment calme : la page voisine est déjà là quand on y va)
  const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
  setTimeout(() => idle(() => { ensure(ring(cur + 1).id); ensure(ring(cur - 1).id); }), 7000);

  const W = () => Math.max(innerWidth * 0.8, 320);
  const els = (pg, all) => ((all && pg.all ? pg.all() : pg.stage ? pg.stage() : []) || []).filter(Boolean);
  function slideOut(list, dir) {
    for (const el of list) {
      el.style.transition = reduced ? 'opacity .3s' : 'translate .62s cubic-bezier(.55,0,.6,.45), opacity .5s ease .1s';
      el.style.translate = reduced ? '' : `${(-dir * W()).toFixed(0)}px 0`; el.style.opacity = '0';
    }
  }
  function slideIn(list, dir, from = null) {
    for (const el of list) {
      el.style.visibility = '';
      el.style.transition = 'none'; el.style.translate = reduced ? '' : `${(from ?? dir * W()).toFixed(0)}px 0`; el.style.opacity = '0';
    }
    void document.body.offsetWidth;
    for (const el of list) { el.style.transition = reduced ? 'opacity .4s' : 'translate .7s cubic-bezier(.2,.65,.25,1), opacity .55s ease .05s'; el.style.translate = ''; el.style.opacity = ''; }
  }
  // ---- aller à une page voisine (d : ±1, ±2) ----
  async function go(d, opt = {}) {
    if (busy || !d) return;
    const target = ring(cur + d), dir = Math.sign(d), fromId = ring(cur).id, from = pages[fromId];
    count('nav/' + target.id);
    const inDoc = !!(pages[target.id] || MOUNTABLE[target.id]);
    busy = true;
    // le fil coulisse : le nom suivant vient au centre
    if (centers[2 + d] != null) setX(centers[2 + d], true);
    items.forEach((a, i) => { a.classList.toggle('cur', i === 2 + d); a.classList.toggle('far', Math.abs(i - 2 - d) > 1); });
    // l'objet part du côté opposé (s'il suivait le doigt, il repart de là)
    const out = els(from || {}, true);
    slideOut(out, dir);
    from?.leave?.();
    const sd = sides[dir < 0 ? 0 : 1];
    sd.style.transition = 'translate .6s cubic-bezier(.45,.05,.25,1), opacity .5s ease'; sd.style.translate = `${(-dir * innerWidth * 0.3).toFixed(0)}px 0`; sd.style.opacity = '0';
    sides[dir < 0 ? 1 : 0].style.opacity = '0';
    if (!inDoc) {
      // une page que le document ne sait pas monter : on y va
      try { sessionStorage.setItem(K_NAV, JSON.stringify({ to: target.id, dir, at: Date.now() })); } catch { /* */ }
      setTimeout(() => { location.href = url(target); }, 560);
      return;
    }
    const pg = await ensure(target.id);
    if (!pg) { busy = false; location.href = url(target); return; }
    cur = mod(cur + d, PAGES.length);
    // l'objet de la page suivante entre de l'autre côté, pendant que le premier sort
    slideIn(els(pg, true), dir);
    pg.back?.();
    if (!opt.pop) try { history.pushState({ sgPage: target.id }, '', url(target)); } catch { /* */ }
    setTimeout(() => {
      for (const el of out) el.style.visibility = 'hidden';
      if (from && from.transient) delete pages[fromId];
      for (const s of sides) { s.style.transition = 'none'; s.style.translate = ''; s.style.opacity = ''; }
      build(); setSides(); layout();
      busy = false; tick();
    }, 680);
  }
  // le bouton retour du navigateur : la page d'avant (sens : vers la gauche)
  try { history.replaceState({ ...(history.state || {}), sgPage: opts.current }, ''); } catch { /* */ }
  addEventListener('popstate', e => {
    const id = e.state && e.state.sgPage; if (!id) return;
    const t = idx(id); if (t < 0 || t === cur) return;
    let d = mod(t - cur, PAGES.length); if (d > PAGES.length / 2) d -= PAGES.length;
    go(d, { pop: true });
  });
  // revenu par le bouton retour après un rechargement (page rendue par le cache) : tout reprend sa place
  addEventListener('pageshow', e => {
    if (!e.persisted || !busy) return;
    busy = false;
    for (const el of els(pages[ring(cur).id] || {}, true)) { el.style.transition = 'none'; el.style.translate = ''; el.style.opacity = ''; el.style.visibility = ''; }
    for (const s of sides) { s.style.transition = 'none'; s.style.translate = ''; s.style.opacity = ''; }
    build(); layout(); tick();
  });

  // ---- l'objet suit le doigt (glisser horizontalement) — au doigt (touch) et à la souris ----
  function swipe(el, page = null) {
    let x0 = null, y0 = 0, t0 = 0, horiz = null;
    const mine = () => (page ? ring(cur).id === page : true);
    const follow = dx => {
      const pg = pages[ring(cur).id] || {};
      for (const s of els(pg, false)) { s.style.transition = 'none'; s.style.translate = `${(dx * 0.9).toFixed(1)}px 0`; }
      const span = (centers[3] - centers[1]) / 2 || 200;
      setX(centers[2] - dx / Math.max(innerWidth, 1) * span, false);
      // l'objet voisin vient avec le doigt
      const sd = sides[dx < 0 ? 1 : 0], ot = sides[dx < 0 ? 0 : 1];
      sd.style.transition = 'none'; sd.style.translate = `${(dx * 0.35).toFixed(1)}px 0`; ot.style.translate = '';
    };
    const release = (dx, v) => {
      if (Math.abs(dx) > Math.min(90, innerWidth * 0.22) || (Math.abs(dx) > 30 && Math.abs(v) > 0.45)) { go(dx < 0 ? 1 : -1); return; }
      const pg = pages[ring(cur).id] || {};
      for (const s of els(pg, false)) { s.style.transition = 'translate .45s cubic-bezier(.2,.7,.3,1)'; s.style.translate = ''; }
      for (const s of sides) { s.style.transition = 'translate .45s cubic-bezier(.2,.7,.3,1)'; s.style.translate = ''; }
      setX(centers[2], true);
    };
    const start = (x, y) => { if (busy || !shown || !mine()) return; x0 = x; y0 = y; t0 = performance.now(); horiz = null; };
    const move = (x, y) => {
      if (x0 == null) return;
      const dx = x - x0, dy = y - y0;
      if (horiz == null && Math.hypot(dx, dy) > 10) horiz = Math.abs(dx) > 1.3 * Math.abs(dy);
      if (horiz) follow(dx);
    };
    const end = x => {
      if (x0 == null) return;
      const dx = x - x0, v = dx / Math.max(1, performance.now() - t0); x0 = null;
      if (horiz) release(dx, v);
    };
    // au doigt : les événements tactiles (plus sûrs que les pointeurs sur iPhone quand la page défile verticalement)
    el.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY); else x0 = null; }, { passive: true });
    el.addEventListener('touchmove', e => { if (x0 != null && e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) end(t.clientX); }, { passive: true });
    el.addEventListener('touchcancel', () => { if (x0 != null && horiz) release(0, 0); x0 = null; }, { passive: true });
    // à la souris
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) start(e.clientX, e.clientY); }, { passive: true });
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientX, e.clientY); }, { passive: true });
    el.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX); });
  }

  // ---- l'arrivée par rechargement : l'objet entre du côté d'où l'on vient ----
  function enter(list) { if (arrived) slideIn(list.filter(Boolean), arrived, arrived * Math.max(innerWidth * 0.5, 260)); }
  // ---- une seule fois (téléphone) : l'objet esquisse le geste, le voisin se montre un peu plus ----
  function nudge() {
    try { if (sessionStorage.getItem('sg.nav.nudge')) return; sessionStorage.setItem('sg.nav.nudge', '1'); } catch { /* */ }
    if (reduced || busy) return;
    const list = els(pages[ring(cur).id] || {}, false);
    const k = [[-26, 420], [0, 560]];
    let i = 0;
    const stepN = () => {
      if (busy || i >= k.length) return;
      const [dx, ms] = k[i++];
      for (const el of list) { el.style.transition = `translate ${ms}ms cubic-bezier(.45,.05,.25,1)`; el.style.translate = dx ? `${dx}px 0` : ''; }
      sides[1].style.transition = `translate ${ms}ms cubic-bezier(.45,.05,.25,1), opacity .8s`; sides[1].style.translate = dx ? `${dx}px 0` : '';
      setX(centers[2] - dx * 0.6, true);
      if (i < k.length) setTimeout(stepN, ms + 120);
    };
    stepN();
  }
  const api = { go, swipe, enter, nudge, layout, get arrived() { return arrived; }, get busy() { return busy; }, get page() { return ring(cur).id; },
    home: () => { const d = mod(home - cur, PAGES.length); if (d) go(d > PAGES.length / 2 ? d - PAGES.length : d); } };
  return api;
}
