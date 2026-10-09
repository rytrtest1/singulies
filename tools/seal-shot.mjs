// Banc d'essai de l'enveloppe et du cachet (09/10) : mêmes images figées à chaque essai, pour juger avant / après.
// node tools/seal-shot.mjs [suffixe] [requête] → captures/cachet/*.png + luminances (papier de l'enveloppe, cachet)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { PNG } from 'pngjs';

const TAG = process.argv[2] || 'x', Q = process.argv[3] || '';
const PORT = 5195, SPEED = 1.45;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dir = 'captures/cachet';
mkdirSync(dir, { recursive: true });
const DPR = 3;
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=bonjour%20toi&envoi=0${Q}`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await new Promise(r => setTimeout(r, 800));
await page.evaluate(async () => { await window.__toSheet(); });
await page.evaluate(() => { window.__at(window.__scene.sheet.timing.CURSOR_AT + 0.5); window.__scene.sheet.showOrders(); });
// l'enveloppe jusqu'à l'adresse
await page.evaluate(d => window.__scene.advance(d), 10.4 / SPEED);
await page.evaluate(() => {
  const m = window.__scene, sh = m.sheet, el = () => [...document.querySelectorAll('.sc-answer')].find(x => document.activeElement === x) || document.querySelectorAll('.sc-answer')[1];
  sh.startWriting(); m.advance(0.3);
  for (const v of ['Martin', '3 rue Haute', '', 'Paris', '75011']) {
    const a = el(); a.value = v; a.dispatchEvent(new Event('input'));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); m.advance(0.3);
  }
  document.activeElement && document.activeElement.blur();
  m.advance(1.2);
});
const shots = {};
const shot = async k => { const b = await page.screenshot({ path: `${dir}/${k}-${TAG}.png` }); shots[k] = PNG.sync.read(b); };
await shot('face');
await page.evaluate(() => { [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER').click(); });
let pt = 0;
for (const [k, p] of [['entiere', 1.0], ['dos', 3.0], ['cachet', 4.9]]) {
  await page.evaluate(d => window.__scene.advance(d), p - pt); pt = p;
  await shot(k);
}
// luminances : médiane d'une zone centrale de l'enveloppe ; cachet = zone autour du centre de la pointe
const lum = (png, x, y) => { const i = (y * png.width + x) * 4; return 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]; };
const stats = (png, x0, y0, x1, y1) => {
  const a = []; for (let y = Math.round(y0 * DPR); y < y1 * DPR; y++) for (let x = Math.round(x0 * DPR); x < x1 * DPR; x++) a.push(lum(png, x, y));
  a.sort((p, q) => p - q); const q = f => Math.round(a[Math.floor(f * (a.length - 1))]);
  return { p05: q(0.05), med: q(0.5), p95: q(0.95), max: q(1) };
};
// recadrage du cachet (agrandi)
const crop = (png, cx, cy, half, out) => {
  const w = 2 * half * DPR, o = new PNG({ width: w, height: w });
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const sx = Math.round(cx * DPR - half * DPR + x), sy = Math.round(cy * DPR - half * DPR + y), i = (sy * png.width + sx) * 4, j = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) o.data[j + c] = png.data[i + c];
  }
  writeFileSync(out, PNG.sync.write(o));
};
const S = shots.cachet;
// le cachet : le point le plus clair autour du centre de l'enveloppe (sinon, le centre)
crop(S, 196, 446, 30, `${dir}/zoom-${TAG}.png`);
// vue rapprochée : la caméra s'approche (essais seulement), même lampe
await page.evaluate(() => { window.__camZoom = 0.22; window.__scene.advance(1 / 30); });
await page.screenshot({ path: `${dir}/proche-${TAG}.png`, clip: { x: 45, y: 420, width: 300, height: 300 } });
await page.evaluate(() => { window.__camZoom = 1; });
console.log(JSON.stringify({
  fond: stats(S, 5, 800, 60, 840).med,
  face: stats(shots.face, 40, 300, 350, 500),
  dos: stats(S, 60, 380, 150, 430),
  cachet: stats(S, 184, 434, 208, 458),
}));
await page.close();
await browser.close(); await server.close();
