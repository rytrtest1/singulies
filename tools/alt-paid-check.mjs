// alt.html (10/10) : RECEVOIR → le paiement (d'essai : email, adresse) → la carte, la réponse, la feuille → l'enveloppe se
// remplit seule (l'adresse du paiement), part → l'email se tape seul (une fois l'enveloppe disparue) → TERMINER → c'est noté.
// reserve : RECEVOIR → la cérémonie tout de suite → on écrit l'adresse sur l'enveloppe → POSTER → l'email → TERMINER.
// node tools/alt-paid-check.mjs [reserve] → captures/alt-paid-*.png + l'état
// reserve : la réservation sans paiement (RESERVATION, config.js) : RÉSERVER au lieu de PAYER, l'email tapé à la fin
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const PORT = 5196;
const OUT = 'C:/Users/maxen/AppData/Local/Temp/claude/paid-dist';   // une version figée (l'autre session modifie les fichiers)
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(90000);
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const shot = n => page.screenshot({ path: `captures/alt-paid-${n}.png` });
const out = {};
const RES = process.argv[2] === 'reserve';
await page.goto(`http://localhost:${PORT}/alt.html?envoi=0&seed=3${RES ? '' : '&paiement=faux'}`);
await page.evaluate(() => { localStorage.removeItem('singulies.order'); });
await page.waitForTimeout(9000);
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 140 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(1200);
out.barre = await page.evaluate(() => document.querySelector('.of-bar .of-go').textContent + ' / ' + document.querySelector('.of-price').textContent);
await page.click('.of-bar .of-go');                 // RECEVOIR : directement le paiement (ou la réservation)
await page.waitForTimeout(1500);
if (!RES) {
  await shot('1-paiement');
  await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
  const ins = await page.$$('.of-pay .of-addr input');
  for (const [i, v] of ['Léa Martin', '3 rue Haute', '75011', 'Paris'].entries()) await ins[i].fill(v);
  await page.click('.of-pay-go');
}
out.order = await page.evaluate(() => JSON.parse(localStorage.getItem('singulies.order') || 'null'));
await page.waitForTimeout(12000); await shot('2-question');
await page.keyboard.type('la mer en hiver', { delay: 40 });
await page.keyboard.press('Enter');
// l'enveloppe : l'adresse se tape seule (paiement) ; réservation : on l'y écrit, puis POSTER
await page.waitForFunction(() => window.__sg.cards?.sheet?.state().env?.write, null, { timeout: 120000 });
if (RES) {
  await page.evaluate(() => window.__sg.cards.sheet.setFields({ nom: 'Martin', rue: '3 rue Haute', cplt: '', ville: 'Paris', cp: '75011' }));
  await page.waitForTimeout(800); await shot('3-adresse-ecrite');
  await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' && e.classList.contains('on'))?.click());
} else {
  await page.waitForFunction(() => (window.__sg.cards?.sheet?.state().env?.fields.rue || '').length > 3, null, { timeout: 60000 });
  await page.waitForTimeout(400); await shot('3-adresse-seule');
}
await page.waitForFunction(() => window.__sg.cards?.sheet?.state().env?.posted, null, { timeout: 60000 });
out.fields = await page.evaluate(() => window.__sg.cards.sheet.state().env.fields);
await page.waitForSelector('.sc-mail', { state: 'attached', timeout: 60000 });
out.placeholderAvant = await page.evaluate(() => document.querySelector('.sc-mail').classList.contains('ready'));
await page.waitForSelector('.sc-mail.ready', { timeout: 30000 });
await page.waitForTimeout(2500); await shot('4-email');
if (RES) { await page.click('.sc-mail input'); await page.keyboard.type('lea.martin@exemple.fr', { delay: 30 }); await page.waitForTimeout(600); }
out.email = await page.evaluate(() => document.querySelector('.sc-mail input').value);
if (RES) out.demande = await page.evaluate(async o => { const m = await import('/src/app/send.js'); const p = m.params({ name: 'LEA', kind: 'theme', text: 'x', address: ['Lea Martin'], email: 'lea.martin@exemple.fr', order: o }); return { mode: p.mode, contact: p.contact_html }; }, out.order).catch(() => '(src/app/send.js : pas dans la version compilée)');
out.bouton = await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].map(e => e.textContent + (e.classList.contains('on') ? '+' : '')).join(','));
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'TERMINER')?.click());
await page.waitForSelector('.mc h1', { timeout: 30000 }).catch(() => { out.fin = 'pas de fin'; });
await page.waitForTimeout(1500); await shot('5-fin');
out.fin = out.fin || await page.evaluate(() => document.querySelector('.mc p')?.textContent);
console.log(JSON.stringify({ ...out, errs: errs.slice(0, 8) }, null, 1));
await browser.close(); server.httpServer.close();
