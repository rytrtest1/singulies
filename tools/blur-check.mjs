// Prénom (09/10) : le clavier se ferme → la suite part ; retoucher le prénom dans la seconde → on corrige.
// node tools/blur-check.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const server = await createServer({ server: { port: 5183, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
for (const cas of ['dehors', 'entree', 'corrige']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:5183/?portail=0&envoi=0');
  await page.waitForTimeout(2500);
  await page.mouse.click(195, 422); await page.keyboard.type('LEA'); await page.waitForTimeout(300);
  if (cas === 'dehors') await page.mouse.click(195, 760);              // toucher ailleurs
  else await page.keyboard.press('Enter');                             // « OK » / Entrée
  if (cas === 'corrige') { await page.waitForTimeout(400); await page.mouse.click(195, 422); }
  await page.waitForTimeout(1500);
  out[cas] = await page.evaluate(() => ({ trans: window.__sg.S.trans != null, focus: document.activeElement?.id || null }));
  out[cas].errs = errs;
  await page.close();
}
console.log(JSON.stringify(out));
await browser.close(); await server.close();
