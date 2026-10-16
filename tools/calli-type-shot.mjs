// Le calligramme pendant qu'on écrit (17/10) : le halo autour des lettres du prénom. Version figée.
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5205, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/calli-dist', dir = 'captures/logo-bg';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [nm, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log(nm, 'ERR', String(e)));
  await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3`);
  await page.waitForTimeout(8000);
  await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 110 });
  await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/${nm}-tape.png` });
  await page.close();
}
await browser.close(); server.httpServer.close();
