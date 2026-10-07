// La toute fin (08/10) : sur le noir, le prénom et « je l'écris à la machine, puis il part chez toi » ; sans réseau,
// « ton enveloppe attend le réseau ». node tools/bye-shot.mjs → captures/fin/*.png
// (la fin seule : scene-cartes.html?fin=… ; aucun envoi réel)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const PORT = 5195;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dir = 'captures/fin';
mkdirSync(dir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RUNS = [
  ['tel-poste', 'fin=poste&prenom=LEA', { width: 390, height: 844 }, false],
  ['tel-long', 'fin=poste&prenom=CLEMENCE%20ROSE', { width: 390, height: 844 }, false],
  ['tel-direct', 'fin=direct&prenom=LEA', { width: 390, height: 844 }, false],
  ['tel-reseau', 'fin=poste&prenom=LEA', { width: 390, height: 844 }, true],
  ['pc-poste', 'fin=poste&prenom=CLEMENCE%20ROSE', { width: 1280, height: 800 }, false],
];
for (const [tag, q, vp, pending] of RUNS) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('page', e));
  await page.route('**/api.emailjs.com/**', r => r.abort());
  // une demande restée en attente (pas de réseau) : posée avant l'arrivée
  if (pending) await page.addInitScript(() => localStorage.setItem('singulies.pending', JSON.stringify([{ tpl: 'x', p: {} }])));
  await page.goto(`http://localhost:${PORT}/scene-cartes.html?${q}&envoi=${pending ? 1 : 0}`);
  await page.waitForFunction(() => window.__scene && window.__scene.bye, null, { timeout: 120000 });
  const t0 = Date.now(), seen = [];
  for (const at of [1200, 6500, 11500]) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    seen.push(await page.evaluate(() => window.__scene.bye.text().replace(/\n/g, ' / ')));
    await page.screenshot({ path: `${dir}/${tag}-${at}.png` });
  }
  console.log(tag, JSON.stringify(seen));
  await page.close();
}
await browser.close(); await server.close();
