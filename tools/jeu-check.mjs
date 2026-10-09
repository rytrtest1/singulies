// Le jeu (09/10, soir) : depuis le portail, le paquet se hisse et la page du jeu s'y pose ; une question ; PARTAGER (la
// question). Lien partagé (jeu?q=…) : la carte réponse, curseur seul ; PARTAGER seulement une fois écrit (la réponse
// avec la question) ; ensuite le jeu seul. node tools/jeu-check.mjs → captures/jeu/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5182;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/jeu', { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
const errs = [];
const shareOn = p => p.evaluate(() => [...document.querySelectorAll('#jeu .jeu-sign')].find(b => b.textContent === 'PARTAGER')?.classList.contains('on'));
// 1) depuis le portail : le jeu seul
let page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'captures/jeu/0-portail.png' });
await page.evaluate(() => window.__sg.portal.choose('jeu'));
await page.waitForTimeout(4500);
await page.screenshot({ path: 'captures/jeu/1-jeu.png' });
const normal = { share: await shareOn(page), ta: await page.evaluate(() => document.querySelector('#jeu .jeu-ta')?.disabled) };
await page.close();
// 2) lien partagé : répondre, puis partager
page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/jeu.html?q=5&envoi=0`);
await page.waitForSelector('#jeu.on', { timeout: 120000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: 'captures/jeu/2-partagee.png' });
const before = await shareOn(page);
await page.keyboard.type('la mer en hiver');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'captures/jeu/3-ecrite.png' });
const after = await shareOn(page);
await page.click('#jeu .jeu-sign >> text=PARTAGER'); await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
await page.waitForTimeout(2500);
await page.screenshot({ path: 'captures/jeu/4-ensuite.png' });
const end = { share: await shareOn(page), ta: await page.evaluate(() => document.querySelector('#jeu .jeu-ta')?.disabled) };
console.log(JSON.stringify({ normal, shared: { before, after, clip, end }, errs }, null, 1));
await browser.close(); await server.close();
