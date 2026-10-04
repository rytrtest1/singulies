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
  await p.keyboard.type('Léa'); await p.keyboard.press('Enter'); await sleep(100);
  await p.focus('#in'); await p.keyboard.press('Enter'); // 2e Entrée : transition
  await p.waitForFunction(() => window.__sg.S.trans != null, null, { timeout: 15000 });
  const early = await p.evaluate(() => ({ ev: window.__ev.length, phase: window.__sg.S.phase, ls: localStorage.getItem('singulies.name'), ss: sessionStorage.getItem('singulies.validated') }));
  const g = await p.evaluate(() => { window.__sg.goBack(); return window.__sg.S.trans != null; });   // goBack ne fait rien pendant la transition
  await p.waitForFunction(() => window.__ev.length > 0, null, { timeout: 120000 });
  await p.waitForFunction(() => window.__sg.S.phase === 'scene', null, { timeout: 120000 });
  const r = await p.evaluate(() => ({ ev: window.__ev, cb: window.__cb, phase: window.__sg.S.phase, ls: localStorage.getItem('singulies.name'), cards: !!window.__sg.cards }));
  const foreign = [...p.hosts].filter((h) => h !== 'localhost' && h !== '127.0.0.1');
  const out = [same('transition démarrée (S.trans != null)', true, g), same('phase pendant transition', 'input', early.phase), same('événement pas immédiat', 0, early.ev),
    same('saveValidated au départ: localStorage', 'LEA', early.ls), same('saveValidated au départ: sessionStorage', true, !!early.ss),
    same('événement name', 'LEA', r.ev[0]?.name), same('onNameValidated', ['LEA'], r.cb), same('phase scene', 'scene', r.phase), same('__sg.cards défini', true, r.cards),
    same('localStorage', 'LEA', r.ls), same('hôtes externes', [], foreign)];
  await p.keyboard.press('Escape'); await sleep(300);
  const e = await p.evaluate(() => ({ phase: window.__sg.S.phase, text: window.__sg.model.text, ls: localStorage.getItem('singulies.name') }));
  out.push(same('Échap en scène: phase inchangée', 'scene', e.phase), same('Échap: prénom conservé', 'LEA', e.text), same('Échap: localStorage inchangé', 'LEA', e.ls));
  return out;
}, { query: '?memoire=1' });
await run('Rechargement après départ de transition', async (p) => {
  await p.keyboard.type('Léa'); await p.evaluate(() => window.__sg.startTransition());   // sans Entrée préalable
  const t = await p.evaluate(() => window.__sg.S.trans != null);
  await sleep(300);
  await p.reload();
  await p.waitForFunction(() => window.__sg && window.__sg.S.phase === 'scene' && window.__sg.cards, null, { timeout: 120000 });
  const s = await p.evaluate(() => ({ phase: window.__sg.S.phase, text: window.__sg.model.text, frames: window.__sg.cards.frames, inpRO: document.getElementById('in').readOnly }));
  await sleep(1500);
  const f2 = await p.evaluate(() => window.__sg.cards.frames);
  const foreign = [...p.hosts].filter((h) => h !== 'localhost' && h !== '127.0.0.1');
  return [same('transition démarrée', true, t), same('phase après reload', 'scene', s.phase), same('prénom restauré', 'LEA', s.text), same('cartes dessinent', true, f2 > 0), same('hôtes externes', [], foreign)];
}, { query: '?memoire=1' });
await run('Sans mémoire (défaut) : prénom jamais retenu', async (p) => {
  await p.keyboard.type('Léa'); await p.evaluate(() => window.__sg.startTransition()); await sleep(300);
  const ls = await p.evaluate(() => localStorage.getItem('singulies.name'));
  await p.reload();
  await p.waitForFunction(() => window.__sg && window.__sg.atlas, null, { timeout: 60000 });
  const s = await st(p);
  return [same('rien en mémoire', null, ls), same('accueil vide après reload', '', s.text), same('phase input', 'input', s.phase)];
});
await run('Validation directe (validate) sans transition', async (p) => {
  await p.keyboard.type('Léa'); await p.evaluate(() => window.__sg.validate());
  await p.waitForFunction(() => window.__sg.S.phase === 'leaving' || window.__sg.S.phase === 'black', null, { timeout: 15000 });
  await p.waitForFunction(() => window.__sg.S.phase === 'black', null, { timeout: 30000 });
  return [same('phase black', 'black', await p.evaluate(() => window.__sg.S.phase))];
});
await run('Visiteur qui revient', async (p) => {
  const s = await st(p); return [same('model', 'LEA', s.text), same('phase', 'input', s.phase)];
}, { query: '?memoire=1', init: () => { try { if (!localStorage.getItem('singulies.name')) localStorage.setItem('singulies.name', 'LEA'); } catch {} } });
await run('Accessibilité du champ', async (p) => {
  const r = await p.evaluate(() => {
    const i = document.getElementById('in');
    const foc = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex],[contenteditable]')].filter((e) => e.tabIndex >= 0 && !e.disabled);
    const vp = document.querySelector('meta[name=viewport]').content;
    return { n: foc.length, id: foc[0]?.id, ac: i.getAttribute('autocomplete'), fac: i.form?.getAttribute('autocomplete'), acr: i.getAttribute('autocorrect'), eh: i.getAttribute('enterkeyhint'), fs: parseFloat(getComputedStyle(i).fontSize), vp };
  });
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  const act = await p.evaluate(() => document.activeElement.id);
  return [same('éléments focalisables', 1, r.n), same('lequel', 'in', r.id), same('Tab x2 reste sur #in', 'in', act), same('autocomplete par défaut', 'given-name', r.ac), same('form autocomplete', 'on', r.fac), same('autocorrect', 'off', r.acr),
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
  await p.keyboard.press('Enter'); await sleep(100); await p.focus('#in'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__ev.length > 0, null, { timeout: 15000 });
  const ph = await p.evaluate(() => ({ phase: window.__sg.S.phase, name: window.__ev[0].name }));
  return [same('pas d\'atlas', false, fb.atlas), same('#fallback affiché', 'block', fb.d), same('#fallback texte', 'LEA', fb.t), same('validation: nom', 'LEA', ph.name), same('phase', 'black', ph.phase)];
}, { waitAtlas: false, init: () => {
  const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { return t === 'webgl2' ? null : o.call(this, t, ...a); };
} });

const flags = (p) => p.evaluate(() => ({ conf: window.__sg.S.confirmed, foc: document.activeElement === document.getElementById('in'), phase: window.__sg.S.phase, trans: window.__sg.S.trans != null, text: window.__sg.model.text }));
await run('autocomplete=off avec ?auto=0', async (p) => {
  return [same('autocomplete', 'off', await p.evaluate(() => document.getElementById('in').getAttribute('autocomplete')))];
}, { query: '?auto=0' });
await run('Entrée = confirmer', async (p) => {
  await p.keyboard.type('Léa'); await p.keyboard.press('Enter'); await sleep(300);
  const a = await flags(p);
  await p.keyboard.type('B'); // champ défocalisé : la touche lui rend le focus et s'écrit
  await p.focus('#in'); await p.keyboard.type('B'); await sleep(100);
  const b = await flags(p);
  return [same('confirmé', true, a.conf), same('champ non focalisé', false, a.foc), same('phase input', 'input', a.phase), same('pas de transition', false, a.trans),
    same('frappe après confirmation: confirmed false', false, b.conf), same('texte (les deux B)', 'LEABB', b.text)];
});
await run('2x Entrée -> transition puis scène', async (p) => {
  await p.evaluate(() => { window.__ev = []; window.addEventListener('singulies:name-validated', (e) => window.__ev.push(e.detail)); });
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter'); await sleep(200);
  await p.focus('#in'); await p.keyboard.press('Enter'); await sleep(200);
  const a = await flags(p);
  await p.waitForFunction(() => window.__sg.S.phase === 'scene', null, { timeout: 120000 });
  const ev = await p.evaluate(() => window.__ev.map((e) => e.name));
  return [same('transition démarrée', true, a.trans), same('phase encore input', 'input', a.phase), same('phase scene', 'scene', (await flags(p)).phase), same('événement', ['LEA'], ev)];
});
await run('Confirmer puis rien faire -> transition automatique', async (p) => {
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter');
  const c = await p.evaluate(() => window.__sg.S.confirmedAt);
  await sleep(500);
  const early = (await flags(p)).trans;
  await p.waitForFunction((c0) => window.__sg.S.t > c0 + 10.5, c, { timeout: 120000 });
  await p.waitForFunction(() => window.__sg.S.trans != null, null, { timeout: 30000 });
  return [same('pas de transition tout de suite', false, early), same('transition automatique', true, (await flags(p)).trans)];
});
await run('Signe #next visible puis clic -> transition', async (p) => {
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.getElementById('next').classList.contains('on'), null, { timeout: 60000 });
  await p.click('#next'); await sleep(200);
  return [same('transition démarrée', true, (await flags(p)).trans)];
}, { query: "?fleche=1" });
await run('2e Entrée sans focus (desktop, champ défocalisé par la confirmation)', async (p) => {
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter'); await sleep(300);
  await p.keyboard.press('Enter'); await sleep(300);
  return [same('transition démarrée', true, (await flags(p)).trans)];
});
await run('Clic dans nameBox -> transition', async (p) => {
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter'); await sleep(500);
  const box = await p.evaluate(() => window.__sg.S.nameBox);
  await p.mouse.click((box[0] + box[2]) / 2, (box[1] + box[3]) / 2); await sleep(200);
  const a = await flags(p);
  return [same('nameBox défini', true, !!box), same('transition', true, a.trans)];
});
await run('Clic hors du prénom après confirmation', async (p) => {
  await p.keyboard.type('Lea'); await p.keyboard.press('Enter'); await sleep(500);
  await p.mouse.click(8, 8); await sleep(200);
  const a = await flags(p);
  return [same('champ non refocalisé (clavier seulement dans la zone du curseur)', false, a.foc), same('pas de transition', false, a.trans), same('phase input', 'input', a.phase)];
});
await run('Zone du curseur (prénom vide) -> champ focalisé ; touche au clavier -> champ focalisé', async (p) => {
  await p.evaluate(() => document.getElementById('in').blur()); await sleep(200);
  await p.mouse.click(8, 8); await sleep(200);
  const a = await flags(p);
  const box = await p.evaluate(() => window.__sg.S.nameBox);
  await p.mouse.click((box[0] + box[2]) / 2, (box[1] + box[3]) / 2); await sleep(200);
  const b = await flags(p);
  await p.evaluate(() => document.getElementById('in').blur()); await sleep(100);
  await p.keyboard.type('L'); await sleep(200);
  const c = await flags(p);
  return [same('clic ailleurs : pas de focus', false, a.foc), same('clic zone du curseur : focus', true, b.foc), same('lettre tapée : focus + texte', [true, 'L'], [c.foc, c.text])];
});
await run('Suggestion en composition (iPhone) : prénom affiché d’un coup, sans frappe automatique', async (p) => {
  const r = await p.evaluate(() => {
    const i = document.getElementById('in');
    i.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
    i.value = 'Léa';
    i.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'Léa' }));
    const rev = window.__sg.S.rev;
    return { rev: !!rev, n: rev ? rev.n : null };
  });
  await sleep(150);
  const mid = await p.evaluate(() => { const r = window.__sg.S.rev; return r ? r.n : 99; });
  await p.evaluate(() => {
    const i = document.getElementById('in');
    i.dispatchEvent(new CompositionEvent('compositionend', { data: 'Léa' }));
    i.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: 'Léa' }));
  });
  await p.waitForFunction(() => window.__sg.S.rev == null, null, { timeout: 15000 });
  await sleep(500);   // la confirmation suit la suggestion de 150 ms
  const s = await st(p);
  return [same('pas de frappe automatique', false, r.rev), same('rien en attente après 150 ms', 99, mid), same('modèle', 'LEA', s.text), same('confirmé', true, await p.evaluate(() => window.__sg.S.confirmed))];
});
await run('Remplissage auto simulé', async (p) => {
  await p.evaluate(() => {
    const i = document.getElementById('in');
    i.value = 'Clémence-Rose'; i.setSelectionRange(13, 13);
    i.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText', bubbles: true }));
  });
  await sleep(500);
  const a = await flags(p); const v = await st(p);
  return [same('texte', 'CLEMENCE ROSE', a.text), same('natif', 'CLEMENCE ROSE', v.val), same('confirmé', true, a.conf), same('champ non focalisé', false, a.foc), same('phase input', 'input', a.phase)];
});
await run('Entrée pendant IME ignorée', async (p, c) => {
  await p.keyboard.type('Lea');
  const cdp = await c.newCDPSession(p);
  await cdp.send('Input.imeSetComposition', { text: 'e', selectionStart: 1, selectionEnd: 1 }); await sleep(100);
  await p.keyboard.press('Enter'); await sleep(200);
  const a = await flags(p);
  return [same('non confirmé', false, a.conf), same('pas de transition', false, a.trans)];
});

await browser.close(); await server.close();

console.log('\n| Cas | Attendu | Obtenu | OK |\n|---|---|---|---|');
for (const r of results) console.log(`| ${r.cas} | ${JSON.stringify(r.attendu)} | ${JSON.stringify(r.obtenu)} | ${r.ok ? 'OK' : 'KO'} |`);
const ko = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - ko}/${results.length} OK`);
process.exit(ko ? 1 : 0);
