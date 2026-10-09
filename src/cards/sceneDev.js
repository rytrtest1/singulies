// Page de développement de la scène 2 (publiée en essai, sans lien) : /scene-cartes.html?prenom=LEA&seed=3
// La carte réponse se pose sous la question : le clavier s'ouvre tout seul (iPhone : au premier toucher, Safari
// n'ouvre le clavier que dans la foulée d'un geste). Coin corné / glisser la question / toucher le paquet = une
// autre ; « terminé » ferme le clavier ; molette ou glissé vertical sur la réponse = relire ; le signe sous la
// réponse = donner ; carte blanche (après une question passée) ; retour = le paquet ; PASSER (sur la carte blanche) = la fin. &reglages : réglages.
import { LOOK } from './scene.js';
import { mountCards } from './mount.js';
import { installSend } from '../app/send.js';
installSend();

const P = new URLSearchParams(location.search);
const PRENOM = (P.get('prenom') || 'LEA').toUpperCase();
const log = document.getElementById('log');
const look = {}; for (const k in LOOK) if (P.has(k)) look[k] = +P.get(k);
mountCards({ name: PRENOM, base: './', seed: P.has('seed') ? +P.get('seed') : undefined, look, canvas: document.getElementById('c'),
  shot: P.has('shot'), log: s => { log.textContent = s; } }).then(m => {
  window.__scene = m; m.ready = true;
  m.start();
  panel(m.scene);
  if (P.has('cachet')) sealBench(m); else if (P.has('enveloppe')) envPlay(m); else autoplay(m);
});

function panel(scene) {
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

// essai direct de la feuille : &reponse=… (une réponse tapée puis donnée), &theme=… (carte blanche), &passer (improvisation)
function autoplay(m) {
  const sc = m.scene;
  const give = () => setTimeout(() => { sc.stopWriting(); setTimeout(() => sc.give(m.now()), 500); }, 300);
  if (P.has('reponse')) {
    // (téléphone : la carte réponse n'ouvre pas l'écriture d'elle-même — on la prend)
    const iv = setInterval(() => { const st = sc.state(); if (st.active && !st.writing && st.active.kind === 'question' && !st.ended) sc.startWriting(); if (st.active && st.writing) { clearInterval(iv); m.type(P.get('reponse')); give(); } }, 150);
  } else if (P.has('theme')) {
    const iv = setInterval(() => { const st = sc.state(); if (st.active && (st.writing || st.discards >= 0)) { clearInterval(iv); sc.stopWriting(); if (sc.chooseBlank(m.now())) setTimeout(() => { m.type(P.get('theme')); give(); }, 1400); } }, 150);
  } else if (P.has('passer')) {
    setTimeout(() => sc.pass(m.now()), 2600);
  }
}

// captures : horloge pilotée jusqu'à la feuille (__toSheet()), puis __at(τ) avance jusqu'au temps τ de la feuille
window.__toSheet = async () => {
  const m = window.__scene, sleep = ms => new Promise(r => setTimeout(r, ms));
  m.manual(true);
  for (let i = 0; i < 40 && !m.sheet; i++) { m.advance(0.5); await sleep(120); }
  return !!m.sheet;
};
window.__at = tau => { const m = window.__scene; const d = tau - m.sheet.state().tau; if (d > 0) m.advance(d); return m.sheet.state(); };

// réglages du cachet (&cachet) : l'enveloppe jusqu'au cachet posé, le temps figé, puis des curseurs qui changent
// tout en direct ; la ligne des valeurs changées se recopie (et se passe aussi dans l'adresse : &s.albedo=0.4…)
async function toAddress(m) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sc = m.scene;
  await new Promise(res => { const iv = setInterval(() => { const st = sc.state(); if (st.active && !st.writing && st.active.kind === 'question' && !st.ended) sc.startWriting(); if (st.active && st.writing) { clearInterval(iv); res(); } }, 150); });
  m.type(P.get('reponse') || 'bonjour toi'); await sleep(300); sc.stopWriting(); await sleep(500); sc.give(m.now());
  await window.__toSheet();
  window.__at(m.sheet.timing.CURSOR_AT + 0.5); m.sheet.showOrders();
  m.advance(10.4 / 1.45);
  const sh = m.sheet, el = () => [...document.querySelectorAll('.sc-answer')].find(x => document.activeElement === x) || document.querySelectorAll('.sc-answer')[1];
  sh.startWriting(); m.advance(0.3);
  for (const v of ['Martin', '3 rue Haute', '', 'Paris', '75011']) {
    const a = el(); a.value = v; a.dispatchEvent(new Event('input'));
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); m.advance(0.3);
  }
  document.activeElement && document.activeElement.blur();
  m.advance(1.2);
}
const poster = () => [...document.querySelectorAll('.sc-pass')].find(e => e.textContent === 'POSTER').click();

// l'envoi seul (&enveloppe) : tout est préparé en accéléré (cartes, feuille, adresse remplie), puis l'envoi se joue en
// temps réel — recul, coup de tampon, retournement, rabat, cachet — et s'arrête sur le cachet posé ; « rejouer »
async function envPlay(m) {
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;z-index:4;background:#060606';
  document.body.appendChild(veil);
  log.style.display = 'none';
  await toAddress(m);
  const sh = m.sheet;
  const play = (sec, then) => {
    let last = performance.now(), left = sec;
    const f = n => { const dt = Math.min(0.05, (n - last) / 1000); last = n; left -= dt; m.advance(dt, 1 / Math.max(dt, 1e-3)); if (left > 0) requestAnimationFrame(f); else then && then(); };
    requestAnimationFrame(f);
  };
  veil.style.transition = 'opacity .8s'; veil.style.opacity = '0';
  setTimeout(() => veil.remove(), 900);
  play(1.4, () => {
    poster();
    play(5.0, () => {
      for (const e of document.querySelectorAll('.sc-pass')) e.style.display = 'none';
      const b = document.createElement('button');
      b.textContent = 'rejouer';
      b.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:5;background:#1a1a1a;color:#aaa;border:0;border-radius:6px;padding:10px 18px;font:13px system-ui';
      b.onclick = () => location.reload();
      b.addEventListener('pointerdown', e => e.stopPropagation());
      document.body.appendChild(b);
    });
  });
}

async function sealBench(m) {
  await toAddress(m);
  const sh = m.sheet;
  poster();
  m.advance(4.9);
  for (const e of document.querySelectorAll('.sc-pass')) e.style.display = 'none';
  const T = sh.sealTune, L0 = T.lamp();
  if (!Number.isFinite(T.shape.lampAz)) { T.shape.lampAz = T.shape.envAz; T.shape.lampEl = +L0.el.toFixed(2); }
  T.shape.zoom = 0.3; T.shape.camDy = -55;   // le cachet en haut de l'écran, au-dessus du panneau
  const G = { look: T.look, shape: T.shape };
  for (const [k, v] of P) if (k.startsWith('s.')) { const n = k.slice(2); if (n in T.look) T.look[n] = +v; else if (n in T.shape) T.shape[n] = +v; }
  const redraw = () => m.step(0, 0);
  redraw();
  const R = [
    ['shape', 'zoom', 0.1, 1, 0.01, 'vue : rapprochée ↔ enveloppe entière'],
    ['shape', 'rotY', -1.4, 1.4, 0.01, "enveloppe : tourner (glisser sur l'image)"],
    ['shape', 'rotX', -1.4, 1.4, 0.01, 'enveloppe : basculer'],
    ['shape', 'lampAz', -1.9, 1.9, 0.01, 'lampe : direction (0 = derrière le cachet)'],
    ['shape', 'lampEl', 0.25, 1.4, 0.01, 'lampe : hauteur (rad)'],
    ['shape', 'lamp', 0.6, 2.5, 0.05, 'lampe : distance (× cartes)'],
    ['look', 'metal', 0, 1, 0.01, 'cire : métal (0 = papier, 1 = argent)'],
    ['look', 'albedo', 0.02, 1, 0.01, 'cire : clarté'],
    ['look', 'env', 0, 0.6, 0.01, 'cire : lumière de la pièce'],
    ['look', 'spec', 0, 40, 0.5, 'cire : reflet de la lampe'],
    ['look', 'rough', 0.08, 1, 0.01, 'cire : rugosité (reflet net ↔ diffus)'],
    ['look', 'envSpec', 0, 6, 0.05, 'cire : reflet de la pièce (métal)'],
    ['look', 'sheen', 0, 2, 0.01, 'cire : lustre rasant'],
    ['look', 'diffRough', 0, 1, 0.01, 'cire : mat'],
    ['look', 'grain', 0, 4, 0.05, 'cire : grain'],
    ['look', 'fiber', 0, 0.15, 0.002, 'cire : relief du grain'],
    ['shape', 'marbre', 0, 2, 0.05, 'cire : marbrure'],
    ['look', 'glint', 0, 4, 0.05, 'cire : paillettes'],
    ['shape', 'hc', 0.3, 4, 0.05, 'forme : hauteur du bourrelet (mm)'],
    ['shape', 'hd', 0, 2, 0.05, "forme : hauteur de l'empreinte (mm)"],
    ['shape', 'crest', 0.1, 0.9, 0.01, 'forme : crête (près du centre ↔ du bord)'],
    ['shape', 'ring', 0, 0.4, 0.01, "forme : anneau autour de l'empreinte"],
    ['shape', 'pits', 0, 4, 0.05, 'forme : piqûres de la cire'],
    ['look', 'h', 0, 1, 0.01, 'logo : relief'],
    ['look', 'b', 0.05, 1.5, 0.01, 'logo : arrondi'],
    ['look', 'foot', 0, 1, 0.01, 'logo : bord net'],
    ['look', 'crease', 0, 1, 0.01, 'logo : trait sombre au pied'],
    ['shape', 'cavWall', 0, 1, 0.01, 'ombre : creux au pied du bourrelet'],
    ['shape', 'cavEdge', 0, 1, 0.01, 'ombre : bord de la cire'],
    ['shape', 'ao', 0, 1, 0.01, 'ombre portée : force'],
    ['shape', 'aoW', 0.1, 5, 0.05, 'ombre portée : largeur (mm)'],
  ];
  const init = {}; for (const [g, k] of R) init[g + k] = G[g][k];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:6px;right:6px;bottom:6px;z-index:5;font:12px system-ui;color:#999';
  const box = document.createElement('div');
  box.style.cssText = 'max-height:44vh;overflow:auto;background:rgba(0,0,0,.85);padding:8px;border-radius:8px';
  const out = document.createElement('div'); out.style.cssText = 'margin:4px 0 8px;color:#ddd;user-select:all;word-break:break-all';
  const show = () => { out.textContent = R.filter(([g, k]) => G[g][k] !== init[g + k] && !['zoom', 'rotX', 'rotY'].includes(k)).map(([g, k]) => 's.' + k + '=' + G[g][k]).join('&') || '(rien de changé)'; };
  box.appendChild(out);
  const inputs = {};
  for (const [g, k, a, b, st, label] of R) {
    const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:44% 1fr 46px;gap:6px;align-items:center;margin:3px 0';
    l.innerHTML = `<span>${label}</span><input type=range min=${a} max=${b} step=${st} value=${G[g][k]}><span>${G[g][k]}</span>`;
    const inp = l.children[1], v = l.children[2];
    inp.oninput = () => { G[g][k] = +inp.value; if (k === 'lampAz') T.shape.envAz = +inp.value; v.textContent = inp.value; show(); redraw(); };
    inputs[k] = [inp, v];
    box.appendChild(l);
  }
  // glisser sur l'image (souris ou doigt) = tourner l'enveloppe autour du cachet ; la scène ne reçoit rien
  const sync = () => { for (const k of ['rotX', 'rotY']) { const [inp, v] = inputs[k]; inp.value = T.shape[k]; v.textContent = T.shape[k].toFixed(2); } redraw(); };
  let drag = null;
  const clampR = x => Math.max(-1.4, Math.min(1.4, x));
  const mine = e => !wrap.contains(e.target);
  addEventListener('pointerdown', e => { if (!mine(e)) return; e.stopImmediatePropagation(); e.preventDefault(); drag = { x: e.clientX, y: e.clientY, rx: T.shape.rotX, ry: T.shape.rotY }; }, true);
  addEventListener('pointermove', e => { if (!drag) return; e.stopImmediatePropagation();
    T.shape.rotY = +clampR(drag.ry + (e.clientX - drag.x) * 0.008).toFixed(3); T.shape.rotX = +clampR(drag.rx + (e.clientY - drag.y) * 0.008).toFixed(3); sync(); }, true);
  addEventListener('pointerup', e => { if (drag) { drag = null; e.stopImmediatePropagation(); } }, true);
  addEventListener('pointercancel', () => { drag = null; }, true);
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'click', 'wheel']) addEventListener(ev, e => { if (mine(e)) { e.stopImmediatePropagation(); if (ev === 'touchmove') e.preventDefault(); } }, { capture: true, passive: false });
  document.body.style.touchAction = 'none';
  const reset = document.createElement('button');
  reset.textContent = 'remettre droite'; reset.style.cssText = 'background:#222;color:#bbb;border:0;border-radius:6px;padding:6px 10px;font:12px system-ui;margin:0 0 6px 6px';
  reset.onclick = () => { T.shape.rotX = T.shape.rotY = 0; sync(); };
  const btn = document.createElement('button');
  btn.textContent = 'cachet'; btn.style.cssText = 'background:#222;color:#bbb;border:0;border-radius:6px;padding:6px 10px;font:12px system-ui;margin-bottom:6px';
  btn.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
  wrap.append(btn, reset, box);
  for (const ev of ['pointerdown', 'touchstart', 'wheel', 'keydown']) wrap.addEventListener(ev, e => e.stopPropagation());
  show(); document.body.appendChild(wrap);
}
