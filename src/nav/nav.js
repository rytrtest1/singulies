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
import { drawNeedle, drawEyeTail, needleEye, NEEDLE_GAP } from './needle.js';
import { paintThread } from '../alt/stitch.js';
import { count } from '../app/count.js';

export const PAGES = [
  { id: 'poeme', label: 'UN PRENOM UN POEME', href: 'alt.html' },
  { id: 'livres', label: 'MES LIVRES', href: 'livres.html' },
  { id: 'jeu', label: 'LE JEU', href: 'jeu.html' },
  { id: 'lettre', label: 'UN POEME PAR MOIS', href: 'lettre.html' },
];
const K_NAV = 'sg.nav', K_REVEAL = 'sg.nav.reveal';
const STANDALONE = (() => { try { return !!navigator.standalone || matchMedia('(display-mode: standalone)').matches; } catch { return false; } })();
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
/* (12/10) le fil et les aiguilles : un seul dessin, fixe à l'écran, refait à chaque image quand il bouge (nav.js) */
.nv-tc { position: absolute; left: 0; bottom: 0; height: 44px; pointer-events: none; }
.nv.on { opacity: 1; }
.nv-in { position: absolute; left: 0; right: 0; bottom: 0; height: 44px; overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent var(--nv-a, 0px), #000 calc(var(--nv-a, 0px) + var(--nv-m, 22%)), #000 calc(100% - var(--nv-a, 0px) - var(--nv-m, 22%)), transparent calc(100% - var(--nv-a, 0px)));
  mask-image: linear-gradient(to right, transparent var(--nv-a, 0px), #000 calc(var(--nv-a, 0px) + var(--nv-m, 22%)), #000 calc(100% - var(--nv-a, 0px) - var(--nv-m, 22%)), transparent calc(100% - var(--nv-a, 0px))); }
/* (12/10) avec les flèches : les noms s'effacent avant elles (jamais une flèche sur un nom) */
.nv.ar { --nv-a: 40px; }
.nv-track { position: absolute; left: 50%; top: 0; height: 44px; display: flex; align-items: center; gap: var(--nv-gap, 34px); white-space: nowrap;
  will-change: transform; }
.nv-l { position: relative; z-index: 1; display: block; margin: 0; padding: 14px 0; border: 0; background: none; cursor: pointer; text-decoration: none;
  font: 500 var(--nv-fs, 12px)/1 'SG Garamond', Georgia, serif; letter-spacing: .3em; margin-right: -.3em; color: #ece8e0; opacity: .4;
  transition: opacity .6s; -webkit-tap-highlight-color: transparent; }
.nv-l.cur { opacity: .9; cursor: default; }
.nv-l.far { opacity: 0; pointer-events: none !important; }
.nv.wide .nv-l.far.d2 { opacity: .2; pointer-events: auto !important; }
.nv.solo .nv-l:not(.cur) { opacity: 0; pointer-events: none !important; }
.nv.on .nv-l { pointer-events: auto; }
.nv-l:not(.cur):hover, .nv-l:not(.cur):focus-visible { opacity: .75 !important; outline: none; }
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
/* (12/10, Maxence) les aiguilles, aux deux bouts du bandeau (dessinées avec le fil, needle.js) : ici, seulement leur zone
   de toucher */
.nv-nd { position: absolute; bottom: 0; width: 48px; height: 44px; margin: 0; padding: 0; border: 0; background: none; cursor: pointer;
  pointer-events: none; -webkit-tap-highlight-color: transparent; }
.nv-nd.l { left: 0; } .nv-nd.r { right: 0; }
.nv.on .nv-nd.in { pointer-events: auto; }
.nv-nd:focus-visible { outline: none; }

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
  const tc = document.createElement('canvas'); tc.className = 'nv-tc'; tc.setAttribute('aria-hidden', 'true');
  inner.appendChild(track); root.append(tc, inner);
  const foot = document.createElement('div'); foot.className = 'nv-foot';
  const fcv = document.createElement('canvas'); fcv.setAttribute('aria-hidden', 'true');
  const fsp = document.createElement('button'); fsp.type = 'button'; fsp.textContent = 'SINGULIES'; fsp.setAttribute('aria-label', 'SINGULIES, me contacter');
  // (11/10, Maxence) SINGULIES en bas = la signature du site, comme un pied de page : on y écrit (le jeu est dans le bandeau)
  fsp.addEventListener('click', () => import('../menu/contact.js').then(m => m.openContact({ base: opts.base || './', reduced })));
  foot.append(fcv, fsp);
  const shadeT = document.createElement('div'), shadeB = document.createElement('div');
  shadeT.className = 'nv-shade t'; shadeB.className = 'nv-shade b';
  let items = [];
  function build() {
    track.replaceChildren();
    items = SPAN.map(d => {
      const p = ring(cur + d), a = document.createElement('a');
      a.className = 'nv-l' + (d === 0 ? ' cur' : Math.abs(d) > 1 ? ' far d' + Math.abs(d) : ''); a.textContent = p.label; a.href = url(p);
      if (d === 0) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', e => { e.preventDefault(); if (d) go(d); });
      track.appendChild(a);
      return a;
    });
  }
  // les aiguilles : leur zone de toucher (le dessin est fait avec le fil)
  const ndBtn = d => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nv-nd ' + (d < 0 ? 'l' : 'r');
    // elle avance et coud la page de son côté : les noms arrivent de son côté
    b.setAttribute('aria-label', d < 0 ? 'page précédente' : 'page suivante');
    b.addEventListener('click', () => { stopReveal(); go(d); });
    root.appendChild(b);
    return b;
  };
  const ndEl = { '-1': ndBtn(-1), 1: ndBtn(1) };
  document.body.append(shadeT, shadeB, root, foot);
  build();

  // ---- mise en page : le nom courant au centre ; le fil cousu entre chaque nom, et jusqu'aux bords ----
  let centers = [], boxes = [];
  const C = Math.floor(SPAN.length / 2);
  const dpr = () => Math.min(3, window.devicePixelRatio || 1);
  const clamp01 = u => Math.min(1, Math.max(0, u));
  const ez = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  // ---- (12/10, Maxence : « qu'on voie le fil bouger pour déplacer le menu » ; « toucher l'aiguille de droite doit aller à
  //      droite ») le fil, les noms et les aiguilles sont menés ensemble, image par image. L'aiguille avance et coud la
  //      page suivante : un coup de pointe vers son bord, le fil sort de son chas (sa torsion défile : elle est attachée à
  //      la matière, stitch.js g0) et les noms arrivent de son côté. Pour que le fil soit toujours tiré, jamais poussé,
  //      les noms en tête du mouvement partent les premiers (le fil s'étire derrière eux) ; chaque bout de fil se tend
  //      quand il s'allonge vraiment et se détend avec un rebond (un ressort par bout). ----
  const LAG = 45;                            // retard d'un nom au suivant (ms)
  let X = 0, slide = null;                   // X : le décalage du bandeau ; slide : { x0 [par nom], x1, t0, dur, dir }
  // le premier à bouger : le nom en tête du mouvement (dir > 0 : les noms vont vers la gauche, le plus à gauche d'abord)
  const rankOf = (i, dir) => (dir > 0 ? i : items.length - 1 - i);
  const nameX = (i, now) => {
    if (!slide) return X;
    const u = clamp01((now - slide.t0 - rankOf(i, slide.dir) * LAG) / slide.dur);
    return slide.x0[i] + (slide.x1 - slide.x0[i]) * ez(u);
  };
  function applyNames(now) {
    if (!items.length) return;
    const xs = items.map((_, i) => nameX(i, now));
    track.style.transform = `translateX(${(-xs[C]).toFixed(2)}px)`;
    items.forEach((a, i) => { const dx = xs[C] - xs[i]; a.style.translate = Math.abs(dx) > 0.01 ? `${dx.toFixed(2)}px 0` : ''; });
    if (slide && now - slide.t0 > slide.dur + items.length * LAG) slide = null;
  }
  function setX(x, anim) {
    const now = performance.now();
    if (!anim || reduced) { slide = null; X = x; applyNames(now); paintNow(); return; }
    const x0 = items.map((_, i) => nameX(i, now));
    slide = { x0, x1: x, t0: now, dur: DUR, dir: Math.sign(x - x0[C]) || 1 };
    X = x; wake();
  }
  // les aiguilles : ndOn (montrée), a (opacité, menée), pull { tp, tr } (tirer / relâcher)
  const ND = { '-1': { on: false, a: 0, pull: null }, 1: { on: false, a: 0, pull: null } };
  function pull(side, on) {
    const n = ND[side], now = performance.now();
    if (on) n.pull = { tp: now, tr: null };
    else if (n.pull && n.pull.tr == null) n.pull.tr = now;
    wake();
  }
  // le coup de pointe de l'aiguille vers son bord (px) : franc, tenu, puis elle revient (léger dépassement)
  const PULL = 7;
  const needleP = (n, now) => {
    const p = n.pull; if (!p) return 0;
    if (p.tr == null) return PULL * ez(clamp01((now - p.tp) / 200));
    const q = clamp01((now - p.tr) / 520), held = PULL * ez(clamp01((p.tr - p.tp) / 200));
    return held * (1 - ez(q)) - 1.3 * Math.sin(Math.PI * q) * (1 - q);
  };
  // la tension : chaque bout de fil a un ressort (s : son mou, 1 = au repos) qui suit son allongement réel — tendu quand
  // il s'allonge, plus mou s'il raccourcit, et qui revient en rebondissant (amorti à moitié)
  const springs = {};
  let lastS = 0;
  const slackSpring = (key, elong, dt) => {
    const sp = springs[key] || (springs[key] = { s: 1, v: 0 });
    const target = Math.min(1.8, Math.max(0.06, 1 - elong / 6));
    if (reduced || !dt) { sp.s = target; sp.v = 0; return sp.s; }
    sp.v += ((target - sp.s) * 260 - 16 * sp.v) * dt; sp.s += sp.v * dt;
    return Math.max(0, sp.s);
  };
  const settling = () => Object.values(springs).some(sp => Math.abs(sp.v) > 0.02);
  function layout() {
    root.classList.toggle('wide', !mobile());
    root.style.setProperty('--nv-fs', innerWidth < 520 ? '11px' : '12px');
    root.style.setProperty('--nv-gap', innerWidth < 520 ? '30px' : '44px');
    root.style.setProperty('--nv-m', mobile() ? '12%' : '7%');
    items.forEach(a => { a.style.translate = ''; });
    track.style.transform = 'translateX(0)';
    const tr = track.getBoundingClientRect();
    boxes = items.map(a => { const r = a.getBoundingClientRect(); const ls = parseFloat(getComputedStyle(a).letterSpacing) || 0; return { l: r.left - tr.left, r: r.right - tr.left - ls, y: r.top - tr.top + r.height / 2 }; });
    centers = boxes.map(b => (b.l + b.r) / 2);
    const k = Math.min(dpr(), 2), W = innerWidth;
    tc.width = Math.round(W * k); tc.height = 44 * k; tc.style.width = W + 'px'; tc.style.height = '44px';
    const fw = innerWidth, fh = 34, d = dpr();
    fcv.width = Math.round(fw * d); fcv.height = fh * d; fcv.style.width = fw + 'px'; fcv.style.height = fh + 'px';
    setX(centers[C], false);
  }
  // ---- les deux fils respirent : l'affaissement de chaque bout change très lentement (6 à 9 s), sans jamais se répéter
  //      à l'identique (deux sinus non accordés), d'un à deux pixels au plus ----
  const breath = (i, t) => 0.45 + 0.42 * Math.sin(t * 0.83 + i * 1.7) * (0.7 + 0.3 * Math.sin(t * 0.31 + i));
  // l'éclat d'une aiguille : rare (toutes les ≈ 10 s), il glisse en 1,2 s
  const glintOf = (side, now) => { if (reduced) return -1; const T = side > 0 ? 9.7 : 11.3, ph = ((now / 1000 + (side > 0 ? 2.3 : 7.1)) % T) / 1.2; return ph <= 1 ? ph : -1; };
  function paint(now) {
    if (!boxes.length) return;
    const t = now / 1000, dtS = lastS ? Math.min(0.05, (now - lastS) / 1000) : 0; lastS = now;
    applyNames(now);
    { const k = Math.min(dpr(), 2), x = tc.getContext('2d'), W = innerWidth; x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, W, 44);
      const y = boxes[C].y + 0.5, solo = root.classList.contains('solo');
      const xs = items.map((_, i) => nameX(i, now));
      const sl = i => W / 2 + boxes[i].l - xs[i], sr = i => W / 2 + boxes[i].r - xs[i];
      // les aiguilles : leur pointe (au repos à NEEDLE_GAP du bord ; elles arrivent en glissant du bord)
      const nd = {};
      for (const sd of [-1, 1]) {
        const n = ND[sd], tip = sd > 0 ? W - NEEDLE_GAP : NEEDLE_GAP, arr = sd * (1 - n.a) * 8;
        const px = tip + sd * needleP(n, now) + arr;
        nd[sd] = { tip: [px, y + 0.3], a: n.a, rest: needleEye([tip + arr, y + 0.3], sd)[0] };
        nd[sd].eye = needleEye(nd[sd].tip, sd);
      }
      // les noms cousus : tous ceux qu'on voit, même en partie (le fil ne passe jamais sur des lettres : il plonge dans
      // le trou avant le nom) ; un nom qui s'étend jusque sous l'aiguille : le fil plonge là où ses lettres paraissent
      const A = root.classList.contains('ar') ? 40 : 0;
      let P = solo ? [C] : items.map((_, i) => i).filter(i => sr(i) > A + 3 && sl(i) < W - A - 3);
      if (!P.length) P = [C];
      const endL = nd[-1].a > 0.01 ? nd[-1].eye[0] : -4, endR = nd[1].a > 0.01 ? nd[1].eye[0] : W + 4;
      const holeL = Math.max(sl(P[0]) - 7, Math.min(endL + 8, A + 2)), holeR = Math.min(sr(P[P.length - 1]) + 7, Math.max(endR - 8, W - A - 2));
      // (au repos : les noms tous au même décalage X, les aiguilles à leur place — l'allongement se mesure par rapport à ça)
      const r0L = (nd[-1].a > 0.01 ? nd[-1].rest : -4), r0R = (nd[1].a > 0.01 ? nd[1].rest : W + 4);
      const segs = [];
      segs.push({ a: endL, b: holeL, holes: [false, true], g0: endL + xs[P[0]] - W / 2, seed: 11 + P[0] * 7, key: 'L',
        L0: Math.max(W / 2 + boxes[P[0]].l - X - 7, Math.min(r0L + 8, A + 2)) - r0L });
      for (let j = 0; j < P.length - 1; j++) segs.push({ a: sr(P[j]) + 7, b: sl(P[j + 1]) - 7, holes: [true, true], g0: boxes[P[j]].r + 7, seed: 18 + P[j] * 7, key: 'm' + P[j],
        L0: boxes[P[j + 1]].l - boxes[P[j]].r - 14 });
      const pl = P[P.length - 1];
      segs.push({ a: holeR, b: endR, holes: [true, false], g0: holeR + xs[pl] - W / 2, seed: 18 + pl * 7, key: 'R',
        L0: r0R - Math.min(W / 2 + boxes[pl].r - X + 7, Math.max(r0R - 8, W - A - 2)) });
      segs.forEach((g, j) => {
        const L = g.b - g.a;
        if (L <= 6) return;
        const sag = (reduced ? 0.45 : breath(j, t) * Math.min(1.6, L / 40)) * slackSpring(g.key, L - g.L0, dtS);
        paintThread(x, g.a, g.b, y, g.seed, 1.25, { holes: g.holes, sag, sag2: reduced ? 0 : 0.18 * Math.sin(t * 0.57 + j * 2.3), g0: g.g0 });
      });
      // au-delà des aiguilles qui paraissent : le fil jusqu'au bord, qui s'efface
      for (const sd of [-1, 1]) {
        const a = nd[sd].a; if (a <= 0.01 || a >= 0.99) continue;
        x.save(); x.globalAlpha = 1 - a;
        if (sd > 0) paintThread(x, nd[1].eye[0], W + 4, y, 91, 1.25, { holes: [false, false], sag: 0.3 });
        else paintThread(x, -4, nd[-1].eye[0], y, 97, 1.25, { holes: [false, false], sag: 0.3 });
        x.restore();
      }
      for (const sd of [-1, 1]) {
        drawNeedle(x, nd[sd].tip, sd, nd[sd].a, glintOf(sd, now));
        drawEyeTail(x, nd[sd].tip, sd, nd[sd].a, reduced ? 0 : 0.4 * Math.sin(t * 0.9 + sd));
      }
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
  const paintNow = () => paint(performance.now());
  // la boucle : vive quand quelque chose bouge (le fil tiré, une aiguille qui paraît, un éclat), ≈ 25 images/s sinon
  let raf = 0, lastP = 0, lastF = 0;
  const lively = now => !!slide || ND[-1].pull || ND[1].pull || settling() || Math.abs(ND[-1].a - ndTarget(-1)) > 0.005 || Math.abs(ND[1].a - ndTarget(1)) > 0.005
    || (ND[-1].a > 0.5 && glintOf(-1, now) >= 0) || (ND[1].a > 0.5 && glintOf(1, now) >= 0);
  const loop = now => {
    raf = 0;
    if (!(shown || footOn) || document.hidden) return;
    const dt = Math.min(0.1, (now - (lastF || now)) / 1000); lastF = now;
    for (const sd of [-1, 1]) {
      const n = ND[sd], tg = ndTarget(sd);
      n.a = reduced ? tg : n.a + (tg - n.a) * Math.min(1, dt * 3.2);
      if (n.pull && n.pull.tr != null && now - n.pull.tr > 1400) n.pull = null;
      ndEl[sd].classList.toggle('in', tg > 0.5);
    }
    const live = lively(now);
    if (live || now - lastP > 40) { lastP = now; paint(now); }
    if (reduced && !live) return;
    raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const ndTarget = sd => (ND[sd].on && !root.classList.contains('solo') ? 1 : 0);

  let shown = false, footOn = false, busy = false, wandered = !!arrived;
  const atHome = () => cur === home;
  const pgOf = id => pages[id] || {};
  const objC = () => { const pg = pgOf(ring(cur).id), c = (pg.center && pg.center()) || (atHome() && opts.center && opts.center()) || null; return c || { y: innerHeight * 0.45, h: innerHeight * 0.5 }; };
  // la distance dont une page glisse en partant (et d'où la suivante arrive)
  const S = () => Math.min(innerWidth * 0.42, 340);
  const ro = new ResizeObserver(layout); ro.observe(track);
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(layout);
  layout();

  // ---- visible quand la page le dit ----
  function tick() {
    if (busy) return;
    const pg = pgOf(ring(cur).id);
    const on = atHome() ? !!opts.show?.() : true;
    const solo = on && atHome() && !!opts.solo?.();
    const f = atHome() ? !!opts.foot?.() : pg.foot !== false;
    const sh = atHome() ? !!opts.shade?.() : !!pg.foot;
    if (on !== shown) { shown = on; root.classList.toggle('on', on); if (on) layout(); }
    if (f !== footOn) { footOn = f; foot.classList.toggle('on', f); if (f) layout(); }
    root.classList.toggle('solo', solo);
    if (on && !arrowsOn && !revealing) {
      if (!atHome() || !opts.ready) showArrows();
      else if (opts.ready()) { let done = false; try { done = !!sessionStorage.getItem(K_REVEAL); } catch { /* */ } if (done || reduced || (opts.quiet && !opts.quiet())) showArrows(); else reveal(); }
    }
    shadeT.classList.toggle('on', sh && on); shadeB.classList.toggle('on', sh && f);
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
  const clearT = el => { el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; el.style.transformOrigin = ''; };
  // ---- l'objet d'une page et le reste ----
  // obj : ce qui voyage dans l'espace (l'enveloppe, le livre, la feuille, la carte du jeu) ; objRect() : où il est au
  // repos quand l'élément est plus grand que lui (une scène plein écran) ; rest : tout le reste de la page (textes,
  // boutons), qui s'efface et paraît à sa place, sans voyager ; layer : ce qu'on montre / cache
  const objOf = pg => (pg.obj ? pg.obj() : []).filter(Boolean);
  const restOf = pg => (pg.rest ? pg.rest() : pg.obj ? [] : els(pg, true)).filter(Boolean);
  const layerOf = pg => els(pg, true);
  const fadeTo = (el, o, ms, delay = 0) => { el.style.transition = `opacity ${ms}ms ease ${delay}ms`; el.style.opacity = o === 1 ? '' : String(o); };
  const clearAll = el => { clearT(el); el.style.opacity = ''; };
  // ---- aller à une page voisine (d : ±1, ±2, ±3) ----
  // (12/10) la page en cours glisse du côté d'où l'on part et s'efface ; la page d'arrivée entre de l'autre côté, en
  // fondu ; le fil du bandeau coulisse avec elles. Rien d'autre ne paraît à l'écran (plus d'aperçus).
  async function go(d, opt = {}) {
    if (busy || !d) return;
    stopReveal();
    if (arrowsOn) pull(Math.sign(d), true);
    const target = ring(cur + d), dir = Math.sign(d), fromId = ring(cur).id, from = pages[fromId] || {};
    count('nav/' + target.id);
    const inDoc = !!(pages[target.id] || MOUNTABLE[target.id]);
    busy = true;
    // la page d'arrivée est prête avant que rien ne bouge (montée maintenant si besoin)
    const pg = inDoc ? await ensure(target.id) : null;
    if (inDoc && !pg) { busy = false; location.href = url(target); return; }
    // le fil coulisse : le nom suivant vient au centre (cousu par l'aiguille de ce côté)
    if (centers[C + d] != null) setX(centers[C + d], true);
    setTimeout(() => pull(dir, false), DUR * 0.75);
    items.forEach((a, i) => { const k = i - C - d; a.classList.toggle('cur', k === 0); a.classList.remove('far', 'd2', 'd3'); if (Math.abs(k) > 1) a.classList.add('far', 'd' + Math.min(3, Math.abs(k))); });

    // ---- ce qui part (un objet qui a suivi le doigt part d'où il est) ----
    const s = S(), c0 = objC();
    const outLayer = layerOf(from), outObj = objOf(from), outRest = restOf(from);
    const outDrag = els(from, false).filter(el => !outLayer.includes(el) && !outObj.includes(el));
    from.leave?.();
    for (const el of outRest) fadeTo(el, 0, 260);
    for (const el of outObj) put(el, -dir * s, 1, 0, c0.y, true);
    for (const el of outDrag) put(el, -dir * s, 1, 0, c0.y, true);
    if (!inDoc) {
      try { sessionStorage.setItem(K_NAV, JSON.stringify({ to: target.id, dir, at: Date.now() })); } catch { /* */ }
      setTimeout(() => { location.href = url(target); }, 420);
      return;
    }
    cur = mod(cur + d, PAGES.length); wandered = true;

    // ---- ce qui arrive ----
    const inLayer = layerOf(pg), inObj = objOf(pg), inRest = restOf(pg);
    for (const el of els(pg, false)) if (!inObj.includes(el)) clearT(el);
    for (const el of inLayer) { el.style.visibility = ''; clearAll(el); }
    for (const el of inRest) { el.style.transition = 'none'; el.style.opacity = '0'; }
    pg.back?.();
    const c1 = objC();
    for (const el of inObj) put(el, dir * s, 1, 0, c1.y, false);
    void document.body.offsetWidth;
    for (const el of inObj) put(el, 0, 1, 1, c1.y, true);
    for (const el of inRest) fadeTo(el, 1, 520, inObj.length ? 260 : 120);

    if (!opt.pop) try { history.pushState({ sgPage: target.id }, '', STANDALONE ? location.href : url(target)); } catch { /* */ }
    setTimeout(() => {
      for (const el of outLayer) { el.style.visibility = 'hidden'; }
      for (const el of [...outLayer, ...outObj, ...outRest, ...outDrag]) clearAll(el);
      for (const el of inObj) { el.style.transition = 'none'; el.style.transformOrigin = ''; el.style.translate = ''; el.style.scale = ''; }
      for (const el of inRest) { el.style.transition = ''; }
      if (from.transient) delete pages[fromId];
      build(); layout();
      busy = false; tick();
    }, DUR + SPAN.length * LAG + 30);
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
  // (ordinateur) ← → = la page voisine, comme glisser l'objet — sauf là où ← → parcourent une série visible (le
  // défilé des autres poèmes, exemples.js) et sur le jeu (les questions) ; jamais pendant qu'on écrit
  addEventListener('keydown', e => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || busy || !shown) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !a.readOnly && getComputedStyle(a).opacity !== '0') return;
    if (ring(cur).id === 'jeu' || document.querySelector('.mn-ct')) return;
    const r = document.querySelector('.ex-ring')?.getBoundingClientRect();
    if (r && r.height && r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4) return;
    go(e.key === 'ArrowRight' ? 1 : -1);
  });
  // revenu par le bouton retour après un rechargement (page rendue par le cache) : tout reprend sa place
  addEventListener('pageshow', e => {
    if (!e.persisted || !busy) return;
    busy = false;
    for (const el of els(pgOf(ring(cur).id), true)) { el.style.transition = 'none'; el.style.translate = ''; el.style.scale = ''; el.style.opacity = ''; el.style.visibility = ''; }
    build(); layout(); tick();
  });

  // ---- (12/10, Maxence) les pages : deux aiguilles, couchées sur le fil. Sur la page de la feuille (sur l'accueil, le
  //      bandeau ne montre que UN PRENOM UN POEME), une fois par visite : l'aiguille de droite paraît, coud — le fil sort
  //      de son chas, les noms arrivent jusqu'à lire MES LIVRES en entier (la page ne bouge pas) —, le fil revient ; puis
  //      celle de gauche (UN POEME PAR MOIS, tenu un peu plus). Le moindre geste arrête tout. ----
  let arrowsOn = false, revealing = false, rvT = [];
  function showArrows() { arrowsOn = true; root.classList.add('ar'); ND[-1].on = ND[1].on = true; wake(); }
  function stopReveal() {
    if (!revealing) return;
    revealing = false; rvT.forEach(clearTimeout); rvT = [];
    removeEventListener('pointerdown', stopReveal, true); removeEventListener('keydown', stopReveal, true);
    pull(-1, false); pull(1, false);
    if (!busy) setX(centers[C], true);
    showArrows();
  }
  function reveal() {
    revealing = true; root.classList.add('ar');
    try { sessionStorage.setItem(K_REVEAL, '1'); } catch { /* */ }
    addEventListener('pointerdown', stopReveal, true); addEventListener('keydown', stopReveal, true);
    const at = (ms, f) => rvT.push(setTimeout(() => { if (revealing && !busy) f(); }, ms));
    // jusqu'où glisser : le voisin lisible en entier, juste avant le fondu du bord (aiguille + marge du masque)
    const shift = d => {
      const A = 40 + (mobile() ? 0.12 : 0.07) * innerWidth + 6, bx = boxes[C + d];
      if (!bx) return 0;
      return d > 0 ? Math.max(0, bx.r - innerWidth / 2 + A - centers[C]) : Math.min(0, innerWidth / 2 + bx.l - A - centers[C]);
    };
    // (d : l'aiguille qui coud ; le voisin de son côté vient se lire ; puis le fil revient)
    const side = (d, t0, hold) => {
      at(t0, () => { ND[d].on = true; wake(); });
      at(t0 + 1000, () => { pull(d, true); setX(centers[C] + shift(d), true); });
      at(t0 + 1000 + DUR * 0.8, () => pull(d, false));
      at(t0 + 1000 + DUR + hold, () => setX(centers[C], true));
    };
    const T1 = 1000 + 2 * DUR + 1100 + 900;
    side(1, 0, 1100);
    side(-1, T1, 1600);
    at(T1 + 1000 + 2 * DUR + 1600 + 400, () => { revealing = false; removeEventListener('pointerdown', stopReveal, true); removeEventListener('keydown', stopReveal, true); showArrows(); });
  }

  // ---- l'arrivée par rechargement : la page entre du côté d'où l'on vient ----
  function enter(list) {
    if (!arrived) return;
    const c = objC(), l = list.filter(Boolean);
    for (const el of l) put(el, arrived * S(), 1, 0, c.y, false);
    void document.body.offsetWidth;
    for (const el of l) put(el, 0, 1, 1, c.y, true);
  }
  const api = { go, goTo, enter, layout, get arrived() { return arrived; }, get wandered() { return wandered; }, get busy() { return busy; }, get page() { return ring(cur).id; },
    home: () => goTo(opts.current) };
  return api;
}
