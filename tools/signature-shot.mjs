// La signature d'ouverture (17/10) : quelques images de la carte balayée par la lampe, puis le début de la page. Version
// figée. node tools/signature-shot.mjs
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
const PORT = 5203, OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/sig-dist', dir = 'captures/signature';
mkdirSync(dir, { recursive: true });
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [nm, vp] of [['tel', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: nm === 'tel' ? 2 : 1 });
  page.on('pageerror', e => console.log(nm, 'ERR', String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(nm, m.type(), m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html?envoi=0&seed=3&signature=1`);
  await page.waitForFunction(() => document.querySelector('canvas.sig'), null, { timeout: 10000 });
  for (let i = 0; i < (process.env.N ? +process.env.N : 10); i++) { await page.waitForTimeout(420); await page.screenshot({ path: `${dir}/${nm}-${String(i).padStart(2, '0')}.png` }); }
  await page.close();
  execFileSync('C:/ffmpeg/ffmpeg.exe', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/${nm}-%02d.png`, '-vf', `scale=${nm === 'tel' ? 260 : 480}:-1,tile=5x2`, '-frames:v', '1', `${dir}/${nm}-planche.jpg`]);
}
await browser.close(); server.httpServer.close();
