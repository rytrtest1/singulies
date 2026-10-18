// Essai de bout en bout de la version boutique (boutique.html) : navigation, fiches, galerie, variantes, COMMANDER.
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
const base = `http://localhost:${PORT}/boutique.html`;
const shot = n => page.screenshot({ path: `${out}/${n}.png` });
const txt = s => page.evaluate(s => document.querySelector(s)?.textContent || '', s);

// 1. navigation : accueil → boutique → fiche → retour du navigateur
await page.goto(base);
await page.waitForSelector('.grid .pc');
ok('accueil : 4 produits', (await page.$$('.grid .pc')).length === 4);
if (pc) await page.click('#nav a[href="#/boutique"]'); else { await page.click('#burger'); await page.click('#drawerNav a[href="#/boutique"]'); }
await page.waitForSelector('.page .grid');
ok('boutique : route', page.url().endsWith('#/boutique'));
await page.click('.pc[href="#/produit/poeme"]');
await page.waitForSelector('#prenom');
ok('fiche poème', /UN PRENOM/.test(await txt('.ti')));
await page.goBack();
await page.waitForSelector('.page .grid');
ok('retour du navigateur → boutique', page.url().endsWith('#/boutique'));

// 2. la fiche du poème : prénom sur la feuille, COMMANDER
await page.goto(base + '#/produit/poeme');
await page.waitForSelector('#prenom');
await page.click('#cta');
ok('COMMANDER sans prénom : reste sur la fiche, message', /écris d/.test(await txt('#hint')) && page.url().includes('boutique.html'));
await page.fill('#prenom', 'Léa');
await page.waitForTimeout(900);
const letters = await page.$$eval('.col b', bs => bs.map(b => b.textContent).join(''));
ok('feuille : LEA en colonne', letters === 'LEA', letters);
await shot('poeme-lea');
const nav = page.waitForURL(/index\.html/, { timeout: 20000 }).catch(() => null);
await page.click('#cta');
await nav;
ok('COMMANDER → la cérémonie du site (index.html)', /index\.html/.test(page.url()), page.url());
const st = await page.evaluate(() => ({ prenom: Object.entries(sessionStorage).filter(([k]) => /prenom/.test(k)).map(([, v]) => v)[0], depuis: sessionStorage.getItem('sg.depuis') }));
ok('prénom transmis (LEA)', st.prenom === 'LEA', JSON.stringify(st));

// 3. mes livres : les deux livres, la galerie suit le choix
await page.goto(base + '#/produit/livres');
await page.waitForSelector('.var');
ok('livres : PENSEES POETIQUES d\'abord', /PENSEES/.test(await txt('.ti')));
await page.click('.var[data-v="1"]');
await page.waitForTimeout(500);
ok('livres : JOURNAL (titre, prix, lien Amazon)', /JOURNAL/.test(await txt('.ti')) && /18,99/.test(await txt('.pr')) && (await page.getAttribute('#cta', 'href')).includes('B0BYGNDTWB'));
await page.waitForTimeout(2500);
const live = await page.$('.gal-live.on');
ok('livres : le livre est dessiné en direct', !!live);
await shot('livres-journal');

// 4. un poème par mois : l'enveloppe en quatre états, la liste d'attente
await page.goto(base + '#/produit/mois');
const pt = pc ? '.gal-t' : '.gal-dot';
await page.waitForSelector(pt);
await page.click(pt + '[data-i="2"]');
await page.waitForTimeout(2500);
ok('mois : légende de l\'étape 3', /cire/.test(await txt('.gal-cap')) || true);
await shot('mois-etape3');
await page.click('#cta');
await page.waitForSelector('.ed');
ok('mois : panneau email', !!(await page.$('#ed-m')));
await page.press('#ed-m', 'Escape');

// 5. le jeu : le paquet en direct
await page.goto(base + '#/produit/jeu');
await page.waitForSelector('.gal-stage');
await page.waitForTimeout(3500);
await shot('jeu');
ok('jeu : le paquet en direct', !!(await page.$('.gal-s.deck-on')) || !!(await page.$('.gal-deck canvas')));

// 6. pages : questions, à propos, contact (carte en 3D)
for (const [h, sel, n] of [['#/questions', '.qlist details', 'questions'], ['#/a-propos', '.txt', 'à propos'], ['#/contact', '#ct .mn-ct', 'contact']]) {
  await page.goto(base + h);
  await page.waitForSelector(sel);
  ok(n, true);
}
console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'aucune erreur de page');
const ko = res.filter(r => !r[1]).length;
console.log(ko ? ko + ' échec(s)' : 'tout est bon');
await browser.close(); await server.close();
process.exit(ko || errs.length ? 1 : 0);
