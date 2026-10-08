// Vérifie le compteur ?fps=1 et les interrupteurs ?dpr= / ?relief=0 (portail). node tools/fps-check.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5199;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const q of ['fps=1']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/?${q}`);
  await page.waitForFunction(() => window.__sg && window.__sg.portal && window.__sg.portal.readyFired, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({ meter: [...document.body.children].find(e => e.style.zIndex === '99')?.textContent, canvas: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height) }));
  console.log(q, JSON.stringify(r), errs.slice(0, 3));
  await page.close();
}
await browser.close(); await server.close();
