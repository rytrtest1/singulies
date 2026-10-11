// Le prénom qui dérive vers sa colonne (alt.html, 11/10) : une image toutes les 250 ms depuis Entrée, version figée.
// node tools/drift-shot.mjs [pc] → captures/drift/planche.jpg
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
const PC = process.argv[2] === 'pc', PORT = 5196, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/drift-dist', dir = 'captures/drift';
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.waitForTimeout(6000);
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('CLEMENCE', { delay: 90 });
await page.waitForTimeout(500);
await page.keyboard.press('Enter');
const N = 40;
for (let i = 0; i < N; i++) {
  await page.screenshot({ path: `${dir}/f${String(i).padStart(2, '0')}.png` });
  await page.waitForTimeout(160);
}
const info = await page.evaluate(() => ({ drift: window.__sg.S.driftT, hand: window.__sg.S.handT, col: Array.isArray(window.__sg.S.colT) }));
console.log(JSON.stringify(info));
execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/f%02d.png`, '-vf', `scale=${PC ? 360 : 160}:-1,tile=10x4`, '-frames:v', '1', `${dir}/planche.jpg`]);
await browser.close(); server.httpServer.close();
