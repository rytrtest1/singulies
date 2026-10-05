// Clarté du papier / de l'encre selon la position de la lampe (respiration figée) : où la carte se délave-t-elle ?
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const server = await createServer({ server: { port: 5189, strictPort: true }, logLevel: 'error' });
await server.listen(); console.log('serveur prêt');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.setDefaultTimeout(240000);
await p.goto('http://localhost:5189/scene-cartes.html?prenom=LEA&seed=3&sway=0');
await p.waitForFunction(() => { const s = window.__scene?.scene.state(); return s && s.writing && s.active && s.active.id != null; });
console.log('scène prête');
const c = await p.evaluate(() => window.__scene.scene.cardRect());
const els = (process.argv[2] || '0').split(',').map(Number), azs = (process.argv[3] || '-1.2,-0.8,-0.4,0,0.4,0.8,1.2').split(',').map(Number);
for (const el of els) for (const az of azs) {
  await p.evaluate(([az, el]) => { const L = window.__scene.scene.look; L.breathFixAz = az; L.breathFixEl = el; }, [az, el]);
  await new Promise(r => setTimeout(r, 3500));
  const png = PNG.sync.read(await p.screenshot());
  const v = [];
  for (let y = Math.ceil(c.top) + 6; y < c.bottom - 6; y++) for (let x = Math.ceil(c.left) + 6; x < c.right - 6; x++) v.push(png.data[(y * png.width + x) * 4]);
  v.sort((a, b) => a - b);
  console.log(`hauteur ${el} orbite ${az} : papier médian ${v[v.length >> 1]}, p25 ${v[v.length >> 2]}, p75 ${v[(v.length * 3) >> 2]}, encre p99,5 ${v[Math.floor(v.length * 0.995)]}`);
}
await b.close(); await server.close();
