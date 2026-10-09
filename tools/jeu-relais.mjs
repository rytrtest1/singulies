// Portail → jeu : la page du jeu prend le paquet, la carte du dessus se retourne sur la question ; retour : l'inverse.
// Deux cas : toucher tôt (la page du jeu pas encore prête) puis, après le retour, toucher de nouveau la carte du jeu
// à la souris (le portail doit répondre). node tools/jeu-relais.mjs → captures/jeu-relais/
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5184;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('captures/jeu-relais', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
const out = {};
for (const pass of ['tot', 'ensuite']) {
  if (pass === 'tot') { await page.waitForTimeout(5600); await page.evaluate(() => window.__sg.portal.choose('jeu')); }
  else {   // un vrai clic sur la carte du jeu : le portail doit répondre
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => { const r = window.__sg.portal.rect('jeu'); return [r.left + r.width / 2, r.top + r.height / 2]; });
    out.cible = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('#portal') ? 'portail' : document.elementFromPoint(x, y)?.outerHTML.slice(0, 40), r);
    await page.mouse.click(r[0], r[1]);
  }
  const t0 = Date.now();
  out[pass + '-relais'] = [];
  for (let k = 0; k < 6; k++) { out[pass + '-relais'].push(await page.evaluate(() => [window.__jeu?.scene.relaying(), Math.round(performance.now())])); await page.waitForTimeout(250); }
  for (const ms of [100, 300, 500, 800, 1300, 2200]) { await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); await page.screenshot({ path: `captures/jeu-relais/${pass}-aller-${ms}.png` }); }
  out[pass] = await page.evaluate(() => !!window.__jeu && window.__jeu.scene.state().active?.id);
  await page.waitForTimeout(1500);
  await page.click('#jeu .jeu-back');
  const t1 = Date.now();
  for (const ms of [300, 900, 2000]) { await page.waitForTimeout(Math.max(0, ms - (Date.now() - t1))); await page.screenshot({ path: `captures/jeu-relais/${pass}-retour-${ms}.png` }); }
}
console.log(JSON.stringify({ out, errs }));
await browser.close(); await server.close();
