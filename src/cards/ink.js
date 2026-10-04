// Frappe à la machine d'une question sur le recto d'une carte : carte d'encre (couverture 0–1)
// à INK_PXMM px/mm couvrant toute la face, lue par le shader de la carte (encre posée sur les fibres).
// Relevé des vraies cartes (04/10) : pica 2,54 mm/caractère, double interligne ≈ 8,6 mm, marge gauche
// 8,5–13 mm, bloc un peu au-dessus du milieu, ≤ 24 caractères par ligne (22 sur les cartes relevées, 24 pour les questions plus longues), « ? » précédé d'une espace.
// Chaque frappe est unique : pression, frappe partielle (un côté plus léger), petit décalage et
// rotation, œil bouché (e, a, o…), rare double frappe ; traces de carbone (trait, points, bavure).
import { CARD } from './cardRenderer.js';
import { createRng } from '../field/rng.js';

export const INK_PXMM = 24;
export const TYPE = { pitch: 2.54, lead: 8.6, size: 2.54 / 0.6, xScale: 1.0, yScale: 1.1, maxChars: 24, weight: 0.035 };
const FAMILY = 'SG Machine';

let fontReady = null;
export function loadTypeFont(base = './') {
  if (!fontReady) {
    const faces = [
      new FontFace(FAMILY, `url(${base}fonts/CourierPrime-latin.woff2)`, { unicodeRange: 'U+0000-00FF, U+2000-206F' }),
      new FontFace(FAMILY, `url(${base}fonts/CourierPrime-latin-ext.woff2)`, { unicodeRange: 'U+0100-024F, U+0152-0153' }),
    ];
    fontReady = Promise.all(faces.map(f => f.load().then(ff => document.fonts.add(ff))));
  }
  return fontReady;
}

// Texte des cartes : minuscules (aucune capitale), accents et ponctuation gardés ; apostrophe droite
// de machine ; espace insécable devant ? ! : ; (jamais seul en début de ligne).
export function cardText(q) {
  return q.toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+([?!:;])/g, ' $1').replace(/\s+/g, ' ').trim();
}

// Coupure comme sur les vraies cartes : on remplit la ligne (≤ max caractères), mais une ligne ne
// finit jamais sur un petit mot qui appelle la suite (te, la, du, ta, l', qu'…) : il passe à la ligne.
// Exemples relevés : « as-tu eu du mal à / te retrouver après / ta dernière relation ? »,
// « quel souvenir heureux / te hante ? ».
const CLITICS = new Set(['te', 'le', 'la', 'les', 'un', 'une', 'du', 'des', 'de', 'se', 'me', 'ma', 'ta', 'sa', 'mon', 'ton', 'son',
  'mes', 'tes', 'ses', 'ce', 'ces', 'cet', 'cette', 'que', 'qu', 'ne', 'n', 'l', 'd', 'j', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous',
  'et', 'ou', 'au', 'aux', 'en', 'y', 'leur', 'leurs', 'notre', 'votre', 'quel', 'quelle', 'parce']);
const isClitic = w => CLITICS.has(w) || /['’]$/.test(w);
export function breakLines(text, max = TYPE.maxChars) {
  const w = text.split(' '), lines = [];
  let i = 0;
  while (i < w.length) {
    let j = i, len = w[i].length;
    while (j + 1 < w.length && len + 1 + w[j + 1].length <= max) { j++; len += 1 + w[j].length; }
    // reculer tant que la ligne finit sur un petit mot (sans vider la ligne)
    while (j < w.length - 1 && j > i && isClitic(w[j])) j--;
    lines.push(w.slice(i, j + 1).join(' '));
    i = j + 1;
  }
  // pas de dernière ligne d'un seul mot court (« bien ? ») : on y descend le dernier mot de la précédente
  const n = lines.length;
  if (n >= 2 && lines[n - 1].length < 8) {
    const prev = lines[n - 2].split(' ');
    const moved = prev.pop() + ' ' + lines[n - 1];
    if (prev.length && moved.length <= max) { lines[n - 2] = prev.join(' '); lines[n - 1] = moved; }
  }
  return lines;
}

const CLOG = new Set('eaoêéèàâôœgqdbp'.split(''));

// Carte d'encre : OffscreenCanvas (largeur CARD.w × INK_PXMM), lettres blanches sur noir.
export function makeInkMap(question, seed = 1) {
  const rnd = createRng(seed), g = () => {           // gaussienne approchée
    let s = 0; for (let i = 0; i < 4; i++) s += rnd(); return (s - 2) / 0.58;
  };
  const PX = INK_PXMM, W = Math.round(CARD.w * PX), H = Math.round(CARD.h * PX);
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  const text = cardText(question), lines = breakLines(text);
  // mise en page (mm, origine en haut à gauche de la face lue)
  const margin = rnd.range(8.5, 13);
  const lead = TYPE.lead * rnd.range(0.97, 1.03);
  const blockH = (lines.length - 1) * lead;
  const cy = CARD.h * rnd.range(0.41, 0.47);
  const y0 = cy - blockH / 2 + 1.0;                   // ligne de base de la 1re ligne
  const tilt = rnd.range(-0.5, 0.5) * Math.PI / 180;   // carte posée un peu de travers dans la machine
  const fontPx = TYPE.size * PX;
  const glyph = new OffscreenCanvas(Math.ceil(fontPx * 1.6), Math.ceil(fontPx * 1.8)), gx = glyph.getContext('2d');
  const ox = glyph.width * 0.25, oyB = glyph.height * 0.72;   // origine du caractère dans la vignette
  cx.save();
  cx.translate(margin * PX, y0 * PX); cx.rotate(tilt); cx.translate(-margin * PX, -y0 * PX);
  cx.globalCompositeOperation = 'lighter';
  const strikes = [];
  lines.forEach((line, li) => {
    const base = y0 + li * lead + g() * 0.05;
    const drift = g() * 0.04;                           // la ligne monte ou descend un peu
    [...line].forEach((ch, ci) => {
      if (ch === ' ' || ch === ' ') return;
      const x = margin + ci * TYPE.pitch + g() * 0.06;
      const y = base + drift * ci / Math.max(1, line.length) + g() * 0.09;
      const press = Math.min(1, Math.max(0.5, 0.82 + g() * 0.14));
      const rot = g() * 0.5 * Math.PI / 180;
      // vignette : caractère seul, puis frappe partielle (dégradé d'un côté), puis report sur la carte
      gx.setTransform(1, 0, 0, 1, 0, 0);
      gx.globalCompositeOperation = 'source-over';
      gx.clearRect(0, 0, glyph.width, glyph.height);
      gx.font = `${fontPx}px "${FAMILY}"`;
      gx.fillStyle = '#fff'; gx.strokeStyle = '#fff';
      gx.translate(ox, oyB); gx.scale(TYPE.xScale, TYPE.yScale);
      gx.fillText(ch, 0, 0);
      // graisse : la frappe écrase l'encre un peu au-delà du dessin
      gx.lineWidth = TYPE.weight * PX + (CLOG.has(ch) && rnd() < 0.12 ? 0.12 * PX : 0);
      gx.lineJoin = 'round';
      gx.strokeText(ch, 0, 0);
      gx.setTransform(1, 0, 0, 1, 0, 0);
      const side = rnd();                               // frappe partielle : haut, bas, gauche ou droite plus légers
      if (side < 0.4) {
        const a = rnd() * Math.PI * 2, r = glyph.width * 0.6;
        const gr = gx.createLinearGradient(glyph.width / 2 - Math.cos(a) * r, glyph.height / 2 - Math.sin(a) * r, glyph.width / 2 + Math.cos(a) * r, glyph.height / 2 + Math.sin(a) * r);
        const k = rnd.range(0.5, 0.9);
        gr.addColorStop(0, `rgba(255,255,255,${k})`); gr.addColorStop(1, 'rgba(255,255,255,1)');
        gx.globalCompositeOperation = 'destination-in'; gx.fillStyle = gr; gx.fillRect(0, 0, glyph.width, glyph.height);
      }
      cx.save();
      cx.translate(x * PX, y * PX); cx.rotate(rot);
      cx.globalAlpha = press;
      cx.drawImage(glyph, -ox, -oyB);
      if (rnd() < 0.04) { cx.globalAlpha = press * 0.35; cx.drawImage(glyph, -ox + 0.08 * PX, -oyB + 0.03 * PX); }   // double frappe
      cx.restore();
      strikes.push({ x, y, ch });
    });
  });
  // traces de carbone : trait horizontal cassé au milieu des lettres, points, bavure en bout de ligne
  cx.globalAlpha = 1;
  const xh = 0.32 * TYPE.size;                           // milieu de la hauteur d'x (mm au-dessus de la base)
  if (rnd() < 0.5 && lines.length) {
    const li = Math.floor(rnd() * lines.length), line = lines[li];
    const c0 = Math.floor(rnd() * Math.max(1, line.length - 4)), c1 = Math.min(line.length + 1, c0 + 3 + Math.floor(rnd() * 7));
    const y = y0 + li * lead - xh + g() * 0.15;
    for (let x = margin + c0 * TYPE.pitch; x < margin + c1 * TYPE.pitch; x += 0.12) {
      if (rnd() < 0.18) continue;
      cx.fillStyle = `rgba(255,255,255,${rnd.range(0.12, 0.4)})`;
      cx.fillRect(x * PX, (y + g() * 0.03) * PX, 0.14 * PX, rnd.range(0.08, 0.16) * PX);
    }
  }
  if (rnd() < 0.35 && lines.length) {                    // bavure de carbone au bout d'une ligne
    const li = Math.floor(rnd() * lines.length), y = y0 + li * lead - xh;
    let x = margin + lines[li].length * TYPE.pitch + rnd.range(0.5, 1.5);
    for (let i = 0; i < 3 + rnd() * 6; i++) {
      cx.fillStyle = `rgba(255,255,255,${rnd.range(0.1, 0.3)})`;
      const w = rnd.range(0.4, 1.6);
      cx.fillRect(x * PX, (y + g() * 0.25) * PX, w * PX, rnd.range(0.06, 0.14) * PX); x += w + rnd.range(0.2, 1.2);
    }
  }
  for (let i = 0, n = 6 + rnd() * 20; i < n; i++) {     // poussière d'encre près du texte
    const s = strikes.length ? strikes[Math.floor(rnd() * strikes.length)] : { x: CARD.w / 2, y: CARD.h / 2 };
    cx.fillStyle = `rgba(255,255,255,${rnd.range(0.08, 0.35)})`;
    const r = rnd.range(0.03, 0.09) * PX;
    cx.beginPath(); cx.arc((s.x + g() * 3) * PX, (s.y + g() * 3) * PX, r, 0, Math.PI * 2); cx.fill();
  }
  cx.restore();
  return { canvas: cv, lines, margin, text };
}

// ---------- réponse tapée sur une carte (thème libre ou verso d'une question) ----------
// Comme une machine : les mots ne bougent jamais une fois tapés (retour à la ligne quand le mot ne tient
// plus, sans rééquilibrage) ; chaque frappe garde ses défauts propres (tirés de son rang dans le texte).
// Trois lignes visibles au plus : au-delà, la ligne du haut disparaît d'un coup.
export function answerLines(text, max = TYPE.maxChars) {
  const lines = [''];
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) { lines[lines.length - 1] += ' '; continue; }
    let w = word;
    while (w.length) {
      const cur = lines[lines.length - 1];
      if (cur.length + w.length <= max) { lines[lines.length - 1] = cur + w; w = ''; }
      else if (cur.trim().length === 0 && w.length > max) { lines[lines.length - 1] = cur + w.slice(0, max - cur.length); w = w.slice(max - cur.length); lines.push(''); }
      else lines.push('');
    }
    if (lines[lines.length - 1].length > max) lines.push('');
  }
  return lines.map(l => l.replace(/^ +/, ''));
}

export function makeAnswerInk(text, seed = 1, maxLines = 3) {
  const PX = INK_PXMM, W = Math.round(CARD.w * PX), H = Math.round(CARD.h * PX);
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  const r0 = createRng(seed);
  const margin = r0.range(9, 12), lead = TYPE.lead, y0 = r0.range(13.5, 15);
  const lines = answerLines(text), first = Math.max(0, lines.length - maxLines);
  const fontPx = TYPE.size * PX;
  const glyph = new OffscreenCanvas(Math.ceil(fontPx * 1.6), Math.ceil(fontPx * 1.8)), gx = glyph.getContext('2d');
  const ox = glyph.width * 0.25, oyB = glyph.height * 0.72;
  cx.globalCompositeOperation = 'lighter';
  let idx = 0;                                          // rang du caractère dans le texte (défauts stables)
  for (let li = 0; li < first; li++) idx += lines[li].length + 1;
  for (let li = first; li < lines.length; li++) {
    const line = lines[li], base = y0 + (li - first) * lead;
    [...line].forEach((ch, ci) => {
      const r = createRng((seed * 7919 + (idx + ci) * 104729) >>> 0);
      const g = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / 0.58; };
      if (ch === ' ') return;
      const x = margin + ci * TYPE.pitch + g() * 0.06, y = base + g() * 0.09;
      const press = Math.min(1, Math.max(0.5, 0.82 + g() * 0.14)), rot = g() * 0.5 * Math.PI / 180;
      gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-over';
      gx.clearRect(0, 0, glyph.width, glyph.height);
      gx.font = `${fontPx}px "${FAMILY}"`; gx.fillStyle = '#fff'; gx.strokeStyle = '#fff';
      gx.translate(ox, oyB); gx.scale(TYPE.xScale, TYPE.yScale);
      gx.fillText(ch, 0, 0);
      gx.lineWidth = TYPE.weight * PX + (CLOG.has(ch) && r() < 0.12 ? 0.12 * PX : 0); gx.lineJoin = 'round';
      if (gx.lineWidth > 0) gx.strokeText(ch, 0, 0);
      gx.setTransform(1, 0, 0, 1, 0, 0);
      if (r() < 0.4) {
        const a = r() * Math.PI * 2, rr = glyph.width * 0.6;
        const gr = gx.createLinearGradient(glyph.width / 2 - Math.cos(a) * rr, glyph.height / 2 - Math.sin(a) * rr, glyph.width / 2 + Math.cos(a) * rr, glyph.height / 2 + Math.sin(a) * rr);
        gr.addColorStop(0, `rgba(255,255,255,${r.range(0.5, 0.9)})`); gr.addColorStop(1, 'rgba(255,255,255,1)');
        gx.globalCompositeOperation = 'destination-in'; gx.fillStyle = gr; gx.fillRect(0, 0, glyph.width, glyph.height);
      }
      cx.save(); cx.translate(x * PX, y * PX); cx.rotate(rot); cx.globalAlpha = press;
      cx.drawImage(glyph, -ox, -oyB); cx.restore();
    });
    idx += line.length + 1;
  }
  const last = lines.length - 1 - first;
  const cursor = { x: margin + lines[lines.length - 1].length * TYPE.pitch - 0.35, y: y0 + Math.max(0, last) * lead };
  return { canvas: cv, lines, cursor, hidden: first };
}

// Feuille réponse glissée sous la carte question : comme dans une machine, la ligne en cours reste toujours
// à la même hauteur (SHEET_LINE mm du haut de la feuille) et c'est la feuille qui monte d'un cran à chaque
// retour à la ligne ; les lignes passées montent et disparaissent sous la carte question.
export const SHEET_LINE = 48;   // ligne en cours : dans la bande qui dépasse sous la carte (les précédentes passent dessous)
export function makeSheetInk(text, seed = 1) {
  const PX = INK_PXMM, W = Math.round(CARD.w * PX), H = Math.round(CARD.h * PX);
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  const r0 = createRng(seed), margin = r0.range(9, 12), lead = TYPE.lead;
  const lines = answerLines(text), n = lines.length;
  const fontPx = TYPE.size * PX;
  const glyph = new OffscreenCanvas(Math.ceil(fontPx * 1.6), Math.ceil(fontPx * 1.8)), gx = glyph.getContext('2d');
  const ox = glyph.width * 0.25, oyB = glyph.height * 0.72;
  cx.globalCompositeOperation = 'lighter';
  let idx = 0;
  for (let li = 0; li < n; li++) {
    const line = lines[li], base = SHEET_LINE - (n - 1 - li) * lead;
    if (base < -4) { idx += line.length + 1; continue; }
    [...line].forEach((ch, ci) => {
      const r = createRng((seed * 7919 + (idx + ci) * 104729) >>> 0);
      const g = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / 0.58; };
      if (ch === ' ') return;
      const x = margin + ci * TYPE.pitch + g() * 0.06, y = base + g() * 0.09;
      const press = Math.min(1, Math.max(0.5, 0.82 + g() * 0.14)), rot = g() * 0.5 * Math.PI / 180;
      gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-over';
      gx.clearRect(0, 0, glyph.width, glyph.height);
      gx.font = `${fontPx}px "${FAMILY}"`; gx.fillStyle = '#fff'; gx.strokeStyle = '#fff';
      gx.translate(ox, oyB); gx.scale(TYPE.xScale, TYPE.yScale);
      gx.fillText(ch, 0, 0);
      gx.setTransform(1, 0, 0, 1, 0, 0);
      if (r() < 0.4) {
        const a = r() * Math.PI * 2, rr = glyph.width * 0.6;
        const gr = gx.createLinearGradient(glyph.width / 2 - Math.cos(a) * rr, glyph.height / 2 - Math.sin(a) * rr, glyph.width / 2 + Math.cos(a) * rr, glyph.height / 2 + Math.sin(a) * rr);
        gr.addColorStop(0, `rgba(255,255,255,${r.range(0.5, 0.9)})`); gr.addColorStop(1, 'rgba(255,255,255,1)');
        gx.globalCompositeOperation = 'destination-in'; gx.fillStyle = gr; gx.fillRect(0, 0, glyph.width, glyph.height);
      }
      cx.save(); cx.translate(x * PX, y * PX); cx.rotate(rot); cx.globalAlpha = press;
      cx.drawImage(glyph, -ox, -oyB); cx.restore();
    });
    idx += line.length + 1;
  }
  return { canvas: cv, lines, cursor: { x: margin + lines[n - 1].length * TYPE.pitch - 0.35, y: SHEET_LINE }, scroll: (n - 1) * lead };
}
