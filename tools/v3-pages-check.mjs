// Version 3 (18/10) : les pages, sans la cérémonie — le bandeau du prix, les exemples, la navigation (points, sections),
// la confirmation, le jeu. Serveur de développement (SG_VERSION=3), pas de construction.
//   node tools/v3-pages-check.mjs [pc]      → captures dans CAPDIR (défaut captures/), l'état en JSON
process.env.SG_VERSION = '3';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc';
const PORT = 5193;
const server = await createServer({ server: { port: PORT, strictPort: false, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: PC ? { width: 1280, height: 720 } : { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: !PC, isMobile: !PC });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const CAP = process.env.CAPDIR || 'captures', T = PC ? 'pc' : 'tel';
const shot = n => page.screenshot({ path: `${CAP}/v3p-${T}-${n}.png` });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };

await page.goto(base + '/?envoi=0&seed=3');
await page.waitForTimeout(6000);
if (PC) { await page.keyboard.type('LEA', { delay: 120 }); await page.keyboard.press('Enter'); }
else { await page.touchscreen.tap(195, 422); await page.keyboard.type('LEA', { delay: 120 }); await page.keyboard.press('Enter'); }
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 120000 });
await page.waitForTimeout(3500);
await shot('1-offre');
out.bandeau = await page.evaluate(() => ({
  prix: document.querySelector('.of-price')?.textContent.trim(),
  paiement: document.querySelector('.of-payline')?.textContent.trim(),
  perdue: document.querySelector('.of-lost')?.textContent.trim(),
  lien: document.querySelector('.of-lost a')?.getAttribute('href'),
  go: (() => { const r = document.querySelector('.of-bar .of-go').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  points: [...document.querySelectorAll('.of-dot')].map(d => { const r = d.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }),
}));
ok('ligne sur le paiement', /rien n’est débité maintenant/.test(out.bandeau.paiement || ''), out.bandeau.paiement);
ok('« si l’enveloppe se perd » + conditions', /se perd, je refais/.test(out.bandeau.perdue || '') && /conditions\.html/.test(out.bandeau.lien || ''), out.bandeau);
ok('RECEVOIR : cible de 44 px', out.bandeau.go.h >= 44 && out.bandeau.go.w >= 44, out.bandeau.go);
ok('points : cibles de 44 px', out.bandeau.points.length > 0 && out.bandeau.points.every(v => v >= 44), out.bandeau.points);

// la navigation : téléphone = trois points, plus de noms coupés ; ordinateur = les noms voisins
out.nav = await page.evaluate(() => ({
  narrow: document.querySelector('.nv')?.classList.contains('narrow'),
  points: [...document.querySelectorAll('.nv-dots button')].map(b => ({ nom: b.getAttribute('aria-label'), cible: Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height), on: b.classList.contains('on') })),
  voisins: [...document.querySelectorAll('.nv-l:not(.cur):not(.far)')].map(a => ({ t: a.textContent, o: getComputedStyle(a).opacity })),
}));
if (!PC) { ok('téléphone : points de navigation, un par page', out.nav.narrow && out.nav.points.length === 3 && out.nav.points.filter(p => p.on).length === 1, out.nav); ok('téléphone : noms voisins cachés (plus de « MOIS » coupé)', out.nav.voisins.every(v => +v.o === 0), out.nav.voisins); }
else ok('ordinateur : noms voisins lisibles', out.nav.voisins.some(v => +v.o >= 0.6), out.nav.voisins);

// les exemples : l'étiquette « exemple »
await page.evaluate(() => document.querySelector('.of-ex')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(2500);
out.exemple = await page.evaluate(() => [...document.querySelectorAll('.ex-tag')].map(e => e.textContent));
ok('étiquette « exemple »', out.exemple.length > 0 && out.exemple.every(t => t === 'exemple'), out.exemple);
await shot('2-exemples');
await page.evaluate(() => document.querySelector('#offre').scrollTo(0, 0));
await page.waitForTimeout(800);

// les sections ont leur adresse : #questions s'ouvre, le retour la ferme
await page.goto(base + '/?envoi=0&seed=3#questions');
await page.waitForTimeout(6000);
out.sectionOuverte = await page.evaluate(() => !!document.querySelector('.mn-au[data-x="questions"]'));
ok('#questions ouvre la page QUESTIONS', out.sectionOuverte);
await shot('3-section');
await page.goBack().catch(() => {});
await page.waitForFunction(() => !document.querySelector('.mn-au[data-x="questions"]'), null, { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(500);
out.sectionFermee = await page.evaluate(() => ({ ouverte: !!document.querySelector('.mn-au[data-x="questions"]'), hash: location.hash }));
ok('retour : la page se ferme', !out.sectionFermee.ouverte, out.sectionFermee);

// la confirmation : le paiement, le délai, une date précise → CONTACT, la référence remplie
await page.goto(base + '/?envoi=0&seed=3');
await page.waitForTimeout(2500);
await page.evaluate(async () => { const f = await import('/src/alt/fin.js'); f.finalScreen({ name: 'LEA', ref: 'LEA-abc123' }, './'); });
await page.waitForTimeout(7500);
await shot('4-confirmation');
out.confirmation = await page.evaluate(() => ({ chevauche: (() => { const a = document.querySelector('.mc-home').getBoundingClientRect(), b = document.querySelector('.mc-deck').getBoundingClientRect(); return a.bottom > b.top + 4; })(), notes: [...document.querySelectorAll('.mc-note')].map(e => e.textContent), date: !!document.querySelector('.mc-date'), h: Math.round(document.querySelector('.mc-date')?.getBoundingClientRect().height || 0) }));
ok('confirmation : ligne sur le paiement et le délai', out.confirmation.notes.length === 1 && /débité/.test(out.confirmation.notes[0]) && /semaine/.test(out.confirmation.notes[0]), out.confirmation.notes);
ok('confirmation : ACCUEIL ne touche pas le paquet', !out.confirmation.chevauche, out.confirmation);
await page.evaluate(() => document.querySelector('.mc-date').click());
await page.waitForTimeout(1500);
out.contactPrefill = await page.evaluate(() => document.querySelector('.mn-ct textarea')?.value || '');
ok('« une date précise ? » ouvre CONTACT avec la référence', /LEA-abc123/.test(out.contactPrefill), out.contactPrefill);
await shot('5-contact');

// le jeu : « ME PREVENIR »
await page.goto(base + '/jeu.html?envoi=0&seed=3');
await page.waitForTimeout(7000);
out.jeuBouton = await page.evaluate(() => [...document.querySelectorAll('.jg-sign')].map(b => b.textContent));
ok('jeu : ME PREVENIR à la place de COMMANDER', out.jeuBouton.includes('ME PREVENIR') && !out.jeuBouton.includes('COMMANDER'), out.jeuBouton);
await page.evaluate(() => [...document.querySelectorAll('.jg-sign')].find(b => b.textContent === 'ME PREVENIR')?.click());
await page.waitForTimeout(1200);
out.attente = await page.evaluate(() => ({ dialogue: !!document.querySelector('.sg-wait'), champ: document.querySelector('.sg-wait input')?.getAttribute('type'), ok: document.querySelector('.sg-wait .sg-wait-ok')?.getBoundingClientRect().height }));
ok('jeu : le panneau « me prévenir » s’ouvre', out.attente.dialogue && out.attente.champ === 'email' && out.attente.ok >= 44, out.attente);
await page.fill('.sg-wait input', 'pas-un-email');
await page.click('.sg-wait .sg-wait-ok');
await page.waitForTimeout(500);
out.attenteMsg = await page.evaluate(() => document.querySelector('.sg-wait-msg').textContent);
ok('jeu : un email invalide est refusé avec un mot', /email/.test(out.attenteMsg), out.attenteMsg);
await page.fill('.sg-wait input', 'moi@exemple.fr');
await page.click('.sg-wait .sg-wait-ok');
await page.waitForTimeout(800);
out.attenteFin = await page.evaluate(() => document.querySelector('.sg-wait-msg').textContent);
ok('jeu : « c’est noté » (essai : rien ne part)', /noté/.test(out.attenteFin), out.attenteFin);
await shot('6-jeu-attente');

// la saisie : retours à la ligne (maj + Entrée) dans le texte de la carte — voir v3-check pour la cérémonie
out.erreurs = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
