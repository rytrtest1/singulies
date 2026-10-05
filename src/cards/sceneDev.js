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
  autoplay(m);
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
    const iv = setInterval(() => { const st = sc.state(); if (st.active && st.writing) { clearInterval(iv); m.type(P.get('reponse')); give(); } }, 150);
  } else if (P.has('theme')) {
    const iv = setInterval(() => { const st = sc.state(); if (st.active && st.writing) { clearInterval(iv); sc.stopWriting(); if (sc.chooseBlank(m.now())) setTimeout(() => { m.type(P.get('theme')); give(); }, 1400); } }, 150);
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
