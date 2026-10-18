// Chronomètre du parcours (18/10) : de l'ouverture à la fin de la cérémonie, combien de secondes avant chaque étape, combien de gestes.
// node tools/parcours-chrono.mjs [pc] [port]  (GPU : msedge d3d11 ; vite en marche sur le port)
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc', PORT = +(process.argv.find(a => /^\d{4}$/.test(a)) || 5195);
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const vp = PC ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
const T0 = Date.now(), marks = []; const mark = (l, extra = '') => { marks.push([((Date.now() - T0) / 1000).toFixed(1) + ' s', l + extra]); };
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`); mark('page chargée (DOM)');
await page.waitForFunction(() => window.__sg && window.__sg.S.hintT0 != null, null, { timeout: 60000 }); mark('le champ de prénoms paraît, l’intro commence');
await page.waitForFunction(() => window.__sg.S.introOff, null, { timeout: 60000 }); mark('intro finie : le curseur seul');
await page.waitForFunction(() => window.__sg.S.navOn, null, { timeout: 60000 }); mark('menu et pages sous ETERNEL');
await page.mouse.click(vp.width / 2, vp.height / 2); await page.keyboard.type('LEA', { delay: 90 }); mark('« LEA » tapé');
await page.keyboard.press('Enter'); mark('Entrée'); const tEnter = Date.now();
await page.waitForFunction(() => document.querySelector('#offre.on'), null, { timeout: 120000 }); mark('la feuille est là', ` (+${((Date.now() - tEnter) / 1000).toFixed(1)} s après Entrée)`);
await page.waitForFunction(() => document.querySelector('#offre.on.bar-on'), null, { timeout: 120000 }); mark('RECEVOIR apparaît', ` (+${((Date.now() - tEnter) / 1000).toFixed(1)} s après Entrée)`);
await page.waitForTimeout(600); const tR = Date.now();
await page.click('.of-bar .of-go'); mark('RECEVOIR touché');
if (await page.waitForSelector('.mc [data-for]', { timeout: 4000 }).catch(() => null)) { mark('question « pour moi / pour offrir »'); await page.click('.mc [data-for="moi"]'); }
await page.waitForFunction(() => window.__sg.cardsApi?.scene?.state().bf, null, { timeout: 90000 }); mark('carte vierge + paquet à l’écran', ` (+${((Date.now() - tR) / 1000).toFixed(1)} s après RECEVOIR)`);
// la suite : PASSER (j'improvise), la feuille, l'enveloppe, l'adresse, POSTER, l'email, TERMINER
await page.waitForFunction(() => document.querySelector('.sc-pass.on'), null, { timeout: 30000 }); mark('PASSER apparaît (après 3,5 s sans geste)');
const tP = Date.now(); await page.evaluate(() => document.querySelector('.sc-pass').click()); mark('PASSER touché');
await page.waitForFunction(() => window.__sg.cardsApi?.sheet, null, { timeout: 60000 }); mark('la feuille (la colonne du prénom)', ` (+${((Date.now() - tP) / 1000).toFixed(1)} s)`);
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env, null, { timeout: 120000 }); mark('l’enveloppe commence', ` (+${((Date.now() - tP) / 1000).toFixed(1)} s après PASSER)`);
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.write, null, { timeout: 120000 }); mark('on peut écrire l’adresse', ` (+${((Date.now() - tP) / 1000).toFixed(1)} s après PASSER)`);
await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ nom: 'Martin', rue: '3 rue Haute', cplt: '', ville: 'Paris', cp: '75011' })); mark('adresse écrite (par le script)');
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.canPost, null, { timeout: 30000 });
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent.includes('POSTER') && e.classList.contains('on'))?.click()); mark('POSTER touché'); const tPo = Date.now();
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.posted, null, { timeout: 60000 }); mark('enveloppe postée (cachet…)', ` (+${((Date.now() - tPo) / 1000).toFixed(1)} s)`);
await page.waitForSelector('.sc-mail.ready', { timeout: 90000 }); mark('on peut écrire l’email', ` (+${((Date.now() - tPo) / 1000).toFixed(1)} s après POSTER)`);
await page.click('.sc-mail input'); await page.keyboard.type('lea.martin@exemple.fr', { delay: 30 });
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'TERMINER')?.click()); mark('TERMINER touché');
await page.waitForSelector('.mc h1', { timeout: 30000 }).catch(() => {}); mark('écran final');
console.table(marks.map(([t, l]) => ({ t, étape: l })));
await browser.close();
