// Respiration de la lampe : deux captures de la carte à 9 s d'écart, sans interaction ; écart moyen et planche
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { writeFileSync } from 'fs';
const server = await createServer({ server: { port: 5192, strictPort: true }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.setDefaultTimeout(240000);
await p.goto('http://localhost:5192/scene-cartes.html?prenom=LEA&seed=3');
await p.waitForFunction(() => { const s = window.__scene?.scene.state(); return s && s.writing && s.active && s.active.id != null; });
const c = await p.evaluate(() => window.__scene.scene.cardRect());
const shots = [];
for (let k = 0; k < 2; k++) { if (k) await new Promise(r => setTimeout(r, 9000)); shots.push(PNG.sync.read(await p.screenshot())); }
const x0 = Math.floor(c.left), y0 = Math.floor(c.top), w = Math.ceil(c.right - c.left), h = Math.ceil(c.bottom - c.top);
let d = 0, n = 0;
const out = new PNG({ width: w * 2 + 8, height: h });
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = ((y0 + y) * shots[0].width + x0 + x) * 4;
  d += Math.abs(shots[0].data[i] - shots[1].data[i]); n++;
  for (let k = 0; k < 2; k++) { const o = (y * out.width + x + k * (w + 8)) * 4; for (let ch = 0; ch < 3; ch++) out.data[o + ch] = Math.min(255, shots[k].data[i + ch] * 3); out.data[o + 3] = 255; }
}
writeFileSync('captures/transition/respiration.png', PNG.sync.write(out));
console.log('écart moyen par pixel (0–255) :', (d / n).toFixed(2));
await b.close(); await server.close();
