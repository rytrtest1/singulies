// Aperçu de l'email (modèle ressources/email-demande.html rempli comme le fait EmailJS, images servies par le site en
// ligne) : node tools/email-shot.mjs → captures/email/<cas>.png (largeur téléphone)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

const LIVE = 'https://rytrtest1.github.io/singulies/';
const PORT = 5195;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/confidentialite.html`);
mkdirSync('captures/email', { recursive: true });
const tpl = readFileSync('ressources/email-demande.html', 'utf8');
const cases = {
  reponse: { name: 'CLEMENCE ROSE', kind: 'reponse', id: 66, text: "celle qui m'a appris à rester, même quand tout disait de partir", mode: 'poste', address: ['Clémence Rose Martin', '12 rue des Lilas', '69004 Lyon'] },
  theme: { name: 'NOUR', kind: 'theme', text: "la mer en hiver, quand il n'y a plus personne", mode: 'direct', address: [] },
  impro: { name: 'MARIE-LOU', kind: 'improvisation', text: '', mode: 'poste', address: ['Marie-Lou Petit', '3 rue Haute', '75011 Paris'] },
};
for (const [k, d] of Object.entries(cases)) {
  d.name = d.name.replace(/-/g, ' ');
  const p = await page.evaluate(async d => (await import('/src/app/send.js')).params(d), d);
  const fix = v => String(v).split(`http://localhost:${PORT}/`).join(LIVE);
  const html = tpl.replace(/\{\{\{(\w+)\}\}\}/g, (_, n) => fix(p[n] ?? '')).replace(/\{\{(\w+)\}\}/g, (_, n) => fix(p[n] ?? ''));
  const shot = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await shot.setContent(html, { waitUntil: 'networkidle' });
  await shot.screenshot({ path: `captures/email/${k}.png`, fullPage: true });
  await shot.close();
  console.log(k, 'ok');
}
await browser.close(); await server.close();
