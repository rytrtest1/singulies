// Version 1 (18/10) : le parcours de bout en bout (DOM, sans WebGL, rapide) et les pages. Serveur de développement (SG_VERSION=1).
//   node tools/v1-check.mjs [pc]      → captures dans CAPDIR (défaut captures/), l'état en JSON
process.env.SG_VERSION = '1';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc';
const server = await createServer({ server: { port: 5197, strictPort: false, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge' });
const ctx = await browser.newContext({ viewport: PC ? { width: 1280, height: 800 } : { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: !PC, isMobile: !PC });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const CAP = process.env.CAPDIR || 'captures', T = PC ? 'pc' : 'tel';
const shot = n => page.screenshot({ path: `${CAP}/v1-${T}-${n}.png`, fullPage: true });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };
const hash = () => page.evaluate(() => location.hash);
const txt = s => page.evaluate(s => document.querySelector(s)?.textContent?.trim(), s);
const cible = async s => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, s);

try {
  await page.goto(base + '/?envoi=0');
  await page.waitForSelector('#prenom');
  out.accueil = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, label: document.querySelector('label[for=prenom]')?.textContent, prix: document.querySelector('.prix-ligne')?.textContent,
    menu: [...document.querySelectorAll('.menu a')].map(a => a.textContent), menuVisible: getComputedStyle(document.querySelector('.menu')).display !== 'none', burger: getComputedStyle(document.querySelector('.menu-bouton')).display !== 'none',
    champ: !!document.querySelector('.champ'), robots: document.querySelector('meta[name=robots]')?.content, retour: document.getElementById('barre').hidden }));
  ok('titre, libellé « ton prénom », promesse avec le prix', /prénom/.test(out.accueil.h1) && out.accueil.label === 'ton prénom' && /39 €/.test(out.accueil.prix), out.accueil);
  ok('noindex', /noindex/.test(out.accueil.robots || ''), out.accueil.robots);
  ok('menu : à propos, questions, contact (pas les autres offres avant la commande)', out.accueil.menu.join('|') === 'à propos|questions|contact', out.accueil.menu);
  ok(PC ? 'ordinateur : menu visible' : 'téléphone : ☰ seul', PC ? out.accueil.menuVisible && !out.accueil.burger : !out.accueil.menuVisible && out.accueil.burger, out.accueil);
  await page.waitForTimeout(800); await shot('1-accueil');

  // le prénom : refus dit, validation par bouton ou Entrée seulement
  await page.fill('#prenom', 'Léa');
  out.aide = await txt('#prenom-aide');
  ok('les accents sont dits, et ce qui sera sur la feuille', /accents/.test(out.aide) && /LEA/.test(out.aide), out.aide);
  await page.waitForTimeout(6000);
  ok('aucune validation automatique', (await hash()) === '' || (await hash()) === '#/', await hash());
  await page.fill('#prenom', 'Anaïs-Marie 123');
  out.aide2 = await txt('#prenom-aide'); ok('signes retirés dits', /ne tape pas/.test(out.aide2), out.aide2);
  await page.fill('#prenom', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  out.aide3 = await txt('#prenom-aide'); ok('plus de 22 caractères : dit', /22/.test(out.aide3), out.aide3);
  await page.fill('#prenom', '');
  await page.click('#f-prenom button[type=submit]');
  out.vide = await txt('#prenom-err'); ok('prénom vide : message', /écris ton prénom/.test(out.vide), out.vide);
  // pour offrir : date, de la part de, un mot
  await page.fill('#prenom', 'Léa');
  await page.check('#pour-offrir', { force: true });
  ok('pour offrir : les champs paraissent', await page.evaluate(() => !document.getElementById('offrir').hidden));
  const proche = new Date(Date.now() + 3 * 86400000), iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  await page.fill('#quand', iso(proche)); await page.dispatchEvent('#quand', 'change');
  out.urgent = await txt('#quand-aide'); ok('moins de 10 jours : proposer d’écrire', /moins de 10 jours/.test(out.urgent), out.urgent);
  await page.fill('#quand', iso(new Date(Date.now() + 30 * 86400000))); await page.dispatchEvent('#quand', 'change');
  await page.fill('#dela', 'Sami'); await page.fill('#mot', 'joyeux anniversaire');
  await shot('2-offrir');
  await page.press('#prenom', 'Enter');
  await page.waitForSelector('.feuille');
  ok('l’aperçu a son adresse (#/apercu)', (await hash()) === '#/apercu', await hash());
  out.apercu = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, lettres: [...document.querySelectorAll('.feuille li span')].map(s => s.textContent).join(''), recu: document.querySelectorAll('.recu li').length,
    bouton: document.getElementById('commander')?.textContent, exemples: document.querySelectorAll('.exemples img').length, titreEx: [...document.querySelectorAll('h2')].map(h => h.textContent), faq: document.querySelectorAll('details').length,
    etapes: document.getElementById('etapes').getAttribute('aria-label'), cond: document.querySelector('a[href*=conditions]')?.getAttribute('target'), alts: [...document.querySelectorAll('.exemples img')].every(i => i.alt) }));
  ok('aperçu : le prénom en acrostiche', out.apercu.lettres === 'LEA', out.apercu.lettres);
  ok('aperçu : la liste de ce qu’on reçoit (4 lignes)', out.apercu.recu === 4, out.apercu.recu);
  ok('aperçu : « commander · 39 € »', out.apercu.bouton === 'commander · 39 €', out.apercu.bouton);
  ok('aperçu : section « exemples : d’autres prénoms » (4, avec texte alternatif)', out.apercu.exemples === 4 && out.apercu.titreEx.some(t => /exemples : d’autres prénoms/.test(t)) && out.apercu.alts, out.apercu);
  ok('aperçu : 3 questions dépliables, étape 1 sur 4', out.apercu.faq === 3 && /Étape 1 sur 4/.test(out.apercu.etapes), out.apercu);
  ok('cible « commander » ≥ 44 px', (await cible('#commander'))[1] >= 44);
  await shot('3-apercu');
  await page.click('#commander');
  await page.waitForSelector('#reponse');
  ok('la question a son adresse (#/question), étape 2', (await hash()) === '#/question' && /Étape 2/.test(await page.evaluate(() => document.getElementById('etapes').getAttribute('aria-label'))), await hash());
  // « une autre question » : sans limite
  const qs = new Set(); qs.add(await txt('.question'));
  for (let i = 0; i < 12; i++) { await page.click('#b-autre'); qs.add(await txt('.question')); }
  ok('une autre question, sans limite (12 tirages, plusieurs questions)', qs.size > 4, qs.size);
  out.libelles = await page.evaluate(() => [...document.querySelectorAll('.actions button')].map(b => b.textContent));
  ok('trois choix explicites', ['une autre question', 'je préfère choisir mon thème', 'laisse Eternel improviser'].every(t => out.libelles.includes(t)), out.libelles);
  await page.fill('#reponse', 'la mer en hiver\net toi');
  await shot('4-question');
  // improviser ne supprime rien ; revenir : le texte est là
  await page.click('#b-impro');
  await page.waitForSelector('#f-adresse');
  ok('improviser mène à l’adresse', (await hash()) === '#/adresse');
  await page.goBack(); await page.waitForSelector('#reponse');
  ok('retour du navigateur : la réponse est gardée', (await page.inputValue('#reponse')).includes('la mer en hiver'), await page.inputValue('#reponse'));
  await page.click('#b-theme');
  await page.fill('#reponse', 'le thème : la mer');
  await page.click('#f-question button[type=submit]');
  await page.waitForSelector('#f-adresse');
  // le formulaire d'adresse : erreurs, code postal
  await page.fill('#a-prenom', ''); await page.click('#f-adresse button[type=submit]');
  out.errs = await page.evaluate(() => [...document.querySelectorAll('.erreur')].map(e => e.textContent).filter(Boolean));
  ok('adresse vide : des messages, le premier champ a le focus', out.errs.length >= 4 && (await page.evaluate(() => document.activeElement.id)) === 'a-prenom', out.errs);
  await page.fill('#a-prenom', 'Léa'); await page.fill('#a-nom', 'Martin'); await page.fill('#a-rue', '8 rue de la Paix'); await page.fill('#a-cp', 'ABC'); await page.fill('#a-ville', 'Paris'); await page.fill('#a-email', 'lea@exemple.fr');
  await page.click('#f-adresse button[type=submit]');
  out.cp = await txt('#e-a-cp'); ok('code postal « ABC » refusé', /cinq chiffres/.test(out.cp), out.cp);
  await page.fill('#a-cp', '98000'); await page.click('#f-adresse button[type=submit]');
  out.cp2 = await txt('#e-a-cp'); ok('code postal hors de France refusé', /France/.test(out.cp2), out.cp2);
  ok('champs : 44 px au moins', (await cible('#a-rue'))[1] >= 44 && (await cible('#a-email'))[1] >= 44);
  await shot('5-adresse');
  await page.fill('#a-cp', '75002'); await page.click('#f-adresse button[type=submit]');
  await page.waitForSelector('#payer');
  ok('le récapitulatif a son adresse (#/paiement), étape 4', (await hash()) === '#/paiement' && /Étape 4/.test(await page.evaluate(() => document.getElementById('etapes').getAttribute('aria-label'))), await hash());
  out.recap = await page.evaluate(() => ({ dd: [...document.querySelectorAll('.recap dd')].map(d => d.innerText), bande: document.querySelector('.bande')?.textContent, bouton: document.getElementById('payer').textContent, ligne: document.querySelector('.payer-zone .doux')?.textContent, cond: !!document.querySelector('.payer-zone a[href*=conditions]') }));
  ok('récapitulatif : prénom, offert, thème, adresse, email', out.recap.dd.length >= 5 && out.recap.dd.some(t => /Sami/.test(t)) && out.recap.dd.some(t => /la mer/.test(t)) && out.recap.dd.some(t => /75002/.test(t)), out.recap.dd);
  ok('bande rassurante avant le paiement', /La Poste/.test(out.recap.bande) && /refais/.test(out.recap.bande) && /sécurisé/.test(out.recap.bande), out.recap.bande);
  ok('PayPal (aujourd’hui) : rien n’est débité, bouton « commander · 39 € », conditions près du bouton', /rien n’est débité/.test(out.recap.ligne) && out.recap.bouton === 'commander · 39 €' && out.recap.cond, out.recap);
  await shot('6-recap');
  // modifier l'adresse depuis le récapitulatif
  await page.click('.recap [data-r="adresse"]'); await page.waitForSelector('#f-adresse');
  ok('modifier : on revient à l’adresse, rien n’est perdu', (await page.inputValue('#a-rue')) === '8 rue de la Paix');
  await page.click('#f-adresse button[type=submit]'); await page.waitForSelector('#payer');
  await page.click('#payer');
  await page.waitForSelector('.ref');
  out.conf = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, ref: document.querySelector('.ref').textContent, etapes: document.querySelectorAll('.etape-suite li').length, menu: [...document.querySelectorAll('.menu a')].map(a => a.textContent), barre: document.getElementById('barre').hidden }));
  ok('confirmation : référence et 3 étapes', /^LEA-/.test(out.conf.ref) && out.conf.etapes === 3, out.conf);
  ok('après la commande : les autres offres paraissent dans le menu', out.conf.menu.includes('un poème par mois') && out.conf.menu.includes('mes livres') && out.conf.menu.includes('le jeu'), out.conf.menu);
  await shot('7-confirmation');

  // les pages
  for (const [r, sel] of [['a-propos', '.qui'], ['questions', 'details'], ['contact', '#f-contact'], ['lettre', 'form.attente'], ['livres', '.livres'], ['jeu', '#j-q']]) {
    await page.evaluate(r => { location.hash = '#/' + r; }, r); await page.waitForSelector(sel);
    out['page ' + r] = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, courant: document.querySelector('.menu a[aria-current]')?.textContent }));
    await shot('p-' + r);
  }
  out.livres = await page.evaluate(() => [...document.querySelectorAll('a[href*=amazon]')].map(a => ({ blank: a.target, rel: a.rel, label: a.getAttribute('aria-label') })));
  await page.evaluate(() => { location.hash = '#/livres'; }); await page.waitForSelector('.livres');
  out.livres = await page.evaluate(() => [...document.querySelectorAll('a[href*=amazon]')].map(a => ({ blank: a.target, label: a.getAttribute('aria-label'), texte: a.textContent })));
  ok('livres : « acheter sur Amazon ↗ », externe', out.livres.length === 2 && out.livres.every(l => l.blank === '_blank' && /nouvel onglet/.test(l.label) && /↗/.test(l.texte)), out.livres);
  await page.evaluate(() => { location.hash = '#/lettre'; }); await page.waitForSelector('form.attente');
  await page.fill('#w-lettre', 'lea@exemple.fr'); await page.click('form.attente button');
  await page.waitForFunction(() => document.querySelector('form.attente .ok')?.textContent);
  ok('un poème par mois : liste d’attente dans la page', /noté/.test(await txt('form.attente .ok')));
  await page.evaluate(() => { location.hash = '#/jeu'; }); await page.waitForSelector('form.attente');
  await page.fill('#w-jeu', 'pas un email'); await page.click('form.attente button');
  await page.waitForFunction(() => document.querySelector('form.attente .erreur')?.textContent);
  ok('jeu : « me prévenir » refuse un email faux', /email/.test(await txt('form.attente .erreur')));
  await page.evaluate(() => { location.hash = '#/contact'; }); await page.waitForSelector('#f-contact');
  await page.fill('#c-message', 'bonjour'); await page.fill('#c-email', 'lea@exemple.fr'); await page.click('#f-contact button[type=submit]');
  await page.waitForFunction(() => document.getElementById('c-ok')?.textContent);
  ok('contact : message envoyé (essai)', /reçu/.test(await txt('#c-ok')));

  // reprise : une commande commencée
  await page.evaluate(() => { sessionStorage.clear(); }); await page.goto(base + '/?envoi=0#/'); await page.waitForSelector('#prenom');
  await page.fill('#prenom', 'Sami'); await page.press('#prenom', 'Enter'); await page.waitForSelector('#commander'); await page.click('#commander'); await page.waitForSelector('#reponse');
  await page.goto(base + '/?envoi=0#/'); await page.waitForSelector('#prenom');
  out.reprise = await page.evaluate(() => ({ visible: !document.getElementById('reprise').hidden, texte: document.getElementById('reprise').textContent }));
  ok('« reprendre ta commande pour SAMI ? »', out.reprise.visible && /SAMI/.test(out.reprise.texte), out.reprise);
  await shot('8-reprise');
  // une étape sautée : retour à l'étape
  await page.goto(base + '/?envoi=0#/paiement'); await page.waitForSelector('#f-question, #f-adresse');
  ok('on ne saute pas d’étape', /question|adresse/.test(await hash()), await hash());
  // test (Stripe en mode test, passable)
  await page.evaluate(() => { sessionStorage.clear(); });
  await page.goto(base + '/?envoi=0&test=1#/'); await page.waitForSelector('#prenom');
  await page.fill('#prenom', 'Lea'); await page.press('#prenom', 'Enter'); await page.click('#commander'); await page.fill('#reponse', 'bonjour'); await page.press('#reponse', 'Control+Enter').catch(() => {});
  await page.click('#f-question button[type=submit]'); await page.waitForSelector('#f-adresse');
  await page.fill('#a-prenom', 'Léa'); await page.fill('#a-nom', 'Martin'); await page.fill('#a-rue', '8 rue de la Paix'); await page.fill('#a-cp', '75002'); await page.fill('#a-ville', 'Paris'); await page.fill('#a-email', 'lea@exemple.fr');
  await page.click('#f-adresse button[type=submit]'); await page.waitForSelector('#payer');
  out.test = await page.evaluate(() => ({ passer: !!document.getElementById('passer'), payer: document.getElementById('payer').textContent, stripe: !document.getElementById('stripe-hote').hidden }));
  ok('mode test : panneau Stripe visible et « passer (test) »', out.test.passer && /payer/.test(out.test.payer) && out.test.stripe, out.test);
  await page.waitForTimeout(2500); await shot('9-test');
  await page.click('#passer'); await page.waitForSelector('.ref');
  ok('passer (test) mène à la confirmation', /^LEA-/.test(await txt('.ref')));
} catch (e) { out.exception = String(e).slice(0, 500); await shot('x-echec').catch(() => {}); }
out.erreurs = errs.filter(e => !/Failed to load resource|net::ERR|stripe|Stripe|fetch/.test(e));
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
