// Le menu (11/10) : le signe en haut à droite, sur le champ puis sur la page de la feuille ; le portail par-dessus ;
// « me contacter » ; « un prénom, un poème » ramène à la page. node tools/menu-check.mjs [simple]
// → captures/menu-*.png + état (signe visible, menu ouvert, page revenue)
import { createServer } from 'vite';
import { chromium } from 'playwright';
const SIMPLE = process.argv[2] === 'simple';
const PORT = 5198;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const tag = SIMPLE ? 'simple-' : '';
const shot = n => page.screenshot({ path: `captures/menu-${tag}${n}.png` });
const out = {};
const signOn = () => page.evaluate(() => document.querySelector('.mn-sign')?.classList.contains('on'));
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&seed=3${SIMPLE ? '&simple=1' : ''}`);
await page.waitForTimeout(11000);
out.signeChamp = await signOn();
await page.click('.mn-sign'); await page.waitForTimeout(1600); await shot('1-champ-menu');
out.menuOuvert = await page.evaluate(() => document.querySelector('.mn-chrome')?.classList.contains('on'));
// « un prénom, un poème » : on revient sur la page
await page.click(SIMPLE ? '.sp-portal .sp-btn' : '#portal button');
await page.waitForTimeout(900);
out.retourPoeme = await page.evaluate(() => !document.querySelector('.mn-chrome')?.classList.contains('on') && !window.__sg.S.portal);
// le prénom, puis la page de la feuille
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 160 });
out.signePendantFrappe = await signOn();
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 60000 }).catch(() => { out.offre = 'pas atteinte'; });
await page.waitForTimeout(1500);
out.signeFeuille = await signOn();
await shot('2-feuille');
await page.click('.mn-sign'); await page.waitForTimeout(1600); await shot('3-feuille-menu');
await page.click('.mn-contact'); await page.waitForTimeout(900);
await page.fill('.mn-ct textarea', 'bonjour, une question sur le poème');
await shot('4-contact');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
out.fermeAuClavier = await page.evaluate(() => !document.querySelector('.mn-chrome')?.classList.contains('on'));
await shot('5-feuille-revenue');
out.erreurs = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
