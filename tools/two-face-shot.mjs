// Carte à deux faces sur la feuille : la réponse sur une face lisse, le logo en relief de l'autre côté (09/10).
// node tools/two-face-shot.mjs → captures/deux-faces/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5195;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dir = 'captures/deux-faces'; mkdirSync(dir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=la%20mer%20en%20hiver&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.waitForTimeout(800);
await page.evaluate(async () => { await window.__toSheet(); });
const tm = await page.evaluate(() => window.__scene.sheet.timing);
for (const [k, tau] of [['a-avant', 0.6], ['b-tranche', 1.4], ['c-posee', tm.CURSOR_AT + 0.6]]) {
  await page.evaluate(t => window.__at(t), tau);
  await page.screenshot({ path: `${dir}/${k}.png` });
}
// toucher la carte posée : elle se retourne (la question, logo en relief)
const q = await page.evaluate(() => window.__scene.sheet.debug().quads.C);
if (q) {
  const x = q.reduce((s, p) => s + p[0], 0) / 4, y = q.reduce((s, p) => s + p[1], 0) / 4;
  await page.evaluate(([x, y]) => window.__scene.sheet.tap(x, y, window.__scene.now()), [x, y]);
  await page.evaluate(() => window.__scene.advance(1.5));
}
await page.screenshot({ path: `${dir}/d-retournee.png` });
console.log(JSON.stringify({ q: !!q, errs }));
await browser.close(); await server.close();
