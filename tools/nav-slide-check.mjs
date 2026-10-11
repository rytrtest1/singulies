// Passage d'une page à l'autre par le bandeau (12/10 : sans aperçus) — version figée. mes livres → ← → →, captures
// pendant (0,33 s) et après. node tools/nav-slide-check.mjs <dossier de sortie>
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const SP = process.argv[2] || '.', OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/nav-slide-dist', PORT = 5207;
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [tag, vp] of [['pc', { width: 1280, height: 800 }], ['tel', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: tag === 'tel' ? 2 : 1 });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/livres.html?envoi=0`);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SP}/t-${tag}-0.png` });
  console.log(tag, await page.evaluate(() => ({ main: document.querySelector('.lt').className, canvas: document.querySelector('.lt-book-c')?.className, sides: document.querySelectorAll('.nv-side').length })));
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(330); await page.screenshot({ path: `${SP}/t-${tag}-1.png` });
  await page.waitForTimeout(1600); await page.screenshot({ path: `${SP}/t-${tag}-2.png` });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(330); await page.screenshot({ path: `${SP}/t-${tag}-3.png` });
  await page.waitForTimeout(1600); await page.screenshot({ path: `${SP}/t-${tag}-4.png` });
  console.log(tag, 'erreurs', errs.slice(0, 5));
  await page.close();
}
await browser.close(); server.httpServer.close();
