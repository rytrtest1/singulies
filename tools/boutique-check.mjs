// Essai de bout en bout de la version boutique (boutique.html) : en-tête, accueil (le prénom, le prix qui paraît), menu,
// visionneuse, fiches, galerie, variantes, COMMANDER.
// node tools/boutique-check.mjs [dossier-captures] [pc]      (téléphone 390×844 par défaut)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = process.argv[2] || 'tmp/boutique-check';
const pc = process.argv[3] === 'pc';
mkdirSync(out, { recursive: true });
const PORT = 5209;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: pc ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !pc, isMobile: !pc });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const errs = [], res = [];
page.on('pageerror', e => errs.push('page: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
const ok = (n, c, d = '') => { res.push([n, !!c]); console.log((c ? 'OK  ' : 'KO  ') + n + (d ? ' — ' + d : '')); };
const base = `http://localhost:${PORT}/boutique.html?envoi=0`;
const shot = n => page.screenshot({ path: `${out}/${n}.png` });
const txt = s => page.evaluate(s => document.querySelector(s)?.textContent || '', s);
const op = s => page.evaluate(s => +getComputedStyle(document.querySelector(s)).opacity, s);

// 1. l'accueil : la feuille, le champ du prénom ; le prix et COMMANDER paraissent une fois le prénom écrit
await page.goto(base);
await page.waitForSelector('.grid .pc');
ok('accueil : 4 produits', (await page.$$('.grid .pc')).length === 4);
await page.waitForTimeout(700);
console.log('   en-tête', await txt('.hd-br'), await op('.hd-bk'), await page.evaluate(() => document.querySelector('.hd-bk').className));
ok('en-tête : ETERNEL, ≡, pas de ←', (await txt('.hd-br')) === 'ETERNEL' && !!(await page.$('.hd-mn')) && (await op('.hd-bk')) < 0.1);
ok('accueil : titre sans virgule', (await page.evaluate(() => document.querySelector('.hero-h').innerText)).replace(/\s+/g, ' ') === 'UN PRENOM UN POEME');
ok('accueil : le prix est caché avant le prénom', (await op('#hr')) < 0.1);
await page.waitForTimeout(600);
await page.fill('#hp', 'Léa');
await page.waitForTimeout(1500);
ok('accueil : LEA sur la feuille', (await page.$$eval('.col b', bs => bs.map(b => b.textContent).join(''))) === 'LEA');
ok('accueil : le prix et COMMANDER paraissent', (await op('#hr')) > 0.9 && /39/.test(await txt('.hero-pr')));
await shot('accueil-lea');

// 2. le menu : les produits, la section ; ← revient
await page.click('.hd-mn');
await page.waitForSelector('#pn.on');
ok('menu ouvert', await page.evaluate(() => document.querySelector('.hd-mn').getAttribute('aria-expanded') === 'true'));
await page.waitForTimeout(500);
await shot('menu');
await page.click('#pn a[data-id="mois"]');
await page.waitForSelector('.ti');
ok('menu → un poème par mois', page.url().endsWith('#/produit/mois') && /POEME PAR MOIS/.test(await txt('.ti')));
await page.waitForTimeout(700);
ok('← visible sur une fiche', (await op('.hd-bk')) > 0.4);
await page.click('.hd-bk');
await page.waitForSelector('.hero');
ok('← ramène à l\'accueil', page.url().endsWith('boutique.html?envoi=0#/') || /#\/$/.test(page.url()) || !page.url().includes('#/produit'));

// 3. la visionneuse : un poème de plus près, gauche / droite
await page.evaluate(() => document.querySelector('.ex').scrollIntoView());
await page.waitForTimeout(500);
await page.click('.ex button[data-i="1"]');
await page.waitForSelector('.vz.on');
ok('visionneuse : 2 / 4', /2 \/ 4/.test(await txt('.vz-c')));
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(700);
ok('visionneuse : → 3 / 4', /3 \/ 4/.test(await txt('.vz-c')));
await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(700);
ok('visionneuse : ← ← 1 / 4', /1 \/ 4/.test(await txt('.vz-c')));
await shot('visionneuse');
if (!pc) {
  const b = await page.$eval('.vz', el => { const r = el.getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2 }; });
  await page.mouse.move(b.x + 120, b.y); await page.mouse.down(); await page.mouse.move(b.x - 120, b.y, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(700);
  ok('visionneuse : glisser vers la gauche → 2 / 4', /2 \/ 4/.test(await txt('.vz-c')));
}
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
ok('visionneuse : Échap referme', !(await page.$('.vz')));

// 4. la fiche du poème : prénom sur la feuille, COMMANDER (le prénom de l'accueil est retenu : on l'efface d'abord)
await page.evaluate(() => sessionStorage.clear());
await page.goto(base + '#/produit/poeme');
await page.waitForSelector('#prenom');
await page.click('#cta');
ok('COMMANDER sans prénom : reste sur la fiche, message', /entrer d/.test(await txt('#hint')) && page.url().includes('boutique.html'));
await page.fill('#prenom', 'Léa');
await page.waitForTimeout(900);
const letters = await page.$$eval('.gal-sheet .col b', bs => bs.map(b => b.textContent).join(''));
ok('feuille : LEA en colonne', letters === 'LEA', letters);
await shot('poeme-lea');
const nav = page.waitForURL(/index\.html/, { timeout: 20000 }).catch(() => null);
await page.click('#cta');
await nav;
ok('COMMANDER → la cérémonie du site (index.html)', /index\.html/.test(page.url()), page.url());
const st = await page.evaluate(() => ({ prenom: Object.entries(sessionStorage).filter(([k]) => /prenom/.test(k)).map(([, v]) => v)[0], depuis: sessionStorage.getItem('sg.depuis') }));
ok('prénom transmis (LEA)', st.prenom === 'LEA', JSON.stringify(st));

// 5. mes livres : les deux livres, la galerie suit le choix
await page.goto(base + '#/produit/livres');
await page.waitForSelector('.var');
ok('livres : PENSEES POETIQUES d\'abord', /PENSEES/.test(await txt('.ti')));
await page.click('.var[data-v="1"]');
await page.waitForTimeout(500);
ok('livres : JOURNAL (titre, prix, lien Amazon)', /JOURNAL/.test(await txt('.ti')) && /18,99/.test(await txt('.pr')) && (await page.getAttribute('#cta', 'href')).includes('B0BYGNDTWB'));
await page.waitForTimeout(2500);
ok('livres : le livre est dessiné en direct', !!(await page.$('.gal-live.on')));
await shot('livres-journal');

// 6. un poème par mois : l'enveloppe en quatre états, la liste d'attente
await page.goto(base + '#/produit/mois');
const pt = pc ? '.gal-t' : '.gal-dot';
await page.waitForSelector(pt);
await page.click(pt + '[data-i="2"]');
await page.waitForTimeout(2500);
await shot('mois-etape3');
await page.click('#cta');
await page.waitForSelector('.dlg-b');
ok('mois : panneau email', !!(await page.$('#ed-m')));
await page.press('#ed-m', 'Escape');

// 7. le jeu : le paquet en direct
await page.goto(base + '#/produit/jeu');
await page.waitForSelector('.gal-stage');
await page.waitForTimeout(3500);
await shot('jeu');
ok('jeu : le paquet en direct', !!(await page.$('.gal-s.deck-on')) || !!(await page.$('.gal-deck canvas')));

// 8. pages : questions, à propos, contact (carte en 3D), pied : SINGULIES
for (const [h, sel, n] of [['#/questions', '.qlist details', 'questions'], ['#/a-propos', '.txt', 'à propos'], ['#/contact', '#ct .mn-ct', 'contact']]) {
  await page.goto(base + h);
  await page.waitForSelector(sel);
  ok(n, true);
}
await page.click('#ft-sig button');
await page.waitForSelector('.mn-au');
ok('SINGULIES (pied) : la page s\'ouvre', true);
console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'aucune erreur de page');
const ko = res.filter(r => !r[1]).length;
console.log(ko ? ko + ' échec(s)' : 'tout est bon');
await browser.close(); await server.close();
process.exit(ko || errs.length ? 1 : 0);
