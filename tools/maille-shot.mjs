// Le gaufrage selon le maillage (?maille=) : captures du portail. node tools/maille-shot.mjs → captures/maille/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5199;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/maille', { recursive: true });
for (const m of ['0.2', '0.5', '2']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await page.goto(`http://localhost:${PORT}/?maille=${m}`);
  await page.waitForFunction(() => window.__sg && window.__sg.portal && window.__sg.portal.readyFired, null, { timeout: 120000 });
  await page.evaluate(() => window.__sg.portal.seek(14));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `captures/maille/${m}.png`, clip: { x: 20, y: 120, width: 350, height: 230 } });
  await page.close();
}
await browser.close(); await server.close();
