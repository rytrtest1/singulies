// Les pages, reliées par le fil (11/10, Maxence : « pas de menu, tout est relié »). En haut, le nom de la page où l'on
// est (UN PRENOM UN POEME), et de part et d'autre, reliés à lui par un fil cousu qui court d'un bord à l'autre de
// l'écran, les noms des pages voisines (UN POEME PAR MOIS à gauche — sur téléphone on en lit « … PAR MOIS » au bord —,
// MES LIVRES à droite) ; sur ordinateur, la place le permet : toutes les pages, les plus lointaines plus pâles encore.
// En bas, SINGULIES, sur un second fil, d'un bord à l'autre, sur toutes les pages (le toucher : le jeu). Les deux fils
// respirent à peine (leur affaissement change très lentement, chaque bout à son rythme).
// UNE SEULE PAGE : aller à une page voisine ne recharge rien. Les pages sont pensées dans un même espace, côte à côte :
// l'objet du centre et ceux des côtés se décalent ensemble, de la même distance, à la même allure (celui de droite vient
// au centre exactement pendant que celui du centre va à gauche, en rapetissant à la taille d'un voisin). Ordinateur :
// les objets des pages voisines attendent sur les côtés, plus petits, en fondu (comme les stories voisines) ; on clique
// dessus. Téléphone : leur bord ; toucher le bord gauche ou droit de l'écran = la page voisine (comme une story), ou
// glisser l'objet (il suit le doigt, le voisin vient avec) ; une fois, l'objet esquisse le geste (à droite, puis à
// gauche). Pages que le document ne sait pas monter (le poème, depuis lettre.html) : on y va en rechargeant.
import { paintThread } from '../alt/stitch.js';
import { count } from '../app/count.js';

export const PAGES = [
  { id: 'poeme', label: 'UN PRENOM UN POEME', href: 'alt.html', img: 'exemples/julie.jpg' },
  { id: 'livres', label: 'MES LIVRES', href: 'livres.html', img: 'livres/couverture.jpg' },
  { id: 'jeu', label: 'LE JEU', href: 'jeu.html', img: 'simple/portail-jeu.jpg' },
  { id: 'lettre', label: 'UN POEME PAR MOIS', href: 'lettre.html', img: 'simple/enveloppe-dos.jpg' },
];
const K_NAV = 'sg.nav';
const mod = (i, n) => ((i % n) + n) % n;
const ring = i => PAGES[mod(i, PAGES.length)];
const idx = id => PAGES.findIndex(p => p.id === id);
// les pages que le document sait monter lui-même (src/nav/pages.js)
const MOUNTABLE = { lettre: 1, livres: 1, jeu: 1 };
const SPAN = [-3, -2, -1, 0, 1, 2, 3];   // les noms posés sur le fil (les plus lointains : ordinateur, et pendant que le fil coulisse)
const EASE = 'cubic-bezier(.45,.05,.25,1)', DUR = 720;
const PAD = 1600;                         // le fil dépasse le bandeau de chaque côté (il court d'un bord à l'autre)

const CSS = `
.nv { position: fixed; z-index: 26; left: 0; right: 0; top: 0; height: calc(48px + env(safe-area-inset-top)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv.on { opacity: 1; }
.nv-in { position: absolute; left: 0; right: 0; bottom: 0; height: 44px; overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--nv-m, 22%), #000 calc(100% - var(--nv-m, 22%)), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 var(--nv-m, 22%), #000 calc(100% - var(--nv-m, 22%)), transparent 100%); }
.nv-track { position: absolute; left: 50%; top: 0; height: 44px; display: flex; align-items: center; gap: var(--nv-gap, 34px); white-space: nowrap;
  will-change: transform; }
.nv-track.anim { transition: transform ${DUR}ms ${EASE}; }
.nv-l { position: relative; z-index: 1; display: block; margin: 0; padding: 14px 0; border: 0; background: none; cursor: pointer; text-decoration: none;
  font: 500 var(--nv-fs, 12px)/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; margin-right: -.3em; color: #ece8e0; opacity: .4;
  transition: opacity .6s; -webkit-tap-highlight-color: transparent; }
.nv-l.cur { opacity: .9; cursor: default; }
.nv-l.far { opacity: 0; pointer-events: none !important; }
.nv.wide .nv-l.far.d2 { opacity: .2; pointer-events: auto !important; }
.nv.solo .nv-l:not(.cur) { opacity: 0; pointer-events: none !important; }
.nv.on .nv-l { pointer-events: auto; }
.nv-l:not(.cur):hover, .nv-l:not(.cur):focus-visible { opacity: .75 !important; outline: none; }
.nv-th { position: absolute; left: -${PAD}px; top: 0; pointer-events: none; }
/* en bas : SINGULIES, sur son fil, d'un bord à l'autre (le toucher : le jeu) */
.nv-foot { position: fixed; z-index: 26; left: 0; right: 0; bottom: 0; height: calc(34px + env(safe-area-inset-bottom)); pointer-events: none;
  opacity: 0; transition: opacity .7s ease; }
.nv-foot.on { opacity: 1; }
.nv-foot canvas { position: absolute; left: 0; top: 0; }
.nv-foot button { position: absolute; left: 50%; top: 2px; transform: translateX(-50%); margin: 0; padding: 8px 6px; border: 0; background: none; cursor: pointer;
  font: 500 10.5px/14px 'SG Garamond', Georgia, serif; letter-spacing: .34em; margin-right: -.34em; color: #ece8e0; opacity: .5; white-space: nowrap;
  -webkit-tap-highlight-color: transparent; transition: opacity .4s; }
.nv-foot.on button { pointer-events: auto; }
.nv-foot button:hover, .nv-foot button:focus-visible { opacity: .8; outline: none; }
/* le noir derrière le bandeau et le bas (les prénoms du champ s'y effacent, ne passent jamais dessous) */
.nv-shade { position: fixed; z-index: 25; left: 0; right: 0; pointer-events: none; opacity: 0; transition: opacity .7s ease; }
.nv-shade.t { top: 0; height: calc(104px + env(safe-area-inset-top)); background: linear-gradient(#060606 0, #060606 52%, rgba(6,6,6,0)); }
.nv-shade.b { bottom: 0; height: calc(96px + env(safe-area-inset-bottom)); background: linear-gradient(to top, #060606 0, #060606 48%, rgba(6,6,6,0)); }
.nv-shade.on { opacity: 1; }
/* les objets des pages voisines, posés dans le même espace (left, translate : nav.js) */
.nv-side { position: fixed; z-index: 19; left: 0; top: var(--nv-cy, 42%); height: var(--nv-sh, 32vh); display: block; transform: translateY(-50%);
  opacity: 0; pointer-events: none; transition: opacity .8s ease; -webkit-tap-highlight-color: transparent; }
.nv-side img { display: block; height: 100%; width: auto; pointer-events: none; }
.nv.on.side ~ .nv-side { opacity: var(--nv-so, .42); pointer-events: auto; cursor: pointer; }
.nv.on.side ~ .nv-side:hover { opacity: .75; }
@media (prefers-reduced-motion: reduce) { .nv-track.anim { transition-duration: .01s; } }
`;

// opts : { current (id de la page du document), base, host : la page du document { stage() (l'objet : il suit le doigt),
//   all() (tout ce qui part et entre sur le côté ; défaut : stage), leave(), back() (elle revient) },
//   show() (le bandeau), side() (les objets voisins), solo() (seulement le nom de la page), foot() (SINGULIES en bas),
//   shade() (le noir derrière le haut et le bas), center() ({ y, h } px : l'objet de la page, pour l'espace commun) }
export function installNav(opts) {
  const base = opts.base || './';
  const home = idx(opts.current);
  if (home < 0) return null;
  if (!document.getElementById('nv-style')) { const st = document.createElement('style'); st.id = 'nv-style'; st.textContent = CSS; document.head.appendChild(st); }
  const url = p => { const u = new URL(base + p.href, document.baseURI), k = new URLSearchParams(location.search); k.delete('q'); u.search = k.toString(); return u.href; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 760;

  // l'arrivée : venue d'une page voisine par le fil, en rechargeant (moins de 6 s)
  let arrived = 0;
  try { const a = JSON.parse(sessionStorage.getItem(K_NAV) || 'null'); if (a && a.to === opts.current && Date.now() - a.at < 6000) arrived = a.dir; sessionStorage.removeItem(K_NAV); } catch { /* */ }

  let cur = home;                            // la page qu'on regarde
  const pages = {};                          // id → page montée { stage(), all(), leave(), back(), foot, center() }
  pages[opts.current] = opts.host || { stage: () => [] };

  const root = document.createElement('nav'); root.className = 'nv'; root.setAttribute('aria-label', 'Les pages');
  const inner = document.createElement('div'); inner.className = 'nv-in';
  const track = document.createElement('div'); track.className = 'nv-track';
  const th = document.createElement('canvas'); th.className = 'nv-th'; th.setAttribute('aria-hidden', 'true');
  inner.appendChild(track); root.appendChild(inner);
  const foot = document.createElement('div'); foot.className = 'nv-foot';
  const fcv = document.createElement('canvas'); fcv.setAttribute('aria-hidden', 'true');
  const fsp = document.createElement('button'); fsp.type = 'button'; fsp.textContent = 'SINGULIES'; fsp.setAttribute('aria-label', 'SINGULIES, le jeu');
  fsp.addEventListener('click', () => goTo('jeu'));
  foot.append(fcv, fsp);
  const shadeT = document.createElement('div'), shadeB = document.createElement('div');
  shadeT.className = 'nv-shade t'; shadeB.className = 'nv-shade b';
  let items = [];
  function build() {
    track.replaceChildren(th);
    items = SPAN.map(d => {
      const p = ring(cur + d), a = document.createElement('a');
      a.className = 'nv-l' + (d === 0 ? ' cur' : Math.abs(d) > 1 ? ' far d' + Math.abs(d) : ''); a.textContent = p.label; a.href = url(p);
      if (d === 0) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', e => { e.preventDefault(); if (d) go(d); });
      track.appendChild(a);
      return a;
    });
  }
  const sides = [-1, 1].map(d => {
    const a = document.createElement('a'); a.className = 'nv-side ' + (d < 0 ? 'l' : 'r');
    const im = new Image(); im.alt = ''; im.decoding = 'async'; a.appendChild(im);
    im.addEventListener('load', () => place());
    a.addEventListener('click', e => { e.preventDefault(); go(d); });
    return a;
  });
  const setSides = () => sides.forEach((a, k) => { const p = ring(cur + (k ? 1 : -1)); a.href = url(p); a.setAttribute('aria-label', p.label.toLowerCase()); const s = new URL(base + p.img, document.baseURI).href; if (a.firstChild.src !== s) a.firstChild.src = s; });
  document.body.append(shadeT, shadeB, root, foot, ...sides);
  build(); setSides();

  // ---- mise en page : le nom courant au centre ; le fil cousu entre chaque nom, et jusqu'aux bords ----
  let centers = [], boxes = [];
  const C = Math.floor(SPAN.length / 2);
  const setX = (x, anim) => { track.classList.toggle('anim', !!anim); track.style.transform = `translateX(${(-x).toFixed(1)}px)`; };
  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  function layout() {
    root.classList.toggle('wide', !mobile());
    root.style.setProperty('--nv-fs', innerWidth < 520 ? '11px' : '12px');
    root.style.setProperty('--nv-gap', innerWidth < 520 ? '30px' : '44px');
    root.style.setProperty('--nv-m', mobile() ? '12%' : '7%');
    const tr = track.getBoundingClientRect();
    boxes = items.map(a => { const r = a.getBoundingClientRect(); const ls = parseFloat(getComputedStyle(a).letterSpacing) || 0; return { l: r.left - tr.left, r: r.right - tr.left - ls, y: r.top - tr.top + r.height / 2 }; });
    centers = boxes.map(b => (b.l + b.r) / 2);
    setX(centers[C], false);
    const w = Math.max(1, tr.width || track.scrollWidth) + 2 * PAD, k = Math.min(dpr(), 2);
    th.width = Math.round(w * k); th.height = 44 * k; th.style.width = w + 'px'; th.style.height = '44px';
    const fw = innerWidth, fh = 34, d = dpr();
    fcv.width = Math.round(fw * d); fcv.height = fh * d; fcv.style.width = fw + 'px'; fcv.style.height = fh + 'px';
    place();
    paint(performance.now() / 1000);
  }
  // ---- les deux fils respirent : l'affaissement de chaque bout change très lentement (6 à 9 s), sans jamais se répéter
  //      à l'identique (deux sinus non accordés), d'un à deux pixels au plus ----
  const breath = (i, t) => 0.45 + 0.42 * Math.sin(t * 0.83 + i * 1.7) * (0.7 + 0.3 * Math.sin(t * 0.31 + i));
  function paint(t) {
    if (!boxes.length) return;
    { const k = Math.min(dpr(), 2), x = th.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, th.width / k, 44);
      const y = boxes[C].y + 0.5;
      // du bord gauche au premier nom, d'un nom à l'autre, du dernier au bord droit
      const segs = [[-PAD + 2, boxes[0].l - 7, [false, true]]];
      for (let i = 0; i < boxes.length - 1; i++) segs.push([boxes[i].r + 7, boxes[i + 1].l - 7, [true, true]]);
      segs.push([boxes[boxes.length - 1].r + 7, boxes[boxes.length - 1].r + PAD - 2, [true, false]]);
      segs.forEach(([a, b, holes], i) => {
        const L = b - a;
        if (L > 6) paintThread(x, a + PAD, b + PAD, y, 11 + i * 7, 1.25, { holes, sag: reduced ? 0.45 : breath(i, t) * Math.min(1.6, L / 40), sag2: reduced ? 0 : 0.18 * Math.sin(t * 0.57 + i * 2.3) });
      });
    }
    { const d = dpr(), x = fcv.getContext('2d'), fw = fcv.width / d, r = fsp.getBoundingClientRect(), y = 17;
      x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, fw, 34);
      if (r.width) {
        const ls = parseFloat(getComputedStyle(fsp).letterSpacing) || 0, l = r.left + 3, rr = r.right - 3 - ls;
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

  // ---- l'espace commun : D = la distance entre l'objet du centre et ceux des côtés (les voisins sont posés à ±D) ----
  let shown = false, footOn = false, busy = false;
  const atHome = () => cur === home;
  const pgOf = id => pages[id] || {};
  const objC = () => { const pg = pgOf(ring(cur).id), c = (pg.center && pg.center()) || (atHome() && opts.center && opts.center()) || null; return c || { y: innerHeight * 0.45, h: innerHeight * 0.5 }; };
  const sideH = () => Math.min(objC().h * (mobile() ? 0.78 : 0.62), innerHeight * (mobile() ? 0.36 : 0.34));
  const sideW = s => { const im = s.firstChild; return im.naturalWidth ? sideH() * im.naturalWidth / im.naturalHeight : sideH() * 0.72; };
  const D = () => { const w = Math.max(sideW(sides[0]), sideW(sides[1])); return mobile() ? innerWidth / 2 + w / 2 - 18 : Math.max(300, innerWidth * 0.22) + w / 2; };
  const sideScale = () => sideH() / Math.max(1, objC().h);
  function place() {
    const c = objC(), h = sideH(), dd = D();
    sides.forEach((s, k) => {
      const dir = k ? 1 : -1, w = sideW(s);
      s.style.setProperty('--nv-cy', c.y + 'px'); s.style.setProperty('--nv-sh', h + 'px');
      s.style.left = (innerWidth / 2 + dir * dd - w / 2).toFixed(1) + 'px';
      s.style.setProperty('--nv-so', mobile() ? '.38' : '.42');
      // ordinateur : le bord extérieur se perd dans le noir
      const m = mobile() ? 'none' : `linear-gradient(to ${dir < 0 ? 'left' : 'right'}, #000 40%, transparent)`;
      s.style.webkitMaskImage = m; s.style.maskImage = m;
    });
  }
  const ro = new ResizeObserver(layout); ro.observe(track);
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();

  // ---- visible quand la page le dit ----
  function tick() {
    if (busy) return;
    const pg = pgOf(ring(cur).id);
    const on = atHome() ? !!opts.show?.() : true;
    const side = on && (atHome() ? !!(opts.side ? opts.side() : true) : !!(pg.side ? pg.side() : true));
    const solo = on && atHome() && !!opts.solo?.();
    const f = atHome() ? !!opts.foot?.() : pg.foot !== false;
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
  // (préparées à un moment calme : la page voisine est déjà là quand on y va ; le jeu, lourd, seulement à la demande)
  const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
  setTimeout(() => idle(() => { for (const d of [1, -1]) { const id = ring(cur + d).id; if (id !== 'jeu') ensure(id); } }), 7000);

  const els = (pg, all) => ((all && pg.all ? pg.all() : pg.stage ? pg.stage() : []) || []).filter(Boolean);
  const T = `translate ${DUR}ms ${EASE}, scale ${DUR}ms ${EASE}, opacity ${Math.round(DUR * 0.8)}ms ease`;
  // un élément dans l'espace : décalé de x, à l'échelle s (autour du centre de l'objet), d'opacité o
  function put(el, x, s, o, cy, anim) {
    el.style.transition = anim ? (reduced ? 'opacity .35s' : T) : 'none';
    el.style.transformOrigin = `50% ${cy.toFixed(0)}px`;
    if (!reduced) { el.style.translate = x ? `${x.toFixed(1)}px 0` : ''; el.style.scale = s !== 1 ? s.toFixed(3) : ''; }
    el.style.opacity = o === 1 ? '' : String(o);
  }
  // ---- aller à une page voisine (d : ±1, ±2, ±3) ----
  async function go(d, opt = {}) {
    if (busy || !d) return;
    const target = ring(cur + d), dir = Math.sign(d), fromId = ring(cur).id, from = pages[fromId];
    count('nav/' + target.id);
    const inDoc = !!(pages[target.id] || MOUNTABLE[target.id]);
    busy = true;
    const dd = D(), sc = sideScale(), c0 = objC(), steps = Math.abs(d);
    // le fil coulisse : le nom suivant vient au centre
    if (centers[C + d] != null) setX(centers[C + d], true);
    items.forEach((a, i) => { const k = i - C - d; a.classList.toggle('cur', k === 0); a.classList.remove('far', 'd2', 'd3'); if (Math.abs(k) > 1) a.classList.add('far', 'd' + Math.min(3, Math.abs(k))); });
    // l'objet du centre va à la place du voisin opposé (en rapetissant), et s'efface en arrivant
    const out = els(from || {}, true);
    for (const el of out) put(el, -dir * dd * steps, sc, 0, c0.y, true);
    from?.leave?.();
    // les objets voisins se décalent d'autant : celui vers qui l'on va vient au centre (et grandit), l'autre sort
    sides.forEach((s, k) => {
      const sd = k ? 1 : -1, toward = sd === dir;
      s.style.transition = reduced ? 'opacity .35s' : `translate ${DUR}ms ${EASE}, scale ${DUR}ms ${EASE}, opacity ${Math.round(DUR * (toward ? 0.55 : 0.5))}ms ease`;
      s.style.transformOrigin = '50% 50%';
      if (!reduced) { s.style.translate = `${(-dir * dd * steps).toFixed(1)}px 0`; if (toward) s.style.scale = (1 / sc).toFixed(3); }
      s.style.opacity = '0';
    });
    if (!inDoc) {
      // une page que le document ne sait pas monter : on y va
      try { sessionStorage.setItem(K_NAV, JSON.stringify({ to: target.id, dir, at: Date.now() })); } catch { /* */ }
      setTimeout(() => { location.href = url(target); }, DUR * 0.8);
      return;
    }
    const pg = await ensure(target.id);
    if (!pg) { busy = false; location.href = url(target); return; }
    cur = mod(cur + d, PAGES.length);
    // l'objet de la page suivante part de la place du voisin (petit, pâle) et vient au centre
    const inn = els(pg, true), c1 = objC();
    for (const el of inn) { el.style.visibility = ''; put(el, dir * dd * steps, sc, 0.4, c1.y, false); }
    void document.body.offsetWidth;
    for (const el of inn) put(el, 0, 1, 1, c1.y, true);
    pg.back?.();
    if (!opt.pop) try { history.pushState({ sgPage: target.id }, '', url(target)); } catch { /* */ }
    setTimeout(() => {
      for (const el of out) { el.style.visibility = 'hidden'; el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; }
      for (const el of inn) { el.style.transition = 'none'; el.style.transformOrigin = ''; }
      if (from && from.transient) delete pages[fromId];
      // les nouveaux voisins se posent à leur place, en fondu
      for (const s of sides) { s.style.transition = 'none'; s.style.translate = ''; s.style.scale = ''; s.style.opacity = ''; }
      build(); setSides(); layout();
      busy = false; tick();
    }, DUR + 40);
  }
  // aller à une page par son nom (le chemin le plus court sur la boucle)
  function goTo(id) { const t = idx(id); if (t < 0) return; let d = mod(t - cur, PAGES.length); if (d > PAGES.length / 2) d -= PAGES.length; if (d) go(d); }
  // le bouton retour du navigateur : la page d'avant
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
    for (const el of els(pgOf(ring(cur).id), true)) { el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; el.style.opacity = ''; el.style.visibility = ''; }
    for (const s of sides) { s.style.transition = 'none'; s.style.translate = ''; s.style.scale = ''; s.style.opacity = ''; }
    build(); layout(); tick();
  });

  // ---- l'objet suit le doigt (glisser horizontalement), et toucher un bord de l'écran = la page voisine ----
  function swipe(el, page = null) {
    let x0 = null, y0 = 0, t0 = 0, horiz = null, tgt = null;
    const mine = () => (page ? ring(cur).id === page : true);
    const follow = dx => {
      const pg = pgOf(ring(cur).id), c = objC();
      for (const s of els(pg, false)) put(s, dx, 1, 1, c.y, false);
      setX(centers[C] - dx / Math.max(innerWidth, 1) * ((centers[C + 1] - centers[C - 1]) / 2 || 200), false);
      // les voisins viennent avec le doigt, du même pas (le même espace)
      for (const s of sides) { s.style.transition = 'none'; s.style.translate = `${dx.toFixed(1)}px 0`; }
    };
    const release = (dx, v) => {
      if (Math.abs(dx) > Math.min(90, innerWidth * 0.22) || (Math.abs(dx) > 30 && Math.abs(v) > 0.45)) { go(dx < 0 ? 1 : -1); return; }
      const pg = pgOf(ring(cur).id), c = objC();
      for (const s of els(pg, false)) put(s, 0, 1, 1, c.y, true);
      for (const s of sides) { s.style.transition = 'translate .45s cubic-bezier(.2,.7,.3,1)'; s.style.translate = ''; }
      setX(centers[C], true);
    };
    // (téléphone) un toucher bref près d'un bord de l'écran, hors bouton ou champ : la page voisine (comme une story)
    const tapEdge = x => {
      if (!mobile() || !tgt || !tgt.closest || tgt.closest('a, button, input, textarea, label, select, form, .of-bar, .of-cap')) return false;
      const z = innerWidth * 0.2;
      if (x < z) { go(-1); return true; }
      if (x > innerWidth - z) { go(1); return true; }
      return false;
    };
    const start = (x, y, t) => { if (busy || !shown || !mine()) return; x0 = x; y0 = y; t0 = performance.now(); horiz = null; tgt = t; };
    const move = (x, y) => {
      if (x0 == null) return;
      const dx = x - x0, dy = y - y0;
      if (horiz == null && Math.hypot(dx, dy) > 10) horiz = Math.abs(dx) > 1.3 * Math.abs(dy);
      if (horiz) follow(dx);
    };
    const end = (x, y, e) => {
      if (x0 == null) return;
      const dx = x - x0, dy = y - y0, dt = performance.now() - t0, v = dx / Math.max(1, dt); x0 = null;
      if (horiz) { release(dx, v); return; }
      if (horiz == null && Math.hypot(dx, dy) < 10 && dt < 350 && tapEdge(x) && e && e.cancelable) e.preventDefault();
    };
    // au doigt : les événements tactiles (plus sûrs que les pointeurs sur iPhone quand la page défile verticalement)
    el.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY, e.target); else x0 = null; }, { passive: true });
    el.addEventListener('touchmove', e => { if (x0 != null && e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) end(t.clientX, t.clientY, e); });
    el.addEventListener('touchcancel', () => { if (x0 != null && horiz) release(0, 0); x0 = null; }, { passive: true });
    // à la souris
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) start(e.clientX, e.clientY, e.target); }, { passive: true });
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientX, e.clientY); }, { passive: true });
    el.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX, e.clientY, null); });
  }

  // ---- l'arrivée par rechargement : l'objet entre de la place du voisin d'où l'on vient ----
  function enter(list) {
    if (!arrived) return;
    const c = objC(), dd = D(), sc = sideScale(), l = list.filter(Boolean);
    for (const el of l) put(el, arrived * dd, sc, 0.4, c.y, false);
    void document.body.offsetWidth;
    for (const el of l) put(el, 0, 1, 1, c.y, true);
  }
  // ---- une seule fois (téléphone) : l'objet esquisse le geste — vers la droite d'abord, puis vers la gauche (« … PAR
  //      MOIS » se montre en dernier) ----
  function nudge() {
    try { if (sessionStorage.getItem('sg.nav.nudge')) return; sessionStorage.setItem('sg.nav.nudge', '1'); } catch { /* */ }
    if (reduced || busy) return;
    const list = els(pgOf(ring(cur).id), false), c = objC();
    const k = [[-30, 460], [0, 520], [30, 460], [0, 560]];
    let i = 0;
    const stepN = () => {
      if (busy || i >= k.length) return;
      const [dx, ms] = k[i++];
      for (const el of list) { put(el, dx, 1, 1, c.y, false); el.style.transition = `translate ${ms}ms ${EASE}`; }
      for (const s of sides) { s.style.transition = `translate ${ms}ms ${EASE}, opacity .8s`; s.style.translate = dx ? `${dx}px 0` : ''; }
      setX(centers[C] - dx * 0.6, true);
      if (i < k.length) setTimeout(stepN, ms + (i === 2 ? 260 : 80));
    };
    stepN();
  }
  const api = { go, goTo, swipe, enter, nudge, layout, get arrived() { return arrived; }, get busy() { return busy; }, get page() { return ring(cur).id; },
    home: () => goTo(opts.current) };
  return api;
}
