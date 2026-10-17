// « le jeu » — le paquet SINGULIES (17/10, recodé ; 17/10 soir : une couche qu'on peut ouvrir de partout, avec un relais seamless depuis
// la page SINGULIES). La scène des cartes en mode jeu — mêmes gestes que les questions du poème : le paquet, AU CENTRE, tire une
// question ; glisser à droite = la suivante, à gauche = la précédente ; toucher le paquet ou le coin corné = une autre. Rien à
// écrire : on regarde, on tire, on PARTAGE (le partage du téléphone — message, story… — avec la question et un lien q/<id> qui
// l'ouvre ici ; sinon le lien copié). COMMANDER : la page d'achat (JEU_LINK ; « bientôt » en attendant). Question partagée
// (jeu.html?q=…) : elle est tirée en premier.
// Trois façons de l'ouvrir : seul (jeu.html : standalone), par-dessus la page (openGame : le sous-bandeau, le menu), ou en RELAIS
// depuis le paquet de la page SINGULIES (relay : une couche transparente préparée d'avance ; au toucher elle prend la carte du
// dessus là où elle est — deck3d.deckScreen — et la retourne sur la question : une seule scène dessine la carte, aucun fondu ; au
// retour, la question se retourne sur le paquet qui redescend, et la page SINGULIES reprend son paquet).
import { createCardScene } from '../cards/scene.js';
import QUESTIONS from '../cards/questions.json';
import { dpr3d } from '../app/perf.js';
import { count } from '../app/count.js';
import { EST_VERSION } from '../core/version.js';
import { ouvrirAttente } from '../core/attente-ui.js';

export const JEU_LINK = null;                // page d'achat du jeu (null = « bientôt »)
const FIRST_BACK = { label: 'SINGULIES, le jeu', lines: ['SINGULIES', 'le jeu'], center: true };   // le dos du paquet, comme sur la page SINGULIES

const CSS = `
.jg { position: fixed; inset: 0; z-index: 44; background: #060606; opacity: 0; transition: opacity .9s ease; touch-action: pinch-zoom; pointer-events: none; }
.jg.on { opacity: 1; }
.jg.live { pointer-events: auto; }
.jg.relay { background: transparent; }
.jg canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.jg .jg-sign { position: absolute; left: 0; right: 0; text-align: center; margin: 0; padding: 0 0 0 .4em; border: 0; background: transparent;
  font: 500 14px/44px 'SG Garamond', Georgia, serif; letter-spacing: .4em; color: #fff; opacity: 0; transition: opacity 1.1s, top .8s ease;
  pointer-events: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.jg .jg-sign.on { opacity: .62; pointer-events: auto; }
.jg .jg-sign.on:hover { opacity: .85; }
.jg .jg-back { display: none; }
.jg .jg-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// opts : { base, reduced, relay, deck: () => le paquet de la page SINGULIES (deck3d), standalone, firstQ, onReturned, onTaken }
export async function mountGame(opts = {}) {
  const { base = './', reduced = false, relay: RELAY = false } = opts;
  if (!document.getElementById('jg-style')) { const st = document.createElement('style'); st.id = 'jg-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'jg' + (RELAY ? ' relay' : ''); root.dataset.x = 'jeu';
  const canvas = document.createElement('canvas'); root.appendChild(canvas);
  document.body.appendChild(root);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: RELAY, premultipliedAlpha: true, depth: true });
  if (!gl) { root.remove(); return null; }
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; root.appendChild(e); return e; };
  const backEl = el('button', 'jg-back', ''); backEl.type = 'button'; backEl.setAttribute('aria-label', 'Retour');
  if (opts.standalone) backEl.remove();   // (jeu.html : le retour du haut va à la page d'avant, il ne ferme rien)
  const shareEl = el('button', 'jg-sign', 'PARTAGER'); shareEl.type = 'button'; shareEl.setAttribute('aria-label', 'Partager cette question, pour la poser à quelqu’un');
  // (18/10, correctif C7) dans les versions : COMMANDER ne faisait rien (le jeu n'est pas encore en vente) → « ME PREVENIR »
  const ATTENTE = EST_VERSION && !JEU_LINK;
  const buyEl = el('button', 'jg-sign', ATTENTE ? 'ME PREVENIR' : 'COMMANDER'); buyEl.type = 'button';
  buyEl.setAttribute('aria-label', ATTENTE ? 'Me prévenir quand le jeu SINGULIES sort' : 'Commander le jeu SINGULIES');
  const sr = el('div', 'jg-sr'); sr.setAttribute('aria-live', 'polite');
  const say = t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); };
  const ev = (id, action) => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id, action } }));

  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  let current = null, firstAt = null, shareReady = false, visible = true, started = false, taken = false, going = false;
  const scene = await createCardScene(gl, { base, jeu: true, jeuWrite: false, autoWrite: false, firstQ: opts.firstQ ?? null, noIntro: RELAY, deckAt: 0.82,   // (le paquet au centre de l'écran : la caméra incline la scène, 42 % de la disposition = 34 % à l'écran)
   
    firstBack: RELAY ? FIRST_BACK : null, on: {
      draw: d => {
        current = d.id; const q = QUESTIONS.find(x => x.id === d.id)?.q;
        if (firstAt == null) firstAt = now() + 1.5 + 1.2 + 0.045 * (q || '').length;      // posée, puis le temps de la lire : PARTAGER
        if (q) say(q); ev(d.id, 'tiree');
      },
      discard: d => ev(d.id, 'passee'),
    } });
  scene.setName('');

  // ---- la boucle ----
  let raf = 0, last = 0, ptr = { x: 0, y: 0 };
  function frame(n) {
    if (!visible || document.hidden) { raf = 0; return; }
    const t = now(), dt = Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const dpr = dpr3d(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (RELAY) gl.clearColor(0, 0, 0, 0); else gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // PARTAGER : sous la carte, à une place fixe (la place de repos de la question), en fondu une fois la première question lue
    // (17/10, Maxence : « remonte COMMANDER à un endroit plus logique sur téléphone ») les deux gestes sous la carte, l'un sous l'autre :
    // PARTAGER, puis COMMANDER ; jamais plus bas que le haut de SINGULIES (le fil, en bas)
    const lowest = H - Math.max(94, H * 0.105) - 6;
    const mk = scene.marks();
    const shareTop = mk ? Math.min(mk.deckBottom + 14, lowest - 54) : lowest - 54;
    if (firstAt != null && t - firstAt > 0) shareReady = true;
    if (mk) shareEl.style.top = shareTop + 'px';
    shareEl.classList.toggle('on', !going && shareReady);
    buyEl.style.top = Math.min(shareTop + 54, lowest) + 'px';
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!started) { started = true; scene.start(now()); } if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  start();
  if (RELAY) {
    // préparée d'avance : deux images pour tout compiler, puis rien ne tourne jusqu'au toucher (la couche est vidée : sinon sa
    // dernière image — le paquet à sa place — apparaîtrait un instant)
    scene.drawAt(1e9);
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (!taken) { visible = false; cancelAnimationFrame(raf); raf = 0; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } })));
  } else {
    root.classList.add('mn-jeu', 'live');
    requestAnimationFrame(() => root.classList.add('on'));
    setTimeout(() => buyEl.classList.add('on'), 1200);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } });

  // ---- gestes : comme les questions du poème ----
  let down = null;
  canvas.addEventListener('pointerdown', e => {
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
    scene.tap(e.clientX, e.clientY, now());
  });

  // ---- partager une question : la poser à quelqu'un qu'on connaît (message, story…) ----
  async function share() {
    if (current == null) return;
    const id = current, q = (QUESTIONS.find(x => x.id === id)?.q || '').toLowerCase();
    const link = new URL('q/' + id, document.baseURI).href;      // sa page porte la vignette de la question (tools/og-image.mjs)
    const text = '« ' + q + ' »\nune question de SINGULIES, le jeu d’Eternel';
    ev(id, 'partagee'); count('jeu/partage');
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text, url: link }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + link); flash(shareEl, 'LIEN COPIE'); } catch { flash(shareEl, link); }
  }
  const flash = (b, txt) => { const t = b.textContent; b.textContent = txt; setTimeout(() => { b.textContent = t; }, 1800); };
  shareEl.addEventListener('click', share);
  buyEl.addEventListener('click', () => {
    if (ATTENTE) { count('jeu/me-prevenir'); ouvrirAttente({ liste: 'jeu' }); return; }
    count('jeu/commander'); if (JEU_LINK) { location.href = JEU_LINK; return; } flash(buyEl, 'BIENTOT');
  });

  // ---- relais : prendre le paquet de la page SINGULIES là où il est, et le lui rendre ----
  const deckNow = () => opts.deck?.() || null;
  function takeOver() {
    const dk = deckNow(), d = dk?.deckScreen?.() || { x: innerWidth / 2, y: innerHeight * 0.3, w: 0 };
    taken = true; going = false; visible = true; firstAt = null; shareReady = false;
    for (const b of [buyEl, shareEl]) b.style.transition = '';
    root.style.transition = 'none'; root.classList.add('on', 'live', 'mn-jeu');
    scene.relayIn(d.x, d.y, d.w, now(), () => deckNow()?.lightNow?.(), d.v || null);
    last = 0; if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => deckNow()?.giveDeck?.());          // la page SINGULIES cesse de dessiner son paquet
    opts.onTaken?.();
    setTimeout(() => { if (!going) buyEl.classList.add('on'); }, 1500);
  }
  function leave() {
    if (RELAY) {
      if (going || scene.relaying() || !taken) return;
      // le retour : la question se retourne sur le paquet, qui redescend à la place qu'il avait ; la page SINGULIES reprend son paquet
      going = true;
      for (const b of [buyEl, shareEl]) { b.style.transition = 'opacity .25s'; b.classList.remove('on'); }
      root.classList.remove('live', 'mn-jeu');
      const dk = deckNow(), d = dk?.deckScreen?.() || { x: innerWidth / 2, y: innerHeight * 0.3, w: 0 };
      scene.relayOut(d.x, d.y, d.w, now(), () => {
        deckNow()?.takeDeck?.();
        requestAnimationFrame(() => requestAnimationFrame(() => { taken = false; visible = false; root.classList.remove('on'); cancelAnimationFrame(raf); raf = 0; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); opts.onReturned?.(); }));
      }, () => deckNow()?.lightNow?.(), d.v || null);
      return;
    }
    // une couche ordinaire : elle s'efface
    visible = false; root.classList.remove('on', 'live', 'mn-jeu'); root.style.transition = 'opacity .45s ease';
    setTimeout(() => { cancelAnimationFrame(raf); raf = 0; root.remove(); try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* */ } opts.onReturned?.(); }, 520);
  }
  backEl.addEventListener('click', leave);
  window.__jeu = { scene, now };          // essais
  return { root, leave, takeOver, scene, now, get on() { return RELAY ? taken && !going : visible; } };
}

// par-dessus la page (le menu, le sous-bandeau) : une couche qui s'ouvre, sans relais ; sans WebGL2 : la page seule
let openG = null;
export async function openGame(opts = {}) {
  if (document.querySelector('.mn-jeu') || openG) return;
  openG = true;
  try {
    const g = await mountGame({ ...opts, relay: false, onReturned: () => { openG = null; opts.onReturned?.(); } });
    if (!g) { openG = null; location.href = new URL((opts.base || './') + 'jeu.html', document.baseURI).href; return; }
    openG = g;
  } catch (e) { console.warn('jeu', e); openG = null; location.href = new URL((opts.base || './') + 'jeu.html', document.baseURI).href; }
}
