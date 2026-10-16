// Le premier écran (17/10) : le curseur, « aide » puis l'aide ouverte ; erreurs de la page. Version figée.
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5202, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/aide-dist', dir = 'captures/aide';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [nm, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log(nm, 'ERR', String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(nm, m.type(), m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3`);
  await page.waitForTimeout(15000); await page.screenshot({ path: `${dir}/${nm}-15.png` });
  const a = await page.$('.aide.on'); console.log(nm, 'aide', !!a);
  if (a) { await a.click(); await page.waitForTimeout(5000); await page.screenshot({ path: `${dir}/${nm}-aide.png` }); }
  await page.close();
}
await browser.close(); server.httpServer.close();
