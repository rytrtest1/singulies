// Les trois versions de luminosité (?lum=base|boost|lisible) côte à côte : portail, accueil (LEA), carte question.
// node tools/lum-shot.mjs → captures/lum/<mode>-<écran>.png + captures/lum/planche.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { PNG } from 'pngjs';
const PORT = 5198;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
mkdirSync('captures/lum', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const MODES = ['base', 'boost', 'lisible'], SHOTS = ['portail', 'accueil', 'carte'];
const base = `http://localhost:${PORT}`;
for (const m of MODES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => console.error(m, String(e)));
  await page.goto(`${base}/?envoi=0&lum=${m}`); await page.waitForTimeout(9000);
  await page.screenshot({ path: `captures/lum/${m}-portail.png` });
  await page.goto(`${base}/?portail=0&envoi=0&lum=${m}`); await page.waitForTimeout(3000);
  await page.mouse.click(195, 422); await page.keyboard.type('LEA'); await page.waitForTimeout(3500);
  await page.screenshot({ path: `captures/lum/${m}-accueil.png` });
  await page.goto(`${base}/scene-cartes.html?prenom=LEA&seed=3&lum=${m}`);
  await page.waitForFunction(() => { const s = window.__scene?.scene.state(); return s && s.writing && s.active && s.active.id != null; });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `captures/lum/${m}-carte.png` });
  await page.close();
}
// planche : colonnes = versions, lignes = écrans (moitié de taille)
const W = 195, H = 422, G = 6, out = new PNG({ width: 3 * W + 2 * G, height: 3 * H + 2 * G });
out.data.fill(40);
MODES.forEach((m, ci) => SHOTS.forEach((s, ri) => {
  const src = PNG.sync.read(readFileSync(`captures/lum/${m}-${s}.png`));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const si = ((y * 2) * src.width + x * 2) * 4, di = ((ri * (H + G) + y) * out.width + ci * (W + G) + x) * 4;
    for (let k = 0; k < 4; k++) out.data[di + k] = src.data[si + k];
  }
}));
writeFileSync('captures/lum/planche.png', PNG.sync.write(out));
await browser.close(); await server.close();
console.log('captures/lum/planche.png');
