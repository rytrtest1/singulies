// Envoie un email d'essai (vrais paramètres du site, images du site en ligne) : node tools/email-test.mjs [reponse|theme|impro]
import { createServer } from 'vite';
import { chromium } from 'playwright';

const LIVE = 'https://rytrtest1.github.io/singulies/';
const PORT = 5194;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/confidentialite.html`);
const cases = {
  reponse: { name: 'CLEMENCE ROSE', kind: 'reponse', id: 66, text: "celle qui m'a appris à rester, même quand tout disait de partir", mode: 'poste', address: ['Clémence Rose Martin (essai)', '12 rue des Lilas', '69004 Lyon'], contact: 'clemence@exemple.fr' },
  theme: { name: 'NOUR', kind: 'theme', text: "la mer en hiver, quand il n'y a plus personne", mode: 'direct', address: [], contact: '06 12 34 56 78' },
  impro: { name: 'LEA', kind: 'improvisation', text: '', mode: 'poste', address: ['Léa Martin (essai)', '3 rue Haute', '75011 Paris'], contact: 'lea@exemple.fr' },
};
const d = cases[process.argv[2] || 'reponse'];
const p = await page.evaluate(async d => (await import('/src/app/send.js')).params(d), d);
const fix = v => String(v).split(`http://localhost:${PORT}/`).join(LIVE);
for (const k in p) p[k] = fix(p[k]);
const cfg = await page.evaluate(async () => (await import('/src/app/send.js')).EMAILJS);
// depuis le site en ligne (même origine que les vraies demandes)
await page.goto(LIVE + 'confidentialite.html');
const r = await page.evaluate(async ({ p, cfg }) => {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: cfg.service, template_id: cfg.template, user_id: cfg.key, template_params: p }) });
  return res.status + ' ' + await res.text();
}, { p, cfg });
console.log(r);
await browser.close(); await server.close();
