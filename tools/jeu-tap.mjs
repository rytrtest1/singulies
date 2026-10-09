// Question partagée, au doigt : toucher la ligne du curseur sous la question donne le focus au champ (le clavier
// s’ouvre) et l’on écrit. node tools/jeu-tap.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const PORT = 5185;
const server = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true, host: 'localhost' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/jeu.html?q=5`);
await page.waitForSelector('#jeu.on', { timeout: 120000 });
await page.waitForTimeout(5000);
const r = await page.evaluate(() => { const j = document.querySelector('#jeu .jeu-ta'); const b = j.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
console.log('ta', r);
const x = 195, y = r.y + r.h - 25;
console.log('hit', await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 80), [x, y]));
console.log('scenehit', await page.evaluate(([x, y]) => window.__jeu.scene.hitAt(x, y), [x, y]), await page.evaluate(() => JSON.stringify(window.__jeu.scene.state())));
await page.evaluate(() => { for (const k of ['pointerdown','pointerup','click','touchend','focusin','focusout']) addEventListener(k, e => (window.__ev = (window.__ev||[])).push(k + ':' + (e.target.className||e.target.tagName)), true); });
await page.touchscreen.tap(x, y);
console.log('ev', await page.evaluate(() => window.__ev));
await page.waitForTimeout(500);
console.log('active', await page.evaluate(() => document.activeElement?.className + ' ' + document.activeElement?.id));
await page.keyboard.type('bonjour');
await page.waitForTimeout(800);
console.log('val', await page.evaluate(() => document.querySelector('#jeu .jeu-ta').value), errs);
await page.screenshot({ path: 'captures/jeu/tap.png' });
await browser.close(); await server.close();
