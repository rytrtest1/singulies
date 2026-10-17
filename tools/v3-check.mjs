// Version 3 (18/10) : le parcours de réservation de bout en bout, avec les correctifs communs.
//   node tools/v3-check.mjs            → captures dans CAPDIR (défaut captures/), l'état en JSON sur la sortie
// Vérifie : C2 (aucune commande « payée / réservée » dans le navigateur après RECEVOIR, clés préfixées v3.), C5 (la ligne
// qui dit ce que la machine retire ; code postal « ABC » refusé au clic sur POSTER, puis accepté une fois corrigé ;
// propositions d'adresse), C6 (PASSER devient CONTINUER quand un thème est écrit), C3 (bouton final TERMINER).
// Rendu logiciel (SwiftShader) : lent, des minutes. La version est construite à part, dans OUTDIR.
process.env.SG_VERSION = '3';
import { build, preview } from 'vite';
import { chromium } from 'playwright';
const PORT = 5197;
const OUT = process.env.OUTDIR || 'C:/Users/maxen/AppData/Local/Temp/claude/v3-dist';
await build({ logLevel: 'error', build: { outDir: OUT, emptyOutDir: true } });
const server = await preview({ build: { outDir: OUT }, preview: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
await page.addInitScript(() => { window.__dtMax = 0.4; });
page.setDefaultTimeout(120000);
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
const CAP = process.env.CAPDIR || 'captures';
const shot = n => page.screenshot({ path: `${CAP}/v3-${n}.png` });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };
const pass = () => [...document.querySelectorAll('.sc-pass')];

await page.goto(`http://localhost:${PORT}/?envoi=0&seed=3`);
await page.waitForTimeout(8000);
await page.mouse.click(195, 422);

// C5 : la machine dit ce qu'elle retire
await page.keyboard.type('Léa7', { delay: 140 });
await page.waitForTimeout(2500);
out.noteNom = await page.evaluate(() => document.querySelector('.sg-note')?.textContent || '');
ok('C5 note du prénom', /retir|accents/.test(out.noteNom), out.noteNom);
await shot('1-note-prenom');
await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
await page.keyboard.type('LEA', { delay: 140 });
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#offre.bar-on'));
await page.waitForTimeout(1200);
await shot('1b-offre');
out.barreRecevoir = await page.evaluate(() => { const b = document.querySelector('.of-bar .of-go').getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { haut: Math.round(scrollY), sous: e && (e.className || e.tagName) }; });
await page.evaluate(() => document.querySelector('.of-bar .of-go').click());   // RECEVOIR
await page.waitForTimeout(2500);
if (await page.$('.mc [data-for]')) await page.click('.mc [data-for="moi"]');
await page.waitForTimeout(1500);

// C2 : rien de « payé / réservé » dans le navigateur, clés préfixées
const stock = await page.evaluate(() => ({ cles: Object.keys(localStorage).concat(Object.keys(sessionStorage)), order: JSON.parse(localStorage.getItem('v3.singulies.order') || 'null'), nu: localStorage.getItem('singulies.order') }));
out.stockage = stock;
ok('C2 pas de paid/reserve persisté', stock.order && !stock.order.paid && !stock.order.reserve && !stock.order.simule, stock.order);
ok('C2 clés préfixées', stock.cles.every(k => /^v3\./.test(k) || !/^singulies\./.test(k)) && stock.nu == null, stock.cles);

// la cérémonie : on pioche, on passe à la carte blanche (PASSER), on écrit un thème : PASSER devient CONTINUER (C6)
await page.waitForTimeout(9000);
await page.evaluate(() => window.__sg.cardsApi.scene.pioche(window.__sg.cardsApi.now()));
await page.waitForTimeout(6000);
const clickPasser = () => page.evaluate(() => { const p = [...document.querySelectorAll('.sc-pass')].find(e => /^PASSER/.test(e.textContent) && e.classList.contains('on')); if (p) p.click(); return !!p; });
await page.waitForFunction(() => [...document.querySelectorAll('.sc-pass')].some(e => /^PASSER/.test(e.textContent) && e.classList.contains('on')), null, { timeout: 90000 });
await clickPasser();                                        // → la carte vierge (thème libre)
await page.waitForTimeout(7000);
await page.mouse.click(195, 280);                       // la carte vierge : on la touche pour y écrire (le clavier ne s'ouvre pas seul)
await page.waitForTimeout(800);
await page.keyboard.type('la mer en hiver', { delay: 40 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => [...document.querySelectorAll('.sc-pass')].some(e => e.classList.contains('on') && /CONTINUER|PASSER/.test(e.textContent)), null, { timeout: 60000 });
out.passerLabel = await page.evaluate(() => [...document.querySelectorAll('.sc-pass.on')].map(e => e.textContent.trim()));
ok('C6 PASSER devient CONTINUER', out.passerLabel.some(t => /^CONTINUER/.test(t)), out.passerLabel);
await shot('2-continuer');
// plusieurs lignes : maj + Entrée = à la ligne ; le signe d'envoi est visible une fois la réponse écrite
await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
await page.keyboard.type('et le vent', { delay: 40 });
await page.waitForTimeout(1200);
out.texte = await page.evaluate(() => window.__sg.cardsApi.scene.state().active?.text);
ok('V3 plusieurs lignes (maj + Entrée)', /la mer en hiver\net le vent/.test(out.texte), out.texte);
out.signeEnvoi = await page.evaluate(() => [...document.querySelectorAll('.sc-sign.on')].map(e => e.getAttribute('aria-label')));
ok("V3 un signe pour continuer, en plus d’Entrée", out.passerLabel.some(t => /^CONTINUER/.test(t)), out.passerLabel);
await shot('2b-plusieurs-lignes');
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => /^CONTINUER/.test(e.textContent) && e.classList.contains('on'))?.click());

// l'enveloppe : propositions d'adresse, code postal refusé puis accepté
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.write, null, { timeout: 300000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ prenom: 'Léa', nom: 'Martin', rue: '', cplt: '', ville: 'Paris', cp: 'ABC', dela: 'Sami' }));
await page.focus('#sc-f-rue');
await page.keyboard.type('8 rue de la pa', { delay: 90 });
await page.waitForSelector('.sg-sugg.on li[role=option]', { timeout: 20000 }).catch(() => {});
out.propositions = await page.evaluate(() => [...document.querySelectorAll('.sg-sugg.on [role=option]')].map(e => e.textContent));
ok('C5 propositions d’adresse', out.propositions.length > 0, out.propositions);
await shot('3-propositions');
await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
await page.waitForTimeout(800);
out.apresChoix = await page.evaluate(() => window.__sg.cardsApi.sheet.state().env.fields);
ok('C5 le choix remplit rue, code postal, ville', /rue/i.test(out.apresChoix.rue) && /^\d{5}$/.test(out.apresChoix.cp) && out.apresChoix.ville, out.apresChoix);
// code postal faux au clic sur POSTER
await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ cp: 'ABC' }));
await page.waitForTimeout(600);
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' && e.classList.contains('on'))?.click());
await page.waitForTimeout(1500);
out.noteCp = await page.evaluate(() => [...document.querySelectorAll('.sg-note')].map(e => e.textContent).join('|'));
const refuse = await page.evaluate(() => !window.__sg.cardsApi.sheet.state().env.posted);
ok('C5 code postal ABC refusé', refuse && /code postal/.test(out.noteCp), out.noteCp);
await shot('4-code-postal');
await page.evaluate(() => window.__sg.cardsApi.sheet.setFields({ cp: '75002' }));
await page.waitForTimeout(600);
await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER' && e.classList.contains('on'))?.click());
await page.waitForFunction(() => window.__sg.cardsApi?.sheet?.state().env?.posted, null, { timeout: 300000 });
ok('C5 code postal valable accepté', true);

// la fin : TERMINER, l'email ; la demande part « réservation », l'événement seulement alors
await page.waitForSelector('.sc-mail.ready', { timeout: 400000 });
out.boutonFinal = await page.evaluate(() => [...document.querySelectorAll('.sc-pass')].map(e => e.textContent.trim()).filter(t => /TERMINER|COMMANDER/.test(t)));
ok('C3 bouton final TERMINER', out.boutonFinal.includes('TERMINER') && !out.boutonFinal.includes('COMMANDER'), out.boutonFinal);
await shot('5-email');

// décision 8 (C1) : l'historique par étape — le bouton retour du navigateur ramène à l'étape d'avant, sans rien perdre
const niveau = () => page.evaluate(() => window.__sg.cardsApi.level());
out.niveauEmail = await niveau();
out.historique = await page.evaluate(() => history.length);
await page.evaluate(() => history.back());
await page.waitForFunction(() => window.__sg.cardsApi.level() <= 5 && !document.querySelector('.sc-mail'), null, { timeout: 200000 }).catch(() => {});
out.niveauApresRetour1 = await niveau();
ok('C1 retour depuis l’email : l’enveloppe revient', out.niveauApresRetour1 <= 5 && out.niveauApresRetour1 >= 4, out.niveauApresRetour1);
out.urlApresRetour = page.url();
ok('C1 on n’a pas quitté la page (ni merci.html)', !/merci\.html/.test(out.urlApresRetour) && /localhost:5197/.test(out.urlApresRetour), out.urlApresRetour);
await page.waitForFunction(() => window.__sg.cardsApi.sheet.state().env && window.__sg.cardsApi.sheet.state().env.canPost, null, { timeout: 300000 }).catch(() => {});
out.champsConserves = await page.evaluate(() => window.__sg.cardsApi.sheet.state().env?.fields);
ok('C1 l’adresse est conservée', out.champsConserves && out.champsConserves.cp === '75002', out.champsConserves);
ok('V3 « de la part de » conservé', out.champsConserves && out.champsConserves.dela === 'Sami', out.champsConserves);
await page.evaluate(() => history.back());
await page.waitForFunction(() => window.__sg.cardsApi.level() <= 4, null, { timeout: 300000 }).catch(() => {});
out.niveauApresRetour2 = await niveau();
ok('C1 retour depuis l’enveloppe : la feuille (la carte avec la réponse)', out.niveauApresRetour2 <= 4, out.niveauApresRetour2);
await shot('6-apres-retour');
out.erreurs = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
