// Une transition entre deux pages, image par image (alt.html, 11/10) : la feuille → un poème par mois (au glissé), puis
// retour (au toucher du nom). node tools/trans-shot.mjs [pc] → captures/trans/planche.jpg — version figée.
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const PC = process.argv[2] === 'pc', PORT = 5200, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/trans-dist', dir = 'captures/trans';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
// depuis la page des prénoms (sans rien écrire) : glisser vers la droite → un poème par mois
let n = 0;
const seq = async (k, ms) => { for (let i = 0; i < k; i++) { await page.screenshot({ path: `${dir}/f${String(n++).padStart(2, '0')}.png` }); await page.waitForTimeout(ms); } };
const drag = async (x0, x1) => { const y = 400; await page.mouse.move(x0, y); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 + (x1 - x0) * i / 8, y); await page.waitForTimeout(16); } await page.mouse.up(); };
await page.waitForTimeout(8000);   // (les pages voisines se préparent)
await drag(70, 330); await seq(8, 70); await page.waitForTimeout(900); await seq(1, 0);
// retour vers les prénoms, puis la feuille
await drag(330, 70); await seq(8, 70); await page.waitForTimeout(900); await seq(1, 0);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(5000);
await drag(70, 330); await seq(8, 70); await page.waitForTimeout(900); await seq(1, 0);
await drag(330, 70); await seq(8, 70); await page.waitForTimeout(900); await seq(1, 0);
execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/f%02d.png`, '-vf', `scale=${PC ? 320 : 150}:-1,tile=9x4`, '-frames:v', '1', `${dir}/planche.jpg`]);
await browser.close(); server.httpServer.close();
