// La vitrine au défilement (alt.html, 11/10) : on descend la page cran par cran (l'animation suit), une image par cran,
// puis on remonte d'un coup (elle rembobine). node tools/vitrine-scrub.mjs [crans] → captures/vitrine/scrub.jpg
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const STEPS = +(process.argv[2] || 18), PORT = 5191, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/scrub-dist', dir = 'captures/vitrine/scrub';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(9000);
await page.mouse.click(187, 406); await page.keyboard.type('CLEMENCE', { delay: 100 }); await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
await page.waitForTimeout(2500);
const L = await page.evaluate(() => Math.round(innerHeight * 0.42) * 3);
for (let i = 0; i <= STEPS; i++) {
  await page.evaluate(y => { const o = document.getElementById('offre'); o.style.scrollSnapType = 'none'; o.scrollTo({ top: y }); }, Math.round(L * i / STEPS));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}.png` });
}
await page.evaluate(() => document.getElementById('offre').scrollTo({ top: 0 }));
await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/retour.png` });
console.log('retour', JSON.stringify(await page.evaluate(() => window.__sg.cards.vitrine.state())));
const cols = 7, rows = Math.ceil((STEPS + 1) / cols);
execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/f%02d.png`, '-vf', `scale=200:-1,tile=${cols}x${rows}`, '-frames:v', '1', 'captures/vitrine/scrub.jpg']);
await browser.close(); server.httpServer.close();
