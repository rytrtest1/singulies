// Version 2 (18/10) : l'arrivée, « continuer → », les repères, l'aperçu (pour offrir, ✕ des exemples, bande rassurante), l'aide.
// Serveur de développement (SG_VERSION=2), rendu logiciel.
//   node tools/v2-pages-check.mjs [pc]      → captures dans CAPDIR (défaut captures/), l'état en JSON
process.env.SG_VERSION = '2';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PC = process.argv[2] === 'pc';
const server = await createServer({ server: { port: 5196, strictPort: false, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const base = `http://localhost:${server.config.server.port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.CANAL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: PC ? { width: 1280, height: 720 } : { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: !PC, isMobile: !PC });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);
await page.addInitScript(() => { window.__dtMax = 0.4; });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const CAP = process.env.CAPDIR || 'captures', T = PC ? 'pc' : 'tel';
const shot = n => page.screenshot({ path: `${CAP}/v2p-${T}-${n}.png` });
const out = {};
const ok = (cle, vrai, detail) => { out[cle] = vrai ? 'ok' : 'ÉCHEC' + (detail !== undefined ? ' : ' + JSON.stringify(detail) : ''); };

try {
await page.goto(base + '/?envoi=0&seed=3');
await page.waitForTimeout(2200);
await shot('0-intro');
const t0 = Date.now();
await page.waitForFunction(() => window.__sg && window.__sg.S.introOff === true, null, { timeout: 60000 });
out.introMs = Date.now() - t0 + 2200;
await page.waitForTimeout(1500);
out.arrivee = await page.evaluate(() => ({
  note: [...document.querySelectorAll('.sg-note.on')].map(e => e.textContent).join('|'), noteOn: !!document.querySelector('.sg-note.on'),
  dim: document.documentElement.classList.contains('v2-dim'), nv: getComputedStyle(document.querySelector('.nv')).opacity,
  rep: document.querySelector('.v2-etapes')?.className, go: document.querySelector('.v2-go')?.className,
  introOff: window.__sg.S.introOff,
}));
ok('intro finie (≈ 3 s en temps réel ; plus lent ici : rendu logiciel)', out.arrivee.introOff === true, out.arrivee);
ok('« écris un prénom » tapé', out.arrivee.note === 'écris un prénom' && out.arrivee.noteOn, out.arrivee);
ok('menu visible, atténué', out.arrivee.dim && +out.arrivee.nv > 0.3 && +out.arrivee.nv < 0.8, out.arrivee);
ok('pas de « continuer → » sans lettre', !/on/.test(out.arrivee.go || ''), out.arrivee.go);
await shot('1-arrivee');

if (PC) await page.mouse.click(640, 360); else await page.touchscreen.tap(195, 422);
await page.keyboard.type('LEA', { delay: 140 });
await page.waitForTimeout(1500);
out.saisie = await page.evaluate(() => ({ go: document.querySelector('.v2-go')?.className, note: !!document.querySelector('.sg-note.on'), trans: window.__sg.S.trans, cible: (() => { const r = document.querySelector('.v2-go').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() }));
ok('« continuer → » dès la première lettre', /\bon\b/.test(out.saisie.go), out.saisie);
ok('cible de 44 px', out.saisie.cible[1] >= 44 && out.saisie.cible[0] >= 44, out.saisie.cible);
await shot('2-saisie');
await page.waitForTimeout(14000);   // pas de validation automatique, même après la pause de V3 (7,5 s)
out.apresPause = await page.evaluate(() => ({ trans: window.__sg.S.trans, phase: window.__sg.S.phase }));
ok('aucune validation automatique', out.apresPause.trans == null && out.apresPause.phase === 'input', out.apresPause);
out.refus = null;
await page.keyboard.type('é', { delay: 60 }); await page.waitForTimeout(3000);
out.refus = await page.evaluate(() => [...document.querySelectorAll('.sg-note.on')].map(e => e.textContent).join('|'));
ok('un caractère accentué est expliqué', /accent|tape/.test(out.refus || ''), out.refus);
await page.keyboard.press('Backspace');
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.v2-go').click());
await page.waitForFunction(() => document.querySelector('#offre.bar-on'), null, { timeout: 240000 });
await page.waitForTimeout(3500);
await shot('3-offre');
out.offre = await page.evaluate(() => ({
  etape: document.querySelector('.v2-etapes')?.getAttribute('aria-label'),
  cadeau: document.querySelector('.of-gift')?.textContent, cadeauH: Math.round(document.querySelector('.of-gift')?.getBoundingClientRect().height || 0),
  humain: document.querySelector('.of-human')?.textContent, perdue: document.querySelector('.of-lost')?.textContent, paiement: document.querySelector('.of-payline')?.textContent,
  go: (() => { const r = document.querySelector('.of-bar .of-go').getBoundingClientRect(); return { y: Math.round(r.top), h: Math.round(r.height) }; })(),
  q: document.querySelector('.v2-q')?.className,
}));
ok('étape 1 « prénom »', /Étape 1 sur 4/.test(out.offre.etape || ''), out.offre.etape);
ok('« pour offrir ? » sous RECEVOIR (44 px)', out.offre.cadeau === 'pour offrir ?' && out.offre.cadeauH >= 44, out.offre);
ok('bande rassurante + « aucun programme »', /La Poste|poste/i.test(out.offre.perdue || '') && /aucun programme/.test(out.offre.humain || ''), out.offre);

// pour offrir : deux cartes
await page.click('.of-gift');
await page.waitForSelector('.v2-carte #v2-quand');
await shot('4-quand');
const tot = new Date(Date.now() + 3 * 86400000), iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
await page.fill('#v2-quand', iso(tot));
await page.click('[data-a="suite"]'); await page.waitForTimeout(500);
out.urgent = await page.evaluate(() => ({ msg: document.querySelector('.v2-msg')?.textContent, ecrire: !!document.querySelector('.v2-acts .v2-btn:not(.fort):not(.discret)') }));
ok('moins de 10 jours : on propose d’écrire à l’auteur', /moins de 10 jours/.test(out.urgent.msg || '') && out.urgent.ecrire, out.urgent);
const loin = new Date(Date.now() + 40 * 86400000);
await page.fill('#v2-quand', iso(loin));
await page.click('[data-a="suite"]');
await page.waitForSelector('#v2-dela');
await page.fill('#v2-dela', 'Sami');
await page.fill('#v2-mot', 'joyeux anniversaire, tu es un poème');
await shot('5-de-la-part');
await page.click('[data-a="ok"]');
await page.waitForTimeout(900);
out.gift = await page.evaluate(() => ({ stock: JSON.parse(sessionStorage.getItem('v2.singulies.offrir') || 'null'), signe: document.querySelector('.of-gift')?.textContent, voile: !!document.querySelector('.v2-voile') }));
ok('la signature, le mot et la date sont gardés (clé v2.)', out.gift.stock && out.gift.stock.offrir && out.gift.stock.dela === 'Sami' && /poème/.test(out.gift.stock.mot) && out.gift.stock.quand === iso(loin), out.gift);
ok('le signe devient « pour offrir ✓ »', /✓/.test(out.gift.signe), out.gift.signe);

// ✕ des exemples
await page.evaluate(() => document.querySelector('.of-ex')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(1800);
out.ex = await page.evaluate(() => ({ x: !!document.querySelector('.ex-fermer'), tag: [...document.querySelectorAll('.ex-tag')].map(e => e.textContent).slice(0, 1) }));
ok('exemples : un ✕ visible', out.ex.x, out.ex);
await shot('6-exemples');
await page.click('.ex-slot.mid .ex-fermer'); await page.waitForTimeout(500);
ok('exemples : fermés par le ✕', await page.evaluate(() => getComputedStyle(document.querySelector('.of-ex')).display === 'none'));
await page.evaluate(() => document.querySelector('#offre').scrollTo(0, 0)); await page.waitForTimeout(800);

// l'aide de l'étape
await page.click('.v2-q'); await page.waitForSelector('.v2-aide summary');
out.aide = await page.evaluate(() => [...document.querySelectorAll('.v2-aide summary')].map(s => s.textContent));
ok('« ? » : les questions de l’étape', out.aide.length >= 2 && out.aide.some(t => /vraiment toi/.test(t)), out.aide);
await shot('7-aide');
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
ok('Échap ferme l’aide', await page.evaluate(() => !document.querySelector('.v2-voile')));
} catch (e) { out.exception = String(e).slice(0, 400); await shot('x-echec').catch(() => {}); }
out.erreurs = errs.filter(e => !/Failed to load resource|net::ERR/.test(e));
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
