// Version alternative (10/10) : tout le parcours dans la page — indice UN PRENOM / UN POEME, le prénom, la feuille
// et la carte face cachée, l'offre, le paiement d'essai (pour moi / pour offrir), la suite sans changer de page.
// node tools/alt-check.mjs [moi|offrir] → captures/alt-*.png + chiffres (délai dernière lettre → prix)
import { createServer } from 'vite';
import { chromium } from 'playwright';
const FOR = process.argv[2] || 'moi';
const PORT = 5197;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => page.screenshot({ path: `captures/alt-${FOR}-${n}.png` });
const out = {};
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&seed=3`);
await page.evaluate(() => { localStorage.removeItem('singulies.order'); });
await page.waitForTimeout(6800); await shot('1-indice');
await page.waitForTimeout(4200); await shot('2-curseur');
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 160 });
await page.keyboard.press('Enter');   // (téléphone : « OK » ; sans Entrée, l'ordinateur attend 3,5 s sans frappe)
const t0 = Date.now();
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 40000 });
out.offreApres = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
await page.waitForTimeout(1500); await shot('3-feuille');
await page.evaluate(() => { const o = document.getElementById('offre'); o.scrollTop = o.scrollHeight; });
await page.waitForTimeout(800); await shot('4-bas');
await page.evaluate(() => { document.getElementById('offre').scrollTop = 0; });
await page.click('.of-bar .of-go');
await page.waitForTimeout(1200);
if (FOR === 'offrir') await page.click('[data-for="offrir"]');
await page.fill('.of-pay .of-pin[type=email]', 'essai@exemple.fr');
await shot('5-paiement');
await page.click('.of-pay-go');
if (FOR === 'offrir') {
  await page.waitForSelector('.mc-how', { timeout: 8000 }); await page.waitForTimeout(1200); await shot('6-comment');
  await page.click('[data-how="question"]');
}
await page.waitForTimeout(2500); await shot('7-merci');
await page.waitForFunction(() => window.__sg?.S && document.querySelector('.sc-hit, textarea, .sc-answer') !== null, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(6000); await shot('8-question');
out.url = page.url();
// répondre
await page.keyboard.type('la mer en hiver', { delay: 40 });
await page.keyboard.press('Enter');
await page.waitForTimeout(9000); await shot('9-feuille');
await page.waitForSelector('.mc h1', { timeout: 60000 }).catch(() => { out.fin = 'pas de fin'; });
await page.waitForTimeout(1500); await shot('10-fin');
out.fin = out.fin || await page.evaluate(() => document.querySelector('.mc p')?.textContent);
out.order = await page.evaluate(() => JSON.parse(localStorage.getItem('singulies.order') || 'null'));
console.log(JSON.stringify({ ...out, errs: errs.slice(0, 8) }, null, 1));
await browser.close(); await server.close();
