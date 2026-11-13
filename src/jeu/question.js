// question.html — page de tournage / lien d'écran (sans bouton PARTAGER ni COMMANDER, sans bandeau).
// Le paquet face cachée, au centre : on le touche, il tire une question ; la carte réponse dépasse dessous (« réponds ici »).
// Entrée (ou « OK » du clavier) : la réponse part à Eternel (sendReponseJeu) ; juste dessous, ton email ou ton insta pour un
// poème inspiré de sa réponse ; Entrée / ENVOYER : le contact part, « reçu. » Glisser la question de côté = une autre.
// ?envoi=0 : rien n'est envoyé (essais).
import { siteFonts } from '../app/fonts.js';
import { installCount, count } from '../app/count.js';
import { dpr3d } from '../app/perf.js';
import { installNav } from '../nav/nav.js';
import { sendReponseJeu } from '../app/send.js';
import { createCardScene } from '../cards/scene.js';
import QUESTIONS from '../cards/questions.json';

const BASE = './';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CSS = `
html, body { margin: 0; background: #060606; overflow: hidden; overscroll-behavior: none; -webkit-text-size-adjust: 100%; }
body { position: fixed; inset: 0; width: 100%; }
.qz-c { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: pinch-zoom; }
.qz-in { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0; font-size: 16px; resize: none;
  background: transparent; color: transparent; caret-color: transparent; outline: none; overflow: hidden; -webkit-user-select: text; z-index: 12; }
.qz-sr { position: fixed; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.qz-ct { position: fixed; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; opacity: 0; pointer-events: none; transition: opacity 1.2s ease; z-index: 13; }
.qz-ct.on { opacity: 1; pointer-events: auto; }
.qz-ct p { margin: 0 0 16px; padding: 0 24px; text-align: center; font: 13px/1.9 'SG Machine', 'Courier New', monospace; color: #aeaeae; letter-spacing: .02em; }
.qz-ct input { width: min(78vw, 320px); box-sizing: border-box; padding: 6px 0 8px; margin: 0; background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.28);
  border-radius: 0; outline: none; text-align: center; font: 16px/1.5 'SG Machine', 'Courier New', monospace; color: #e6e6e6; caret-color: #fff; }
.qz-ct input::placeholder { color: rgba(255,255,255,.28); }
.qz-go { margin: 18px 0 0; padding: 10px 0 10px .45em; border: 0; background: transparent; cursor: pointer; font: 500 14px/24px 'SG Garamond', Georgia, serif; letter-spacing: .45em;
  color: #fff; opacity: 0; transition: opacity .8s; pointer-events: none; -webkit-tap-highlight-color: transparent; }
.qz-go.on { opacity: .62; pointer-events: auto; } .qz-go.on:hover { opacity: .85; }
.qz-ok { position: fixed; left: 0; right: 0; text-align: center; margin: 0; padding: 0 24px; white-space: pre; font: 13px/1.9 'SG Machine', 'Courier New', monospace; color: #aeaeae; letter-spacing: .02em; pointer-events: none; z-index: 13; }
`;

installCount('question');
// la ligne du haut (ETERNEL, ←, menu ≡) et SINGULIES en bas, comme sur la page du jeu — rien d'autre (ni PARTAGER, ni COMMANDER)
installNav({ current: 'jeu', subHome: 'jeu', headerOnly: true, base: BASE, show: () => false, foot: () => true, shade: () => true, canBack: () => true, onBack: () => { location.href = BASE; return true; } });
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

(async () => {
  await siteFonts(BASE).catch(() => {});
  const canvas = document.createElement('canvas'); canvas.className = 'qz-c'; document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) { document.body.textContent = ''; const p = document.createElement('p'); p.textContent = 'ton téléphone n’arrive pas à montrer la suite.'; p.style.cssText = 'position:fixed;inset:0;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#aeaeae;font:15px/1.9 "Courier New",monospace'; document.body.appendChild(p); return; }

  const el = (tag, cls, parent = document.body) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
  const ta = el('textarea', 'qz-in'); Object.assign(ta, { autocomplete: 'off', spellcheck: false }); ta.setAttribute('autocapitalize', 'none'); ta.setAttribute('autocorrect', 'off'); ta.setAttribute('enterkeyhint', 'send'); ta.setAttribute('aria-label', 'Ta réponse');
  const ct = el('div', 'qz-ct');
  const inv = el('p', '', ct); inv.innerHTML = 'ton email ou ton @<br>pour un poème inspiré de ta réponse';
  const ci = el('input', '', ct); Object.assign(ci, { type: 'text', spellcheck: false, name: 'contact', placeholder: 'email · @' });
  ci.setAttribute('autocomplete', 'email'); ci.setAttribute('autocapitalize', 'none'); ci.setAttribute('autocorrect', 'off'); ci.setAttribute('enterkeyhint', 'send'); ci.setAttribute('aria-label', 'Ton email ou ton @');
  const ok = el('p', 'qz-ok');
  // « reçu / je t'écris » : deux lignes, sans point, tapé à la machine (frappe un peu irrégulière)
  const typeOk = () => {
    const txt = 'reçu\nje t’écris'; let i = 0;
    const step = () => { ok.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(step, txt[i - 1] === '\n' ? 420 : 70 + Math.random() * 70); };
    setTimeout(step, 250);
  };
  const sr = el('div', 'qz-sr'); sr.setAttribute('aria-live', 'polite');
  const say = t => { sr.textContent = ''; setTimeout(() => { sr.textContent = t; }, 60); };

  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
  let current = null, sent = null, done = false, drew = false, sentAt = 0, ctShown = false, lowPrev = -1, still = 0, lockLow = 0;      // sent : { id, text, ref } une fois la réponse partie
  const ref = 'Q' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 36).toString(36).toUpperCase();

  // ?q=<id> : la première question tirée est celle-là (le paquet reste face cachée, au toucher) ; ensuite, comme toujours, une autre au hasard
  const P = new URLSearchParams(location.search);
  const qParam = /^\d+$/.test(P.get('q') || '') && QUESTIONS.some(x => x.id === +P.get('q')) ? +P.get('q') : null;
  // ?partage=1 (pour toi) : un signe PARTAGER sous les cartes, qui partage / copie le lien de la question en cours
  const shareEl = el('button', 'qz-go qz-share'); shareEl.type = 'button'; shareEl.textContent = 'PARTAGER';
  const linkOf = id => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('q', id); return u.href; };
  shareEl.addEventListener('click', async () => {
    if (current == null) return;
    const link = linkOf(current), q = (QUESTIONS.find(x => x.id === current)?.q || '').toLowerCase();
    try { if (navigator.share) { await navigator.share({ title: 'SINGULIES', text: '« ' + q + ' »', url: link }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(link); shareEl.textContent = 'LIEN COPIE'; } catch { shareEl.textContent = link; }
    setTimeout(() => { shareEl.textContent = 'PARTAGER'; }, 1800);
  });
  const scene = await createCardScene(gl, { base: BASE, jeu: true, jeuWrite: true, autoWrite: false, deckAt: 0.6, hintAnswer: 'écris ta réponse ici', firstQ: qParam,
    on: {
      draw: d => {
        current = d.id; const q = QUESTIONS.find(x => x.id === d.id)?.q; if (q) { ta.setAttribute('aria-label', 'Ta réponse à : ' + q); say(q); }
        try { history.replaceState(history.state, '', linkOf(d.id) + (P.get('envoi') ? '&envoi=' + encodeURIComponent(P.get('envoi')) : '') + (P.get('partage') ? '&partage=' + encodeURIComponent(P.get('partage')) : '')); } catch { /* */ }   // l'adresse suit la question : on peut la copier
      },
      write: () => { if (document.activeElement !== ta && !sent) ta.focus({ preventScroll: true }); },
      text: d => { if (ta.value !== d.text) { ta.value = d.text; try { ta.setSelectionRange(d.text.length, d.text.length); } catch { /* */ } } },
    } });
  scene.setName('');
  scene.start(now());
  scene.drawAt(Infinity);          // le paquet reste face cachée : c'est le toucher qui tire

  // ---- l'envoi : Entrée / « OK » = la réponse part ; la même touche ouvre le contact (le clavier reste) ----
  function submit() {
    const text = ta.value.replace(/[\r\n]+/g, ' ').trim();
    if (!text || sent || current == null) return false;
    sent = { id: current, text, ref };
    sendReponseJeu(sent); count('question/reponse');
    scene.stopWriting();
    ci.focus({ preventScroll: true });               // dans le même geste : le clavier de l'iPhone ne se ferme pas
    sentAt = performance.now();                       // le bloc du contact ne paraît qu'une fois la carte réponse immobile (voir la boucle)
    return true;
  }
  ta.addEventListener('input', () => {
    if (sent) { ta.value = sent.text; return; }
    if (/[\r\n]/.test(ta.value)) { ta.value = ta.value.replace(/[\r\n]+/g, ' ').replace(/ +$/, ''); scene.setText(ta.value); submit(); return; }
    scene.setText(ta.value);
  });
  ta.addEventListener('keydown', e => { if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault(); submit(); });
  ta.addEventListener('focus', () => { if (!sent && !scene.state().writing) scene.startWriting(); });
  let lastPD = -1e9; addEventListener('pointerdown', () => { lastPD = performance.now(); }, true);
  // « OK » de l'iPhone : clavier fermé avec une réponse écrite = envoyée (sauf si la fermeture vient d'un toucher ailleurs)
  ta.addEventListener('blur', e => {
    if (e.relatedTarget === ci) return;
    if (!sent && ta.value.trim() && performance.now() - lastPD > 400) { submit(); return; }
    scene.stopWriting();
  });

  function sendContact() {
    const c = ci.value.trim();
    if (c.length < 3 || done || !sent) return;
    done = true; sendReponseJeu({ ...sent, contact: c }); count('question/contact');
    ci.blur(); ci.readOnly = true; ct.style.opacity = '0.0'; ct.style.pointerEvents = 'none';
    typeOk();
  }
  ci.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendContact(); } });

  // ---- clavier mobile ----
  const vv = window.visualViewport;
  const onVV = () => scene.setKeyboard(vv ? Math.max(0, innerHeight - vv.height) : 0);
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); }

  // ---- la boucle ----
  let ptr = { x: 0, y: 0 }, last = 0;
  function frame(n) {
    if (document.hidden) { last = 0; return; }
    const t = now(), dt = Math.min(0.05, last ? (n - last) / 1000 : 0.016); last = n;
    const dpr = dpr3d(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.frame(t, dt, W, H);
    // le champ natif posé, invisible, sur la carte réponse : le toucher ouvre le clavier (iPhone : seul un toucher direct l'ouvre)
    const r = scene.activeRect();
    if (r && !sent) { Object.assign(ta.style, { left: r.left + 'px', top: r.top + 'px', width: (r.right - r.left) + 'px', height: (r.bottom - r.top) + 'px' }); }
    else { ta.style.width = '1px'; ta.style.height = '1px'; }
    // le contact : juste sous la carte réponse (au-dessus du clavier s'il est là)
    const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
    const low = scene.lowestBottom ? scene.lowestBottom() : (r ? r.bottom : innerHeight * 0.7);
    // (la carte réponse glisse vers le bas pendant ≈ 0,7 s après Entrée) : le contact attend qu'elle soit immobile, puis paraît à sa place définitive, qui ne bouge plus
    if (sent && !ctShown) {
      still = Math.abs(low - lowPrev) < 0.4 ? still + 1 : 0; lowPrev = low;
      if (still >= 10 && performance.now() - sentAt > 600) { ctShown = true; lockLow = low; ct.classList.add('on'); }
    }
    ct.style.top = Math.max(8, Math.min((ctShown ? lockLow : low) + 22, kbTop - ct.offsetHeight - 14)) + 'px';
    ok.style.top = Math.min((ctShown ? lockLow : low) + 40, kbTop - 60) + 'px';
    shareEl.classList.toggle('on', P.get('partage') === '1' && current != null && !sent);
    shareEl.style.cssText = 'position:fixed;left:0;right:0;bottom:' + (Math.max(94, H * 0.105) + 16) + 'px;margin:0;z-index:13;';
    const br = reduced ? { x: 0, y: 0 } : { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
    scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = 0; });

  // ---- gestes : toucher le paquet = tirer ; ensuite comme le jeu (glisser = une autre, toucher la carte réponse = écrire) ----
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') e.preventDefault();
    if (sent) { down = null; return; }
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, on: scene.hitAt(e.clientX, e.clientY) };
    scene.setPress(down.on); if (e.pointerType !== 'mouse') scene.setHover(down.on);
  });
  canvas.addEventListener('pointerleave', () => { scene.setHover(null); scene.setPress(null); canvas.style.cursor = ''; });
  addEventListener('pointermove', e => {
    if (!down && e.pointerType === 'mouse' && !sent) { const id = scene.hitAt(e.clientX, e.clientY); scene.setHover(id); canvas.style.cursor = id ? 'pointer' : ''; }
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) down.moved = true;
      if (down.moved && current != null) { scene.drag(dx); return; }
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
    if (f.moved) { if (current != null) { ta.value = ''; scene.release(dx, dx / dtm, now()); } return; }
    // pas encore de question : toucher le paquet la tire
    if (current == null && !drew) { if (scene.hitAt(e.clientX, e.clientY) === 'deck') { drew = true; scene.drawAt(now()); count('question/tirage'); } return; }
    const res = scene.tap(e.clientX, e.clientY, now());
    if (res && res.type === 'discard') ta.value = '';
  });
  window.__question = { scene, now };      // essais
})().catch(e => console.warn('question', e));
