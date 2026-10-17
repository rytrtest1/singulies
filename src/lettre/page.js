// Une page du site autour d'un objet en direct (12/10, Maxence : « toutes les pages vivant dans le même environnement ») :
// mes livres, un poème par mois. La même grammaire que la page du poème :
//   — l'objet, dessiné par le moteur dans le monde commun (src/app/stage.js : même caméra, même échelle, même horizon
//     que la feuille), sur un canvas transparent qui couvre l'écran (en changeant de page, plus de cadre noir autour) ;
//   — dessous, à la même distance du bas de l'objet que la description de la feuille, sa description tapée à la
//     machine (deux lignes au plus, sans virgule en fin de ligne), et des points (une étape chacun) ;
//   — glisser (ailleurs que sur l'objet, qu'on prend en main), la molette, le doigt vers le haut, les points, le fil qui
//     invite à descendre : l'étape suivante (ou précédente) ;
//   — en bas, le signe cousu et son prix (comme RECEVOIR).
// o : { base, steps: [{ txt, price?, href?, label? }], sign: { label, href?, onClick(k) }, price(k), make(gl) →
//       { frame(W, H, cssW, cssH, t, tilt, spin, p), rect(cssW, cssH, p) → { l, t, r, b }, bottom(p) (unités) },
//       aspectLabel, onStep(k), extra (html sous la légende) }
import { stitch, paintThread } from '../alt/stitch.js';
import { captionShift, insetBottom } from '../app/stage.js';
import { mountStage } from '../livres/book3d.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// les petits mots restent avec le suivant (jamais « à » seul en fin de ligne)
const nbsp = s => { const r = /(^|[\s ])(à|a|de|du|la|le|un|et|y|me|ton|pour|au) /gi, f = x => x.replace(r, (m, a, w) => a + w + ' '); return f(f(s)); };

export function buildStagePage(host, o) {
  const N = o.steps.length;
  host.innerHTML = `<main class="lt lt-st">
    <div class="lt-grab" role="img" aria-label="${esc(o.aspectLabel || '')}"></div>
    <div class="lt-cap">
      ${o.steps.some(x => x.title || x.sub) ? '<h1 class="lt-ti caps"></h1><p class="lt-su"></p>' : ''}
      <p class="lt-cap-t" aria-live="polite"></p>
      ${N > 1 ? `<div class="lt-dots">${o.steps.map((s, i) => `<button class="lt-dot" type="button" data-k="${i}" aria-label="${esc(s.txt.replace(/\n/g, ' '))}"><i></i></button>`).join('')}</div>` : ''}
      ${o.extra || ''}
      <p class="lt-done" role="status" aria-live="polite"></p>
    </div>
    <div class="lt-bar">${o.sign.href ? `<a class="lt-sign" href="${esc(o.sign.href)}" target="_blank" rel="noopener">${esc(o.sign.label)}</a>` : `<button class="lt-sign" type="button">${esc(o.sign.label)}</button>`}<div class="lt-pr"></div></div>
  </main>`;
  const main = host.querySelector('.lt'), cap = main.querySelector('.lt-cap'), txt = main.querySelector('.lt-cap-t');
  const grab = main.querySelector('.lt-grab'), sign = main.querySelector('.lt-sign'), pr = main.querySelector('.lt-pr');
  stitch(sign, { seed: o.sign.label.length * 13 });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // la boîte du texte a la hauteur de la plus longue description : les points restent à leur place
  txt.style.setProperty('--lines', Math.max(...o.steps.map(s => s.txt.split('\n').length)));

  // ---- l'étape : p (continu, l'objet y glisse) ; k (la description, les points, le prix, le lien) ----
  let k = -1, p = 0, pT = 0, typeT = 0, detail = false;
  const type = s => {
    clearTimeout(typeT);
    txt.setAttribute('aria-label', s.replace(/\n/g, ' '));
    for (const old of txt.querySelectorAll('i:not(.out)')) { old.classList.add('out'); setTimeout(() => old.remove(), 350); }
    const box = document.createElement('i'); txt.appendChild(box);
    if (reduced) { box.textContent = s; return; }
    // les lettres à venir sont déjà là, invisibles : la mise en page ne bouge jamais pendant la frappe
    box.innerHTML = '<span class="tw">' + [...s].map(ch => ch === '\n' ? '<br>' : `<b>${esc(ch)}</b>`).join('') + '</span>';
    const ks = [...box.querySelectorAll('b')];
    let n = 0;
    const strike = () => { if (!box.isConnected || n >= ks.length) return; ks[n++].classList.add('on'); typeT = setTimeout(strike, (ks[n - 1].textContent === ' ' ? 70 : 32) + Math.random() * 46); };
    typeT = setTimeout(strike, 140);
  };
  // (17/10, Maxence) le livre ouvert : sa fiche (format, papier) à la place de la description ; refermé : la description
  const syncOpen = () => {
    const op = !!(scene && scene.isOpen && scene.isOpen()), m = o.steps[k] && o.steps[k].more;
    if (!m || op === detail) return;
    detail = op; type(nbsp(op ? m : o.steps[k].txt));
  };
  const wrapTo0 = () => { if (scene && scene.wrap && scene.wrap()) { p = 0; } setStep(0); };
  const setStep = (j, from = 'geste') => {
    j = Math.max(0, Math.min(N - 1, j));
    if (j === k) return;
    k = j; pT = j; detail = false;
    scene?.close?.();                                    // (un livre ouvert se referme quand on change d'objet)
    const s = o.steps[j];
    // (12/10) le titre de l'objet (capitales, Garamond) et sa ligne dessous, au-dessus de la description
    const ti = main.querySelector('.lt-ti'), su = main.querySelector('.lt-su');
    if (ti && (ti.textContent !== (s.title || '') || su.textContent !== (s.sub || ''))) {
      const put = () => { ti.textContent = s.title || ''; su.textContent = s.sub || ''; ti.style.opacity = su.style.opacity = ''; };
      if (!ti.textContent || reduced) put(); else { ti.style.opacity = su.style.opacity = '0'; setTimeout(put, 260); }
    }
    type(nbsp(s.txt));
    main.querySelectorAll('.lt-dot').forEach((b, i) => b.classList.toggle('on', i === j));
    pr.innerHTML = o.price ? o.price(j) : '';
    if (o.sign.href && s.href) sign.href = s.href;
    if (o.fallback) grab.style.backgroundImage = o.fallback(j) ? `url("${o.base || './'}${o.fallback(j)}")` : '';
    if (o.onStep) o.onStep(j, from);
    if (scene) place();
  };
  main.querySelectorAll('.lt-dot').forEach(b => b.addEventListener('click', () => setStep(+b.dataset.k)));
  const down = main.querySelector('.lt-down');
  if (down) down.addEventListener('click', () => setStep(k + 1 < N ? k + 1 : 0));
  // glisser (doigt, souris tenue), sur l'objet aussi (13/10 : on ne le prend plus en main) : de côté = l'étape voisine ;
  // vers le haut = la suivante
  let sx = null, sy = 0, st0 = 0;
  const s0 = (x, y, tg) => { if (tg.closest('a, button, input, form')) { sx = null; return; } sx = x; sy = y; st0 = performance.now(); };
  const s1 = (x, y) => {
    if (sx == null) return; const dx = x - sx, dy = y - sy; sx = null;
    if (performance.now() - st0 > 900) return;
    // (16/10) l'objet répond d'abord à ses propres gestes (le livre : ouvrir, feuilleter, refermer)
    if (Math.hypot(dx, dy) < 10 && scene && scene.tap && scene.tap(x, y, innerWidth, innerHeight, p)) { live?.then(r => r && r.go()); setTimeout(syncOpen, 700); return; }
    if (scene && scene.isOpen && scene.isOpen()) {
      if (Math.abs(dx) > 42 && Math.abs(dx) > 1.4 * Math.abs(dy)) { scene.swipe(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dy) > 42) { scene.close(); setTimeout(syncOpen, 50); return; }
    }
    // (16/10, Maxence) toucher une enveloppe de la guirlande : elle est choisie, l'étape suivante
    if (Math.hypot(dx, dy) < 10 && scene && scene.pick && k === 0) { const i = scene.pick(x, y, innerWidth, innerHeight); if (i >= 0) { scene.choose(i); setStep(1); return; } }
    // (16/10) ailleurs sur l'objet : ce qu'il est vraiment (more), à la place de la description ; encore = la description
    if (Math.hypot(dx, dy) < 10 && o.steps[k].more) { const r = grab.getBoundingClientRect(); if (x > r.left && x < r.right && y > r.top && y < r.bottom) { detail = !detail; type(nbsp(detail ? o.steps[k].more : o.steps[k].txt)); return; } }
    // (13/10, Maxence : « cohérence PARTOUT ») depuis le dernier point, le geste vers la suite revient au premier
    // (13/10) l'objet peut enchaîner du dernier au premier sans rembobiner (un poème par mois : scene.wrap)
    if (Math.abs(dx) > 42 && Math.abs(dx) > 1.4 * Math.abs(dy)) { if (dx < 0 && k === N - 1) { wrapTo0(); return; } setStep(k + (dx < 0 ? 1 : -1)); }
    else if (Math.abs(dy) > 42 && Math.abs(dy) > 1.4 * Math.abs(dx)) setStep(k + (dy < 0 ? 1 : -1));
  };
  host.addEventListener('touchstart', e => { if (e.touches.length === 1) s0(e.touches[0].clientX, e.touches[0].clientY, e.target); else sx = null; }, { passive: true });
  host.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) s1(t.clientX, t.clientY); }, { passive: true });
  host.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) s0(e.clientX, e.clientY, e.target); });
  host.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') s1(e.clientX, e.clientY); });
  // la molette : une étape par geste
  let wAt = 0, wAcc = 0;
  host.addEventListener('wheel', e => {
    if (N < 2 || e.ctrlKey) return;
    const now = performance.now(); if (now - wAt > 260) wAcc = 0; wAt = now;
    wAcc += e.deltaY;
    if (Math.abs(wAcc) > 60 && !host._wLock && scene?.isOpen?.()) { host._wLock = true; scene.close(); setTimeout(syncOpen, 50); wAcc = 0; setTimeout(() => { host._wLock = false; }, 650); return; }
    if (Math.abs(wAcc) > 60 && !host._wLock) { host._wLock = true; setStep(k + Math.sign(wAcc)); wAcc = 0; setTimeout(() => { host._wLock = false; }, 650); }
  }, { passive: true });

  // ---- l'objet en direct ; la légende à sa distance ; la zone qu'on prend en main ----
  const place = () => {
    const W = innerWidth, H = innerHeight, sc = scene && scene.bottom ? captionShift(W, H, scene.bottom(p)) : 0;
    cap.style.top = `calc(100svh - ${insetBottom()}px + ${sc.toFixed(1)}px)`;
    tagLine(W, H);
    const r = scene && scene.rect ? scene.rect(W, H, p) : null;
    if (r) Object.assign(grab.style, { left: r.l + 'px', top: r.t + 'px', width: (r.r - r.l) + 'px', height: (r.b - r.t) + 'px' });
  };
  // (13/10, Maxence) derrière les lettres qui dérivent, SINGULIES — le nom de la communauté — en grand, dans la police
  // des textes, sur son fil d'un bord à l'autre ; le fil coulisse dans l'autre sens que les lettres (comme une poulie)
  let wordEl = null;
  const tagLine = W => {
    if (!o.behind || !scene || !scene.flowPx) return;
    if (!wordEl) {
      wordEl = document.createElement('div'); wordEl.className = 'lt-word'; wordEl.setAttribute('aria-hidden', 'true');
      wordEl.innerHTML = `<canvas></canvas><span>${esc(o.behind)}</span>`;
      host.insertBefore(wordEl, host.firstChild);                      // (sous le canvas de l'objet : derrière les lettres)
    }
    const f = scene.flowPx(W, innerHeight), op = Math.max(0, Math.min(1, f.o));
    wordEl.style.top = f.y.toFixed(1) + 'px'; wordEl.style.setProperty('--o', op.toFixed(3));
    if (op < 0.005) return;
    const cv = wordEl.querySelector('canvas'), sp = wordEl.querySelector('span'), d = Math.min(3, devicePixelRatio || 1), hh = 30;
    if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = hh * d; Object.assign(cv.style, { width: W + 'px', height: hh + 'px' }); }
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, hh);
    const r = sp.getBoundingClientRect(), ls = parseFloat(getComputedStyle(sp).letterSpacing) || 0, l = r.left - 6, rr = r.right - ls + 6, y = hh / 2;
    paintThread(x, -4, l, y, 83, 1.3, { holes: [false, true], sag: 0.5 + 0.6 * f.sag, g0: -4 + f.x });
    paintThread(x, rr, W + 4, y, 97, 1.3, { holes: [true, false], sag: 0.5 - 0.6 * f.sag, g0: rr + f.x });
  };
  let scene = null, live = null;
  const step = dt => { const kk = reduced ? 1 : Math.min(1, dt * 3.2); p += (pT - p) * kk; if (Math.abs(pT - p) < 1e-3) p = pT; place(); return Math.abs(pT - p) > 1e-3; };
  live = mountStage(host, grab, o.make, { reduced, step, p: () => p, pt: () => pT }).then(r => { scene = r && r.scene; if (!r) main.classList.add('flat'); place(); return r; });
  addEventListener('resize', place);
  addEventListener('keydown', e => { if (e.key === 'Escape' && scene?.isOpen?.() && getComputedStyle(host).visibility !== 'hidden') { scene.close(); setTimeout(syncOpen, 50); } });
  setStep(0, 'debut');
  return { main, grab, cap, sign, live, setStep, get step() { return k; },
    canvas: () => host.querySelector('.lt-cv'),
    // (le bandeau des pages) ce qui voyage : l'objet (le canvas et sa prise) ; le reste paraît sur place
    obj: () => [host.querySelector('.lt-cv'), grab].filter(Boolean),
    rest: () => [cap, main.querySelector('.lt-bar'), wordEl].filter(Boolean),
    center: () => { const r = grab.getBoundingClientRect(); return r.height ? { y: r.top + r.height / 2, h: r.height } : null; } };
}

