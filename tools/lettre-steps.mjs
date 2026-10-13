// Un poème par mois, l'objet étape par étape (12/10) : une capture par instant de l'horloge de l'objet.
// node tools/lettre-steps.mjs <dossier> [vt,vt,…]  →  lettre-<vt>.png (390 × 844, rendu logiciel)
import { createServer } from 'vite';
import { chromium } from 'playwright';
const OUT = process.argv[2] || '.', VTS = (process.argv[3] || '0,0.8,1.6,2.6,3.6,4.6,5.6,7.6,8.4,9.2,10.4,11.8').split(',').map(Number);
const PORT = 5204;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/lettre.html?envoi=0`);
await page.waitForFunction(() => window.__lettre && document.querySelector('.lt-cv.on'));
for (const v of VTS) {
  // l'étape voulue = celle de l'instant (pour que l'horloge reste là)
  await page.evaluate(async v => { const r = await window.__lettre.live; const K = r.scene.keys, k = K.filter(x => x <= v + 1e-6).length - 1; window.__lettre.setStep(k < K.length - 1 && v > K[k] + 1e-6 ? k + 1 : k); r.scene.seek(v); }, v);
  await page.evaluate(() => new Promise(r => { window.__lettre.live.then(x => x.scene.seek(x.scene.state().vt)); requestAnimationFrame(() => requestAnimationFrame(r)); }));
  await page.evaluate(v => window.__lettre.live.then(x => x.scene.seek(v)), v);
  await page.waitForTimeout(400);
  await page.evaluate(v => window.__lettre.live.then(x => x.scene.seek(v)), v);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `${OUT}/lettre-${v}.png` });
}
console.log('ok');
await browser.close(); await server.close();
