// Le jeu (09/10, v2) : depuis le portail, le paquet se hisse et la page du jeu s'y pose ; une question ; PARTAGER ;
// « une réponse, un poème » → le champ, puis la première question est celle-là. node tools/jeu-check.mjs → captures/jeu/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5182;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/jeu', { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'captures/jeu/0-portail.png' });
await page.evaluate(() => window.__sg.portal.choose('jeu'));
for (const ms of [300, 700, 1100, 1600, 3500]) { await page.waitForTimeout(ms < 1000 ? 400 : ms === 1100 ? 400 : ms === 1600 ? 500 : 1900); await page.screenshot({ path: `captures/jeu/1-depart-${ms}.png` }); }
const st = await page.evaluate(() => ({ url: location.pathname, share: document.querySelector('#jeu .jeu-sign')?.classList.contains('on') }));
await page.click('#jeu .jeu-sign >> text=PARTAGER'); await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
// « une réponse, un poème » : la carte sous la question
const r = await page.evaluate(() => { const j = document.getElementById('jeu'); return null; });
const id = await page.evaluate(() => { const b = [...document.querySelectorAll('#jeu .jeu-sr')].find(x => x.textContent === 'une réponse, un poème'); b.click(); return true; });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'captures/jeu/2-champ.png' });
console.log(JSON.stringify({ st, clip, url: await page.evaluate(() => location.pathname), portal: await page.evaluate(() => window.__sg.S.portal), errs }));
await browser.close(); await server.close();
