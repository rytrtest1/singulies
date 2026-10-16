// Le logo du fond de la page des prénoms (16/10) : téléphone et ordinateur, à quelques instants (version figée).
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5201, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/logo-dist', dir = 'captures/logo-bg';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [nm, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3${process.env.Q || ''}`);
  for (const t of [6, 12]) { await page.waitForTimeout(t === 6 ? 6000 : 6000); await page.screenshot({ path: `${dir}/${nm}-${t}.png` }); }
  await page.close();
}
await browser.close(); server.httpServer.close();
