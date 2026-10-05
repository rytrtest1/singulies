// Flaque de lumière des cartes : captures avec la flaque forcée à gauche puis à droite, luminosité par moitié
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const Q = process.argv[2] || '';
const server = await createServer({ server: { port: 5193, strictPort: true }, logLevel: 'error' });
await server.listen();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.setDefaultTimeout(240000);
await p.goto('http://localhost:5193/scene-cartes.html?prenom=LEA&seed=3' + Q);
await p.waitForFunction(() => { const s = window.__scene?.scene.state(); return s && s.writing && s.active && s.active.id != null; });
await p.evaluate(() => { const s = window.__scene.scene; window.__setB = s.setBreath; s.setBreath = () => {}; });
const out = {};
for (const [k, x] of [['gauche', -1], ['droite', 1]]) {
  await p.evaluate((x) => window.__setB(x, 0), x);
  await new Promise(r => setTimeout(r, 4000));
  const buf = await p.screenshot({ path: `captures/transition/pool-${k}.png` });
  const png = PNG.sync.read(buf), c = await p.evaluate(() => window.__scene.scene.cardRect());
  const half = (x0, x1) => { const v = []; for (let y = Math.ceil(c.top) + 4; y < c.bottom - 4; y++) for (let xx = Math.ceil(x0); xx < x1; xx++) { const i = (y * png.width + xx) * 4; v.push(png.data[i]); } v.sort((a, b) => a - b); return { papier: v[v.length >> 1], encre: v[Math.floor(v.length * 0.995)] }; };
  const mid = (c.left + c.right) / 2;
  out[k] = { gauche: half(c.left + 4, mid), droite: half(mid, c.right - 4) };
}
console.log(JSON.stringify(out));
await b.close(); await server.close();
