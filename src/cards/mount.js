// Scène 2 montée dans une page : canvas WebGL2 propre, champ natif de la réponse, signes (donner, PASSER,
// retour) et gestes (toucher, glisser, relire, inclinaison). Utilisée par l'accueil (après la transition) et par
// la page d'essai scene-cartes.html. Rien n'est dessiné avant start().
import { createCardScene } from './scene.js';
import { createSheetScene } from '../sheet/sheet.js';
import { settled, pendingCount } from '../app/send.js';

const CSS = `
.sc-c { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: pinch-zoom; }
/* champ natif : reçoit le clavier, invisible (le texte est tapé sur la carte) */
.sc-answer { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0;
  font-size: 16px; resize: none; background: transparent; color: transparent; caret-color: transparent; outline: none;
  overflow: hidden; -webkit-tap-highlight-color: transparent; -webkit-user-select: text; z-index: 12; }
.sc-sign { position: fixed; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity .8s; pointer-events: none; z-index: 13; cursor: pointer; }
/* signes discrets : une seule opacité dans toute l'app (0,4 ; survol 0,6) */
.sc-sign.on { opacity: .44; pointer-events: auto; }
.sc-sign.on:hover, .sc-pass.on:hover { opacity: .6; }
/* PASSER (sur la carte blanche, après quelques secondes sans frappe) : discret, placé par le script */
.sc-pass { position: fixed; left: 0; right: 0; top: 85%; text-align: center; z-index: 13; cursor: pointer;
  opacity: 0; transition: opacity 1.2s; pointer-events: none;
  font: 500 12px/44px 'SG Garamond', serif; letter-spacing: 0.4em; padding-left: 0.4em; color: #fff; }
.sc-pass.on { opacity: .44; pointer-events: auto; }
.sc-back { left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); }
/* feuille : boutons accessibles (clavier, lecteur d'écran) posés sur la carte et la commande ; le toucher passe au canvas */
.sc-hit { position: fixed; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; font-size: 1px;
  pointer-events: none; z-index: 13; outline: none; }
.sc-hit:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
/* au moment de confier ses mots (commande, enveloppe) : une ligne discrète, vers « ce que tu me confies » */
.sc-note { position: fixed; left: 16px; right: 16px; bottom: max(14px, env(safe-area-inset-bottom)); text-align: center; z-index: 13;
  font: 500 12px/1.5 'SG Garamond', Georgia, serif; letter-spacing: .08em; color: #fff; opacity: 0; transition: opacity 1.2s;
  pointer-events: none; text-decoration: none; }
.sc-note.on { opacity: .44; pointer-events: auto; }
.sc-note.on:hover { opacity: .6; }
/* après l'enveloppe : sur le noir, l'email ou le numéro « pour te tenir au courant » (06/10) */
.sc-ask { position: fixed; inset: 0; z-index: 15; background: #060606; opacity: 0; transition: opacity 1.2s; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 16px 18vh; }
.sc-ask.on { opacity: 1; pointer-events: auto; }
.sc-ask .ask-q { font: 15px/1.9 'SG Machine', 'Courier New', monospace; color: rgb(174,174,174); text-align: center; white-space: pre; min-height: 3.8em; }
.sc-ask input { margin-top: 26px; width: min(84vw, 360px); font: 17px/1.6 'SG Machine', 'Courier New', monospace; color: #e4e4e4;
  text-align: center; background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.22); border-radius: 0;
  padding: 6px 0; outline: none; caret-color: rgba(255,255,255,.7); -webkit-appearance: none; }
.sc-ask input::placeholder { color: rgba(255,255,255,.28); }
.sc-ask .sc-pass { position: static; margin-top: 22px; }
.sc-ask .ask-skip { margin-top: 4px; }
/* la toute fin (08/10) : sur le noir, le prénom, puis ce qui va se passer, tapé à la machine */
.sc-ask .bye-name { font: 500 40px/1.25 'SG Garamond', Georgia, serif; letter-spacing: .45em; padding-left: .45em; color: rgb(174,174,174);
  text-align: center; white-space: pre; opacity: 0; transition: opacity 1.6s; }
.sc-ask .bye-name.on { opacity: 1; }
.sc-ask .bye-q { margin-top: 34px; font: 15px/1.9 'SG Machine', 'Courier New', monospace; color: rgb(174,174,174); text-align: center;
  white-space: pre; min-height: 3.8em; transition: opacity 1.2s; }
.sc-ask .bye-net { color: rgba(255,255,255,.44); min-height: 0; margin-top: 18px; }
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
  const ta = el('textarea', 'sc-answer');
  Object.assign(ta, { autocomplete: 'off', spellcheck: false });
  // les champs de l'enveloppe : un vrai champ d'une ligne (le remplissage automatique du téléphone — nom, adresse,
  // email, téléphone — ne marche que sur un <input>)
  const fieldEl = el('input', 'sc-answer');
  Object.assign(fieldEl, { type: 'text', spellcheck: false });
  let answer = ta;
  const useEl = e => { if (answer === e) return; answer.style.width = '1px'; answer.style.height = '1px'; answer = e; };
  const both = (ev, fn, o) => { ta.addEventListener(ev, fn, o); fieldEl.addEventListener(ev, fn, o); };
  answer.setAttribute('autocapitalize', 'none'); answer.setAttribute('enterkeyhint', 'done'); answer.setAttribute('aria-label', 'Réponse');
  const giveEl = el('div', 'sc-sign', '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19 V6 M6.5 11 L12 5.5 L17.5 11" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  const passEl = el('div', 'sc-pass', 'PASSER'); passEl.setAttribute('role', 'button');
  // l'enveloppe : POSTER (même signe que PASSER), dès que l'adresse a deux lignes, même clavier ouvert
  const postEl = el('div', 'sc-pass', 'POSTER'); postEl.setAttribute('role', 'button'); postEl.tabIndex = 0;
  // pointerdown sans effet par défaut : le champ garde le focus, le clavier ne se ferme pas sous le doigt avant le clic
  postEl.addEventListener('pointerdown', e => { e.preventDefault(); });
  postEl.addEventListener('click', () => { if (sheet && sheet.post(now())) { answer.blur(); log('postée'); } });
  postEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); postEl.click(); } });
  const backEl = el('div', 'sc-sign sc-back', '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  backEl.setAttribute('role', 'button'); backEl.setAttribute('aria-label', 'Retour');
  const veil = el('div', 'sc-veil');
  const note = el('a', 'sc-note', 'ce que tu me confies ne sert qu’à ton poème');
  Object.assign(note, { href: './confidentialite.html', target: '_blank' });   // nouvel onglet : l'enveloppe reste où elle en est

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
  const hits = [['card', 'retourner la carte'], ['poste', 'par la poste'], ['direct', 'en direct']].map(([id, label]) => {
    const b = el('button', 'sc-hit'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', label); b.hidden = true;
    b.addEventListener('click', () => { if (sheet) { const r = sheet.tapId(id, now()); if (r.type) log(r.type); } });
    return { id, b };
  });
  function placeHits() {
    const R = sheet ? sheet.rects() : {};
    for (const { id, b } of hits) {
      const q = R[id];
      b.hidden = !q;
      if (!q) continue;
      const xs = q.map(p => p[0]), ys = q.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
      Object.assign(b.style, { left: x0 + 'px', top: y0 + 'px', width: (Math.max(...xs) - x0) + 'px', height: (Math.max(...ys) - y0) + 'px' });
    }
  }
  function openSheet() {
    answer.blur();
    sheet = createSheetScene(gl, { card: scene.renderer, nameR: scene.nameR, look: scene.look, from: scene.snapshot(), seed, reduced,
      on: { back: closeSheet, order: d => { log('commande : ' + d.mode); opts.onOrder?.(d); },
        // l'enveloppe : on y tape l'adresse (même champ natif que la réponse, Entrée = ligne suivante)
        write: d => {
          useEl(d.field ? fieldEl : ta);
          answer.value = d.text || '';
          if (d.field) {
            const f = d.field, last = f.id === 'ville';
            answer.setAttribute('aria-label', f.label); answer.setAttribute('enterkeyhint', last ? 'done' : 'next');
            answer.setAttribute('autocomplete', f.ac); answer.setAttribute('inputmode', f.im); answer.setAttribute('autocapitalize', f.cap);
            answer.type = f.im === 'email' ? 'email' : f.im === 'tel' ? 'tel' : 'text';
          } else if (d.zone === 'contact') {
            // email ou numéro : le clavier propose le sien (fiche contact), sans majuscule ; Entrée = l'adresse
            answer.setAttribute('aria-label', 'Ton email ou ton numéro'); answer.setAttribute('enterkeyhint', sheet?.state().env ? 'next' : 'done');
            answer.setAttribute('autocomplete', 'email'); answer.setAttribute('inputmode', 'email'); answer.setAttribute('autocapitalize', 'none');
          } else {
            // l'adresse : le clavier du téléphone peut la proposer (fiche contact), majuscules aux mots
            answer.setAttribute('aria-label', 'Adresse'); answer.setAttribute('enterkeyhint', 'enter');
            answer.setAttribute('autocomplete', 'shipping street-address'); answer.setAttribute('inputmode', 'text'); answer.setAttribute('autocapitalize', 'words');
          }
          try { answer.setSelectionRange(answer.value.length, answer.value.length); } catch { /* */ }
          focusAnswer();
        },
        // postée (ou « en direct » envoyé) : un temps, puis l'écran principal
        stopWrite: () => answer.blur(),
        address: d => {
          log('adresse : ' + d.address.join(' / '));
          if (d.mode === 'poste' && !d.test) { askContact(d); return; }          // « en direct » : le contact est déjà sur la carte
          if (d.test) {                                                     // essai sans adresse : la demande part telle quelle
            try { if (typeof window.onAddress === 'function') window.onAddress(d); } catch (e) { console.error(e); }
            window.dispatchEvent(new CustomEvent('singulies:address', { detail: d }));
          }
          opts.onAddress?.(d); setTimeout(() => farewell(d), 300);
        } } });
    scene.hideName(true);
    sheetAt = now(); api.sheet = sheet;
  }
  // ---- après l'enveloppe postée : fondu au noir, puis « ton email ou ton numéro, pour te tenir au courant » ----
  // La demande est gardée (brouillon) dès qu'elle est postée : si l'on ferme la page ici, elle part quand même à la
  // visite suivante, sans contact. ENVOYER (Entrée) avec un email / numéro valable, ou PASSER : elle part, puis
  // l'écran principal.
  const contactOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || (v.replace(/\D/g, '').length >= 8 && /^[\d\s+().-]+$/.test(v.trim()));
  function askContact(d) {
    try { localStorage.setItem('singulies.draft', JSON.stringify(d)); } catch { /* */ }
    answer.blur(); postEl.classList.remove('on'); note.classList.remove('on'); backEl.classList.remove('on');
    const box = el('div', 'sc-ask');
    const q = el('div', 'ask-q'); box.appendChild(q);
    const inp = document.createElement('input');
    Object.assign(inp, { type: 'text', spellcheck: false, autocomplete: 'email', placeholder: '' });
    inp.setAttribute('inputmode', 'email'); inp.setAttribute('autocapitalize', 'none'); inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('enterkeyhint', 'send'); inp.setAttribute('aria-label', 'Ton email ou ton numéro, pour te tenir au courant');
    const go = el('div', 'sc-pass', 'ENVOYER'); go.setAttribute('role', 'button'); go.tabIndex = 0;
    const skip = el('div', 'sc-pass ask-skip', 'PASSER'); skip.setAttribute('role', 'button'); skip.tabIndex = 0;
    const priv = el('a', 'sc-note on', 'ce que tu me confies ne sert qu’à ton poème');
    Object.assign(priv, { href: './confidentialite.html', target: '_blank' }); priv.style.zIndex = '16';
    box.append(inp, go, skip, priv);
    requestAnimationFrame(() => box.classList.add('on'));
    // la question se tape à la machine
    const Q = 'ton email ou ton numéro,\npour te tenir au courant';
    let k = 0;
    const type = () => { if (k > Q.length) return; q.textContent = Q.slice(0, k++); setTimeout(type, reduced ? 0 : 45 + Math.random() * 70); };
    setTimeout(type, 1300);
    setTimeout(() => skip.classList.add('on'), 4000);
    const ok = () => contactOk(inp.value);
    inp.addEventListener('input', () => go.classList.toggle('on', ok()));
    let done = false;
    const finish = contact => {
      if (done) return; done = true;
      const c = (contact || '').trim(), out = { ...d, contact: c, email: /@/.test(c) ? c : '', tel: /@/.test(c) ? '' : c };
      try { localStorage.removeItem('singulies.draft'); } catch { /* */ }
      inp.blur(); go.classList.remove('on'); skip.classList.remove('on');
      try { if (typeof window.onAddress === 'function') window.onAddress(out); } catch (e) { console.error(e); }
      window.dispatchEvent(new CustomEvent('singulies:address', { detail: out }));
      opts.onAddress?.(out);
      log('contact : ' + (c || '—'));
      q.style.transition = inp.style.transition = 'opacity 1s'; q.style.opacity = inp.style.opacity = '0';
      priv.classList.remove('on');
      setTimeout(() => { q.remove(); inp.remove(); go.remove(); skip.remove(); farewell(out, box); }, 1100);
    };
    go.addEventListener('click', () => { if (ok()) finish(inp.value); });
    skip.addEventListener('click', () => finish(''));
    for (const b of [go, skip]) b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (ok()) finish(inp.value); } });
    api.ask = { input: inp, send: () => go.click(), skip: () => skip.click() };
  }
  // ---- la toute fin (08/10) : pas de « merci pour votre commande », pas de retour sec au portail. Sur le noir, le
  // prénom (le fil de tout le parcours), puis, tapé à la machine, ce qui va vraiment se passer : c'est une personne
  // qui écrit le poème, puis il part par la poste. Si la demande n'a pas pu partir (pas de réseau), on le dit, sans
  // jargon. Toucher / Entrée / Échap : on passe. Ensuite l'écran principal (opts.onDone).
  const BYE = { poste: 'je l’écris à la machine,\npuis il part chez toi.', direct: 'je t’écris.', test: 'je l’écris à la machine.' };
  const NET = { poste: 'ton enveloppe attend le réseau,\nelle partira dès qu’il reviendra.', direct: 'ta carte attend le réseau,\nelle partira dès qu’il reviendra.' };
  let byeOn = false;
  function farewell(d, box) {
    if (byeOn) return; byeOn = true;
    answer.blur(); postEl.classList.remove('on'); note.classList.remove('on'); backEl.classList.remove('on'); passEl.classList.remove('on');
    if (!box) { box = el('div', 'sc-ask'); void box.offsetWidth; box.classList.add('on'); }
    const kind = d.test ? 'test' : d.mode === 'direct' ? 'direct' : 'poste';
    // le prénom, comme partout (EB Garamond, capitales espacées, gris 174) ; deux mots longs : deux lignes
    const nm = document.createElement('div'); nm.className = 'bye-name';
    const words = String(d.name || name || '').trim().split(/\s+/).filter(Boolean);
    box.append(nm);
    const fit = () => {
      const maxW = Math.min(innerWidth - 32, 760);
      let fs = Math.max(26, Math.min(44, innerWidth * 0.1));
      nm.style.fontSize = fs + 'px'; nm.textContent = words.join(' ');
      if (nm.scrollWidth > maxW && words.length > 1) nm.textContent = words.join('\n');
      while (nm.scrollWidth > maxW && fs > 14) { fs *= 0.92; nm.style.fontSize = fs + 'px'; }
    };
    fit();
    const q = document.createElement('div'); q.className = 'bye-q'; box.append(q);
    const timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    const typeInto = (elq, text, then) => {
      let k = 0;
      const step = () => { if (ended) return; elq.textContent = text.slice(0, k++); if (k > text.length) { then?.(); return; } later(step, reduced ? 0 : (text[k - 2] === ',' || text[k - 2] === '\n' ? 260 : 45 + Math.random() * 70)); };
      step();
    };
    let ended = false, canSkip = false;
    const end = () => {
      if (ended) return; ended = true;
      timers.forEach(clearTimeout);
      removeEventListener('keydown', onKey, true); box.removeEventListener('pointerdown', onTap);
      box.style.transition = 'opacity 1.2s'; nm.style.opacity = '0'; q.style.opacity = '0';
      for (const e of box.querySelectorAll('.bye-net')) e.style.opacity = '0';
      setTimeout(() => opts.onDone?.(d), 1200);
    };
    const onTap = () => { if (canSkip) end(); };
    const onKey = e => {          // (rien ne passe aux scènes dessous : Échap y serait un retour)
      if (e.key !== 'Enter' && e.key !== 'Escape' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation(); if (canSkip) end();
    };
    box.addEventListener('pointerdown', onTap); addEventListener('keydown', onKey, true);
    later(() => nm.classList.add('on'), 200);
    later(() => { canSkip = true; typeInto(q, BYE[kind], () => {
      // la demande est-elle partie ? (au plus 6 s d'attente, pendant que la phrase reste lue)
      const hold = new Promise(r => later(r, 2600));
      const sent = Promise.race([settled().catch(() => {}), new Promise(r => setTimeout(r, 6000))]);
      Promise.all([hold, sent]).then(() => {
        if (ended) return;
        if (kind !== 'test' && pendingCount() > 0) {
          const n2 = document.createElement('div'); n2.className = 'bye-q bye-net'; box.append(n2);
          typeInto(n2, NET[kind], () => later(end, 3400));
        } else end();
      });
    }); }, 1500);
    api.bye = { end, text: () => box.innerText };
  }
  function closeSheet() {
    if (!sheet) return;
    useEl(ta);
    sheet.free(); sheet = null; api.sheet = null; placeHits(); note.classList.remove('on'); postEl.classList.remove('on');
    answer.setAttribute('aria-label', 'Réponse'); answer.setAttribute('enterkeyhint', 'done');
    answer.setAttribute('autocomplete', 'off'); answer.setAttribute('autocapitalize', 'none');
    scene.reopen(now());
    log('retour aux cartes');
  }
  function focusAnswer() { if (document.activeElement !== answer) answer.focus({ preventScroll: true }); }
  const setValue = (s) => { if (answer.value !== s) { answer.value = s; try { answer.setSelectionRange(s.length, s.length); } catch { /* */ } } };
  const scene = await createCardScene(gl, { base, seed, look, toSheet, on: { end: finish, write: focusAnswer, text: (d) => setValue(d.text) } });
  scene.setName(name);

  let started = false;
  const api = { scene, canvas, gl, now, started: () => started, frames: 0, start, nameTargets: (W, H) => scene.nameTargets(name, W, H),
    farewell };                                       // (essais : la fin seule, ?fin=…)

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
        passEl.classList.remove('on');
        backEl.classList.toggle('on', t - sheetAt > 2.5 && !sheet.state().backing);
        // l'enveloppe : le champ natif sur le bloc d'adresse ; le signe « donner » = poster
        const ar = sheet.addrRect(), es = sheet.state().env;
        if (ar) Object.assign(answer.style, { left: ar.left + 'px', top: ar.top + 'px', width: (ar.right - ar.left) + 'px', height: (ar.bottom - ar.top) + 'px' });
        else { answer.style.width = '1px'; answer.style.height = '1px'; }
        giveEl.classList.remove('on');
        postEl.classList.toggle('on', !!(es && es.canPost && ar));
        if (es && postEl.textContent !== es.sign) postEl.textContent = es.sign;
        if (ar) {
          // sous l'adresse ; clavier ouvert : entre l'adresse et le haut du clavier
          const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
          postEl.style.top = Math.max(ar.bottom - 6, Math.min(kbTop - 50, ar.bottom + 40)) + 'px';
        }
        const ss = sheet.state();
        note.classList.toggle('on', !ss.backing && (es ? !es.posted && !es.back && !(es.writing && vv && innerHeight - vv.height > 40) : ss.view === 'commande'));
        const br = { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
        sheet.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
        placeHits();
        api.frames++;
        if (manualDt == null) requestAnimationFrame(frame);
        return;
      }
      scene.frame(t, dt, W, H);
      // signes : donner (sous la carte écrite, clavier fermé) ; passer (avec la carte blanche offerte)
      const st = scene.state(), r = scene.activeRect();
      giveEl.classList.remove('on');      // la petite flèche est retirée (06/10) : Entrée, glisser vers le haut
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
  both('input', () => {
    if (sheet) { const c = sheet.setAddress(answer.value); if (c !== answer.value) setValue(c); return; }
    // Entrée qui a échappé à keydown (clavier Android, composition iPhone) : un retour à la ligne arrive dans le
    // texte — on le retire et c'est la suite, comme Entrée
    const NL = /[\r\n]+/g;
    if (NL.test(answer.value)) {
      setValue(answer.value.replace(NL, ' ').replace(/ +$/, ''));
      scene.setText(answer.value);
      if (!give('Entrée')) answer.blur();
      return;
    }
    scene.setText(answer.value);
  });
  both('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    // enveloppe : Entrée = le champ suivant ; après le dernier, terminé
    if (sheet && sheet.state().env) {
      e.preventDefault();
      if (sheet.enter() === 'done') answer.blur();
      return;
    }
    e.preventDefault();
    // réponse ou carte blanche : Entrée = la suite, directement (06/10 : sinon on croit devoir répondre à autre chose)
    if (!sheet && give('Entrée')) return;
    answer.blur();
  });
  // clavier fermé (« OK » / flèche de l'iPhone, Entrée non vue) avec une réponse écrite = la suite, tout de suite
  // (Maxence 06/10 : « ça reste en attente ») — sauf si la fermeture vient d'un toucher ailleurs (glisser la
  // question, la carte blanche, un signe : le geste décide)
  let lastPD = -1e9;
  addEventListener('pointerdown', () => { lastPD = performance.now(); }, true);
  both('blur', e => {
    if (e.relatedTarget === ta || e.relatedTarget === fieldEl) return;
    if (sheet) { sheet.stopWriting(); return; }
    const st = scene.state();
    if (st.writing && st.active && st.active.text && !st.ended && performance.now() - lastPD > 400 && give('clavier fermé')) return;
    scene.stopWriting();
  });
  both('focus', () => {
    if (sheet) { const es = sheet.state().env; if (es && es.write && !es.writing) sheet.startWriting(); return; }
    if (started && !scene.state().writing) scene.startWriting();
  });
  // relire en glissant verticalement sur la carte réponse (le champ est dessus)
  let ty = null, tvs = 0;
  both('touchstart', e => { ty = e.touches[0].clientY; tvs = 0; }, { passive: true });
  both('touchmove', e => {
    if (ty == null || scene.state().writing) return;
    const steps = Math.trunc((ty - e.touches[0].clientY) / 28);
    if (steps !== tvs) { scene.scrollAnswer(steps - tvs); tvs = steps; }
  }, { passive: true });
  both('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) scene.scrollAnswer(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  const onVV = () => { const k = vv ? Math.max(0, innerHeight - vv.height) : 0; scene.setKeyboard(k); sheet?.setKeyboard(k); };
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); }

  // ---- pointeur : toucher, glisser la carte (gauche : la suivante, droite : la précédente ; carte blanche : vers
  // le haut) ; inclinaison : téléphone (gyroscope — iPhone : autorisation au premier toucher, Android : sans
  // demande), souris sur ordinateur, doigt en repli ----
  let down = null, gyroLive = false;
  const ptr = { x: 0, y: 0 };
  canvas.addEventListener('pointerdown', e => { if (!started) return; if (sheet) { sheet.press(e.clientX, e.clientY); down = { x: e.clientX, y: e.clientY, sheet: true, d: 0, t: performance.now() }; return; } down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, v: false, on: scene.hitAt(e.clientX, e.clientY) }; });
  // premier geste : si l'écriture attend le clavier, on l'ouvre (iPhone)
  addEventListener('touchend', () => { if (started && (sheet ? sheet.state().env?.writing : scene.state().writing)) focusAnswer(); }, { passive: true });
  // relire la réponse validée : molette
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!started || Math.abs(e.deltaY) <= 4) return;
    if (sheet) { sheet.scroll(e.deltaY > 0 ? -1 : 1, now()); return; }
    scene.scrollAnswer(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', e => {
    if (!sheet) return;
    const es = sheet.state().env;
    if (es && es.write && document.activeElement !== answer && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { sheet.startWriting(); return; }
    if (es && document.activeElement === answer && e.key !== 'Escape') return;
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
    if (down.sheet) { const mv = down.moved, f = down; down = null;
      if (isFlick(e.clientX - f.x, e.clientY - f.y, performance.now() - f.t)) flickUp(); sheet?.release(); if (!mv && sheet) { const r = sheet.tap(e.clientX, e.clientY, now()); if (r.type) log(r.type); } return; }
    const dx = e.clientX - down.x, dtm = Math.max(1, performance.now() - down.t);
    if (down.moved) { const r = scene.release(dx, dx / dtm, now()); if (r.type) log(r.type); down = null; return; }
    if (down.took) { down = null; setValue(''); focusAnswer(); log('carte blanche'); return; }   // iPhone : le clavier s'ouvre au lâcher
    if (down.v) { const f = down; down = null; if (f.on !== 'blank' && isFlick(e.clientX - f.x, e.clientY - f.y, dtm)) flickUp(); return; }
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
  // la suite : réponse (ou carte blanche) donnée
  function give(how) {
    const st = scene.state();
    if (!st.active || !st.active.text || st.ended || !scene.give(now())) return false;
    answer.blur(); log('donné (' + how + ')'); return true;
  }
  // glisser vers le haut = envoyer : la réponse (scène des cartes), l'enveloppe ou la carte « en direct » (si prêtes)
  function flickUp() {
    if (sheet) { const es = sheet.state().env; if (es && es.canPost && !es.posted) postEl.click(); return; }
    give('glissé');
  }
  const isFlick = (dx, dy, ms) => dy < -60 && Math.abs(dy) > 1.4 * Math.abs(dx) && ms < 700;
  let fl = null;
  both('touchstart', e => { const p = e.touches[0]; fl = { x: p.clientX, y: p.clientY, t: performance.now() }; }, { passive: true });
  both('touchend', e => {
    if (!fl) return;
    const p = e.changedTouches[0], f = fl; fl = null;
    if (isFlick(p.clientX - f.x, p.clientY - f.y, performance.now() - f.t)) flickUp();
  }, { passive: true });
  giveEl.addEventListener('click', () => {
    if (sheet) { if (sheet.post(now())) { answer.blur(); log('postée'); } return; }
    if (scene.give(now())) { answer.blur(); log('donné'); }
  });
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
