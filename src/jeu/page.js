// « le jeu » — la page du paquet SINGULIES, recodée proprement (17/10, Maxence : « la recoder clean, supprimer l'ancienne :
// ETERNEL en haut, et la flèche ramenait à l'ancien portail avec les cartes »). Plus de portail, plus de relais : une page
// comme les autres (la ligne du haut : LE JEU, ← la page d'avant, le menu), et la scène des cartes en mode jeu — mêmes
// gestes que les questions du poème : le paquet tire une question ; glisser à droite = la suivante, à gauche = la
// précédente ; toucher le paquet ou le coin corné = une autre. PARTAGER (sous la carte) : la poser à quelqu'un — le
// partage du téléphone (la question et un lien q/<id> qui l'ouvre ici), sinon le lien copié. COMMANDER : la page d'achat
// (JEU_LINK ; « bientôt » en attendant). Question partagée (jeu.html?q=…) : elle est tirée en premier, la carte réponse
// dessous (un curseur seul) : on y répond ; PARTAGER n'apparaît qu'une fois quelque chose écrit.
import { createCardScene } from '../cards/scene.js';
import QUESTIONS from '../cards/questions.json';
import { dpr3d } from '../app/perf.js';
import { siteFonts } from '../app/fonts.js';
import { installCount, count } from '../app/count.js';
import { installNav } from '../nav/nav.js';

export const JEU_LINK = null;                // page d'achat du jeu (null = « bientôt »)
const BASE = './';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const P = new URLSearchParams(location.search);
const sharedQ = P.get('q') != null && /^\d+$/.test(P.get('q')) ? +P.get('q') : null;

const CSS = `
html, body { margin: 0; background: #060606; overflow: hidden; overscroll-behavior: none; -webkit-text-size-adjust: 100%; }
body { position: fixed; inset: 0; width: 100%; }
#jeu { position: fixed; inset: 0; background: #060606; opacity: 0; transition: opacity .9s ease; touch-action: pinch-zoom; }
#jeu.on { opacity: 1; }
#jeu canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#jeu .jeu-sign { position: absolute; left: 0; right: 0; text-align: center; margin: 0; padding: 0 0 0 .4em; border: 0; background: transparent;
  font: 500 14px/44px 'SG Garamond', Georgia, serif; letter-spacing: .4em; color: #fff; opacity: 0; transition: opacity 1.1s, top .8s ease;
  pointer-events: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#jeu .jeu-sign.on { opacity: .62; pointer-events: auto; }
#jeu .jeu-sign.on:hover { opacity: .85; }
#jeu .jeu-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
#jeu .jeu-ta { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0; font-size: 16px; resize: none;
  background: transparent; color: transparent; caret-color: transparent; outline: none; overflow: hidden; -webkit-tap-highlight-color: transparent;
  -webkit-user-select: text; pointer-events: none; }
/* question partagée : le champ est posé sur la carte réponse et reçoit le toucher lui-même (iPhone n'ouvre le clavier que sur un toucher
   direct du champ) */
#jeu .jeu-ta.live { pointer-events: auto; }
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// la page d'avant (l'historique du site) ; venu d'ailleurs (lien partagé) : l'accueil
function goBack() {
  try { if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) { history.back(); return; } } catch { /* */ }
  location.href = BASE;
}
installCount('jeu');
installNav({ current: 'jeu', headerOnly: true, title: 'LE JEU', base: BASE, show: () => false, foot: () => false, shade: () => false, canBack: () => true, onBack: () => { goBack(); return true; } });

async function main() {
  await siteFonts(BASE).catch(() => {});
  const root = document.createElement('div'); root.id = 'jeu'; document.body.appendChild(root);
  const canvas = document.createElement('canvas'); root.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  // sans WebGL2 : le jeu en version simple (mêmes mots, mêmes gestes)
  const simple = () => import('../simple/simple.js').then(m => { root.remove(); return m.mountSimpleJeu({ onBack: goBack, firstQ: sharedQ, answer: sharedQ != null }); });
  if (!gl) return simple();
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; root.appendChild(e); return e; };
  const shareEl = el('button', 'jeu-sign', 'PARTAGER'); shareEl.type = 'button'; shareEl.setAttribute('aria-label', 'Partager cette question, pour la poser à quelqu’un');
  const buyEl = el('button', 'jeu-sign', 'COMMANDER'); buyEl.type = 'button'; buyEl.setAttribute('aria-label', 'Commander le jeu SINGULIES');
  let answering = sharedQ != null;
  const ta = el('textarea', 'jeu-ta');
  Object.assign(ta, { autocomplete: 'off', spellcheck: false }); ta.setAttribute('autocorrect', 'off'); ta.setAttribute('enterkeyhint', 'done');
  ta.setAttribute('aria-label', 'Ta réponse'); ta.disabled = !answering;
  const sr = el('div', 'jeu-sr'); sr.setAttribute('aria-live', 'polite');
  const say = t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); };
  const ev = (id, action) => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action } }));

  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  let current = null, firstAt = null, shareReady = false, kbPx = 0;
  const scene = await createCardScene(gl, { base: BASE, jeu: true, jeuWrite: answering, autoWrite: false, firstQ: sharedQ, on: {
    draw: d => {
      current = d.id; const q = QUESTIONS.find(x => x.id === d.id)?.q;
      if (firstAt == null) firstAt = now() + 1.5 + 1.2 + 0.045 * (q || '').length;      // posée, puis le temps de la lire : PARTAGER
      if (q) say(q); ev(d.id, 'tiree');
    },
    discard: d => { ev(d.id, 'passee'); if (answering) stopAnswering(); },
  } });
  scene.setName('');

  // ---- la boucle ----
  let raf = 0, last = 0, started = false, ptr = { x: 0, y: 0 };
  function frame(n) {
    if (document.hidden) { raf = 0; return; }
    const t = now(), dt = Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const dpr = dpr3d(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // PARTAGER : sous la carte, à une place fixe (la place de repos de la question, jamais attachée à la carte qui bouge) ; il
    // vient en fondu une fois la première question lue (question partagée : sous la réponse, une fois quelque chose écrit) ;
    // clavier ouvert : au-dessus du clavier
    const s = scene.state(), said = answering && !!(s.active && s.active.text);
    const buyTop = H - Math.max(58, H * 0.075) - 6;
    if (firstAt != null && t - firstAt > 0) shareReady = true;
    const mk = scene.marks();
    if (mk) shareEl.style.top = Math.min((answering ? mk.peekBottom : mk.deckBottom) + 14, kbPx > 40 ? H - kbPx - 54 : buyTop - 48) + 'px';
    shareEl.classList.toggle('on', answering ? said : shareReady);
    const r = answering ? scene.activeRect() : null;
    ta.classList.toggle('live', !!(answering && r));
    if (!(answering && r)) Object.assign(ta.style, { width: '1px', height: '1px' });
    else Object.assign(ta.style, { left: r.left + 'px', top: r.top + 'px', width: Math.max(1, r.right - r.left) + 'px', height: Math.max(1, r.bottom - r.top) + 'px' });
    buyEl.style.top = buyTop + 'px';
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!started) { started = true; scene.start(now()); } if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  start();
  requestAnimationFrame(() => root.classList.add('on'));
  setTimeout(() => buyEl.classList.add('on'), 1200);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); } });

  // ---- gestes : comme les questions du poème ----
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    // toucher : pas d'événements souris simulés derrière (leur « mousedown » retirait le focus du champ de la réponse)
    if (e.pointerType !== 'mouse') e.preventDefault();
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, on: scene.hitAt(e.clientX, e.clientY) };
    scene.setPress(down.on); if (e.pointerType !== 'mouse') scene.setHover(down.on);
  });
  canvas.addEventListener('pointerleave', () => { scene.setHover(null); scene.setPress(null); canvas.style.cursor = ''; });
  addEventListener('pointermove', e => {
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
    const res = scene.tap(e.clientX, e.clientY, now());
    if (res.type === 'write') { ta.value = scene.state().active?.text || ''; ta.focus({ preventScroll: true }); }
    else if (res.type && document.activeElement === ta) ta.blur();
  });

  // ---- répondre à la question partagée ----
  ta.addEventListener('input', () => {
    if (/[\r\n]/.test(ta.value)) { ta.value = ta.value.replace(/[\r\n]+/g, ' ').replace(/ +$/, ''); scene.setText(ta.value); ta.blur(); return; }
    scene.setText(ta.value);
  });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ta.blur(); } });
  ta.addEventListener('focus', () => { if (answering && !scene.state().writing) scene.startWriting(); });
  ta.addEventListener('blur', () => scene.stopWriting());
  // iPhone : le focus repris au lâcher du doigt tant qu'on écrit
  addEventListener('touchend', () => { if (answering && scene.state().writing && document.activeElement !== ta) ta.focus({ preventScroll: true }); }, { passive: true });
  // ordinateur : une touche de lettre donne la frappe à la carte réponse
  addEventListener('keydown', e => {
    if (!answering || document.activeElement === ta || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (scene.startWriting()) { ta.value = scene.state().active?.text || ''; ta.focus({ preventScroll: true }); }
  });
  // clavier du téléphone : la carte remonte dans la partie visible
  const vv = window.visualViewport;
  if (vv) vv.addEventListener('resize', () => { kbPx = Math.max(0, innerHeight - vv.height); scene.setKeyboard(kbPx); });
  function stopAnswering() { answering = false; ta.blur(); ta.disabled = true; scene.setJeuWrite(false); scene.setKeyboard(0); }

  // ---- partager une question : la poser à quelqu'un qu'on connaît ----
  // question partagée, une réponse écrite : on partage la réponse avec la question ; ensuite, le jeu seul
  async function share() {
    if (current == null) return;
    const id = current, q = (QUESTIONS.find(x => x.id === id)?.q || '').toLowerCase();
    const said = answering ? (scene.state().active?.text || '').trim() : '';
    if (answering && !said) return;
    const link = new URL('q/' + id, document.baseURI).href;      // sa page porte la vignette de la question (tools/og-image.mjs)
    const text = '« ' + q + ' »\n' + (said ? '— ' + said + '\n\n' : '') + 'une question de SINGULIES, le jeu d’Eternel';
    ev(id, said ? 'repondue' : 'partagee'); count('jeu/partage');
    ta.blur();
    const done = () => { if (answering) stopAnswering(); };
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text, url: link }); done(); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + link); flash(shareEl, 'LIEN COPIE'); } catch { flash(shareEl, link); }
    done();
  }
  const flash = (b, txt) => { const t = b.textContent; b.textContent = txt; setTimeout(() => { b.textContent = t; }, 1800); };
  shareEl.addEventListener('click', share);
  buyEl.addEventListener('click', () => { count('jeu/commander'); if (JEU_LINK) { location.href = JEU_LINK; return; } flash(buyEl, 'BIENTOT'); });
  // Échap : la page d'avant (sauf menu ouvert, ou en train d'écrire)
  addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.nv-pan.on, .mn-au, .mn-ct') && document.activeElement !== ta) goBack(); });
  window.__jeu = { scene, ta, now };          // essais
}
main().catch(e => { console.warn('jeu', e); import('../simple/simple.js').then(m => m.mountSimpleJeu({ onBack: goBack, firstQ: sharedQ, answer: sharedQ != null })).catch(() => { /* */ }); });
