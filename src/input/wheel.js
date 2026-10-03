// Saisie « roue » (?saisie=roue) : on compose le prénom lettre par lettre en faisant tourner une roue,
// comme le sélecteur de date d'un téléphone. Pas de clavier virtuel.
// Défilement vertical = lettre en cours (inertie + aimantation), glisser à gauche = lettre suivante,
// glisser à droite = retour, double toucher (ou Entrée) = valider.
// Le texte (lettres validées + lettre en cours) est écrit dans le modèle, source de vérité.
import { MAX_LEN } from '../text/normalize.js';

export const WHEEL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '; // l'espace (prénoms composés) est une position de la roue
const N = WHEEL.length;
const mod = (i) => ((i % N) + N) % N;

export function createWheel({ model, onChange, onSubmit, onEscape, getStep, reduced = false }) {
  const st = {
    letters: [],          // lettres validées
    cur: 0,               // position (flottante) de la roue en cours
    vel: 0,               // lettres/s
    drag: null,
    touched: false,       // tant que personne n'a touché : la roue tourne seule, lentement
    lastTap: -1,
    keyed: false,         // lettre en cours posée au clavier
  };
  // reprise d'un prénom mémorisé : toutes ses lettres sont validées sauf la dernière
  const init = model.text.replace(/ +$/, '');
  if (init) { st.letters = [...init.slice(0, -1)]; st.cur = WHEEL.indexOf(init.slice(-1)); st.touched = true; }

  const current = () => WHEEL[mod(Math.round(st.cur))];
  const text = () => (st.letters.join('') + current()).replace(/^ +/, '').replace(/ {2,}/g, ' ').slice(0, MAX_LEN);
  let lastText = null;
  function sync() {
    if (!st.touched) return;
    const t = text();
    if (t === lastText) return;
    lastText = t;
    model.replace(0, model.text.length, t, { kind: 'edit' });
    onChange();
  }

  function next() {      // valide la lettre en cours, ouvre la suivante (même lettre : doublons faciles)
    st.keyed = false;
    if (st.letters.length + 1 >= MAX_LEN) return;
    const c = current();
    if (c === ' ' && (!st.letters.length || st.letters[st.letters.length - 1] === ' ')) return;
    st.letters.push(c); st.cur = Math.round(st.cur); st.vel = 0; sync();
  }
  function back() {
    if (!st.letters.length) return;
    st.cur = WHEEL.indexOf(st.letters.pop()); st.vel = 0; sync();
  }
  function touch() { if (!st.touched) { st.touched = true; st.cur = Math.round(st.cur); st.vel = 0; sync(); } }

  // ---------- gestes ----------
  function down(e) {
    if (e.button > 0) return;
    touch();
    st.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), mode: null, moved: false, v: 0 };
  }
  function move(e) {
    const d = st.drag; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.mode && Math.hypot(dx, dy) > 10) d.mode = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
    if (d.mode === 'v') {
      const now = performance.now(), step = getStep();
      const dl = -(e.clientY - d.y) / step;            // vers le haut = lettre suivante
      st.cur += dl;
      const dt = Math.max(1, now - d.t) / 1000;
      d.v = 0.7 * d.v + 0.3 * (dl / dt);
      d.t = now;
      sync();
    }
    d.x = e.clientX; d.y = e.clientY; d.moved = d.moved || Math.hypot(dx, dy) > 10;
  }
  function up(e) {
    const d = st.drag; st.drag = null; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (d.mode === 'v') { st.vel = reduced ? 0 : Math.max(-25, Math.min(25, d.v)); return; }
    if (d.mode === 'h' && Math.abs(dx) > 40) { if (dx < 0) next(); else back(); return; }
    if (!d.moved) {      // double toucher = valider
      const now = performance.now();
      if (now - st.lastTap < 350) { st.lastTap = -1; onSubmit(); } else st.lastTap = now;
    }
  }
  function wheelEv(e) { e.preventDefault(); touch(); st.cur += Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 60); st.vel = 0; sync(); }
  function key(e) {
    touch();
    if (e.key === 'ArrowUp') { st.cur -= 1; st.cur = Math.round(st.cur); }
    else if (e.key === 'ArrowDown') { st.cur += 1; st.cur = Math.round(st.cur); }
    else if (e.key === 'ArrowRight' || e.key === ' ') next();
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') back();
    else if (e.key === 'Enter') { onSubmit(); }
    // touche lettre : elle remplace la lettre en cours ; la lettre suivante valide la précédente
    else if (/^[a-z]$/i.test(e.key)) { if (st.keyed) next(); st.cur = WHEEL.indexOf(e.key.toUpperCase()); st.keyed = true; e.preventDefault(); st.vel = 0; sync(); return; }
    else return;
    e.preventDefault(); st.vel = 0; sync();
  }

  let on = false;
  function enable(v) {
    if (v === on) return; on = v;
    const f = v ? 'addEventListener' : 'removeEventListener';
    document[f]('pointerdown', down); window[f]('pointermove', move); window[f]('pointerup', up); window[f]('pointercancel', up);
    window[f]('wheel', wheelEv, { passive: false }); window[f]('keydown', key);
  }

  // ---------- animation : inertie, aimantation, rotation lente au repos ----------
  function update(dt) {
    if (!st.touched) { if (!reduced) st.cur += 0.45 * dt; return; }
    if (st.drag && st.drag.mode === 'v') return;
    if (Math.abs(st.vel) > 0.3) { st.cur += st.vel * dt; st.vel *= Math.exp(-dt * 3.2); }
    else {
      st.vel = 0;
      const tgt = Math.round(st.cur);
      st.cur += (tgt - st.cur) * (1 - Math.exp(-dt * (reduced ? 60 : 12)));
      if (Math.abs(tgt - st.cur) < 1e-3) st.cur = tgt;
    }
    sync();
  }

  // lettres voisines à dessiner : décalage k (−2…2, hors 0) et fraction de rotation
  function neighbors() {
    const r = Math.round(st.cur), frac = st.cur - r, out = [];
    for (let k = -2; k <= 2; k++) out.push({ k, ch: WHEEL[mod(r + k)], off: k - frac });
    return out;
  }

  sync();
  return { enable, update, neighbors, get displayText() { return text(); }, get touched() { return st.touched; }, get frac() { return st.cur - Math.round(st.cur); }, get current() { return current(); }, get count() { return st.letters.length; } };
}
