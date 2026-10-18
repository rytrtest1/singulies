// Version 2 (18/10) : la cérémonie de bout en bout — « tirer une autre carte », PASSER explicites, « envoyer → », le récapitulatif
// « 39 € · payer » au POSTER, le paiement (faux formulaire), la cire, l'email, la confirmation tapée. Rendu logiciel : lent.
//   node tools/v2-ceremonie-check.mjs          le parcours complet
//   MODIF=1 node tools/v2-ceremonie-check.mjs  s'arrête sur « modifier ma réponse » depuis le récapitulatif
process.env.SG_VERSION = '2';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const server = await createServer({ server: { port: 5198, strictPort: false, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
await page.addInitScript(() => { window.__dtMax = 0.4; });
page.setDefaultTimeout(240000);
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const CAP = process.env.CAPDIR || 'captures';
const shot = n => page.screenshot({ path: `${CAP}/v2c-${n}.png` });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };
const pass = () => page.evaluate(() => [...document.querySelectorAll('.sc-pass')].filter(e => e.classList.contains('on')).map(e => e.firstChild.nodeValue));
try {
  await page.goto(`${base}/?envoi=0&seed=3&test=1&paiement=faux`);
  await page.waitForFunction(() => window.__sg && window.__sg.S.introOff === true, null, { timeout: 90000 });
  await page.mouse.click(195, 422);
  await page.keyboard.type('LEA', { delay: 140 });
  await page.evaluate(() => document.querySelector('.v2-go').click());
  await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.of-bar .of-go').click());
  await page.waitForTimeout(9000);
  await page.evaluate(() => window.__sg.cardsApi.scene.pioche(window.__sg.cardsApi.now()));
  await page.waitForFunction(() => document.querySelector('.sc-autre.on'), null, { timeout: 120000 });
  out.q1 = await page.evaluate(() => window.__sg.cardsApi.scene.state().active?.id);
  out.autreBox = await page.evaluate(() => { const r = document.querySelector('.sc-autre').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.top)]; });
  ok('« tirer une autre carte » (44 px)', out.autreBox[1] >= 44, out.autreBox);
  await shot('1-question');
  const ids = new Set([out.q1]);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('.sc-autre').click());
    await page.waitForTimeout(4500);
    await page.waitForFunction(() => document.querySelector('.sc-autre.on'), null, { timeout: 60000 });
    ids.add(await page.evaluate(() => window.__sg.cardsApi.scene.state().active?.id));
  }
  ok('tirer une autre carte, sans limite (4 cartes)', ids.size >= 3, [...ids]);
  await page.waitForFunction(() => [...document.querySelectorAll('.sc-pass')].some(e => e.classList.contains('on')), null, { timeout: 90000 });
  out.passer1 = await pass();
  ok('PASSER explicite sous la question', out.passer1.some(t => /^PASSER : CHOISIR MON THEME/.test(t)), out.passer1);
  await shot('2-passer-theme');
  await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /^PASSER/.test(e.textContent) && e.classList.contains('on'))?.click());
  await page.waitForTimeout(7000);
  out.passer2 = await pass();
  ok('PASSER explicite sur la carte blanche', out.passer2.some(t => /^PASSER : LAISSE-MOI IMPROVISER/.test(t)), out.passer2);
  await page.mouse.click(195, 280); await page.waitForTimeout(800);
  await page.keyboard.type('la mer en hiver', { delay: 40 }); await page.waitForTimeout(1500);
  out.passer3 = await pass();
  ok('un thème écrit : CONTINUER (jamais effacé)', out.passer3.includes('CONTINUER'), out.passer3);
  await shot('3-theme');
  await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /^CONTINUER/.test(e.textContent) && e.classList.contains('on'))?.click());
  await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.write, null, { timeout: 400000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ prenom: 'Léa', nom: 'Martin', rue: '8 Rue de la Paix', cplt: '', ville: 'Paris', cp: '75002' }));
  await page.waitForTimeout(800);
  out.offrir = await page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('v2.singulies.offrir') || 'null'); } catch { return null; } });
  // POSTER : le récapitulatif, pas encore le paiement ni la cire
  await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' && e.classList.contains('on'))?.click());
  await page.waitForSelector('.v2-rec');
  await page.waitForTimeout(800);
  out.recap = await page.evaluate(() => ({ nom: document.querySelector('.v2-nom')?.textContent, dd: [...document.querySelectorAll('.v2-rec dd')].map(d => d.innerText), bouton: document.querySelector('[data-m=payer]')?.textContent, payeOuvert: !!document.querySelector('.of-pay.on'), etape: document.querySelector('.v2-etapes')?.getAttribute('aria-label') }));
  ok('POSTER ouvre le récapitulatif (feuille + enveloppe), pas le paiement', out.recap.nom === 'LEA' && out.recap.dd.length >= 2 && !out.recap.payeOuvert, out.recap);
  ok('carte « 39 € · payer »', out.recap.bouton === '39 € · payer', out.recap.bouton);
  ok('l’adresse est dans le récapitulatif', out.recap.dd.some(t => /75002/.test(t)), out.recap.dd);
  ok('repère : étape 4 « paiement »', /Étape 4 sur 4/.test(out.recap.etape || ''), out.recap.etape);
  await shot('4-recap');
  if (process.env.MODIF) {
    await page.click('.v2-rec [data-m=reponse]');
    await page.waitForFunction(() => window.__sg.cardsApi.level() <= 3, null, { timeout: 120000 });
    out.modif = { niveau: await page.evaluate(() => window.__sg.cardsApi.level()), texte: await page.evaluate(() => window.__sg.cardsApi.scene.state().active?.text) };
    ok('modifier ma réponse : on revient à la carte, le texte est gardé', out.modif.niveau <= 3 && /mer en hiver/.test(out.modif.texte || ''), out.modif);
    throw new Error('fin MODIF');
  }
  await page.click('.v2-rec [data-m=payer]');
  await page.waitForSelector('.of-pay.on', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.fill('.of-pay .of-pin[type=email]', 'lea.martin@exemple.fr');
  await page.waitForTimeout(400);
  await page.click('.of-pay-go');
  await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.posted, null, { timeout: 420000 });
  ok('payé : l’enveloppe est scellée', true);
  await page.waitForSelector('.sc-mail.ready', { timeout: 420000 });
  await page.waitForTimeout(3500);
  ok('l’email donné se tape seul', (await page.evaluate(() => document.querySelector('.sc-mail input')?.value)) === 'lea.martin@exemple.fr');
  await shot('5-fin');
  await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /TERMINER/.test(e.textContent))?.click());
  await page.waitForSelector('.mc.fin .mc-suite li', { timeout: 120000 });
  await page.waitForTimeout(14000);
  out.confirmation = await page.evaluate(() => ({ ref: document.querySelector('.mc.fin .ref')?.textContent, ligne: document.querySelector('.mc.fin .mc-type')?.getAttribute('aria-label'), suite: [...document.querySelectorAll('.mc-suite li')].map(l => l.getAttribute('aria-label') || l.textContent) }));
  ok('confirmation tapée : la référence et 3 lignes sur la suite', /^réf\. LEA/.test(out.confirmation.ref || '') && /réf\. LEA/.test(out.confirmation.ligne || '') && out.confirmation.suite.length === 3 && out.confirmation.suite.every(Boolean), out.confirmation);
  await shot('6-confirmation');
} catch (e) { out.exception = String(e).slice(0, 400); await shot('x-echec').catch(() => {}); }
out.erreurs = errs.filter(e => !/Failed to load resource|net::ERR/.test(e));
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
