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
import { stitch } from '../alt/stitch.js';
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
      <p class="lt-cap-t" aria-live="polite"></p>
      ${N > 1 ? `<div class="lt-dots">${o.steps.map((s, i) => `<button class="lt-dot" type="button" data-k="${i}" aria-label="${esc(s.txt.replace(/\n/g, ' '))}"><i></i></button>`).join('')}</div>
      <button class="lt-down" type="button" aria-label="La suite"><i class="lt-scroll"></i></button>` : ''}
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
  let k = -1, p = 0, pT = 0, typeT = 0;
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
  const setStep = (j, from = 'geste') => {
    j = Math.max(0, Math.min(N - 1, j));
    if (j === k) return;
    k = j; pT = j;
    const s = o.steps[j];
    type(nbsp(s.txt));
    main.querySelectorAll('.lt-dot').forEach((b, i) => b.classList.toggle('on', i === j));
    pr.innerHTML = o.price ? o.price(j) : '';
    if (o.sign.href && s.href) sign.href = s.href;
    if (o.fallback) grab.style.backgroundImage = o.fallback(j) ? `url("${o.base || './'}${o.fallback(j)}")` : '';
    if (o.onStep) o.onStep(j, from);
  };
  main.querySelectorAll('.lt-dot').forEach(b => b.addEventListener('click', () => setStep(+b.dataset.k)));
  const down = main.querySelector('.lt-down');
  if (down) down.addEventListener('click', () => setStep(k + 1 < N ? k + 1 : 0));
  // glisser (doigt, souris tenue) ailleurs que sur l'objet : de côté = l'étape voisine ; vers le haut = la suivante
  let sx = null, sy = 0, st0 = 0;
  const s0 = (x, y, tg) => { if (grab.contains(tg) || tg.closest('a, button, input, form')) { sx = null; return; } sx = x; sy = y; st0 = performance.now(); };
  const s1 = (x, y) => {
    if (sx == null) return; const dx = x - sx, dy = y - sy; sx = null;
    if (performance.now() - st0 > 900) return;
    if (Math.abs(dx) > 42 && Math.abs(dx) > 1.4 * Math.abs(dy)) setStep(k + (dx < 0 ? 1 : -1));
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
    if (Math.abs(wAcc) > 60 && !host._wLock) { host._wLock = true; setStep(k + Math.sign(wAcc)); wAcc = 0; setTimeout(() => { host._wLock = false; }, 650); }
  }, { passive: true });

  // ---- l'objet en direct ; la légende à sa distance ; la zone qu'on prend en main ----
  const place = () => {
    const W = innerWidth, H = innerHeight, sc = scene && scene.bottom ? captionShift(W, H, scene.bottom(p)) : 0;
    cap.style.top = `calc(100svh - ${insetBottom()}px + ${sc.toFixed(1)}px)`;
    if (scene && scene.rect) { const r = scene.rect(W, H, p); Object.assign(grab.style, { left: r.l + 'px', top: r.t + 'px', width: (r.r - r.l) + 'px', height: (r.b - r.t) + 'px' }); }
  };
  let scene = null, live = null;
  const step = dt => { const kk = reduced ? 1 : Math.min(1, dt * 3.2); p += (pT - p) * kk; if (Math.abs(pT - p) < 1e-3) p = pT; place(); return Math.abs(pT - p) > 1e-3; };
  live = mountStage(host, grab, o.make, { reduced, step, p: () => p }).then(r => { scene = r && r.scene; if (!r) main.classList.add('flat'); place(); return r; });
  addEventListener('resize', place);
  setStep(0, 'debut');
  return { main, grab, cap, sign, live, setStep, get step() { return k; },
    canvas: () => host.querySelector('.lt-cv'),
    // (le bandeau des pages) ce qui voyage : l'objet (le canvas et sa prise) ; le reste paraît sur place
    obj: () => [host.querySelector('.lt-cv'), grab].filter(Boolean),
    rest: () => [cap, main.querySelector('.lt-bar')].filter(Boolean),
    center: () => { const r = grab.getBoundingClientRect(); return r.height ? { y: r.top + r.height / 2, h: r.height } : null; } };
}
