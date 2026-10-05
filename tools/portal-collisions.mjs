// Portail : aucune carte ne doit en traverser une autre. Toutes les 10 ms de la donne, puis des liens d'attente
// (« bientôt ») de chaque carte, chaque paire de cartes est testée comme deux plaques (87 × 51,5 mm, épaisseur
// 0,7 mm = carton + gondolage), par axes séparateurs. `vite build` avant. node tools/portal-collisions.mjs
import { preview } from 'vite';
import { chromium } from 'playwright';
const server = await preview({ preview: { port: 5196, strictPort: true, host: 'localhost' }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
for (const vp of [{ width: 390, height: 844 }, { width: 390, height: 664 }, { width: 1440, height: 810 }]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage();
  page.setDefaultTimeout(300000);
  await page.goto('http://localhost:5196/');
  await page.waitForFunction(() => window.__sg && window.__sg.portal && window.__sg.portal.readyFired);
  const res = await page.evaluate(() => {
    const P = window.__sg.portal, HX = 43.5, HY = 25.75, HZ = 0.35;
    const box = m => ({ c: [m[12], m[13], m[14]], a: [[m[0], m[1], m[2]], [m[4], m[5], m[6]], [m[8], m[9], m[10]]], e: [HX, HY, HZ] });
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    // plus grand écart sur un axe séparateur (> 0 : séparées, < 0 : elles se traversent de tant de mm)
    function gap(A, B) {
      const d = [B.c[0] - A.c[0], B.c[1] - A.c[1], B.c[2] - A.c[2]];
      const axes = [...A.a, ...B.a];
      for (const x of A.a) for (const y of B.a) { const c = cross(x, y), l = Math.hypot(...c); if (l > 1e-6) axes.push(c.map(v => v / l)); }
      let best = -Infinity;
      for (const n of axes) {
        const ra = A.e.reduce((s, e, i) => s + e * Math.abs(dot(A.a[i], n)), 0);
        const rb = B.e.reduce((s, e, i) => s + e * Math.abs(dot(B.a[i], n)), 0);
        best = Math.max(best, Math.abs(dot(d, n)) - ra - rb);
      }
      return best;
    }
    const out = [];
    function scan(label, s0, s1, anim, a0) {
      let worst = { g: Infinity };
      for (let s = s0; s <= s1; s += 0.01) {
        const bs = P.probe(s, anim, a0).map(o => ({ id: o.id, pile: o.pile, b: box(o.m) }));
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
          // le paquet et la carte « le jeu » posée dessus, ou les cartes encore sur le paquet : une pile, pas une collision
          if (bs[i].pile && bs[j].pile) continue;
          const ids = [bs[i].id, bs[j].id];
          const g = gap(bs[i].b, bs[j].b);
          if (g < worst.g) worst = { g, s: +s.toFixed(2), ids };
        }
      }
      out.push({ label, ...worst });
    }
    const st = P.state();
    scan('donne', 0, 6.5, null, 0);
    for (const id of ['lettre', 'livres', 'jeu']) scan('bientot ' + id, 20, 26, id, 20);
    return out;
  });
  console.log(vp.width + 'x' + vp.height);
  for (const r of res) { console.log('  ' + r.label.padEnd(16) + ' écart minimal ' + r.g.toFixed(2) + ' mm à ' + r.s + ' s (' + r.ids.join(' / ') + ')'); if (r.g < 0) bad++; }
  await page.context().close();
}
await browser.close(); await new Promise(r => server.httpServer.close(r));
console.log(bad ? `${bad} cas où des cartes se traversent` : 'aucune carte ne traverse une autre');
process.exit(bad ? 1 : 0);
