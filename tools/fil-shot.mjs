// Les soulignements cousus (alt.html, 11/10) : RECEVOIR (et la description qui glisse quand on passe à l'étape suivante).
// node tools/fil-shot.mjs → captures/fil/*.png (téléphone, ×3) — version figée (l'autre session modifie les fichiers)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5193, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/fil-dist', dir = 'captures/fil';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(9000);
await page.mouse.click(195, 422); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(2600);
const bar = await page.evaluate(() => { const r = document.querySelector('.of-bar').getBoundingClientRect(); return { x: 0, y: r.top + 20, width: innerWidth, height: r.height - 20 }; });
await page.screenshot({ path: `${dir}/repos.png`, clip: bar });
await page.screenshot({ path: `${dir}/repos-pres.png`, clip: { x: 120, y: bar.y + bar.height * 0.45, width: 150, height: 40 } });
await page.screenshot({ path: `${dir}/page.png` });
await page.click('.of-vit-a[data-d="1"]');
for (const [i, ms] of [[1, 120], [2, 250], [3, 500], [4, 1600]]) { await page.waitForTimeout(ms - (i > 1 ? [0, 120, 250, 500][i - 1] : 0)); await page.screenshot({ path: `${dir}/glisse-${i}.png`, clip: bar }); }
await browser.close(); server.httpServer.close();
