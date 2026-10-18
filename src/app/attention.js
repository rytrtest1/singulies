// L'attention (18/10, Maxence : « un fondu au noir, un peu de vignettage : on coupe l'attention sur tout autour sauf le centre ; si la
// personne n'écrit pas ou ne touche pas le curseur, on met l'attention dessus et on écrit une indication — ça pourra servir partout
// si l'utilisateur est bloqué »). Un seul outil, pour tout le site :
//
//   const attn = createAttention();
//   attn.update({ stuck: true, x, y, r, text: 'entre un prénom', delay: 5 });   // à chaque image (ou toutes les 200 ms)
//
// stuck : la page dit que la personne est bloquée (elle attend quelque chose et ne fait rien). Au bout de `delay` s de blocage SANS geste,
// tout s'assombrit autour du point (x, y) (px écran, rayon r de lumière) et le texte se tape à la machine dessous. Le moindre geste
// (toucher, clic, touche, molette) éteint l'attention ; elle se ré-arme plus tard, de plus en plus patiente, et jamais plus de MAX fois.
// Mouvement réduit : pas de frappe, un simple fondu. Ne bloque jamais un geste (pointer-events: none).
const CSS = `
.sg-attn { position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: 0; transition: opacity 1.4s ease;
  background: radial-gradient(circle at var(--ax, 50%) var(--ay, 50%), rgba(6,6,6,0) 0, rgba(6,6,6,0) calc(var(--ar, 120px) * .45), rgba(6,6,6,.6) calc(var(--ar, 120px) * 1.35), rgba(6,6,6,.93) calc(var(--ar, 120px) * 2.8)); }
.sg-attn.on { opacity: 1; }
.sg-attn.off { transition-duration: .5s; }
.sg-attn p { position: absolute; left: 0; right: 0; margin: 0; text-align: center; font: 500 18px/1.4 'SG Garamond', Georgia, serif; letter-spacing: .08em; color: #ece8e0; }
.sg-attn p b { font-weight: inherit; opacity: 0; }
.sg-attn p b.on { opacity: .88; }
@media (prefers-reduced-motion: reduce) { .sg-attn { transition-duration: .6s; } }
`;
const MAX = 3;

export function createAttention({ max = MAX } = {}) {
  if (!document.getElementById('sg-attn-style')) { const st = document.createElement('style'); st.id = 'sg-attn-style'; st.textContent = CSS; document.head.appendChild(st); }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.className = 'sg-attn'; el.setAttribute('role', 'status');
  const p = document.createElement('p'); el.appendChild(p);
  document.body.appendChild(el);
  let shown = false, since = 0, count = 0, text = '', timer = 0, lastGest = performance.now(), px = -1, py = -1, pr = -1;
  const gesture = () => { lastGest = performance.now(); if (shown) hide(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, gesture, { passive: true, capture: true });

  function type(txt) {
    clearTimeout(timer); text = txt; el.setAttribute('aria-label', txt);
    if (reduced) { p.innerHTML = ''; p.textContent = txt; return; }
    p.innerHTML = [...txt].map(ch => `<b>${ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch}</b>`).join('');
    const ks = [...p.querySelectorAll('b')]; let n = 0;
    const strike = () => { if (!shown || n >= ks.length) return; ks[n++].classList.add('on'); timer = setTimeout(strike, (ks[n - 1].textContent === ' ' ? 90 : 55) + Math.random() * 55); };
    timer = setTimeout(strike, 900);   // (le temps que la lumière se resserre)
  }
  function show(txt) {
    shown = true; count++; since = performance.now(); el.classList.remove('off'); void el.offsetWidth; el.classList.add('on'); type(txt);
  }
  function hide() {
    shown = false; clearTimeout(timer); el.classList.add('off'); el.classList.remove('on');
    setTimeout(() => { if (!shown) p.innerHTML = ''; }, 600);
  }
  return {
    // x, y, r : le point où l'attention se pose (px écran) et le rayon de lumière ; below : écart du texte sous y (px, négatif : au-dessus)
    update({ stuck, x, y, r = 120, text: txt, delay = 5, below = 70 }) {
      const now = performance.now();
      if (!stuck) { if (shown) hide(); lastGest = Math.max(lastGest, now); return; }    // (l'attente ne commence qu'une fois bloqué)
      if (x !== px || y !== py || r !== pr) {
        px = x; py = y; pr = r;
        el.style.setProperty('--ax', x.toFixed(1) + 'px'); el.style.setProperty('--ay', y.toFixed(1) + 'px'); el.style.setProperty('--ar', r.toFixed(1) + 'px');
        p.style.top = Math.max(8, y + below).toFixed(1) + 'px';
      }
      // de plus en plus patient : delay, puis 2 × delay, puis 3 × delay… ; jamais plus de `max` fois
      if (!shown && count < max && now - lastGest > delay * 1000 * (count + 1)) show(txt);
      else if (shown && txt !== text) type(txt);
    },
    hide, get shown() { return shown; }, get count() { return count; },
  };
}
