// La machine à écrire du site (feuille, enveloppe) : chaque caractère frappé avec ses défauts (appui, décalage,
// inclinaison, manques), tirés de son rang — un caractère ne bouge plus une fois tapé. Mêmes défauts que les cartes.
import { TYPE } from '../cards/ink.js';
import { createRng } from '../field/rng.js';

// frappe à la machine (mêmes défauts que les cartes, tirés du rang de chaque caractère) : lignes à partir de (x0, y0) mm
export function typeLines(cx, PX, lines, x0, y0, lead, seed, alpha = 1, col = '#fff', upTo = Infinity) {
  const fontPx = TYPE.size * PX;
  const glyph = new OffscreenCanvas(Math.ceil(fontPx * 1.6), Math.ceil(fontPx * 1.8)), gx = glyph.getContext('2d');
  const ox = glyph.width * 0.25, oyB = glyph.height * 0.72;
  cx.globalCompositeOperation = 'lighter';
  let idx = 0;
  lines.forEach((line, li) => {
    const base = y0 + li * lead, lx = typeof x0 === 'function' ? x0(line) : x0;
    [...line].forEach((ch, ci) => {
      if (idx + ci >= upTo) return;
      const r = createRng((seed * 7919 + (idx + ci) * 104729) >>> 0);
      const g = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / 0.58; };
      if (ch === ' ') return;
      const x = lx + ci * TYPE.pitch + g() * 0.06, y = base + g() * 0.09;
      const press = Math.min(1, Math.max(0.5, 0.82 + g() * 0.14)) * alpha, rot = g() * 0.5 * Math.PI / 180;
      gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-over';
      gx.clearRect(0, 0, glyph.width, glyph.height);
      gx.font = fontPx + 'px "SG Machine"'; gx.fillStyle = col; gx.strokeStyle = col;
      gx.translate(ox, oyB); gx.scale(TYPE.xScale, TYPE.yScale);
      gx.fillText(ch, 0, 0);
      gx.lineWidth = TYPE.weight * PX; gx.lineJoin = 'round'; gx.strokeText(ch, 0, 0);
      gx.setTransform(1, 0, 0, 1, 0, 0);
      if (r() < 0.4) {
        const a = r() * Math.PI * 2, rr = glyph.width * 0.6;
        const gr = gx.createLinearGradient(glyph.width / 2 - Math.cos(a) * rr, glyph.height / 2 - Math.sin(a) * rr, glyph.width / 2 + Math.cos(a) * rr, glyph.height / 2 + Math.sin(a) * rr);
        gr.addColorStop(0, 'rgba(255,255,255,' + r.range(0.5, 0.9) + ')'); gr.addColorStop(1, 'rgba(255,255,255,1)');
        gx.globalCompositeOperation = 'destination-in'; gx.fillStyle = gr; gx.fillRect(0, 0, glyph.width, glyph.height);
      }
      cx.save(); cx.translate(x * PX, y * PX); cx.rotate(rot); cx.globalAlpha = press;
      cx.drawImage(glyph, -ox, -oyB); cx.restore();
    });
    idx += line.length + 1;
  });
}
