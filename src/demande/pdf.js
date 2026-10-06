// La demande en PDF (A5, noir, comme le site) : une page composée sur un canvas (polices du site : EB Garamond pour
// le prénom, Courier Prime pour la frappe ; l'image de la vraie carte), puis un PDF minimal écrit à la main (une
// image JPEG pleine page) — aucune bibliothèque.
import QUESTIONS from '../cards/questions.json';

const A5 = { w: 148, h: 210 }, DPI = 300, PX = DPI / 25.4;            // px par mm
const BG = '#060606';

function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

// lignes du prénom : comme l'email (mots regroupés jusqu'à 11 caractères)
function nameLines(name) {
  const lines = [];
  for (const w of name.split(' ').filter(Boolean)) { const l = lines[lines.length - 1]; if (l && (l + ' ' + w).length <= 11) lines[lines.length - 1] = l + ' ' + w; else lines.push(w); }
  return lines;
}
// coupure de la frappe : par mots, au plus n caractères
function wrap(text, n) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let cur = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    out.push(cur);
  }
  return out;
}

export async function composePage(d, base = './') {
  await Promise.all([document.fonts.load('500 64px "SG Garamond"'), document.fonts.load('48px "SG Machine"')]).catch(() => {});
  const W = Math.round(A5.w * PX), H = Math.round(A5.h * PX);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, W, H);
  const mm = v => v * PX;
  // ---- le prénom : EB Garamond, gris du site, interlettrage 0,45 em ----
  let capMm = 7.2;
  const lines = nameLines(d.name || '');
  const em = () => mm(capMm) / 0.65;
  const lineW = l => { x.font = `500 ${em()}px "SG Garamond"`; return [...l].reduce((s, ch) => s + x.measureText(ch).width + 0.45 * em(), -0.45 * em()); };
  while (lines.length && Math.max(...lines.map(lineW)) > mm(118)) capMm *= 0.94;
  let y = mm(34);
  x.fillStyle = 'rgb(158,158,158)'; x.textBaseline = 'alphabetic';
  for (const l of lines) {
    x.font = `500 ${em()}px "SG Garamond"`;
    let px = (W - lineW(l)) / 2;
    for (const ch of l) { x.fillText(ch, px, y + mm(capMm)); px += x.measureText(ch).width + 0.45 * em(); }
    y += mm(capMm * 2.4);
  }
  y += mm(6);
  // ---- la carte : l'image de la vraie carte (question tirée, ou carte blanche) ----
  const q = d.kind === 'reponse' ? QUESTIONS.find(o => o.id === d.id)?.q : null;
  const src = q ? `${base}email/q/${d.id}.jpg` : d.kind === 'theme' ? `${base}email/q/blanche.jpg` : null;
  if (src) {
    const img = await loadImg(src);
    if (img) { const w = mm(104), h = w * img.height / img.width; x.drawImage(img, (W - w) / 2, y, w, h); y += h + mm(8); }
  }
  // ---- ce que la personne a écrit : Courier Prime, centré ----
  const fs = mm(3.9);
  x.font = `${fs}px "SG Machine"`; x.fillStyle = 'rgb(205,205,205)'; x.textAlign = 'center';
  if (d.kind === 'reponse' || d.kind === 'theme') for (const l of wrap(d.text || '', 34)) { x.fillText(l, W / 2, y + fs); y += mm(6.4); }
  // ---- l'adresse, puis le pied ----
  x.font = `${mm(3.1)}px "SG Machine"`; x.fillStyle = 'rgb(140,140,140)';
  const addr = d.address || [];
  let ya = Math.max(y + mm(12), mm(A5.h - 46) - addr.length * mm(5));
  for (const l of addr) { x.fillText(l, W / 2, ya); ya += mm(5); }
  const KIND = { reponse: 'une question du jeu', theme: 'carte blanche', improvisation: 'improvisation' };
  x.font = `500 ${mm(2.6)}px "SG Garamond"`; x.fillStyle = 'rgb(110,110,110)';
  x.letterSpacing = mm(0.5) + 'px';
  x.fillText([KIND[d.kind], d.mode === 'direct' ? 'en direct' : 'par la poste', d.date].filter(Boolean).join('  ·  '), W / 2, mm(A5.h - 18));
  x.font = `${mm(2.4)}px "SG Machine"`; x.fillStyle = 'rgb(70,70,70)'; x.letterSpacing = mm(1.2) + 'px';
  x.fillText('SINGULIES', W / 2, mm(A5.h - 11));
  return c;
}

// PDF minimal : une page A5, une image JPEG qui la couvre
export async function pagePdf(canvas) {
  const jpg = new Uint8Array(await (await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9))).arrayBuffer());
  const pw = (A5.w / 25.4 * 72).toFixed(2), ph = (A5.h / 25.4 * 72).toFixed(2);
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const add = p => { const b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); for (const b of body) add(b); add('\nendobj\n'); };
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  obj(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
  obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream']);
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  obj(5, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  const xref = len;
  add(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map(n => String(offs[n]).padStart(10, '0') + ' 00000 n \n').join('')}`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

export async function downloadPdf(d, base = './') {
  const blob = await pagePdf(await composePage(d, base));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `singulies-${(d.name || 'demande').toLowerCase().replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
