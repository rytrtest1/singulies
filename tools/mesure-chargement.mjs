// Phase 0 du plan des trois versions (17/10/2026) : mesurer le chargement et la fluidité d'une page sur un « téléphone
// moyen en 4G » — profil Moto G Power (412×915, ×2,625), Chrome Android, CPU ralenti ×4, réseau « Fast 4G »
// (1,6 Mb/s descendants, 0,75 Mb/s montants, 150 ms de latence, valeurs de Lighthouse / WebPageTest).
//   node tools/mesure-chargement.mjs [url] [--runs 3] [--cpu 4] [--sans-saisie] [--canal msedge|chromium] [--sortie fichier.json]
// Par défaut : https://singulies.com/?envoi=0 (envoi=0 : ni email, ni compteur — les mesures ne polluent rien).
// Mesure : poids transféré et requêtes (par type), FCP, LCP, TBT, décalages de mise en page, images/s et pire image
// pendant l'intro, puis la saisie d'un prénom et la transition vers la feuille ; mémoire JS à la fin.
// ATTENTION : sans GPU de téléphone (SwiftShader ou GPU du PC), les images/s sont une indication, pas une mesure
// de téléphone (voir CLAUDE.md, « Preuves ») ; le poids, les requêtes et les temps réseau, eux, sont fiables.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const URL_ = args.find(a => /^https?:/.test(a)) || 'https://singulies.com/?envoi=0';
const RUNS = +opt('runs', 3), CPU = +opt('cpu', 4), SAISIE = !args.includes('--sans-saisie');
const CANAL = opt('canal', 'msedge'), OUT = opt('sortie', '');

const NET = { offline: false, latency: 150, downloadThroughput: Math.round(1.6 * 1024 * 1024 / 8), uploadThroughput: Math.round(0.75 * 1024 * 1024 / 8) };
const UA = 'Mozilla/5.0 (Linux; Android 12; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

const INIT = () => {
  const m = window.__m = { fcp: null, lcp: null, lt: [], cls: 0, frames: [], marks: {} };
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) m.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  let last = 0; const tick = t => { if (last) m.frames.push([t, t - last]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__mark = k => { m.marks[k] = performance.now(); };
};

const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const stats = (frames, a, b) => {
  const f = frames.filter(([t]) => t >= a && t < b).map(x => x[1]);
  if (f.length < 2) return null;
  const sorted = [...f].sort((x, y) => x - y), sum = f.reduce((s, x) => s + x, 0);
  return { images: f.length, ips: +(f.length / (sum / 1000)).toFixed(1), p95_ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), pire_ms: +sorted[sorted.length - 1].toFixed(1), plus50ms: f.filter(x => x > 50).length };
};

async function une(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA, locale: 'fr-FR', serviceWorkers: 'block' });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NET);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await cdp.send('Performance.enable');
  const reqs = new Map(); let bytes = 0;
  cdp.on('Network.requestWillBeSent', e => reqs.set(e.requestId, { url: e.request.url, type: e.type || '?', bytes: 0, t0: e.timestamp }));
  cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.dt = e.timestamp - r.t0; bytes += e.encodedDataLength; } });
  const erreurs = []; page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));

  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: 'load', timeout: 120000 });
  const tLoad = Date.now() - t0, bytesLoad = bytes, nLoad = [...reqs.values()].filter(r => r.bytes).length;
  await page.waitForTimeout(12000);                                              // l'intro
  const intro = await page.evaluate(() => { const n = performance.now(); return { n, f: window.__m.frames }; });
  const r = { url: URL_, chargement_ms: tLoad, octets_au_load: bytesLoad, requetes_au_load: nLoad };

  let saisie = null, trans = null, tOffre = null;
  if (SAISIE) {
    await page.evaluate(() => window.__mark('saisie'));
    try {
      await page.focus('#in', { timeout: 5000 });
      await page.keyboard.type('LEA', { delay: 220 });
      await page.keyboard.press('Enter');                                        // téléphone : le clavier fermé / Entrée = la suite
      await page.evaluate(() => window.__mark('saisie-fin'));
      // la feuille est posée quand l'offre paraît (#offre.txt-on) : on attend au plus 40 s
      await page.waitForFunction(() => { const o = document.querySelector('#offre'); return o && o.classList.contains('txt-on'); }, null, { timeout: 40000, polling: 250 })
        .then(() => page.evaluate(() => window.__mark('offre'))).catch(() => {});
      await page.waitForTimeout(3000);
    } catch (e) { erreurs.push('saisie: ' + String(e).slice(0, 120)); }
  }
  const fin = await page.evaluate(() => ({ m: window.__m, n: performance.now() }));
  const perf = await cdp.send('Performance.getMetrics');
  const pm = Object.fromEntries(perf.metrics.map(x => [x.name, x.value]));
  const fcp = fin.m.fcp, tbt = fin.m.lt.filter(([s]) => fcp != null && s >= fcp).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
  Object.assign(r, {
    fcp_ms: fcp && Math.round(fcp), lcp_ms: fin.m.lcp && Math.round(fin.m.lcp), tbt_ms: Math.round(tbt),
    longues_taches: fin.m.lt.length, cls: +fin.m.cls.toFixed(3),
    fluidite_intro_0_12s: stats(fin.m.frames, 0, intro.n),
    octets_total: bytes, requetes_total: [...reqs.values()].filter(r => r.bytes).length,
    memoire_js_mo: +(pm.JSHeapUsedSize / 1048576).toFixed(1), noeuds_dom: pm.Nodes,
    erreurs,
    gros_fichiers: [...reqs.values()].filter(x => x.bytes).sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(x => ({ ko: Math.round(x.bytes / 1024), type: x.type, url: x.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 70) })),
  });
  const types = {};
  for (const x of reqs.values()) if (x.bytes) types[x.type] = (types[x.type] || 0) + x.bytes;
  r.octets_par_type_ko = Object.fromEntries(Object.entries(types).map(([k, v]) => [k, Math.round(v / 1024)]));
  if (SAISIE) {
    const M = fin.m.marks;
    if (M.saisie != null) {
      r.fluidite_saisie = stats(fin.m.frames, M.saisie, M['saisie-fin'] ?? fin.n);
      r.offre_apres_saisie_s = M.offre != null ? +((M.offre - M['saisie-fin']) / 1000).toFixed(1) : null;
      r.fluidite_transition = M['saisie-fin'] != null ? stats(fin.m.frames, M['saisie-fin'], M.offre ?? fin.n) : null;
    }
  }
  await ctx.close();
  return r;
}

const launch = async () => {
  const base = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (CANAL === 'chromium') return chromium.launch(base);
  try { return await chromium.launch({ ...base, channel: CANAL }); } catch (e) { console.error('canal ' + CANAL + ' indisponible, Chromium de Playwright à la place'); return chromium.launch(base); }
};
const browser = await launch();
const res = [];
for (let i = 0; i < RUNS; i++) { process.stderr.write(`passage ${i + 1}/${RUNS}… `); const r = await une(browser); res.push(r); process.stderr.write(`${(r.octets_total / 1024).toFixed(0)} Ko, FCP ${r.fcp_ms} ms\n`); }
await browser.close();

const pick = k => med(res.map(r => r[k]).filter(v => v != null));
const resume = {
  url: URL_, date: new Date().toISOString(), profil: `Moto G Power 412×915 ×2,625 · CPU ×${CPU} · Fast 4G (1,6 Mb/s, 150 ms) · première visite (contexte neuf, cache vide) · ${CANAL}`, passages: res.length,
  mediane: { chargement_ms: pick('chargement_ms'), octets_au_load_ko: Math.round(pick('octets_au_load') / 1024), requetes_au_load: pick('requetes_au_load'), fcp_ms: pick('fcp_ms'), lcp_ms: pick('lcp_ms'), tbt_ms: pick('tbt_ms'), cls: pick('cls'),
    octets_total_ko: Math.round(pick('octets_total') / 1024), requetes_total: pick('requetes_total'), memoire_js_mo: pick('memoire_js_mo'), offre_apres_saisie_s: pick('offre_apres_saisie_s'),
    ips_intro: med(res.map(r => r.fluidite_intro_0_12s?.ips).filter(Boolean)), ips_transition: med(res.map(r => r.fluidite_transition?.ips).filter(Boolean)) },
  passages_detail: res,
};
console.log(JSON.stringify(resume, null, 1));
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(resume, null, 1)); }
