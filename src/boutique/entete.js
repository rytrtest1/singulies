// L'en-tête de la boutique : celui du site (src/nav/nav.js) — ETERNEL suspendu à son fil, qui court d'un bord à l'autre et
// plonge dans un trou de chaque côté du nom, ← à gauche (quand il y a un retour), ≡ à droite — puis, sur ordinateur, la
// ligne des produits suspendus au même fil (comme le bandeau des pages) ; le menu plein écran (les noms sur un fil
// vertical) ; en bas, SINGULIES sur son fil d'un bord à l'autre. Même fil (stitch.js : paintThread), même onde lente,
// même respiration. Mouvement réduit : tracé une fois, immobile.
import { paintThread, flowNow } from '../alt/stitch.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const dpr = () => Math.min(3, window.devicePixelRatio || 1);
// l'onde lente qui parcourt le fil du haut, la respiration de chaque bout (deux sinus non accordés)
const WAVE_A = REDUCED ? 0 : 0.6, WAVE_K = 2 * Math.PI / 380, WAVE_W = 0.55;
const waveTop = (px, t) => WAVE_A * Math.sin(px * WAVE_K - t * WAVE_W);
const waveBot = (px, t) => WAVE_A * Math.sin(px * WAVE_K * 1.13 + t * WAVE_W * 0.9 + 1.7);
const breath = (i, t) => 0.45 + 0.42 * Math.sin(t * 0.83 + i * 1.7) * (0.7 + 0.3 * Math.sin(t * 0.31 + i));

// o : { produits: [{ id, titre }], legal: [[label, href]], onSingulies() }
export function installEntete(o) {
  const hd = $('#hd'), hcv = $('canvas', hd), br = $('.hd-br', hd), bk = $('.hd-bk', hd), mn = $('.hd-mn', hd);
  const bd = $('#bd'), bcv = $('canvas', bd), pn = $('#pn'), pcv = $('.pn-t', pn);
  const ft = $('#ft-sig'), fcv = ft && $('canvas', ft), fbt = ft && $('button', ft);

  // la ligne des produits (ordinateur) : des noms suspendus au fil
  bd.insertAdjacentHTML('beforeend', o.produits.map(p => `<a class="bd-l" href="#/produit/${p.id}" data-id="${p.id}">${p.titre}</a>`).join(''));
  // le menu : les produits, puis la section, puis les pages légales
  pn.insertAdjacentHTML('beforeend', o.produits.map(p => `<a href="#/produit/${p.id}" data-id="${p.id}" data-p>${p.titre}</a>`).join('') + '<hr>' +
    [['A PROPOS', '#/a-propos'], ['QUESTIONS', '#/questions'], ['CONTACT', '#/contact']].map(([l, h]) => `<a href="${h}" data-p>${l}</a>`).join('') +
    '<button type="button" data-p data-x="singulies">SINGULIES</button>' +
    `<div class="lg">${o.legal.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</div>`);

  let panOn = false, canBack = false;
  const setPan = on => {
    panOn = on; pn.classList.toggle('on', on); pn.inert = !on; hd.classList.toggle('open', on);
    mn.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('pn-open', on);
    if (on) { wake(); } else if (document.activeElement && pn.contains(document.activeElement)) mn.focus();
  };
  mn.addEventListener('click', () => setPan(!panOn));
  pn.addEventListener('click', e => {
    const b = e.target.closest('[data-x]');
    if (b) { setPan(false); if (b.dataset.x === 'singulies') o.onSingulies(); return; }
    if (e.target.closest('a') || e.target === pn) setPan(false);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panOn) { e.preventDefault(); e.stopPropagation(); setPan(false); } }, true);
  br.addEventListener('click', () => { if (panOn) setPan(false); });
  bk.addEventListener('click', () => { if (panOn) { setPan(false); return; } o.onBack(); });
  if (ft) fbt.addEventListener('click', o.onSingulies);

  // ——— le tracé ———
  const size = (cv, w, h) => { const d = dpr(); if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.width = w + 'px'; cv.style.height = h + 'px'; } return d; };
  const letterSpacing = el => parseFloat(getComputedStyle(el).letterSpacing) || 0;
  const vis = el => el && parseFloat(getComputedStyle(el).opacity) > 0.15 && getComputedStyle(el).display !== 'none';

  function paintHeader(t) {
    const W = hd.clientWidth, d = size(hcv, W, 46), x = hcv.getContext('2d'), y = 23, fl = flowNow();
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, 46);
    const r = br.getBoundingClientRect(); if (!r.width) return;
    const ls = letterSpacing(br);
    // les bornes sont les lettres (le remplissage gauche + l'interlettrage, le remplissage droit), 11 px de chaque côté
    const l = r.left + 8 + ls - 11, rr = r.right - 8 - ls + 11, yt = px => waveTop(px, t);
    br.style.translate = `0 ${waveTop((l + rr) / 2, t).toFixed(2)}px`;
    // le fil va d'une icône à l'autre : il sort d'un trou juste après ← (s'il y a un retour), plonge dans un trou juste avant ≡
    const sv = $('svg', bk).getBoundingClientRect(), m = $('i', mn).getBoundingClientRect();
    const a0 = vis(bk) && sv.width ? sv.left + 0.625 * sv.width + 10 : -4, b1 = m.width ? m.left - 10 : W + 4;
    const sg = j => ({ sag: REDUCED ? 0.6 : 0.3 + 1.1 * breath(3 + j, t), sag2: REDUCED ? 0 : 0.35 * Math.sin(t * 0.43 + 2 + j), yf: yt, g0: (j ? rr : a0) - (j ? -fl : fl) });
    paintThread(x, a0, l, y, 37, 1.2, { holes: [a0 > -4, true], ...sg(0) });
    paintThread(x, rr, b1, y, 41, 1.2, { holes: [true, b1 < W + 4], ...sg(1) });
  }

  function paintBand(t) {
    if (getComputedStyle(bd).display === 'none') return;
    const W = bd.clientWidth, H = bd.clientHeight, d = size(bcv, W, H), x = bcv.getContext('2d'), y = H / 2, fl = flowNow();
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H);
    const names = [...bd.querySelectorAll('.bd-l')], yt = px => waveTop(px, t), br0 = bd.getBoundingClientRect();
    if (!names.length) return;
    const bx = names.map(n => { const r = n.getBoundingClientRect(), ls = letterSpacing(n); return { l: r.left - br0.left + 6 + ls, r: r.right - br0.left - 6 - ls * 0 }; });
    names.forEach((n, i) => { n.style.translate = `0 ${waveTop((bx[i].l + bx[i].r) / 2, t).toFixed(2)}px`; });
    const segs = [{ a: -4, b: bx[0].l - 8, holes: [false, true], g0: -4 }];
    for (let i = 0; i < names.length - 1; i++) segs.push({ a: bx[i].r + 8, b: bx[i + 1].l - 8, holes: [true, true], g0: bx[i].r + 8 });
    segs.push({ a: bx[names.length - 1].r + 8, b: W + 4, holes: [true, false], g0: bx[names.length - 1].r + 8 });
    segs.forEach((g, j) => { if (g.b - g.a > 6) paintThread(x, g.a, g.b, y, 11 + j * 7, 1.25, { holes: g.holes, sag: REDUCED ? 0.45 : breath(j, t) * Math.min(1.6, (g.b - g.a) / 40), sag2: REDUCED ? 0 : 0.18 * Math.sin(t * 0.57 + j * 2.3), g0: g.g0 - fl, yf: px => waveTop(px, t) }); });
  }

  function paintFoot(t) {
    if (!ft || !fcv) return;
    const r0 = ft.getBoundingClientRect(); if (r0.bottom < 0 || r0.top > innerHeight) return;
    const W = ft.clientWidth, d = size(fcv, W, 34), x = fcv.getContext('2d'), y = 17, fl = flowNow();
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, 34);
    const r = fbt.getBoundingClientRect(); if (!r.width) return;
    const ls = letterSpacing(fbt), l = r.left + 3, rr = r.right - 3 - ls, yb = px => waveBot(px, t);
    fbt.style.translate = `0 ${waveBot((l + rr) / 2, t).toFixed(2)}px`;
    // (le fil du bas coulisse de droite à gauche ; SINGULIES y est suspendu)
    paintThread(x, -4, l, y, 53, 1.2, { holes: [false, true], sag: REDUCED ? 0.6 : 0.3 + 1.1 * breath(7, t), sag2: REDUCED ? 0 : 0.35 * Math.sin(t * 0.43 + 1), g0: -4 + fl, yf: yb });
    paintThread(x, rr, W + 4, y, 71, 1.2, { holes: [true, false], sag: REDUCED ? 0.6 : 0.3 + 1.1 * breath(9, t), sag2: REDUCED ? 0 : 0.35 * Math.sin(t * 0.47 + 4), g0: rr + fl, yf: yb });
  }

  // le fil vertical du menu : il plonge dans un trou au-dessus de chaque nom et ressort dessous
  function paintPanel(t) {
    if (!panOn) return;
    const d = dpr(), W = pn.clientWidth, H = pn.clientHeight, x = pcv.getContext('2d');
    if (pcv.width !== Math.round(W * d) || pcv.height !== Math.round(H * d)) { pcv.width = Math.round(W * d); pcv.height = Math.round(H * d); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, pcv.width, pcv.height);
    x.setTransform(0, d, -d, 0, (W / 2) * d, 0);          // couché puis tourné d'un quart de tour : le long du fil = vers le bas
    const els = [...pn.querySelectorAll('[data-p]')], lg = $('.lg', pn);
    if (!els.length) return;
    const mid = el => el.offsetTop + el.offsetHeight / 2, half = 8.4 + 6, f = flowNow(), top0 = hd.getBoundingClientRect().bottom + 12;
    const segs = [{ a: top0, b: mid(els[0]) - half }];
    for (let i = 0; i < els.length - 1; i++) segs.push({ a: mid(els[i]) + half, b: mid(els[i + 1]) - half });
    if (lg && lg.offsetHeight) segs.push({ a: mid(els[els.length - 1]) + half, b: lg.offsetTop - 12 });
    segs.forEach((g, j) => { if (g.b - g.a > 8) paintThread(x, g.a, g.b, 0, 23 + j * 7, 1.2, { holes: [true, true], sag: REDUCED ? 0.5 : 0.3 + 0.7 * Math.sin(t * 0.4 + j) ** 2, g0: g.a - f }); });
  }

  let raf = 0, last = 0;
  const paint = now => { const t = now / 1000; paintHeader(t); paintBand(t); paintFoot(t); paintPanel(t); };
  const loop = now => {
    raf = 0;
    if (document.hidden) return;
    if (now - last > 40) { last = now; paint(now); }
    if (!REDUCED) raf = requestAnimationFrame(loop);
  };
  function wake() { if (!raf) raf = requestAnimationFrame(loop); }
  const redraw = () => { paint(performance.now()); wake(); };
  addEventListener('resize', redraw);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  document.fonts?.ready?.then(redraw);
  wake();

  return {
    // route : l'identifiant du produit en cours (ou null), back : y a-t-il un retour à montrer
    set({ id = null, back = false }) {
      canBack = back; bk.classList.toggle('off', !back); bk.tabIndex = back ? 0 : -1;
      bd.querySelectorAll('.bd-l').forEach(a => { if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      pn.querySelectorAll('[data-id]').forEach(a => { if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      redraw();
    },
    closeMenu() { if (panOn) setPan(false); },
  };
}
