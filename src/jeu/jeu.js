// « le jeu » (09/10, v2) : la page du paquet SINGULIES, dans le même monde et avec les mêmes gestes que les questions
// du poème (la scène des cartes, en mode jeu) : le paquet tire une question ; glisser à gauche = la suivante, à
// droite = la précédente (elle revient du bord), toucher le paquet ou le coin corné = une autre. Sous la question,
// comme la carte réponse, « une réponse, un poème » : la toucher = le parcours du poème, avec cette question.
// PARTAGER (sous la carte) : la poser à quelqu'un — le partage du téléphone (messages, Instagram…), avec la question et
// un lien qui l'ouvre directement (jeu?q=…) ; sur ordinateur, le lien est copié. COMMANDER (en bas, toujours là) : sa
// page d'achat (JEU_LINK ; « bientôt » en attendant). Retour (flèche, Échap) : le portail.
import { createCardScene } from '../cards/scene.js';
import { JEU_LINK } from '../portal/items.js';
import QUESTIONS from '../cards/questions.json';
import { dpr3d } from '../app/perf.js';
export { JEU_LINK };

const CSS = `
#jeu { position: fixed; inset: 0; z-index: 22; background: #060606; opacity: 0; transition: opacity .9s ease; touch-action: pinch-zoom; }
#jeu.on { opacity: 1; }
#jeu.fast { transition-duration: .35s; }
#jeu canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#jeu .jeu-sign { position: absolute; left: 0; right: 0; text-align: center; margin: 0; padding: 0 0 0 .4em; border: 0; background: transparent;
  font: 500 12px/44px 'SG Garamond', Georgia, serif; letter-spacing: .4em; color: #fff; opacity: 0; transition: opacity 1.1s;
  pointer-events: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#jeu .jeu-sign.on { opacity: .44; pointer-events: auto; }
#jeu .jeu-sign.on:hover { opacity: .6; }
#jeu .jeu-back { position: absolute; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  margin: 0; padding: 0; border: 0; background: transparent; color: #fff; opacity: 0; transition: opacity .8s; display: flex; align-items: center;
  justify-content: center; cursor: pointer; pointer-events: none; }
#jeu .jeu-back.on { opacity: .44; pointer-events: auto; }
#jeu .jeu-back.on:hover { opacity: .6; }
#jeu .jeu-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
const BACK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

// opts : { base, reduced, onBack(), onPoem(id) (une réponse, un poème), firstQ (question tirée en premier),
//          hold (la page reste invisible jusqu'à reveal() : le portail y amène son paquet), noIntro }
export async function mountJeu(opts = {}) {
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('jeu-style')) { const st = document.createElement('style'); st.id = 'jeu-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'jeu';
  const canvas = document.createElement('canvas');
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; root.appendChild(e); return e; };
  root.appendChild(canvas);
  document.body.appendChild(root);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) { root.remove(); return null; }
  const backEl = el('button', 'jeu-back', BACK_SVG); backEl.type = 'button'; backEl.setAttribute('aria-label', 'Retour');
  const shareEl = el('button', 'jeu-sign', 'PARTAGER'); shareEl.type = 'button'; shareEl.setAttribute('aria-label', 'Partager cette question, pour la poser à quelqu’un');
  const buyEl = el('button', 'jeu-sign', 'COMMANDER'); buyEl.type = 'button'; buyEl.setAttribute('aria-label', 'Commander le jeu SINGULIES');
  const poemBtn = el('button', 'jeu-sr', 'une réponse, un poème'); poemBtn.type = 'button';
  const nextBtn = el('button', 'jeu-sr', 'une autre question'); nextBtn.type = 'button';
  const sr = el('div', 'jeu-sr'); sr.setAttribute('aria-live', 'polite');
  const say = t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); };
  const ev = (id, action) => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action } }));

  let current = null, visible = true, started = false;
  const scene = await createCardScene(gl, { base, jeu: true, autoWrite: false, firstQ: opts.firstQ ?? null, noIntro: !!opts.noIntro, on: {
    draw: d => { current = d.id; const q = QUESTIONS.find(x => x.id === d.id)?.q; if (q) say(q); ev(d.id, 'tiree'); },
    discard: d => ev(d.id, 'passee'),
    poem: d => goPoem(d.id),
  } });
  scene.setName('');

  // ---- l'horloge, la boucle ----
  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  let raf = 0, last = 0, ptr = { x: 0, y: 0 };
  function frame(n) {
    if (!visible) { raf = 0; return; }
    const t = now(), dt = Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const dpr = dpr3d(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // PARTAGER sous la carte « une réponse, un poème » ; COMMANDER en bas, toujours là
    const r = scene.activeRect();
    if (r && current != null) { shareEl.style.top = Math.min(r.bottom + 10, H - 104) + 'px'; shareEl.classList.add('on'); } else shareEl.classList.remove('on');
    buyEl.style.top = (H - Math.max(58, H * 0.075)) + 'px';
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!started) { started = true; scene.start(now()); } if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  function reveal() {
    root.classList.toggle('fast', !!opts.hold);
    requestAnimationFrame(() => root.classList.add('on'));
    setTimeout(() => { backEl.classList.add('on'); buyEl.classList.add('on'); }, opts.hold ? 300 : 1200);
  }
  start();
  if (!opts.hold) reveal();

  // ---- gestes : comme les questions du poème ----
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, on: scene.hitAt(e.clientX, e.clientY) };
    scene.setPress(down.on); if (e.pointerType !== 'mouse') scene.setHover(down.on);
  });
  canvas.addEventListener('pointerleave', () => { scene.setHover(null); scene.setPress(null); canvas.style.cursor = ''; });
  addEventListener('pointermove', e => {
    if (!visible) return;
    if (!down && e.pointerType === 'mouse') { const id = scene.hitAt(e.clientX, e.clientY); scene.setHover(id); canvas.style.cursor = id ? 'pointer' : ''; }
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) down.moved = true;
      if (down.moved) { scene.drag(dx); return; }
    }
    if (e.pointerType !== 'mouse') return;
    const r = scene.cardRect(); if (!r) return;
    const x = e.clientX, y = e.clientY, ox = x < r.left ? x - r.left : x > r.right ? x - r.right : 0, oy = y < r.top ? y - r.top : y > r.bottom ? y - r.bottom : 0;
    ptr.x = Math.max(-1, Math.min(1, ox / (innerWidth * 0.3))); ptr.y = Math.max(-1, Math.min(1, -oy / (innerHeight * 0.3)));
  });
  canvas.addEventListener('pointerup', e => {
    scene.setPress(null); if (e.pointerType !== 'mouse') scene.setHover(null);
    if (!down) return;
    const f = down; down = null;
    const dx = e.clientX - f.x, dtm = Math.max(1, performance.now() - f.t);
    if (f.moved) { scene.release(dx, dx / dtm, now()); return; }
    scene.tap(e.clientX, e.clientY, now());
  });
  nextBtn.addEventListener('click', () => scene.tap(...(r => r ? [(r.left + r.right) / 2, (r.top + r.bottom) / 2] : [0, 0])(scene.cardRect()), now()));
  poemBtn.addEventListener('click', () => { if (current != null) goPoem(current); });

  // ---- partager une question : la poser à quelqu'un qu'on connaît ----
  async function share() {
    if (current == null) return;
    const id = current, q = (QUESTIONS.find(x => x.id === id)?.q || '').toLowerCase();
    const link = new URL('jeu?q=' + id, document.baseURI).href;
    const text = '« ' + q + ' »\nune question de SINGULIES, le jeu d’Eternel';
    ev(id, 'partagee');
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text, url: link }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + link); flash(shareEl, 'LIEN COPIÉ'); } catch { flash(shareEl, link); }
  }
  function flash(b, txt) { const t = b.textContent; b.textContent = txt; setTimeout(() => { b.textContent = t; }, 1800); }
  shareEl.addEventListener('click', share);
  buyEl.addEventListener('click', () => { if (JEU_LINK) { location.href = JEU_LINK; return; } flash(buyEl, 'BIENTÔT'); });

  // ---- une réponse, un poème : le parcours du poème, avec cette question ----
  function goPoem(id) {
    if (!opts.onPoem) return;
    visible = false; cancelAnimationFrame(raf); raf = 0;
    root.classList.remove('fast'); root.classList.remove('on');
    setTimeout(() => { root.remove(); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } }, 950);
    opts.onPoem(id);
  }
  function leave() {
    if (!visible) return;
    visible = false; root.classList.remove('fast'); root.classList.remove('on');
    setTimeout(() => { cancelAnimationFrame(raf); raf = 0; root.remove(); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } opts.onBack?.(); }, 900);
  }
  backEl.addEventListener('click', leave);
  addEventListener('keydown', function esc(e) { if (!document.body.contains(root)) { removeEventListener('keydown', esc); return; } if (visible && e.key === 'Escape') leave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
  return { root, leave, reveal, scene, now };
}
