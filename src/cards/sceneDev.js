// Page de développement de la scène 2 (publiée en essai, sans lien) : /scene-cartes.html?prenom=LEA&seed=3
// La carte réponse se pose sous la question : le clavier s'ouvre tout seul (iPhone : au premier toucher, Safari
// n'ouvre le clavier que dans la foulée d'un geste). Coin corné / glisser la question / toucher le paquet = une
// autre ; « terminé » ferme le clavier ; molette ou glissé vertical sur la réponse = relire ; le signe sous la
// réponse = donner ; carte blanche (après une question passée) ; retour = le paquet ; PASSER (sur la carte blanche) = la fin. &reglages : réglages.
import { createCardScene, LOOK } from './scene.js';

const P = new URLSearchParams(location.search);
const PRENOM = (P.get('prenom') || 'LEA').toUpperCase();
const log = document.getElementById('log'), answer = document.getElementById('answer');
const giveEl = document.getElementById('give'), passEl = document.getElementById('pass'), backEl = document.getElementById('back'), veil = document.getElementById('veil');
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: P.has('shot') });
const look = {}; for (const k in LOOK) if (P.has(k)) look[k] = +P.get(k);
const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;

function finish(d) {
  log.textContent = d.kind + (d.text ? ' : ' + d.text : '');
  const detail = { name: PRENOM, ...d };
  try { if (typeof window.onCardChosen === 'function') window.onCardChosen(detail); } catch (e) { console.error(e); }
  window.dispatchEvent(new CustomEvent('singulies:card-chosen', { detail }));
  veil.style.opacity = 1;
}
function focusAnswer() { if (document.activeElement !== answer) answer.focus({ preventScroll: true }); }
createCardScene(gl, { base: './', seed: P.has('seed') ? +P.get('seed') : undefined, look, on: { end: finish, write: focusAnswer, discard: () => { answer.value = ''; } } }).then(start);

function start(scene) {
  scene.setName(PRENOM);
  scene.start(now());
  window.__scene = { scene, ready: true, frames: 0 };
  let last = performance.now();
  function frame(n) {
    const t = now(), dt = Math.min(0.05, (n - last) / 1000); last = n;
    const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // signes : donner (sous la carte écrite, clavier fermé) ; passer (avec la carte blanche offerte)
    const st = scene.state(), r = scene.activeRect();
    const canGive = st.active && st.active.text && !st.writing && !st.ended && r;
    giveEl.classList.toggle('on', !!canGive);
    if (r) { giveEl.style.left = ((r.left + r.right) / 2 - 22) + 'px'; giveEl.style.top = (r.bottom + 10) + 'px'; }
    // PASSER : sur la carte blanche seulement, après 3 s sans frappe, sous la carte ; retour : en haut à gauche
    const mk = scene.marks();
    passEl.classList.toggle('on', !st.ended && !st.kb && st.mode === 'free' && st.idle > 3 && !(st.active && st.active.text));
    if (mk) passEl.style.top = (mk.deckBottom + 34) + 'px';
    backEl.classList.toggle('on', !st.ended && st.mode === 'free');
    // le champ natif est posé, invisible, sur la carte réponse : la toucher ouvre le clavier (iPhone : seul un
    // toucher direct sur le champ l'ouvre)
    if (r && !st.ended) {
      answer.style.left = r.left + 'px'; answer.style.top = r.top + 'px';
      answer.style.width = (r.right - r.left) + 'px'; answer.style.height = (r.bottom - r.top) + 'px';
    } else { answer.style.width = '1px'; answer.style.height = '1px'; }
    window.__scene.frames++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- clavier : le champ natif reçoit la frappe, la carte affiche ----
  answer.addEventListener('input', () => scene.setText(answer.value));
  answer.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); answer.blur(); } });
  answer.addEventListener('blur', () => scene.stopWriting());
  answer.addEventListener('focus', () => { if (!scene.state().writing) scene.startWriting(); });
  // relire en glissant verticalement sur la carte réponse (le champ est dessus)
  let ty = null, tvs = 0;
  answer.addEventListener('touchstart', e => { ty = e.touches[0].clientY; tvs = 0; }, { passive: true });
  answer.addEventListener('touchmove', e => {
    if (ty == null || scene.state().writing) return;
    const steps = Math.trunc((ty - e.touches[0].clientY) / 28);
    if (steps !== tvs) { scene.scrollAnswer(steps - tvs); tvs = steps; }
  }, { passive: true });
  answer.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) scene.scrollAnswer(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  const vv = window.visualViewport;
  const onVV = () => scene.setKeyboard(vv ? Math.max(0, innerHeight - vv.height) : 0);
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); }

  // ---- pointeur : toucher, glisser la carte, et inclinaison (souris ; doigt en repli sans gyroscope) ----
  let down = null, gyroLive = false;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, v: false }; askOrientation(); });
  // premier geste : si l'écriture attend le clavier, on l'ouvre (iPhone)
  addEventListener('touchend', () => { if (scene.state().writing) focusAnswer(); }, { passive: true });
  // relire la réponse validée : molette
  canvas.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) scene.scrollAnswer(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  addEventListener('pointermove', e => {
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && !down.v && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) down.moved = true;
      if (!down.moved && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) down.v = true;
      if (down.v) { const steps = Math.trunc(-dy / 28); if (steps !== (down.vs || 0)) { scene.scrollAnswer(steps - (down.vs || 0)); down.vs = steps; } return; }
      if (down.moved) { scene.drag(dx); return; }
    }
    // souris (ou doigt sans gyroscope) : sur la carte, elle est parfaitement droite ; elle s'incline à mesure
    // que le pointeur s'en éloigne
    if (e.pointerType === 'mouse' || !gyroLive) {
      const r = scene.cardRect(); if (!r) return;
      const x = e.clientX, y = e.clientY;
      const ox = x < r.left ? x - r.left : x > r.right ? x - r.right : 0;
      const oy = y < r.top ? y - r.top : y > r.bottom ? y - r.bottom : 0;
      scene.setTilt(ox / (innerWidth * 0.3), -oy / (innerHeight * 0.3));
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dtm = Math.max(1, performance.now() - down.t);
    if (down.moved) { const r = scene.release(dx, dx / dtm, now()); if (r.type) log.textContent = r.type; down = null; return; }
    if (down.v) { down = null; return; }
    down = null;
    const r = scene.tap(e.clientX, e.clientY, now());
    if (r.type) log.textContent = r.type;
    if (r.type === 'write') { answer.value = scene.state().active?.text || ''; focusAnswer(); }
  });
  backEl.addEventListener('click', () => { if (scene.back(now())) { answer.value = scene.state().active?.text || ''; focusAnswer(); log.textContent = 'retour'; } });
  giveEl.addEventListener('click', () => { if (scene.give(now())) { answer.blur(); log.textContent = 'donné'; } });
  passEl.addEventListener('click', () => { const r = scene.pass(now()); if (r) { answer.blur(); log.textContent = 'passé'; } });

  // ---- gyroscope (iPhone : demande au premier geste) ----
  let g0 = null, orientAsked = false;
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    // position zéro : tenue normale de lecture (écran penché d'environ 50° vers l'arrière, à plat de côté)
    if (!g0) g0 = { b: 50, g: 0 };
    gyroLive = true;
    scene.setTilt((e.gamma - g0.g) / 25, -(e.beta - g0.b) / 25);
  }
  function askOrientation() {
    if (orientAsked) return;
    const DO = window.DeviceOrientationEvent;
    if (DO && typeof DO.requestPermission === 'function') {
      orientAsked = true;
      DO.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => { orientAsked = false; });
    } else { orientAsked = true; addEventListener('deviceorientation', onOrient); }
  }
  addEventListener('touchend', askOrientation, { passive: true });
  if (!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function')) askOrientation();

  // tests : window.__scene.tapAt(fx, fy) en fractions de l'écran
  window.__scene.tapAt = (fx, fy) => scene.tap(fx * canvas.clientWidth, fy * canvas.clientHeight, now());
  window.__scene.type = s => { answer.value = s; scene.setText(s); };

  // réglages à la main (&reglages) : tous les paramètres de la carte, panneau repliable ; la ligne de
  // valeurs (seulement celles changées) se recopie, et se passe aussi dans l'adresse
  if (P.has('reglages')) {
    const R = {
      lightMode: [0, 2, 1, 'LUMIÈRE : 0 orbite · 1 orbite + hauteur (défaut) · 2 lampe de poche'],
      elevAmp: [0, 1.2, 0.02, '1 : variation de hauteur'], flashZ: [20, 200, 2, '2 : hauteur de la lampe de poche'], cardTilt: [0, 0.5, 0.005, 'inclinaison des cartes'], lightVar: [0, 2, 0.05, 'ampleur du mouvement de la lumière'], sway: [0, 0.15, 0.002, 'respiration (carte en attente : moitié)'], unfocusDim: [0, 1, 0.01, 'baisse de la carte en attente'],
      spot: [0, 0.4, 0.002, 'projecteur sur la carte active'],
      nameFlat: [0, 1, 0.01, 'prénom à plat : gris (0 = relief)'],
      light: [0, 0.3, 0.001, 'lampe : force'], lightAz: [0, 6.28, 0.01, 'lampe : direction'], lightZ: [20, 600, 5, 'lampe : hauteur'],
      lightR0: [0.2, 3, 0.05, 'lampe : distance'], lightR: [5, 400, 5, 'lampe : taille (ombres douces)'], tiltAmp: [0, 2, 0.05, 'variation (inclinaison)'],
      env: [0, 1, 0.01, 'lumière de face'], envSpec: [0, 0.5, 0.005, 'reflet de la pièce'], exposure: [0.2, 3, 0.01, 'exposition'], toe: [0, 0.015, 0.0002, 'noir du papier'],
      albedo: [0.005, 0.1, 0.001, 'papier : clarté'], grain: [0, 4, 0.05, 'papier : grain'], fiber: [0, 0.06, 0.001, 'papier : relief des fibres'],
      glint: [0, 4, 0.05, 'papier : scintillement'], rough: [0.1, 1, 0.01, 'papier : rugosité'], spec: [0, 4, 0.05, 'papier : reflet'],
      sheen: [0, 2, 0.01, 'papier : lustre rasant'], diffRough: [0, 1, 0.01, 'papier : mat'], edge: [0, 3, 0.05, 'bords cassés'],
      h: [0, 1, 0.01, 'gaufrage : hauteur'], b: [0.1, 2, 0.01, 'gaufrage : arrondi'], foot: [0, 1, 0.01, 'gaufrage : pli net'],
      footW: [0.02, 0.4, 0.005, 'gaufrage : largeur du pli'], crease: [0, 1, 0.01, 'gaufrage : trait sombre'],
      inkAlb: [0, 4, 0.05, 'encre : blancheur'], inkThr: [0.15, 0.7, 0.01, 'encre : finesse du trait'], inkVar: [0, 3, 0.05, 'encre : variations'],
      inkPaper: [0, 30, 0.5, 'encre : papier visible'], inkOrg: [0, 3, 0.05, 'encre : contours irréguliers'], inkWear: [0, 3, 0.05, 'encre : usure'],
      inkPress: [0, 0.1, 0.002, 'encre : creusement'],
      nameAlb: [0, 2, 0.01, 'prénom : clarté'], nameRelief: [0, 0.3, 0.005, 'prénom : relief'], nameBevel: [0.01, 0.2, 0.005, 'prénom : arrondi'], nameSpec: [0, 3, 0.05, 'prénom : brillance'], nameGrain: [0, 4, 0.05, 'prénom : grain'], nameFiber: [0, 0.2, 0.002, 'prénom : relief des fibres'], nameGlint: [0, 4, 0.05, 'prénom : scintillement'],
    };
    const init = { ...scene.look };
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:6px;right:6px;bottom:6px;z-index:5;font:12px system-ui;color:#999';
    const btn = document.createElement('button');
    btn.textContent = 'réglages'; btn.style.cssText = 'background:#222;color:#bbb;border:0;border-radius:6px;padding:6px 10px;font:12px system-ui';
    const box = document.createElement('div');
    box.style.cssText = 'display:none;margin-top:6px;max-height:48vh;overflow:auto;background:rgba(0,0,0,.85);padding:8px;border-radius:8px';
    const out = document.createElement('div'); out.style.cssText = 'margin:4px 0 8px;color:#ddd;user-select:all;word-break:break-all';
    const show = () => { out.textContent = Object.keys(R).filter(k => scene.look[k] !== init[k]).map(k => k + '=' + scene.look[k]).join('&') || '(rien de changé)'; };
    box.appendChild(out);
    for (const k in R) {
      const [a, b, st, label] = R[k];
      const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:44% 1fr 52px;gap:6px;align-items:center;margin:3px 0';
      l.innerHTML = `<span>${label}</span><input type=range min=${a} max=${b} step=${st} value=${scene.look[k]}><span>${scene.look[k]}</span>`;
      const inp = l.children[1], v = l.children[2];
      inp.oninput = () => { scene.look[k] = +inp.value; v.textContent = inp.value; show(); };
      box.appendChild(l);
    }
    btn.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
    wrap.append(btn, box);
    wrap.addEventListener('pointerdown', e => e.stopPropagation());
    show(); document.body.appendChild(wrap);
  }
}
