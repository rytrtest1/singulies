// Accueil : le paquet du jeu doit être entier à l'écran, quelle que soit la taille (priorité, 09/10). Mesure le bas
// de la carte du jeu et la taille des cartes, et capture chaque format. node tools/portal-paquet.mjs → captures/portail/paquet-*.png
import { preview } from 'vite';
import { chromium } from 'playwright';
const server = await preview({ preview: { port: 5198, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rows = [];
for (const [w, h] of [[390, 844], [390, 664], [375, 667], [375, 560], [430, 932], [1440, 810]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5198/?envoi=0');
  await page.waitForFunction(() => window.__sg?.portal?.readyFired, null, { timeout: 120000 });
  await page.waitForTimeout(7000);
  const r = await page.evaluate(() => { const j = window.__sg.portal.rect('jeu'), p = window.__sg.portal.rect('poeme'), l = window.__sg.portal.rect('livres'); return { jeuTop: j.top, jeuBas: j.bottom, carteL: p.width, livresBas: l.bottom }; });
  await page.screenshot({ path: `captures/portail/paquet-${w}x${h}.png` });
  rows.push({ format: `${w}x${h}`, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v)])), marge: Math.round(h - r.jeuBas), carte80: Math.round(w * 0.8) });
  await page.close();
}
console.table(rows);
await browser.close(); await server.close();
