// Le défilé de l'accueil (18/10, Maxence : « ETERNEL, UN PRENOM UN POEME, ensuite la feuille et les différents poèmes déjà
// écrits qui défilent ; quand on entre un prénom elles se regroupent, ça écrit le prénom sur une feuille vierge, et au-dessous
// la description »). Les poèmes déjà écrits passent lentement derrière la feuille vierge ; au premier prénom ils glissent
// vers le centre, se rangent sous elle et s'effacent ; si le prénom est effacé, ils repartent de là où ils étaient.
// Tout est calculé image par image (un seul paramètre g : 0 = ils défilent, 1 = regroupés), donc réversible à tout moment.
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// stage : le cadre ; poemes : [{ src, alt }] ; onOpen(i) : toucher un poème ; rend { gather(bool, instant?), destroy() }
export function mountDefile(stage, poemes, { onOpen = () => {}, speed = 20 } = {}) {
  const layer = document.createElement('div'); layer.className = 'df-poems';
  const N = poemes.length * 2;                       // deux tours : toujours de quoi remplir la largeur
  const items = Array.from({ length: N }, (_, i) => {
    const p = poemes[i % poemes.length];
    const im = document.createElement('img');
    im.className = 'df-p'; im.src = p.src; im.alt = ''; im.decoding = 'async'; im.draggable = false;
    im.dataset.i = String(i % poemes.length);
    im.addEventListener('click', () => onOpen(+im.dataset.i));
    layer.appendChild(im);
    return im;
  });
  stage.insertBefore(layer, stage.firstChild);

  let off = 0, g = 0, want = 0, last = 0, raf = 0, visible = true, held = false, dead = false, geom = { W: 0, H: 0, w: 0, step: 0, total: 0 };
  const measure = () => {
    const W = stage.clientWidth, H = stage.clientHeight, h = H * 0.8, w = h * (1350 / 1860), step = w + Math.max(12, H * 0.05);
    geom = { W, H, w, step, total: N * step };
    for (const im of items) { im.style.height = h + 'px'; im.style.width = w + 'px'; im.style.top = (H - h) / 2 + 'px'; }
  };
  const draw = () => {
    const { W, w, step, total } = geom;
    const e = ease(g), cx = (W - w) / 2;
    items.forEach((im, i) => {
      // sa place dans le défilé (de droite à gauche, en boucle), puis vers le centre
      let x = ((i * step + off) % total + total) % total - step;
      x = x + (cx - x) * e;
      const s = 1 - 0.14 * e, o = (1 - e) * 0.92;
      im.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${s.toFixed(3)})`;
      im.style.opacity = o.toFixed(3);
      im.style.visibility = o < 0.004 ? 'hidden' : 'visible';
      im.style.pointerEvents = e > 0.3 ? 'none' : '';
    });
  };
  const loop = now => {
    raf = 0;
    if (dead) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (!REDUCED) {
      if (!held && g < 0.999) off -= speed * dt * (1 - g);
      g += (want - g) * Math.min(1, dt * 3.4);
      if (Math.abs(want - g) < 0.002) g = want;
    } else g = want;
    draw();
    // au repos (regroupés, ou mouvement réduit) : on s'arrête
    if (visible && !document.hidden && (!REDUCED && (g < 1 || want < 1))) raf = requestAnimationFrame(loop);
    else last = 0;
  };
  const go = () => { if (!raf && !dead) raf = requestAnimationFrame(loop); };
  measure(); draw(); go();
  const ro = new ResizeObserver(() => { measure(); draw(); go(); });
  ro.observe(stage);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = 0; go(); } }) : null;
  io?.observe(stage);
  const vis = () => { if (!document.hidden) { last = 0; go(); } };
  document.addEventListener('visibilitychange', vis);
  // le doigt (ou la souris) posé sur le défilé : il s'arrête, pour qu'on puisse toucher un poème
  const hold = on => () => { held = on; if (!on) { last = 0; go(); } };
  const up = hold(false);
  layer.addEventListener('pointerdown', hold(true)); addEventListener('pointerup', up); addEventListener('pointercancel', up); layer.addEventListener('pointerenter', hold(true)); layer.addEventListener('pointerleave', up);

  return {
    gather(on, instant = false) { want = on ? 1 : 0; if (instant) g = want; last = 0; go(); },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', vis); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); layer.remove(); },
  };
}
