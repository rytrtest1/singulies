// Retour au portail : la carte dans laquelle on était entré se rembobine (depuis le champ : Échap ; depuis un lien
// sortant : page rendue par le cache, simulée ici en bloquant le lien). node tools/portal-rewind.mjs → captures/rembobine/
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5183;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.route(/amazon/, r => r.fulfill({ status: 204 }));   // 204 : la page reste
await page.goto(`http://localhost:${PORT}/?envoi=0`);
await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
await page.waitForTimeout(6500);
const out = {};
for (const [id, how] of [['poeme', 'echap'], ['livres', 'pageshow']]) {
  await page.evaluate(id => window.__sg.portal.choose(id), id);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `captures/rembobine/${id}-0-dedans.png` });
  if (how === 'echap') await page.keyboard.press('Escape');
  else await page.evaluate(() => window.__sg.portal.back());
  for (const ms of [350, 700, 1400]) { await page.waitForTimeout(ms === 350 ? 350 : ms === 700 ? 350 : 700); await page.screenshot({ path: `captures/rembobine/${id}-${ms}.png` }); }
  out[id] = await page.evaluate(() => window.__sg.portal.state());
  await page.waitForTimeout(1500);
}
console.log(JSON.stringify({ out, errs }));
await browser.close(); await server.close();
