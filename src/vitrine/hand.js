// L'écriture à la main (10/10, la vitrine) : le prénom écrit au stylo au travers du carbone blanc — jamais deux fois la
// même écriture. 21 écritures manuscrites (Google Fonts, licences OFL / Apache dans public/fonts/main/licences),
// tirées au hasard à chaque visite, puis chaque prénom a son geste (taille, pente, inclinaison, ligne qui ondule,
// appui) et chaque lettre le sien (petit décalage, rotation, échelle, pression). On l'écrit lettre par lettre.
import { createRng } from '../field/rng.js';

export const HANDS = ['AnnieUseYourTelescope-Regular', 'Calligraffitti-Regular', 'Cedarville-Cursive', 'DawningofaNewDay', 'GiveYouGlory',
  'HerrVonMuellerhoff-Regular', 'HomemadeApple-Regular', 'Kristi-Regular', 'LaBelleAurore', 'LovedbytheKing', 'MrDeHaviland-Regular',
  'MrsSaintDelafield-Regular', 'NothingYouCouldDo', 'OvertheRainbow', 'Qwigley-Regular', 'ReenieBeanie', 'ShadowsIntoLight',
  'SueEllenFrancisco-Regular', 'TheGirlNextDoor', 'WaitingfortheSunrise', 'Zeyada'];
// taille relative (certaines écritures sont petites ou grandes pour un même corps)
const K = { 'HerrVonMuellerhoff-Regular': 1.35, 'MrDeHaviland-Regular': 1.3, 'MrsSaintDelafield-Regular': 1.25, 'Qwigley-Regular': 1.3, 'Kristi-Regular': 1.25,
  'HomemadeApple-Regular': 0.82, 'ReenieBeanie': 1.15, 'SueEllenFrancisco-Regular': 1.15, 'LovedbytheKing': 1.1, 'DawningofaNewDay': 1.1, 'Zeyada': 1.1 };

// l'ordre des écritures pour cette visite (mélangé) : la carte de la personne a la première, les autres cartes les suivantes
export function handOrder() {
  const a = HANDS.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const loaded = {};
export function loadHand(name, base = './') {
  if (!loaded[name]) {
    const f = new FontFace('SGH-' + name, `url(${base}fonts/main/${name}.ttf)`);
    loaded[name] = f.load().then(ff => { document.fonts.add(ff); return true; }).catch(() => false);
  }
  return loaded[name];
}

// le geste d'un prénom (tiré une fois)
export function handStyle(font, seed) {
  const r = createRng(seed);
  return {
    font, k: (K[font] || 1) * (0.92 + 0.16 * r()), slant: -0.22 + 0.24 * r(), rot: -0.09 + 0.12 * r(), track: -0.04 + 0.08 * r(),
    wave: 0.02 + 0.05 * r(), wph: r() * 6.28, press: 0.75 + 0.25 * r(), weight: r() * 0.035,
    glyph: Array.from({ length: 40 }, () => ({ dy: r() - 0.5, rot: r() - 0.5, s: r() - 0.5, a: r() })),
  };
}
// le prénom écrit, sur une carte d'encre (blanc sur noir : la couverture d'encre) ; u : part écrite (0–1)
// wmm × hmm : la surface (mm) ; box : { cx, cy, w } la zone d'écriture (mm) ; pxmm : définition
export function handInk(text, st, wmm, hmm, pxmm, box, u = 1, canvas = null) {
  const W = Math.round(wmm * pxmm), H = Math.round(hmm * pxmm);
  const c = canvas && canvas.width === W && canvas.height === H ? canvas : new OffscreenCanvas(W, H);
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const fam = `"SGH-${st.font}", cursive`;
  let fs = 10 * pxmm * st.k;
  x.font = `${fs}px ${fam}`;
  const chars = [...text], adv = chars.map(ch => x.measureText(ch).width * (1 + st.track));
  let tw = adv.reduce((a, b) => a + b, 0);
  const maxW = box.w * pxmm;
  if (tw > maxW) { const s = maxW / tw; fs *= s; for (let i = 0; i < adv.length; i++) adv[i] *= s; tw = maxW; x.font = `${fs}px ${fam}`; }
  x.translate(box.cx * pxmm, box.cy * pxmm); x.rotate(st.rot); x.transform(1, 0, st.slant, 1, 0, 0);
  x.textBaseline = 'alphabetic'; x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineJoin = 'round';
  x.lineWidth = st.weight * fs;
  const n = chars.length, shown = u * n;
  let px = -tw / 2;
  for (let i = 0; i < n; i++) {
    if (i >= shown) break;
    const g = st.glyph[i % st.glyph.length], part = Math.min(1, shown - i);
    const y = fs * 0.32 + fs * (st.wave * Math.sin(st.wph + i * 0.9) + 0.035 * g.dy);
    x.save();
    x.translate(px, y); x.rotate(0.05 * g.rot); x.scale(1 + 0.06 * g.s, 1 + 0.06 * g.s);
    if (part < 1) { x.beginPath(); x.rect(-fs * 0.3, -fs * 1.6, adv[i] * part + fs * 0.3, fs * 2.6); x.clip(); }   // la lettre en train de s'écrire
    x.globalAlpha = st.press * (0.82 + 0.18 * g.a);
    x.fillText(chars[i], 0, 0);
    if (st.weight > 0.004) x.strokeText(chars[i], 0, 0);
    x.restore();
    px += adv[i];
  }
  return c;
}

// le timbre : dentelé (les dents = le papier noir de la carte, comme des trous), un filet, le logo gaufré au milieu
export function stampInk(k = 24) {
  const w = 20, h = 24, c = new OffscreenCanvas(w * k, h * k), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#000'; x.fillRect(2.3 * k, 2.3 * k, (w - 4.6) * k, (h - 4.6) * k);
  x.strokeStyle = '#fff'; x.lineWidth = 0.22 * k; x.strokeRect(3.1 * k, 3.1 * k, (w - 6.2) * k, (h - 6.2) * k);
  const dent = (x0, y0, x1, y1, n) => { for (let i = 0; i <= n; i++) { x.beginPath(); x.arc((x0 + (x1 - x0) * i / n) * k, (y0 + (y1 - y0) * i / n) * k, 0.72 * k, 0, Math.PI * 2); x.fillStyle = '#000'; x.fill(); } };
  dent(0, 0, w, 0, 10); dent(0, h, w, h, 10); dent(0, 0, 0, h, 12); dent(w, 0, w, h, 12);
  x.fillStyle = '#fff'; x.font = `${1.7 * k}px "SG Machine"`; x.textAlign = 'center'; x.fillText('SINGULIES', w / 2 * k, (h - 4.3) * k);
  return c;
}
// le prénom comme on l'écrit à la main : capitale initiale, accents (Léa) — handName du parcours
export const said = n => String(n).toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());
