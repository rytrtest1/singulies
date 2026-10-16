// Le livre qu'on ouvre et qu'on feuillette (16/10) : fermé, ouvert, une feuille qui tourne, ouvert ; téléphone et
// ordinateur (version figée). node tools/livre-open-shot.mjs → captures/livre-open/
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5202, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/livre-dist', dir = 'captures/livre-open';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [nm, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log('ERR', String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
  await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`);
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => { const g = document.querySelector('.lt-grab').getBoundingClientRect(); return { x: g.left + g.width / 2, y: g.top + g.height / 2 }; });
  await page.screenshot({ path: `${dir}/${nm}-0-ferme.png` });
  await page.mouse.click(r.x, r.y); await page.waitForTimeout(600); await page.screenshot({ path: `${dir}/${nm}-1-ouvre.png` });
  await page.waitForTimeout(1400); await page.screenshot({ path: `${dir}/${nm}-2-ouvert.png` });
  const r2 = await page.evaluate(() => { const g = document.querySelector('.lt-grab').getBoundingClientRect(); return { x: g.right - 40, y: g.top + g.height / 2 }; });
  await page.mouse.click(r2.x, r2.y); await page.waitForTimeout(450); await page.screenshot({ path: `${dir}/${nm}-3-tourne.png` });
  await page.waitForTimeout(1200); await page.screenshot({ path: `${dir}/${nm}-4-page.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(1800); await page.screenshot({ path: `${dir}/${nm}-5-referme.png` });
  await page.close();
}
await browser.close(); server.httpServer.close();
