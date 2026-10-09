// « La feuille qui attend » (basique-feuille.html) : tout le chemin au téléphone, une capture par étape.
// node tools/feuille-shot.mjs → captures/feuille/<n>-<etape>.png ; affiche les erreurs et le temps du parcours
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = 5194;
const server = await createServer({ server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
const dir = 'captures/feuille';
mkdirSync(dir, { recursive: true });
const errs = [];
// 390 × 664 ≈ la partie visible dans le navigateur d'Instagram sur un iPhone 12–15
const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const shot = (n) => page.screenshot({ path: `${dir}/${n}.png` });
const url = `http://localhost:${PORT}/basique-feuille.html`;

await page.goto(url);
await page.waitForTimeout(1200);
await shot('1-ouverture');
const t0 = Date.now();
await page.tap('#name');
await page.keyboard.type('Clémence', { delay: 90 });
await page.waitForTimeout(1400);
await shot('2-prenom');
await page.keyboard.press('Enter');
await page.locator('[data-go=moi]').scrollIntoViewIfNeeded();
await shot('3-choix');
await page.tap('[data-go=moi]');
await page.waitForTimeout(1600);
await shot('4-moi-carte');
await page.fill('#answer', 'les dimanches matin');
await page.tap('#another1');
await page.waitForTimeout(1600);
await shot('5-moi-autre');
await page.locator('.pay').first().scrollIntoViewIfNeeded();
await shot('6-moi-payer');
await page.tap('.pay[data-kind=moi]');
await page.waitForTimeout(400);
const tMoi = (Date.now() - t0) / 1000;
await shot('7-moi-fin');

await page.goto(url);
await page.tap('#name');
await page.keyboard.type('Gérard');
await page.keyboard.press('Enter');
await page.tap('[data-go=offrir]');
await page.waitForTimeout(500);
await page.fill('#mot', 'joyeux anniversaire, papa.');
await shot('8-offrir');
await page.tap('input[name=gq][value=tirer] + span');
await page.waitForTimeout(1600);
await shot('9-offrir-tirer');
await page.locator('.pay[data-kind=offrir]').scrollIntoViewIfNeeded();
await page.tap('.pay[data-kind=offrir]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${dir}/10-offrir-fin.png`, fullPage: true });

// ordinateur : le premier écran
const pc = await browser.newPage({ viewport: { width: 1280, height: 800 } });
pc.on('pageerror', (e) => errs.push('pc: ' + e));
await pc.goto(url);
await pc.fill('#name', 'Léa');
await pc.waitForTimeout(1200);
await pc.screenshot({ path: `${dir}/11-pc.png` });

await browser.close();
await server.close();
console.log(`parcours « pour moi » (automate) : ${tMoi.toFixed(1)} s`);
console.log(errs.length ? errs.join('\n') : 'ok, aucune erreur');
