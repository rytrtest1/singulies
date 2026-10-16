// Les à-coups sur le portail des prénoms (16/10) : la plus longue image et les images > 50 ms de 0 à 16 s, sans
// rien toucher (le menu paraît vers 7 s). Version figée. node tools/freeze-check.mjs [pc]
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc', PORT = 5197, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/freeze-dist';
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.addInitScript(() => {
  window.__fr = []; let last = 0;
  const f = t => { if (last) window.__fr.push([+(t / 1000).toFixed(2), +(t - last).toFixed(0)]); last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3`);
await page.waitForTimeout(16000);
const r = await page.evaluate(() => ({ long: window.__fr.filter(x => x[1] > 50), navOn: window.__sg.S.navOn, n: window.__fr.length }));
console.log(JSON.stringify(r));
await browser.close(); server.httpServer.close();
