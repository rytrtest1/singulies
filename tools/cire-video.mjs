// La cire qui se forme (17/10, verdict de la réunion : « la fin, en vidéo courte ») : rendue par le vrai moteur (la
// scène de l'enveloppe, POSTER), image par image, puis assemblée par ffmpeg.
// node tools/cire-video.mjs essai            → captures/cire/t-*.png (repérage : quand, où)
// node tools/cire-video.mjs <t0> <t1> <x> <y> <w> <h>  → public/epure/cire.mp4 + cire.jpg (dernière image)
//   (t en secondes après POSTER ; x y w h : le cadre, en px CSS d'une vue 390 × 844)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';

const A = process.argv.slice(2), PROBE = A[0] === 'essai';
const PORT = +(process.env.PORT || 5198), DPR = 2, FPS = 30;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
page.on('pageerror', e => console.error('page', e));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=bonjour%20toi&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await new Promise(r => setTimeout(r, 800));
await page.evaluate(async () => { await window.__toSheet(); });
await page.evaluate(() => { window.__at(window.__scene.sheet.timing.CURSOR_AT + 0.5); window.__scene.sheet.showOrders(); });
await page.evaluate(d => window.__scene.advance(d), 10.4 / 1.45);
await page.evaluate(() => {
  const m = window.__scene, sh = m.sheet, el = () => [...document.querySelectorAll('.sc-answer')].find(x => document.activeElement === x) || document.querySelectorAll('.sc-answer')[1];
  sh.startWriting(); m.advance(0.3);
  for (const v of ['Martin', '3 rue Haute', '', 'Paris', '75011']) {
    const a = el(); a.value = v; a.dispatchEvent(new Event('input'));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); m.advance(0.3);
  }
  document.activeElement && document.activeElement.blur();
  m.advance(1.2);
  // aucun signe ni texte d'interface dans l'image
  const st = document.createElement('style'); st.textContent = 'body > :not(canvas) { visibility: hidden !important; }'; document.head.appendChild(st);
});
await page.evaluate(() => { [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER').click(); });

if (PROBE) {
  const dir = 'captures/cire'; mkdirSync(dir, { recursive: true });
  let t = 0;
  for (let p = +(process.env.P0 || 0.3); p <= +(process.env.P1 || 6) + 0.001; p += +(process.env.PS || 0.2)) {
    await page.evaluate(d => window.__scene.advance(d), p - t); t = p;
    await page.screenshot({ path: `${dir}/t-${p.toFixed(1)}.png` });
  }
} else {
  const [t0, t1, x, y, w, h] = A.map(Number);
  const tmp = 'captures/cire/frames'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  await page.evaluate(d => window.__scene.advance(d), t0);
  const n = Math.round((t1 - t0) * FPS);
  for (let i = 0; i <= n; i++) {
    await page.screenshot({ path: `${tmp}/f-${String(i).padStart(4, '0')}.png`, clip: { x, y, width: w, height: h } });
    await page.evaluate(d => window.__scene.advance(d), 1 / FPS);
  }
  mkdirSync('public/epure', { recursive: true });
  const W = Math.round(w * DPR / 2) * 2, H = Math.round(h * DPR / 2) * 2;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${tmp}/f-%04d.png`,
    '-vf', `scale=${W}:${H},format=yuv420p`, '-c:v', 'libx264', '-profile:v', 'main', '-crf', '30', '-preset', 'veryslow', '-movflags', '+faststart', '-an', 'public/epure/cire.mp4']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${tmp}/f-${String(n).padStart(4, '0')}.png`, '-vf', `scale=${W}:${H}`, '-q:v', '4', 'public/epure/cire.jpg']);
  console.log('cire.mp4', n + 1, 'images', W + '×' + H);
}
await browser.close();
await server.close();
