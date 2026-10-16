// Le paquet après paiement (16/10) : la coupe, image par image (version figée).
// node tools/shuffle-shot.mjs → captures/shuffle/planche.jpg (+ ancien : le paquet de la scène des cartes d'avant)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const PORT = 5199, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/shuf-dist', dir = 'captures/shuffle';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3`);
await page.waitForTimeout(5000);
await page.mouse.click(195, 422); await page.keyboard.type('LEA', { delay: 90 });
await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 60000 });
await page.waitForTimeout(800);
await page.click('.of-bar .of-go'); await page.waitForTimeout(700);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().shuffling, null, { timeout: 30000 });
await page.waitForTimeout(1200);
for (let i = 0; i < 24; i++) { await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}.png` }); await page.waitForTimeout(200); }
execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/f%02d.png`, '-vf', 'crop=390:500:0:170,scale=130:-1,tile=8x3', '-frames:v', '1', `${dir}/planche.jpg`]);
// ancien : la scène des cartes d'avant (le paquet tire)
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p2.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&envoi=0`);
await p2.waitForTimeout(7000); await p2.screenshot({ path: `${dir}/ancien.png` });
await browser.close(); server.httpServer.close();
