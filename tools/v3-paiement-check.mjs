// Version 3 (18/10, décision 7) : le paiement À LA FIN — la cérémonie jusqu'à l'adresse, POSTER ouvre le panneau (email, paiement),
// payé (ou passé, en test) l'enveloppe est scellée, l'email se tape seul, TERMINER.
//   node tools/v3-paiement-check.mjs fake     le faux formulaire (?paiement=faux), PAYER avec un email
//   node tools/v3-paiement-check.mjs passer   le panneau Stripe de test, PASSER (test)
//   node tools/v3-paiement-check.mjs carte    le panneau Stripe de test, la carte d'essai 4242… saisie dans les cadres de Stripe
// Serveur de développement (SG_VERSION=3), rendu logiciel : lent (des minutes).
process.env.SG_VERSION = '3';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const MODE = process.argv[2] || 'fake';
const server = await createServer({ server: { port: 5195, strictPort: false, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
await page.addInitScript(() => { window.__dtMax = 0.4; });
page.setDefaultTimeout(180000);
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const CAP = process.env.CAPDIR || 'captures';
const shot = n => page.screenshot({ path: `${CAP}/v3pay-${MODE}-${n}.png` });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };
const env = () => page.evaluate(() => window.__sg.cardsApi.sheet?.state().env || null);

await page.goto(`${base}/?envoi=0&seed=3&test=1${MODE === 'fake' ? '&paiement=faux' : ''}`);
await page.waitForTimeout(8000);
await page.mouse.click(195, 422);
await page.keyboard.type('LEA', { delay: 140 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('.of-bar .of-go').click());          // RECEVOIR : la cérémonie, sans payer
await page.waitForTimeout(3500);
out.panneauAvant = await page.evaluate(() => !!document.querySelector('.of-pay.on'));
ok('RECEVOIR ne demande pas de payer', !out.panneauAvant, out.panneauAvant);
out.ordre = await page.evaluate(() => JSON.parse(localStorage.getItem('v3.singulies.order') || 'null'));
ok('rien de « payé » dans le navigateur', out.ordre && !out.ordre.paid && !out.ordre.simule, out.ordre);

// la cérémonie jusqu'à l'enveloppe
await page.waitForTimeout(9000);
await page.evaluate(() => window.__sg.cardsApi.scene.pioche(window.__sg.cardsApi.now()));
await page.waitForFunction(() => [...document.querySelectorAll('.sc-pass')].some(e => /^PASSER/.test(e.textContent) && e.classList.contains('on')), null, { timeout: 90000 });
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /^PASSER/.test(e.textContent) && e.classList.contains('on'))?.click());
await page.waitForTimeout(7000);
await page.mouse.click(195, 280); await page.waitForTimeout(800);
await page.keyboard.type('la mer en hiver', { delay: 40 }); await page.waitForTimeout(1200);
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /^CONTINUER/.test(e.textContent) && e.classList.contains('on'))?.click());
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.write, null, { timeout: 400000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ prenom: 'Léa', nom: 'Martin', rue: '8 Rue de la Paix', cplt: '', ville: 'Paris', cp: '75002' }));
await page.waitForTimeout(800);
await shot('1-adresse');

// POSTER : le panneau s'ouvre, l'enveloppe n'est pas scellée
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' && e.classList.contains('on'))?.click());
await page.waitForSelector('.of-pay.on', { timeout: 30000 });
await page.waitForTimeout(2500);
out.apresPoster = await env();
ok('POSTER ouvre le paiement, l’enveloppe n’est pas scellée', out.apresPoster && !out.apresPoster.posted, out.apresPoster && out.apresPoster.posted);
out.panneau = await page.evaluate(() => ({
  adresse: (() => { const w = document.querySelector('.of-addr')?.closest('.of-pf'); return w ? w.hidden : null; })(),
  passer: !!document.querySelector('.of-pay-skip'),
  prix: document.querySelector('.of-pay-p')?.textContent,
  email: document.querySelector('.of-pay .of-pin[type=email]')?.value,
}));
ok('panneau : l’adresse n’est pas redemandée', out.panneau.adresse === true, out.panneau);
ok('panneau : PASSER (test) présent en test', out.panneau.passer === true, out.panneau);
await shot('2-panneau');

if (MODE === 'fake') {
  await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
  await page.waitForTimeout(400);
  await page.click('.of-pay-go');
} else if (MODE === 'passer') {
  await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
  await page.click('.of-pay-skip');
} else {
  // la carte d'essai de Stripe, dans ses cadres
  await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
  await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 60000 });
  await page.waitForTimeout(5000);
  await shot('2b-stripe');
  const cadre = page.frames().find(f => /elements-inner-payment|payment/.test(f.url()) && f !== page.mainFrame());
  out.cadres = page.frames().map(f => f.url().slice(0, 80));
  const num = cadre && await cadre.$('input[name="number"], input[name="cardnumber"], input[autocomplete="cc-number"]');
  if (num) { await num.fill('4242424242424242'); await (await cadre.$('input[name="expiry"], input[autocomplete="cc-exp"]')).fill('1233'); await (await cadre.$('input[name="cvc"], input[autocomplete="cc-csc"]')).fill('123'); const cp = await cadre.$('input[name="postalCode"], input[autocomplete="postal-code"]'); if (cp) await cp.fill('75002'); }
  await page.waitForTimeout(1500);
  await shot('2c-carte');
  await page.click('.of-pay-go');
}
// payé (ou passé) : le panneau se ferme et la cire se pose
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.posted, null, { timeout: 420000 });
ok('payé : l’enveloppe est scellée', true);
out.ordreApres = await page.evaluate(() => JSON.parse(localStorage.getItem('v3.singulies.order') || 'null'));
await page.waitForSelector('.sc-mail.ready', { timeout: 420000 });
await page.waitForTimeout(3500);
out.email = await page.evaluate(() => document.querySelector('.sc-mail input')?.value);
ok('l’email donné se tape seul à la fin', out.email === 'lea.martin@exemple.fr', out.email);
out.bouton = await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].map(e => e.textContent.trim()).filter(t => /TERMINER|COMMANDER/.test(t)));
ok('bouton final TERMINER', out.bouton.includes('TERMINER'), out.bouton);
await shot('3-fin');
out.erreurs = errs.filter(e => !/Failed to load resource|net::ERR/.test(e));
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
