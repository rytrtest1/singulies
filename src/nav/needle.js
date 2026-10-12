// Les aiguilles du bandeau (12/10, Maxence) : à chaque bout, une aiguille piquée dans le fil — la pointe plongée dans un
// trou, le chas vers les noms ; le fil du bandeau sort d'un trou, monte jusqu'au chas, le traverse, un bout pend. On la
// reconnaît à ce qu'elle fait : elle ressort, replonge, tire le fil (et les noms avec lui).
//   arrive()  : elle paraît, la pointe au-dessus du trou, et pique
//   breathe() : un geste de couture au repos — la pointe ressort, elle replonge un peu plus loin (le fil se tend), revient
//   stitch()  : un point complet (changer de page) — elle sort, replonge profond en tirant, revient
//   tug(on)   : tirer et tenir (la démonstration), relâcher
// Repère (côté droit ; le gauche en miroir) : un SVG de 84 × 44 px collé au bord, x = 84 au bord de l'écran.
const NS = 'http://www.w3.org/2000/svg';
const L = 44;                                // longueur de l'aiguille (px)
const HOLE = { x: 64, y: 22 };               // le trou où elle pique (20 px du bord)
export const THREAD_END = 30;                // x du trou d'où sort le fil du bandeau (54 px du bord : --nv-el / --nv-er)
const ANG = 30 * Math.PI / 180;              // piquée en biais : la pointe vers le bas et le bord
const REST = 11;                             // au repos : 11 px de l'aiguille sous le tissu
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = u => 1 - Math.pow(1 - u, 3);

export function createNeedle(side, { reduced = false, onClick } = {}) {
  const left = side < 0, id = 'nd' + (left ? 'l' : 'r');
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'nv-nd ' + (left ? 'l' : 'r');
  btn.setAttribute('aria-label', left ? 'page précédente' : 'page suivante');
  btn.innerHTML = `<svg viewBox="0 0 84 44" width="84" height="44" aria-hidden="true">
<defs>
<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcdbd6"/><stop offset=".38" stop-color="#9a9994"/><stop offset=".62" stop-color="#6c6b67"/><stop offset="1" stop-color="#262523"/></linearGradient>
<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${L}" y2="0"><stop class="g0" offset="0" stop-color="#fff" stop-opacity="0"/><stop class="g1" offset="0" stop-color="#fff" stop-opacity=".9"/><stop class="g2" offset="0" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="${id}c" clipPathUnits="userSpaceOnUse"><rect class="clip" x="-4" y="-4" width="${L + 8}" height="8"/></clipPath>
</defs>
<g class="thr"><path class="t0" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.6" stroke-linecap="round"/><path class="t1" fill="none" stroke="rgb(30,29,27)" stroke-width="1.3" stroke-linecap="round"/><path class="t2" fill="none" stroke="rgba(120,116,108,.26)" stroke-width=".5" stroke-linecap="round"/></g>
<ellipse cx="${THREAD_END}" cy="${HOLE.y}" rx="1.1" ry=".85" fill="#020202"/>
<ellipse cx="${HOLE.x}" cy="${HOLE.y}" rx="1.5" ry="1" fill="#020202"/>
<g class="nd" clip-path="url(#${id}c)">
<path d="M1.1 -1.45 Q-.6 0 1.1 1.45 L28 1.05 Q37 .6 ${L} 0 Q37 -.6 28 -1.05 Z" fill="url(#${id}m)"/>
<path d="M1.1 -1.45 Q-.6 0 1.1 1.45 L28 1.05 Q37 .6 ${L} 0 Q37 -.6 28 -1.05 Z" fill="url(#${id}g)"/>
<rect x="2.6" y="-.5" width="6.4" height="1" rx=".5" fill="#050505"/>
</g>
<g class="tail"><path class="u1" fill="none" stroke="rgb(30,29,27)" stroke-width="1.3" stroke-linecap="round"/><path class="u2" fill="none" stroke="rgba(120,116,108,.26)" stroke-width=".5" stroke-linecap="round"/></g>
</svg>`;
  if (left) btn.querySelector('svg').style.transform = 'scaleX(-1)';
  btn.addEventListener('click', () => onClick && onClick());
  const q = s => btn.querySelector(s);
  const nd = q('.nd'), clip = q('.clip'), t0 = q('.t0'), t1 = q('.t1'), t2 = q('.t2'), u1 = q('.u1'), u2 = q('.u2');
  const g0 = q('.g0'), g1 = q('.g1'), g2 = q('.g2');
  const dir = [Math.cos(ANG), Math.sin(ANG)];
  // la pose : s = longueur sous le tissu (négatif : la pointe au-dessus du trou), a = opacité
  const P = { s: -14, a: 0, glint: -1 };
  function render() {
    const tip = [HOLE.x + dir[0] * P.s, HOLE.y + dir[1] * P.s], eye = [tip[0] - dir[0] * L, tip[1] - dir[1] * L];
    nd.setAttribute('transform', `translate(${eye[0].toFixed(2)} ${eye[1].toFixed(2)}) rotate(${(ANG * 180 / Math.PI).toFixed(2)})`);
    clip.setAttribute('width', (Math.min(L + 8, L - Math.max(0, P.s) + 4)).toFixed(2));
    // le fil : du trou du bandeau au chas (un peu affaissé), puis le bout qui ressort de l'autre côté et pend
    const ex = eye[0] + dir[0] * 5.8, ey = eye[1] + dir[1] * 5.8;
    const mx = (THREAD_END + ex) / 2, my = Math.max(HOLE.y, ey) + 1.2;
    const d = `M${THREAD_END} ${HOLE.y} Q${mx.toFixed(2)} ${my.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    t0.setAttribute('d', d); t0.setAttribute('transform', 'translate(0 .8)'); t1.setAttribute('d', d);
    t2.setAttribute('d', `M${THREAD_END + 1} ${HOLE.y - 0.3} Q${mx.toFixed(2)} ${(my - 0.3).toFixed(2)} ${(ex - 0.3).toFixed(2)} ${(ey - 0.3).toFixed(2)}`);
    const tl = `M${ex.toFixed(2)} ${ey.toFixed(2)} Q${(ex + 3.4).toFixed(2)} ${(ey + 1.5).toFixed(2)} ${(ex + 3).toFixed(2)} ${(ey + 5.5).toFixed(2)} Q${(ex + 2.6).toFixed(2)} ${(ey + 8.5).toFixed(2)} ${(ex + 1).toFixed(2)} ${(ey + 10).toFixed(2)}`;
    u1.setAttribute('d', tl); u2.setAttribute('d', tl);
    btn.querySelector('.thr').style.opacity = btn.querySelector('.tail').style.opacity = String(P.a);
    nd.style.opacity = String(P.a);
    // l'éclat : une petite lumière qui glisse le long de la tige
    const g = P.glint;
    if (g < 0 || g > 1) { g1.setAttribute('stop-opacity', '0'); }
    else { const c = g, w = 0.07; g0.setAttribute('offset', Math.max(0, c - w).toFixed(3)); g1.setAttribute('offset', c.toFixed(3)); g2.setAttribute('offset', Math.min(1, c + w).toFixed(3)); g1.setAttribute('stop-opacity', (0.85 * Math.sin(Math.PI * g)).toFixed(3)); }
  }
  render();

  // un petit moteur de gestes : une suite d'étapes [{ s, a, t (ms), e (courbe), at (rappel au départ) }]
  let seq = null, raf = 0;
  const loop = now => {
    raf = 0;
    if (seq) {
      const st = seq.list[seq.i];
      if (seq.t0 == null) { seq.t0 = now; seq.from = { s: P.s, a: P.a }; st.at && st.at(); }
      const u = st.t ? Math.min(1, (now - seq.t0) / st.t) : 1, k = (st.e || ease)(u);
      if (st.s != null) P.s = seq.from.s + (st.s - seq.from.s) * k;
      if (st.a != null) P.a = seq.from.a + (st.a - seq.from.a) * k;
      if (u >= 1) { seq.i++; seq.t0 = null; if (seq.i >= seq.list.length) { const r = seq.res; seq = null; r && r(); } }
    }
    // l'éclat, toutes les 6 à 9 s (jamais en mouvement réduit)
    if (!reduced && P.a > 0.5) { const T = 7.3, ph = ((now / 1000 + (left ? 3.1 : 0)) % T) / 1.4; P.glint = ph <= 1 ? ph : -1; } else P.glint = -1;
    render();
    if (seq || (!reduced && P.a > 0.5 && !document.hidden)) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  const play = list => new Promise(res => { if (seq && seq.res) seq.res(); seq = { list, i: 0, t0: null, res }; wake(); });
  const R = reduced ? 0.01 : 1;

  return {
    el: btn,
    get shown() { return P.a > 0.01; },
    show() { return play([{ s: REST, a: 1, t: 500 * R + 1 }]); },
    hide() { return play([{ s: -14, a: 0, t: 300 }]); },
    arrive() { return play([{ s: -14, a: 0, t: 1 }, { a: 1, t: 420 * R + 1, e: easeOut }, { s: REST, t: 520 * R + 1 }]); },
    // pull(on) : rappel quand le fil se tend / se détend (le nom voisin glisse de quelques pixels vers le centre)
    breathe(pull) {
      if (reduced) return Promise.resolve();
      return play([{ s: -5, t: 650 }, { s: REST + 6, t: 380, at: () => pull && pull(true) }, { s: REST, t: 700, at: () => pull && pull(false) }]);
    },
    stitch() { return play([{ s: -16, t: 220 * R + 1 }, { s: REST + 12, t: 340 * R + 1 }, { s: REST, t: 420 * R + 1 }]); },
    tug(on) { return play([{ s: on ? REST + 8 : REST, t: on ? 420 : 600 }]); },
  };
}
