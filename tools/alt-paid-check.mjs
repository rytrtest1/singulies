// alt.html (10/10) : payé, l'adresse et l'email déjà connus se tapent seuls à la fin. RECEVOIR → l'enveloppe (adresse)
// → PAYER (paiement d'essai, email) → la carte, la réponse, la feuille → l'enveloppe se remplit seule, part → l'email
// se tape seul dans le champ (une fois l'enveloppe disparue) → TERMINER → c'est noté.
// node tools/alt-paid-check.mjs → captures/alt-paid-*.png + l'état
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5196;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(90000);
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => page.screenshot({ path: `captures/alt-paid-${n}.png` });
const out = {};
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&paiement=faux&seed=3`);
await page.evaluate(() => { localStorage.removeItem('singulies.order'); });
await page.waitForTimeout(9000);
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 140 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(1200);
await page.click('.of-bar .of-go');                 // RECEVOIR
await page.waitForFunction(() => window.__sg.cards?.sheet?.state().env?.write);
await page.evaluate(() => window.__sg.cards.sheet.setFields({ nom: 'Martin', rue: '3 rue Haute', cplt: '', ville: 'Paris', cp: '75011' }));
await page.waitForFunction(() => document.querySelector('#offre.env-ready'));
await shot('1-adresse');
await page.click('.of-bar .of-go');                 // PAYER
await page.waitForTimeout(1200);
await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
await page.click('.of-pay-go');
out.order = await page.evaluate(() => JSON.parse(localStorage.getItem('singulies.order') || 'null'));
await page.waitForTimeout(12000); await shot('2-question');
await page.keyboard.type('la mer en hiver', { delay: 40 });
await page.keyboard.press('Enter');
// l'enveloppe : l'adresse se tape seule
await page.waitForFunction(() => { const e = window.__sg.cards?.sheet?.state().env; return e && e.write && (e.fields.rue || '').length > 3; }, null, { timeout: 120000 });
await page.waitForTimeout(400); await shot('3-adresse-seule');
await page.waitForFunction(() => window.__sg.cards?.sheet?.state().env?.posted, null, { timeout: 60000 });
out.fields = await page.evaluate(() => window.__sg.cards.sheet.state().env.fields);
await page.waitForSelector('.sc-mail', { state: 'attached', timeout: 60000 });
out.placeholderAvant = await page.evaluate(() => document.querySelector('.sc-mail').classList.contains('ready'));
await page.waitForSelector('.sc-mail.ready', { timeout: 30000 });
await page.waitForTimeout(2500); await shot('4-email');
out.email = await page.evaluate(() => document.querySelector('.sc-mail input').value);
out.bouton = await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].map(e => e.textContent + (e.classList.contains('on') ? '+' : '')).join(','));
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'TERMINER')?.click());
await page.waitForSelector('.mc h1', { timeout: 30000 }).catch(() => { out.fin = 'pas de fin'; });
await page.waitForTimeout(1500); await shot('5-fin');
out.fin = out.fin || await page.evaluate(() => document.querySelector('.mc p')?.textContent);
console.log(JSON.stringify({ ...out, errs: errs.slice(0, 8) }, null, 1));
await browser.close(); await server.close();
