// Tests de saisie de bout en bout : Vite (port 5198) + Playwright Chromium headless.
import { createServer } from 'vite';
import { chromium } from 'playwright';

const PORT = 5198;
const BASE = `http://localhost:${PORT}/`;
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open({ query = '', init, viewport = { width: 1280, height: 800 }, waitAtlas = true } = {}) {
  const context = await browser.newContext({ viewport });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.hosts = new Set(); page.errors = [];
  page.on('request', (r) => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) page.hosts.add(u.hostname); } catch {} });
  page.on('pageerror', (e) => page.errors.push(String(e)));
  await page.goto(BASE + query);
  await page.waitForFunction(waitAtlas ? () => window.__sg && window.__sg.atlas : () => window.__sg, null, { timeout: 30000 });
  if (!waitAtlas) await sleep(1500);
  await page.focus('#in');
  return { context, page };
}
const st = (page) => page.evaluate(() => ({ text: window.__sg.model.text, val: document.getElementById('in').value, a: window.__sg.model.selStart, b: window.__sg.model.selEnd, phase: window.__sg.S.phase }));

async function run(name, fn, opts) {
  let ctx;
  try {
    ctx = await open(opts);
    const r = await fn(ctx.page, ctx.context);
    for (const [label, exp, got] of r) {
      const ok = JSON.stringify(exp) === JSON.stringify(got);
      results.push({ cas: `${name} / ${label}`, attendu: exp, obtenu: got, ok });
    }
  } catch (e) {
    results.push({ cas: name, attendu: 'sans exception', obtenu: String(e).split('\n')[0], ok: false });
  } finally { await ctx?.context.close(); }
}
const same = (label, exp, got) => [label, exp, got];

await run('Léa', async (p) => {
  await p.keyboard.type('Léa'); const s = await st(p);
  return [same('model', 'LEA', s.text), same('natif', 'LEA', s.val)];
});
await run('Clémence-Rose123!', async (p) => {
  await p.keyboard.type('Clémence-Rose123!'); const s = await st(p);
  return [same('model', 'CLEMENCE ROSE', s.text), same('natif', 'CLEMENCE ROSE', s.val)];
});
await run('IME', async (p, c) => {
  const cdp = await c.newCDPSession(p);
  const snap = () => p.evaluate(() => ({ comp: window.__sg.bridge.composing, text: window.__sg.model.text, val: document.getElementById('in').value, shown: window.__sg.bridge.shownText }));
  await cdp.send('Input.imeSetComposition', { text: 'e', selectionStart: 1, selectionEnd: 1 });
  await sleep(100);
  const s1 = await snap();
  await cdp.send('Input.imeSetComposition', { text: 'é', selectionStart: 1, selectionEnd: 1 });
  await sleep(100);
  const s2 = await snap();
  await p.keyboard.press('Enter'); await sleep(150);
  const s3 = await p.evaluate(() => ({ phase: window.__sg.S.phase }));
  await cdp.send('Input.insertText', { text: 'é' });
  await sleep(150);
  const s4 = await snap();
  return [
    same('composition: active', true, s1.comp), same('composition e: modèle non réécrit', '', s1.text),
    same('composition e: aperçu normalisé', 'E', s1.shown), same('composition e: champ natif non réécrit', 'e', s1.val),
    same('composition é: modèle non réécrit', '', s2.text), same('composition é: aperçu', 'E', s2.shown), same('composition é: champ natif non normalisé', 'é', s2.val),
    same('Entrée pendant composition: pas de validation', 'input', s3.phase),
    same('fin: model', 'E', s4.text), same('fin: natif normalisé', 'E', s4.val), same('fin: composition terminée', false, s4.comp),
  ];
});
await run('Dictée / remplacement', async (p, c) => {
  const cdp = await c.newCDPSession(p);
  await cdp.send('Input.insertText', { text: 'marie-claire' }); await sleep(100);
  const s1 = await st(p);
  const r = await p.evaluate(() => {
    const i = document.getElementById('in');
    const ev = new InputEvent('beforeinput', { inputType: 'insertReplacementText', data: 'Maria', bubbles: true, cancelable: true });
    i.dispatchEvent(ev);
    i.value = 'Maria Léa'; i.setSelectionRange(9, 9);
    i.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText', bubbles: true }));
    return { prevented: ev.defaultPrevented, text: window.__sg.model.text, val: i.value };
  });
  return [same('insertText model', 'MARIE CLAIRE', s1.text), same('insertText natif', 'MARIE CLAIRE', s1.val),
    same('beforeinput non intercepté', false, r.prevented), same('réconcilié model', 'MARIA LEA', r.text), same('réconcilié natif', 'MARIA LEA', r.val)];
});
await run('Collage 26 lettres', async (p) => {
  await p.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text/plain', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    document.getElementById('in').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await sleep(200);
  const s = await st(p); const live = await p.textContent('#live');
  return [same('model', 'ABCDEFGHIJKLMNOPQRSTUV', s.text), same('natif', 'ABCDEFGHIJKLMNOPQRSTUV', s.val), same('#live annonce', true, live.trim().length > 0)];
});
await run('Édition (milieu, sélection, suppression)', async (p) => {
  await p.keyboard.type('LA'); await p.keyboard.press('ArrowLeft'); await p.keyboard.type('E');
  const a = await st(p);
  await p.keyboard.press('Control+A'); await p.keyboard.type('CLEA');
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft');
  const sel = await st(p);
  await p.keyboard.type('O'); const b = await st(p);
  await p.keyboard.press('Control+A'); await p.keyboard.type('LEA');
  await p.keyboard.press('Backspace'); const c = await st(p);
  await p.keyboard.press('Home'); await p.keyboard.press('Delete'); const d = await st(p);
  return [same('insertion milieu', 'LEA', a.text), same('curseur après insertion', 2, a.a),
    same('sélection shift+flèches', [1, 3], [sel.a, sel.b]), same('sélection + frappe', 'COA', b.text),
    same('Backspace', 'LE', c.text), same('Delete', 'E', d.text)];
});
await run('Annuler / rétablir', async (p) => {
  await p.keyboard.type('LEA'); await p.keyboard.press('Control+Z'); const a = await st(p);
  await p.keyboard.press('Control+Y'); const b = await st(p);
  await p.keyboard.press('Control+Z'); await p.keyboard.press('Control+Shift+Z'); const c = await st(p);
  return [same('Ctrl+Z', '', a.text), same('Ctrl+Y', 'LEA', b.text), same('Ctrl+Z puis Ctrl+Shift+Z', 'LEA', c.text), same('natif suit', 'LEA', c.val)];
});
await run('Validation / Échap', async (p) => {
  await p.evaluate(() => {
    window.__ev = []; window.__cb = [];
    window.onNameValidated = (n) => window.__cb.push(n);
    window.addEventListener('singulies:name-validated', (e) => window.__ev.push(e.detail));
  });
  await p.keyboard.type('Léa'); await p.keyboard.press('Enter');
  await sleep(200);
  const early = await p.evaluate(() => ({ ev: window.__ev.length, phase: window.__sg.S.phase }));
  await p.waitForFunction(() => window.__ev.length > 0, null, { timeout: 15000 });
  const r = await p.evaluate(() => ({ ev: window.__ev, cb: window.__cb, phase: window.__sg.S.phase, ls: localStorage.getItem('singulies.name') }));
  const foreign = [...p.hosts].filter((h) => h !== 'localhost' && h !== '127.0.0.1');
  const out = [same('phase pendant fondu', 'leaving', early.phase), same('événement pas immédiat', 0, early.ev),
    same('événement name', 'LEA', r.ev[0]?.name), same('onNameValidated', ['LEA'], r.cb), same('phase black', 'black', r.phase),
    same('localStorage', 'LEA', r.ls), same('hôtes externes', [], foreign)];
  await p.keyboard.press('Escape'); await sleep(200);
  const e = await p.evaluate(() => ({ phase: window.__sg.S.phase, text: window.__sg.model.text, ls: localStorage.getItem('singulies.name') }));
  out.push(same('Échap: phase', 'input', e.phase), same('Échap: prénom conservé', 'LEA', e.text), same('Échap: localStorage effacé', null, e.ls));
  return out;
});
await run('Rechargement 0,3 s après Entrée', async (p) => {
  await p.keyboard.type('Léa'); await p.keyboard.press('Enter'); await sleep(300);
  await p.reload();
  await p.waitForFunction(() => window.__sg && window.__sg.atlas, null, { timeout: 30000 });
  await sleep(300);
  const s = await p.evaluate(() => ({ phase: window.__sg.S.phase, text: window.__sg.model.text }));
  return [same('phase après reload', 'black', s.phase), same('prénom restauré', 'LEA', s.text)];
});
await run('Visiteur qui revient', async (p) => {
  const s = await st(p); return [same('model', 'LEA', s.text), same('phase', 'input', s.phase)];
}, { init: () => { try { if (!localStorage.getItem('singulies.name')) localStorage.setItem('singulies.name', 'LEA'); } catch {} } });
await run('Accessibilité du champ', async (p) => {
  const r = await p.evaluate(() => {
    const i = document.getElementById('in');
    const foc = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex],[contenteditable]')].filter((e) => e.tabIndex >= 0 && !e.disabled);
    const vp = document.querySelector('meta[name=viewport]').content;
    return { n: foc.length, id: foc[0]?.id, ac: i.getAttribute('autocomplete'), acr: i.getAttribute('autocorrect'), eh: i.getAttribute('enterkeyhint'), fs: parseFloat(getComputedStyle(i).fontSize), vp };
  });
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  const act = await p.evaluate(() => document.activeElement.id);
  return [same('éléments focalisables', 1, r.n), same('lequel', 'in', r.id), same('Tab x2 reste sur #in', 'in', act), same('autocomplete', 'off', r.ac), same('autocorrect', 'off', r.acr),
    same('enterkeyhint', 'done', r.eh), same('font-size >= 16', true, r.fs >= 16), same('viewport sans user-scalable/maximum-scale', false, /user-scalable|maximum-scale/i.test(r.vp))];
});
await run('?case=lower', async (p) => {
  await p.keyboard.type('clémence rose'); const s = await st(p);
  return [same('natif', 'Clemence Rose', s.val), same('model', 'CLEMENCE ROSE', s.text)];
}, { query: '?case=lower' });
await run('Sans WebGL2', async (p) => {
  await p.keyboard.type('Léa'); await sleep(150);
  const fb = await p.evaluate(() => ({ t: document.getElementById('fallback').textContent, d: getComputedStyle(document.getElementById('fallback')).display, atlas: !!window.__sg.atlas }));
  await p.evaluate(() => { window.__ev = []; window.addEventListener('singulies:name-validated', (e) => window.__ev.push(e.detail)); });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__ev.length > 0, null, { timeout: 15000 });
  const ph = await p.evaluate(() => ({ phase: window.__sg.S.phase, name: window.__ev[0].name }));
  return [same('pas d\'atlas', false, fb.atlas), same('#fallback affiché', 'block', fb.d), same('#fallback texte', 'LEA', fb.t), same('validation: nom', 'LEA', ph.name), same('phase', 'black', ph.phase)];
}, { waitAtlas: false, init: () => {
  const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { return t === 'webgl2' ? null : o.call(this, t, ...a); };
} });

await browser.close(); await server.close();

console.log('\n| Cas | Attendu | Obtenu | OK |\n|---|---|---|---|');
for (const r of results) console.log(`| ${r.cas} | ${JSON.stringify(r.attendu)} | ${JSON.stringify(r.obtenu)} | ${r.ok ? 'OK' : 'KO'} |`);
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
process.exit(ko ? 1 : 0);
