// Scène 2 montée dans une page : canvas WebGL2 propre, champ natif de la réponse, signes (donner, PASSER,
// retour) et gestes (toucher, glisser, relire, inclinaison). Utilisée par l'accueil (après la transition) et par
// la page d'essai scene-cartes.html. Rien n'est dessiné avant start().
import { createCardScene } from './scene.js';
import { createSheetScene } from '../sheet/sheet.js';

const CSS = `
.sc-c { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: pinch-zoom; }
/* champ natif : reçoit le clavier, invisible (le texte est tapé sur la carte) */
.sc-answer { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0;
  font-size: 16px; resize: none; background: transparent; color: transparent; caret-color: transparent; outline: none;
  overflow: hidden; -webkit-tap-highlight-color: transparent; -webkit-user-select: text; z-index: 12; }
.sc-sign { position: fixed; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity .8s; pointer-events: none; z-index: 13; cursor: pointer; }
/* signes discrets : une seule opacité dans toute l'app (0,4 ; survol 0,6) */
.sc-sign.on { opacity: .4; pointer-events: auto; }
.sc-sign.on:hover, .sc-pass.on:hover { opacity: .6; }
/* PASSER (sur la carte blanche, après quelques secondes sans frappe) : discret, placé par le script */
.sc-pass { position: fixed; left: 0; right: 0; top: 85%; text-align: center; z-index: 13; cursor: pointer;
  opacity: 0; transition: opacity 1.2s; pointer-events: none;
  font: 500 12px/44px 'SG Garamond', serif; letter-spacing: 0.4em; padding-left: 0.4em; color: #fff; }
.sc-pass.on { opacity: .4; pointer-events: auto; }
.sc-back { left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); }
.sc-veil { position: fixed; inset: 0; background: #000; opacity: 0; transition: opacity 1.4s; pointer-events: none; z-index: 14; }
`;

// opts : { name, base, seed, look, canvas?, onEnd(detail), onExit?() (retour depuis le paquet), log?(s), shot?,
//          sheet? (défaut : oui ; ?feuille=0 → l'ancienne fin, fondu au noir), onOrder?(detail) }
export async function mountCards(opts) {
  const { name, base = './', seed, look = {}, onEnd, onExit, log = () => {} } = opts;
  const toSheet = opts.sheet ?? new URLSearchParams(location.search).get('feuille') !== '0';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.getElementById('sc-style')) {
    const st = document.createElement('style'); st.id = 'sc-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; document.body.appendChild(e); return e; };
  const canvas = opts.canvas || el('canvas', 'sc-c');
  // invisible tant que la page ne la montre pas : un canvas WebGL neuf est noir et couvrirait l'accueil
  if (opts.hidden) Object.assign(canvas.style, { opacity: '0', pointerEvents: 'none', zIndex: '5' });
  const answer = el('textarea', 'sc-answer');
  Object.assign(answer, { autocomplete: 'off', spellcheck: false });
  answer.setAttribute('autocapitalize', 'none'); answer.setAttribute('enterkeyhint', 'done'); answer.setAttribute('aria-label', 'Réponse');
  const giveEl = el('div', 'sc-sign', '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19 V6 M6.5 11 L12 5.5 L17.5 11" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  const passEl = el('div', 'sc-pass', 'PASSER'); passEl.setAttribute('role', 'button');
  const backEl = el('div', 'sc-sign sc-back', '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  backEl.setAttribute('role', 'button'); backEl.setAttribute('aria-label', 'Retour');
  const veil = el('div', 'sc-veil');

  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: !!opts.shot });
  if (!gl) return null;
  // horloge : réelle, ou pilotée image par image (tests, captures : api.manual / api.advance)
  let vclock = null;
  const t0 = performance.now(), now = () => vclock ?? (performance.now() - t0) / 1000;
  const vv = window.visualViewport;

  function finish(d) {
    log(d.kind + (d.text ? ' : ' + d.text : ''));
    const detail = { name, ...d };
    try { if (typeof window.onCardChosen === 'function') window.onCardChosen(detail); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent('singulies:card-chosen', { detail }));
    if (toSheet) { openSheet(); onEnd?.(detail); return; }
    veil.style.opacity = 1;
    onEnd?.(detail);
  }
  // ---- la feuille (scène 3) : même canvas, même rendu ; la scène des cartes lui passe la main ----
  let sheet = null, sheetAt = 0;
  function openSheet() {
    answer.blur();
    sheet = createSheetScene(gl, { card: scene.renderer, nameR: scene.nameR, look: scene.look, from: scene.snapshot(), seed, reduced,
      on: { back: closeSheet, order: d => { log('commande : ' + d.mode); opts.onOrder?.(d); } } });
    scene.hideName(true);
    sheetAt = now(); api.sheet = sheet;
  }
  function closeSheet() {
    if (!sheet) return;
    sheet.free(); sheet = null; api.sheet = null;
    scene.reopen(now());
    log('retour aux cartes');
  }
  function focusAnswer() { if (document.activeElement !== answer) answer.focus({ preventScroll: true }); }
  const setValue = (s) => { if (answer.value !== s) { answer.value = s; try { answer.setSelectionRange(s.length, s.length); } catch { /* */ } } };
  const scene = await createCardScene(gl, { base, seed, look, toSheet, on: { end: finish, write: focusAnswer, text: (d) => setValue(d.text) } });
  scene.setName(name);

  let started = false;
  const api = { scene, canvas, gl, now, started: () => started, frames: 0, start, nameTargets: (W, H) => scene.nameTargets(name, W, H) };

  function start() {
    if (started) return; started = true;
    scene.start(now());
    let last = performance.now();
    function frame(n, manualDt) {
      if (vclock != null && manualDt == null) return;            // horloge pilotée : pas de boucle
      const t = now(), dt = manualDt ?? Math.min(0.05, (n - last) / 1000); last = n;
      const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (sheet) {
        const sh = sheet;
        sh.frame(t, dt, W, H);
        if (sheet !== sh) { if (manualDt == null) requestAnimationFrame(frame); return; }     // retour : la scène des cartes reprend
        for (const e of [giveEl, passEl]) e.classList.remove('on');
        backEl.classList.toggle('on', t - sheetAt > 2.5 && !sheet.state().backing);
        answer.style.width = '1px'; answer.style.height = '1px';
        const br = { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
        sheet.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
        api.frames++;
        if (manualDt == null) requestAnimationFrame(frame);
        return;
      }
      scene.frame(t, dt, W, H);
      // signes : donner (sous la carte écrite, clavier fermé) ; passer (avec la carte blanche offerte)
      const st = scene.state(), r = scene.activeRect();
      const canGive = st.active && st.active.text && !st.writing && !st.ended && r;
      giveEl.classList.toggle('on', !!canGive);
      if (r) { giveEl.style.left = ((r.left + r.right) / 2 - 22) + 'px'; giveEl.style.top = (r.bottom + 10) + 'px'; }
      // PASSER : sur la carte blanche seulement, après 3 s sans frappe, sous la carte ; retour : en haut à gauche
      // (carte blanche → paquet ; paquet → accueil quand la page le permet)
      // PASSER : 3 s après que la carte blanche a pris la place du paquet, toujours visible ; clavier ouvert : entre
      // le bas de la carte et le haut du clavier
      const mk = scene.marks();
      passEl.classList.toggle('on', !st.ended && st.mode === 'free' && st.freeFor > 3);
      const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
      if (st.kb && r) passEl.style.top = Math.max(r.bottom + 2, (r.bottom + kbTop) / 2 - 22) + 'px';
      else if (mk) passEl.style.top = (mk.deckBottom + 34) + 'px';
      // respiration : la lumière et la carte en focus bougent d'elles-mêmes, très peu (le vivant, sans gyroscope)
      // la lampe respire d'elle-même (scene.js : breathAz / breathEl) ; carte en focus : elle respire aussi, moins que
      // celle en attente (Maxence 05/10)
      const br = { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
      scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
      backEl.classList.toggle('on', !st.ended && (st.mode === 'free' || (!!onExit && t > 3 && !st.kb)));
      // le champ natif est posé, invisible, sur la carte réponse : la toucher ouvre le clavier (iPhone : seul un
      // toucher direct sur le champ l'ouvre)
      if (r && !st.ended) {
        answer.style.left = r.left + 'px'; answer.style.top = r.top + 'px';
        answer.style.width = (r.right - r.left) + 'px'; answer.style.height = (r.bottom - r.top) + 'px';
      } else { answer.style.width = '1px'; answer.style.height = '1px'; }
      api.frames++;
      if (manualDt == null) requestAnimationFrame(frame);
    }
    api.step = frame;
    requestAnimationFrame(frame);
  }

  // ---- clavier : le champ natif reçoit la frappe, la carte affiche ----
  answer.addEventListener('input', () => scene.setText(answer.value));
  answer.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); answer.blur(); } });
  answer.addEventListener('blur', () => scene.stopWriting());
  answer.addEventListener('focus', () => { if (started && !scene.state().writing) scene.startWriting(); });
  // relire en glissant verticalement sur la carte réponse (le champ est dessus)
  let ty = null, tvs = 0;
  answer.addEventListener('touchstart', e => { ty = e.touches[0].clientY; tvs = 0; }, { passive: true });
  answer.addEventListener('touchmove', e => {
    if (ty == null || scene.state().writing) return;
    const steps = Math.trunc((ty - e.touches[0].clientY) / 28);
    if (steps !== tvs) { scene.scrollAnswer(steps - tvs); tvs = steps; }
  }, { passive: true });
  answer.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) scene.scrollAnswer(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  const onVV = () => scene.setKeyboard(vv ? Math.max(0, innerHeight - vv.height) : 0);
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); }

  // ---- pointeur : toucher, glisser la carte (gauche : la suivante, droite : la précédente ; carte blanche : vers
  // le haut) ; inclinaison : téléphone (gyroscope — iPhone : autorisation au premier toucher, Android : sans
  // demande), souris sur ordinateur, doigt en repli ----
  let down = null, gyroLive = false;
  const ptr = { x: 0, y: 0 };
  canvas.addEventListener('pointerdown', e => { if (!started) return; if (sheet) { sheet.press(e.clientX, e.clientY); down = { x: e.clientX, y: e.clientY, sheet: true, d: 0 }; return; } down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, v: false, on: scene.hitAt(e.clientX, e.clientY) }; });
  // premier geste : si l'écriture attend le clavier, on l'ouvre (iPhone)
  addEventListener('touchend', () => { if (started && scene.state().writing) focusAnswer(); }, { passive: true });
  // relire la réponse validée : molette
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!started || Math.abs(e.deltaY) <= 4) return;
    if (sheet) { sheet.scroll(e.deltaY > 0 ? -1 : 1, now()); return; }
    scene.scrollAnswer(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', e => {
    if (!sheet) return;
    if (e.key === 'Escape') { sheet.back(now()); backEl.classList.remove('on'); }
    else if (e.key === 'ArrowDown' || e.key === 'PageDown') sheet.scroll(-1, now());
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') sheet.scroll(1, now());
  });
  addEventListener('pointermove', e => {
    if (!started) return;
    if (down && down.sheet) {
      const dy = e.clientY - down.y;
      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(e.clientX - down.x) && Math.sign(dy) !== down.d) { down.d = Math.sign(dy); down.moved = true; sheet?.scroll(dy < 0 ? -1 : 1, now()); sheet?.release(); }
      return;
    }
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && !down.v && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) down.moved = true;
      if (!down.moved && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) down.v = true;
      if (down.v && down.on === 'blank' && scene.state().mode !== 'free') { if (dy < -36 && !down.took) { down.took = scene.chooseBlank(now()); } return; }
      if (down.v) { const steps = Math.trunc(-dy / 28); if (steps !== (down.vs || 0)) { scene.scrollAnswer(steps - (down.vs || 0)); down.vs = steps; } return; }
      if (down.moved) { scene.drag(dx); return; }
    }
    // souris (ou doigt sans gyroscope) : sur la carte, elle est parfaitement droite ; elle s'incline à mesure
    // que le pointeur s'en éloigne
    if (e.pointerType !== 'mouse' && gyroLive) return;
    const r = sheet ? sheet.focusRect() : scene.cardRect(); if (!r) return;
    const x = e.clientX, y = e.clientY;
    const ox = x < r.left ? x - r.left : x > r.right ? x - r.right : 0;
    const oy = y < r.top ? y - r.top : y > r.bottom ? y - r.bottom : 0;
    ptr.x = Math.max(-1, Math.min(1, ox / (innerWidth * 0.3))); ptr.y = Math.max(-1, Math.min(1, -oy / (innerHeight * 0.3)));
  });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    if (down.sheet) { const mv = down.moved; down = null; sheet?.release(); if (!mv && sheet) { const r = sheet.tap(e.clientX, e.clientY, now()); if (r.type) log(r.type); } return; }
    const dx = e.clientX - down.x, dtm = Math.max(1, performance.now() - down.t);
    if (down.moved) { const r = scene.release(dx, dx / dtm, now()); if (r.type) log(r.type); down = null; return; }
    if (down.took) { down = null; setValue(''); focusAnswer(); log('carte blanche'); return; }   // iPhone : le clavier s'ouvre au lâcher
    if (down.v) { down = null; return; }
    down = null;
    const r = scene.tap(e.clientX, e.clientY, now());
    if (r.type) log(r.type);
    if (r.type === 'write') { answer.value = scene.state().active?.text || ''; focusAnswer(); }
  });
  backEl.addEventListener('click', () => {
    if (sheet) { if (sheet.back(now())) { backEl.classList.remove('on'); log('retour'); } return; }
    if (scene.state().mode !== 'free') { if (onExit) { answer.blur(); onExit(); } return; }
    if (scene.back(now())) { answer.value = scene.state().active?.text || ''; focusAnswer(); log('retour'); }
  });
  giveEl.addEventListener('click', () => { if (scene.give(now())) { answer.blur(); log('donné'); } });
  passEl.addEventListener('click', () => { const r = scene.pass(now()); if (r) { answer.blur(); log('passé'); } });


  // ---- gyroscope : zéro = tenue normale de lecture (≈ 50° vers l'arrière, à plat de côté) ----
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    gyroLive = true;
    ptr.x = Math.max(-1, Math.min(1, e.gamma / 25)); ptr.y = Math.max(-1, Math.min(1, -(e.beta - 50) / 25));
  }
  let orientAsked = false;
  function askOrientation() {
    if (orientAsked) return;
    const DO = window.DeviceOrientationEvent;
    if (DO && typeof DO.requestPermission === 'function') {          // iPhone : demande système, dans un geste
      orientAsked = true;
      DO.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => { orientAsked = false; });
    } else if (DO) { orientAsked = true; addEventListener('deviceorientation', onOrient); }   // Android : sans demande
  }
  // iPhone : la demande n'est acceptée qu'au lâcher du doigt (touchend / click), jamais au pointerdown
  addEventListener('touchend', () => { if (started) askOrientation(); }, { passive: true });
  addEventListener('click', () => { if (started) askOrientation(); });
  if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) askOrientation();

  // préparation invisible (textures, compilation des shaders) : une image dessinée puis effacée, avant start()
  api.warm = () => {
    scene.prepare();
    const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    scene.frame(now(), 0.016, W, H);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.finish();
  };

  // horloge pilotée : manual(true) fige le temps ; advance(s, fps) calcule les images une à une
  api.manual = on => { if (on) vclock = now(); else { vclock = null; requestAnimationFrame(api.step); } };
  api.advance = (sec, fps = 30) => { const n = Math.max(1, Math.round(sec * fps)); for (let i = 0; i < n; i++) { vclock += 1 / fps; api.step(0, 1 / fps); } return vclock; };
  // tests : tapAt(fx, fy) en fractions de l'écran ; type(s)
  api.tapAt = (fx, fy) => scene.tap(fx * canvas.clientWidth, fy * canvas.clientHeight, now());
  api.type = s => { answer.value = s; scene.setText(s); };
  return api;
}
