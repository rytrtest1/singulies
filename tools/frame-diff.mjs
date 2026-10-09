// Cherche une image isolée qui « clignote » au début des cartes (après le prénom) : l'horloge des cartes est pilotée
// image par image (1/60 s), chaque image lue en tuiles 8×16 ; un écart qui monte puis retombe aussitôt = un glitch.
// node tools/frame-diff.mjs [secondes]
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5191, SEC = +(process.argv[2] || 4), AT = process.argv[3] != null ? +process.argv[3] : -99;   // AT : images AT−2…AT+2 → captures/frame-diff/
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?portail=0&envoi=0`);
await page.waitForFunction(() => window.__sg?.renderer || window.__sg?.field, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.type('LEA', { delay: 120 }); await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForFunction(() => { const c = window.__sg.cards; return c && c.started && c.started(); }, null, { timeout: 60000 });
const { res, imgs } = await page.evaluate(([SEC, AT]) => {
  const c = window.__sg.cards, gl = c.gl;
  c.manual(true);
  const out = [], imgs = {}, GX = 8, GY = 16;
  let prev = null;
  for (let f = 0; f < SEC * 60; f++) {
    c.advance(1 / 60, 60);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const tiles = new Float32Array(GX * GY), n = new Float32Array(GX * GY);
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) { const i = (y * w + x) * 4, k = Math.floor(y * GY / h) * GX + Math.floor(x * GX / w); tiles[k] += px[i]; n[k]++; }
    for (let k = 0; k < tiles.length; k++) tiles[k] /= n[k];
    let d = 0, where = -1; if (prev) for (let k = 0; k < tiles.length; k++) { const e = Math.abs(tiles[k] - prev[k]); if (e > d) { d = e; where = k; } }
    if (Math.abs(f - AT) <= 2) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x2 = cv.getContext('2d'), im = x2.createImageData(w, h);
      for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      x2.putImageData(im, 0, 0); imgs[f] = cv.toDataURL('image/png');
    }
    out.push([f, +d.toFixed(2), where, c.scene.state().active?.anim || '-']);
    prev = tiles;
  }
  return { res: out, imgs };
}, [SEC, AT]);
if (Object.keys(imgs).length) { const fs = await import('fs'); fs.mkdirSync('captures/frame-diff', { recursive: true }); for (const [f, u] of Object.entries(imgs)) fs.writeFileSync(`captures/frame-diff/${f}.png`, Buffer.from(u.split(',')[1], 'base64')); }
// glitch : d[f] grand et d[f+1] grand aussi (aller-retour), au-dessus des voisins
for (let i = 1; i < res.length - 1; i++) { const [f, d, w, a] = res[i]; if (d > 1.5 && d > 2.5 * Math.max(res[i - 1][1], 0.3)) console.log('pic', f, d, 'tuile', w, 'suivant', res[i + 1][1], a); }
console.log(res.map(r => r[1]).join(' '));
console.log(JSON.stringify({ errs }));
await browser.close(); await server.close();
