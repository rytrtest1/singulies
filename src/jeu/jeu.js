// « le jeu » (09/10, v2) : la page du paquet SINGULIES, dans le même monde et avec les mêmes gestes que les questions
// du poème (la scène des cartes, en mode jeu) : le paquet tire une question ; glisser à gauche = la suivante, à
// droite = la précédente (elle revient du bord), toucher le paquet ou le coin corné = une autre.
// PARTAGER (sous la carte) : la poser à quelqu'un — le partage du téléphone (messages, Instagram…), avec la question et
// un lien qui l'ouvre directement (jeu?q=…) ; sur ordinateur, le lien est copié. COMMANDER (en bas, toujours là) : sa
// page d'achat (JEU_LINK ; « bientôt » en attendant). Retour (flèche, Échap) : le portail.
// (09/10, soir) Question qu'on nous a partagée (lien jeu?q=…) : sous elle, la carte réponse, un curseur seul qui
// respire (on y répond) ; PARTAGER n'apparaît qu'une fois quelque chose écrit, et partage la réponse avec la question ;
// une fois partagée (ou la question passée), la carte réponse se fond : le jeu seul, poser une question à son tour.
import { createCardScene } from '../cards/scene.js';
import { JEU_LINK, ITEMS } from '../portal/items.js';
import QUESTIONS from '../cards/questions.json';
import { dpr3d } from '../app/perf.js';
export { JEU_LINK };

const CSS = `
#jeu { position: fixed; inset: 0; z-index: 22; background: #060606; opacity: 0; transition: opacity .9s ease; touch-action: pinch-zoom; pointer-events: none; }
#jeu.on { opacity: 1; pointer-events: auto; }
#jeu.fast { transition-duration: .35s; }
#jeu canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#jeu .jeu-sign { position: absolute; left: 0; right: 0; text-align: center; margin: 0; padding: 0 0 0 .4em; border: 0; background: transparent;
  font: 500 14px/44px 'SG Garamond', Georgia, serif; letter-spacing: .4em; color: #fff; opacity: 0; transition: opacity 1.1s;
  pointer-events: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#jeu .jeu-sign.on { opacity: .62; pointer-events: auto; }
#jeu .jeu-share { transition: opacity 1.4s, top .8s ease; }
#jeu .jeu-sign.on:hover { opacity: .85; }
#jeu .jeu-back { position: absolute; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  margin: 0; padding: 0; border: 0; background: transparent; color: #fff; opacity: 0; transition: opacity .8s; display: flex; align-items: center;
  justify-content: center; cursor: pointer; pointer-events: none; }
#jeu .jeu-back.on { opacity: .62; pointer-events: auto; }
#jeu .jeu-back.on:hover { opacity: .85; }
#jeu .jeu-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
#jeu .jeu-ta { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0;
  font-size: 16px; resize: none; background: transparent; color: transparent; caret-color: transparent; outline: none;
  overflow: hidden; -webkit-tap-highlight-color: transparent; -webkit-user-select: text; pointer-events: none; }
/* question partagée : le champ est posé sur la carte réponse et reçoit le toucher lui-même (iPhone n'ouvre le
   clavier que sur un toucher direct du champ — comme les questions du poème) */
#jeu .jeu-ta.live { pointer-events: auto; }
`;
const BACK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

// opts : { base, reduced, onBack(), firstQ (question tirée en premier ; avec answer : question partagée, on y répond),
//          hold (la page reste invisible jusqu'à reveal() : le portail y amène son paquet), noIntro }
export async function mountJeu(opts = {}) {
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('jeu-style')) { const st = document.createElement('style'); st.id = 'jeu-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'jeu';
  const canvas = document.createElement('canvas');
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; root.appendChild(e); return e; };
  root.appendChild(canvas);
  document.body.appendChild(root);
  // relais (09/10, venu du portail) : une couche transparente posée sur le portail, préparée d'avance ; au toucher du
  // jeu, elle prend son paquet là où il est et l'amène à sa place pendant que la carte du dessus se retourne sur la
  // question (une seule scène dessine la carte : aucun fondu) ; au retour, elle le lui rend
  const RELAY = !!opts.relay;
  if (RELAY) root.style.background = 'transparent';
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: RELAY, premultipliedAlpha: true, depth: true });
  if (!gl) { root.remove(); return null; }
  const backEl = el('button', 'jeu-back', BACK_SVG); backEl.type = 'button'; backEl.setAttribute('aria-label', 'Retour');
  const shareEl = el('button', 'jeu-sign jeu-share', 'PARTAGER'); shareEl.type = 'button'; shareEl.setAttribute('aria-label', 'Partager cette question, pour la poser à quelqu’un');
  const buyEl = el('button', 'jeu-sign', 'COMMANDER'); buyEl.type = 'button'; buyEl.setAttribute('aria-label', 'Commander le jeu SINGULIES');
  // question partagée : on y répond (le champ natif reçoit la frappe, la carte affiche)
  let answering = opts.firstQ != null && !!opts.answer;
  const ta = el('textarea', 'jeu-ta');
  Object.assign(ta, { autocomplete: 'off', spellcheck: false }); ta.setAttribute('autocorrect', 'off'); ta.setAttribute('enterkeyhint', 'done');
  ta.setAttribute('aria-label', 'Ta réponse'); ta.disabled = !answering;
  const nextBtn = el('button', 'jeu-sr', 'une autre question'); nextBtn.type = 'button';
  const sr = el('div', 'jeu-sr'); sr.setAttribute('aria-live', 'polite');
  const say = t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); };
  const ev = (id, action) => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action } }));

  let current = null, visible = true, started = false, kbPx = 0, firstAt = null, shareReady = false;
  const scene = await createCardScene(gl, { base, jeu: true, jeuWrite: answering, autoWrite: false, firstQ: opts.firstQ ?? null, noIntro: !!opts.noIntro,
    firstBack: RELAY ? ITEMS.find(x => x.id === 'jeu') : null, on: {
    draw: d => { current = d.id; const q = QUESTIONS.find(x => x.id === d.id)?.q;
      if (firstAt == null) firstAt = now() + 1.5 + 1.2 + 0.045 * (q || '').length;   // posée, puis le temps de la lire : PARTAGER
      if (q) say(q); ev(d.id, 'tiree'); },
    discard: d => { ev(d.id, 'passee'); if (answering) stopAnswering(); },
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
    if (RELAY) gl.clearColor(0, 0, 0, 0); else gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // PARTAGER : sous la carte, à une place fixe (la place de repos de la question, jamais attaché à la carte qui
    // bouge, 09/10) ; il vient en fondu une fois la première question lue (question partagée : sous la réponse, une
    // fois quelque chose écrit) et reste ; clavier ouvert : au-dessus du clavier
    const st = scene.state(), said = answering && !!(st.active && st.active.text);
    const buyTop = H - Math.max(58, H * 0.075);
    if (firstAt != null && t - firstAt > 0) shareReady = true;
    const mk = scene.marks();
    if (mk) shareEl.style.top = Math.min((answering ? mk.peekBottom : mk.deckBottom) + 14, kbPx > 40 ? H - kbPx - 54 : buyTop - 48) + 'px';
    shareEl.classList.toggle('on', !going && (answering ? said : shareReady));
    const r = answering ? scene.activeRect() : null;
    ta.classList.toggle('live', !!(answering && r && !going));
    if (!(answering && r)) Object.assign(ta.style, { width: '1px', height: '1px' });
    if (answering && r) Object.assign(ta.style, { left: r.left + 'px', top: r.top + 'px', width: Math.max(1, r.right - r.left) + 'px', height: Math.max(1, r.bottom - r.top) + 'px' });
    buyEl.style.top = buyTop + 'px';
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!started) { started = true; scene.start(now()); } if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  // venu du portail (hold) : la page se pose d'un coup sur le paquet du portail (aucun fondu), et la carte du dessus
  // se retourne aussitôt sur la première question
  function reveal() {
    // venu du portail : la question y est déjà, à la place exacte de la carte du portail ; relais très court
    if (opts.hold) { root.style.transition = 'opacity .22s linear'; requestAnimationFrame(() => root.classList.add('on')); }
    else requestAnimationFrame(() => root.classList.add('on'));
    setTimeout(() => { backEl.classList.add('on'); buyEl.classList.add('on'); }, opts.hold ? 300 : 1200);
  }
  start();
  if (opts.hold || RELAY) scene.drawAt(1e9);
  if (!opts.hold && !RELAY) reveal();
  // relais : deux images pour tout préparer (shaders, textures), puis rien ne tourne jusqu'au toucher
  // (puis la couche est vidée : sinon sa dernière image — le paquet à sa place — apparaissait un instant au toucher)
  if (RELAY) requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (!taken) { visible = false; cancelAnimationFrame(raf); raf = 0; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } })));
  let taken = false, going = false;
  function takeOver() {
    const d = opts.portal?.()?.deckScreen?.() || { x: innerWidth / 2, y: innerHeight * 0.75, w: 0 };
    taken = true; going = false; visible = true; firstAt = null; shareReady = false;
    for (const b of [backEl, buyEl, shareEl]) b.style.transition = '';
    root.style.transition = 'none'; root.classList.add('on');
    scene.relayIn(d.x, d.y, d.w, now(), () => opts.portal?.()?.lightNow?.(), d.v || null);
    last = 0; if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => opts.portal?.()?.giveDeck?.());          // le portail cesse de le dessiner
    setTimeout(() => { if (!going) { backEl.classList.add('on'); buyEl.classList.add('on'); } }, 1500);
  }

  // ---- gestes : comme les questions du poème ----
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    // toucher : pas d'événements souris simulés derrière (leur « mousedown » retirait le focus du champ de la réponse :
    // le clavier ne s'ouvrait pas, on ne pouvait pas écrire)
    if (e.pointerType !== 'mouse') e.preventDefault();
    if (scene.relaying() || going) { down = null; return; }
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
  // iPhone : le focus repris au lâcher du doigt tant qu'on écrit (comme la scène des cartes)
  addEventListener('touchend', () => { if (visible && answering && scene.state().writing && document.activeElement !== ta) ta.focus({ preventScroll: true }); }, { passive: true });
  // ordinateur : une touche de lettre donne la frappe à la carte réponse
  addEventListener('keydown', e => {
    if (!visible || !answering || document.activeElement === ta || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (scene.startWriting()) { ta.value = scene.state().active?.text || ''; ta.focus({ preventScroll: true }); }
  });
  // clavier du téléphone : la carte remonte dans la partie visible
  const vv = window.visualViewport;
  const onVV = () => { kbPx = vv ? Math.max(0, innerHeight - vv.height) : 0; scene.setKeyboard(kbPx); };
  vv?.addEventListener('resize', onVV);
  function stopAnswering() {
    answering = false; ta.blur(); ta.disabled = true; scene.setJeuWrite(false); scene.setKeyboard(0);
  }
  nextBtn.addEventListener('click', () => scene.tap(...(r => r ? [(r.left + r.right) / 2, (r.top + r.bottom) / 2] : [0, 0])(scene.cardRect()), now()));

  // ---- partager une question : la poser à quelqu'un qu'on connaît ----
  // question partagée, une réponse écrite : on partage la réponse avec la question ; ensuite, le jeu seul
  async function share() {
    if (current == null) return;
    const id = current, q = (QUESTIONS.find(x => x.id === id)?.q || '').toLowerCase();
    const said = answering ? (scene.state().active?.text || '').trim() : '';
    if (answering && !said) return;
    const link = new URL('q/' + id, document.baseURI).href;      // sa page porte la vignette de la question (tools/og-image.mjs)
    const text = '« ' + q + ' »\n' + (said ? '— ' + said + '\n\n' : '') + 'une question de SINGULIES, le jeu d’Eternel';
    ev(id, said ? 'repondue' : 'partagee');
    ta.blur();
    const done = () => { if (answering) stopAnswering(); };
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text, url: link }); done(); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + link); flash(shareEl, 'LIEN COPIÉ'); } catch { flash(shareEl, link); }
    done();
  }
  function flash(b, txt) { const t = b.textContent; b.textContent = txt; setTimeout(() => { b.textContent = t; }, 1800); }
  shareEl.addEventListener('click', share);
  buyEl.addEventListener('click', () => { if (JEU_LINK) { location.href = JEU_LINK; return; } flash(buyEl, 'BIENTÔT'); });

  function leave() {
    if (!visible) return;
    if (RELAY) {
      if (going || scene.relaying()) return;
      // le retour : la question se retourne sur le paquet, qui redescend à la place du portail ; le portail, dessous,
      // rembobine le reste en même temps, puis reprend son paquet
      going = true; ta.blur();
      for (const b of [backEl, buyEl, shareEl]) { b.style.transition = 'opacity .25s'; b.classList.remove('on'); }
      const d = opts.portal?.()?.deckScreen?.() || { x: innerWidth / 2, y: innerHeight * 0.75, w: 0 };
      const lightFn = () => opts.portal?.()?.lightNow?.();
      scene.relayOut(d.x, d.y, d.w, now(), () => {
        opts.onReturned?.();
        requestAnimationFrame(() => requestAnimationFrame(() => { visible = false; root.classList.remove('on'); cancelAnimationFrame(raf); raf = 0; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }));
      }, lightFn, d.v || null);
      opts.onBack?.();
      return;
    }
    // le portail, dessous, se rembobine pendant que la page s'efface
    visible = false; ta.blur(); vv?.removeEventListener('resize', onVV);
    root.style.transition = 'opacity .55s ease'; root.classList.remove('on');
    opts.onBack?.();
    setTimeout(() => { cancelAnimationFrame(raf); raf = 0; root.remove(); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } }, 650);
  }
  backEl.addEventListener('click', leave);
  addEventListener('keydown', function esc(e) { if (!document.body.contains(root)) { removeEventListener('keydown', esc); return; } if (visible && e.key === 'Escape') leave(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
  window.__jeu = { scene, ta, now };          // essais
  return { root, leave, reveal, scene, now, takeOver, get on() { return taken && !going; } };
}
