// Retour à chaque étape : feuille → cartes ; enveloppe (adresse) → feuille → cartes. Captures après chaque retour.
// node tools/back-check.mjs → captures/retour/*.png
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5197;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const dir = 'captures/retour'; mkdirSync(dir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/scene-cartes.html?prenom=LEA&seed=3&reponse=la%20mer%20en%20hiver&envoi=0`);
await page.waitForFunction(() => window.__scene && window.__scene.ready);
await page.waitForTimeout(800);
const out = [];
await page.evaluate(async () => { await window.__toSheet(); });
await page.evaluate(() => { const m = window.__scene; window.__at(m.sheet.timing.CURSOR_AT + 0.5); m.sheet.showOrders(); m.advance(10.4 / 1.45); });
await page.screenshot({ path: `${dir}/0-enveloppe.png` });
// retour, retour, retour… : enveloppe → feuille → cartes (3 s entre deux, une capture à chaque fois)
for (let k = 1; k <= 4; k++) {
  out.push(await page.evaluate(() => { const m = window.__scene; const ok = m.sheet ? m.sheet.back(m.now()) : 'cartes'; m.advance(3); const s = m.sheet?.state(); return { ok, sheet: !!m.sheet, env: !!s?.env, view: s?.view, tau: s && +s.tau.toFixed(2), active: m.scene.state().active?.kind, ended: !!m.scene.state().ended }; }));
  await page.screenshot({ path: `${dir}/${k}-retour.png` });
}
console.log(JSON.stringify({ out, errs }));
await browser.close(); await server.close();
