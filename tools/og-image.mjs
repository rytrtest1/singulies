// Les vignettes de partage (Open Graph : iMessage, WhatsApp, messages Instagram), une par page, rendues par le vrai
// moteur (email-assets.html → vignettes()) : public/og.jpg (accueil), og-poeme.jpg, og-jeu.jpg ; et une par question
// partagée (public/q/<id>.html + og-<id>.jpg : la carte retournée, la question lisible ; la page renvoie aussitôt vers
// jeu?q=<id>). node tools/og-image.mjs [q] (q : seulement les questions)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
const PORT = 5196;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 700 } });
page.setDefaultTimeout(300000);
page.on('pageerror', e => console.error('page', e));
page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(`http://localhost:${PORT}/email-assets.html`);
await page.waitForFunction(() => window.__assets && window.__assets.ready);
if (process.argv[2] !== 'q') for (const [name, url] of await page.evaluate(() => window.__assets.vignettes())) writeFileSync('public/' + name, Buffer.from(url.split(',')[1], 'base64'));
// les questions : adresses absolues, à changer le jour du nom de domaine
const SITE = 'https://rytrtest1.github.io/singulies/';
const esc = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
mkdirSync('public/q', { recursive: true });
for (const { id, q } of JSON.parse(readFileSync('src/cards/questions.json', 'utf8'))) {
  const url = await page.evaluate(id => window.__assets.vignetteQ(id), id);
  writeFileSync(`public/q/og-${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  const d = esc('« ' + q.toLowerCase() + ' »');
  writeFileSync(`public/q/${id}.html`, `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>SINGULIES — le jeu</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ETERNEL">
<meta property="og:title" content="SINGULIES — le jeu">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${SITE}q/${id}">
<meta property="og:image" content="${SITE}q/og-${id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Une carte noire du jeu SINGULIES, la question tapée à la machine : ${d}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=../jeu?q=${id}">
<style>html,body{margin:0;background:#060606}</style>
<script>location.replace('../jeu?q=${id}');</script>
</head>
<body></body>
</html>
`);
}
await browser.close(); await server.close();
