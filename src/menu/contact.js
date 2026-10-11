// « me contacter » (11/10, Maxence) : un message libre, reçu par email. On l'écrit sur une carte vierge du jeu (la
// carte blanche), à la machine ; l'email de la personne n'est demandé que s'il n'est pas déjà connu (donné pendant le
// poème, le paiement, la liste d'attente). ENVOYER dès qu'il y a un message et un email valable ; la carte part vers
// le haut, « reçu. je te réponds. » se tape, puis on revient là où l'on était. Envoi : le modèle EmailJS des
// demandes (sendNote). Contre les robots : un champ piège invisible, un envoi toutes les 30 s au plus.
import { sendNote } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';

const CSS = `
.mn-ct { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 45; background: #060606; opacity: 0; transition: opacity .35s ease;
  color: rgb(214,214,214); -webkit-tap-highlight-color: transparent; touch-action: pinch-zoom; overflow: hidden; }
.mn-ct.on { opacity: 1; }
.mn-ct .ct-stack { position: absolute; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; transition: transform .25s ease; }
.mn-ct .ct-card { position: relative; transition: transform .9s cubic-bezier(.5,0,.2,1), opacity .9s ease; }
.mn-ct .ct-card.gone { transform: translateY(-70vh) rotate(-3deg); opacity: 0; }
.mn-ct .ct-card img { display: block; width: 100%; height: auto; pointer-events: none; -webkit-user-drag: none; }
.mn-ct textarea { position: absolute; margin: 0; padding: 0; border: 0; outline: none; resize: none; background: transparent;
  font: 15px/1.75 'SG Machine', 'Courier New', monospace; color: rgb(226,226,226); caret-color: rgba(255,255,255,.85);
  text-transform: lowercase; -webkit-appearance: none; border-radius: 0; overflow-y: auto; scrollbar-width: none; text-align: center; }
.mn-ct textarea::-webkit-scrollbar { display: none; }
.mn-ct textarea::placeholder { color: rgba(255,255,255,.26); text-transform: none; }
.mn-ct .ct-mail { margin-top: 18px; width: min(340px, calc(100vw - 32px)); text-align: center; font: 14px/1.6 'SG Machine', 'Courier New', monospace; color: rgba(255,255,255,.5); }
.mn-ct .ct-mail input { display: block; width: 100%; box-sizing: border-box; text-align: center; font: 16px/1.5 'SG Machine', 'Courier New', monospace;
  color: rgb(226,226,226); background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.3); border-radius: 0; padding: 4px 0;
  outline: none; -webkit-appearance: none; caret-color: rgba(255,255,255,.75); }
.mn-ct .ct-mail input::placeholder { color: rgba(255,255,255,.28); }
.mn-ct .ct-mail input:-webkit-autofill, .mn-ct .ct-mail input:autofill { -webkit-text-fill-color: rgb(226,226,226); -webkit-box-shadow: 0 0 0 1000px #060606 inset; }
.mn-ct .ct-mail button { margin: 0; padding: 0 4px; border: 0; background: transparent; font: inherit; color: inherit; cursor: pointer;
  text-decoration: underline; text-decoration-color: rgba(255,255,255,.25); text-underline-offset: 3px; }
.mn-ct .ct-go { margin-top: 14px; height: 44px; padding: 0 16px 0 calc(16px + .45em); border: 0; background: transparent; cursor: pointer;
  font: 500 14px/44px 'SG Garamond', Georgia, serif; letter-spacing: .45em; color: #fff; opacity: 0; transition: opacity .6s; pointer-events: none; }
.mn-ct .ct-go.on { opacity: .62; pointer-events: auto; }
.mn-ct .ct-go.on:hover, .mn-ct .ct-go.on:focus-visible { opacity: .9; outline: none; }
.mn-ct .ct-alt { margin-top: 6px; font: 13px/1.6 'SG Machine', 'Courier New', monospace; color: rgba(255,255,255,.34); }
.mn-ct .ct-alt a { color: inherit; text-decoration: none; }
.mn-ct .ct-trap { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.mn-ct .ct-done { position: absolute; left: 16px; right: 16px; top: 50%; transform: translateY(-50%); text-align: center; white-space: pre;
  font: 15px/1.9 'SG Machine', 'Courier New', monospace; color: rgb(214,214,214); pointer-events: none; }
.mn-ct .ct-back { position: absolute; left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; background: transparent; color: #fff;
  opacity: .62; cursor: pointer; z-index: 2; }
.mn-ct .ct-back:hover, .mn-ct .ct-back:focus-visible { opacity: .85; outline: none; }
`;
const BACK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const K_LAST = 'singulies.note';
const INSTAGRAM = 'https://www.instagram.com/e.t.ernel/';
// la carte vierge rendue par le moteur (public/simple/vierge.jpg) : 900 × 550, la carte en occupe 86 % de la largeur
const IMG = { w: 900, h: 550, f: 0.86 };

const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; parent?.appendChild(e); return e; };

// opts : { base, reduced, name (le prénom tapé, s'il y en a un), onDone() (une fois le message parti : fermer le menu) }
export function openContact(opts = {}) {
  if (document.querySelector('.mn-ct')) return;
  const { base = './', reduced = false } = opts;
  if (!document.getElementById('ct-style')) { const st = el('style', '', document.head); st.id = 'ct-style'; st.textContent = CSS; }
  const root = el('div', 'mn-ct', document.body);
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'me contacter');
  const back = el('button', 'ct-back', root, BACK); back.type = 'button'; back.setAttribute('aria-label', 'Retour');
  const form = el('form', 'ct-stack', root); form.noValidate = true; form.setAttribute('autocomplete', 'on');
  const card = el('div', 'ct-card', form);
  const img = el('img', '', card); img.src = new URL(base + 'simple/vierge.jpg', document.baseURI).href; img.alt = '';
  const ta = el('textarea', '', card); ta.placeholder = 'écris-moi ici'; ta.maxLength = 2000;
  ta.setAttribute('aria-label', 'ton message'); ta.spellcheck = true; ta.setAttribute('autocapitalize', 'off');
  const trap = el('input', 'ct-trap', form); trap.name = 'site'; trap.tabIndex = -1; trap.autocomplete = 'off'; trap.setAttribute('aria-hidden', 'true');
  const mail = el('div', 'ct-mail', form);
  let email = knownEmail(), input = null;
  function askMail(v = '') {
    mail.innerHTML = '';
    input = el('input', '', mail); input.type = 'email'; input.name = 'email'; input.autocomplete = 'email'; input.inputMode = 'email';
    input.placeholder = 'ton email, pour te répondre'; input.value = v; input.setAttribute('aria-label', 'ton email');
    input.setAttribute('autocapitalize', 'off'); input.spellcheck = false; input.enterKeyHint = 'send';
    input.addEventListener('input', check);
  }
  if (email) {
    mail.append('je te réponds à ' + email + ' · ');
    const ch = el('button', '', mail); ch.type = 'button'; ch.textContent = 'changer';
    ch.addEventListener('click', () => { askMail(email); email = null; input.focus(); input.select(); check(); });
  } else askMail();
  const go = el('button', 'ct-go', form); go.type = 'submit'; go.textContent = 'ENVOYER';
  el('div', 'ct-alt', form, 'ou sur instagram <a href="' + INSTAGRAM + '" target="_blank" rel="noopener">@e.t.ernel</a>');

  const mailOk = () => EMAIL_RE.test((email || input?.value || '').trim());
  function check() { go.classList.toggle('on', ta.value.trim().length > 0 && mailOk()); }
  ta.addEventListener('input', check);
  // Entrée : à la ligne dans le message ; Ctrl / Cmd + Entrée : envoyer
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } });

  // la carte à la taille des cartes du jeu (80 % de la largeur sur téléphone), le tout au milieu de la partie visible
  // (clavier ouvert : au-dessus du clavier)
  const vv = window.visualViewport;
  function layout() {
    const W = innerWidth, H = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0;
    const cw = Math.min(W * 0.8, 420, H * 0.42 / (52 / 87)), iw = cw / IMG.f;
    Object.assign(card.style, { width: iw + 'px' });
    const ih = iw * IMG.h / IMG.w, ch = cw * 52 / 87, ox = (iw - cw) / 2, oy = (ih - ch) / 2;
    const pad = cw * 0.09;
    Object.assign(ta.style, { left: (ox + pad) + 'px', top: (oy + pad * 0.8) + 'px', width: (cw - 2 * pad) + 'px', height: (ch - 1.6 * pad) + 'px' });
    root.style.top = top + 'px'; root.style.height = H + 'px';
    form.style.top = '0px';
    const sh = form.offsetHeight;
    form.style.transform = `translateY(${Math.max(8, (H - sh) / 2)}px)`;
  }
  layout();
  addEventListener('resize', layout); vv?.addEventListener('resize', layout); vv?.addEventListener('scroll', layout);
  img.addEventListener('load', layout);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
  // ordinateur : on écrit tout de suite ; téléphone : le clavier ne sort que si l'on touche la carte
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => ta.focus({ preventScroll: true }), 380);
  card.addEventListener('click', () => ta.focus());

  function remove() {
    removeEventListener('resize', layout); vv?.removeEventListener('resize', layout); vv?.removeEventListener('scroll', layout);
    removeEventListener('keydown', onKey, true);
    root.classList.remove('on'); root.inert = true;
    setTimeout(() => root.remove(), 380);
  }
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); remove(); } };
  addEventListener('keydown', onKey, true);
  back.addEventListener('click', remove);

  let sent = false;
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  function submit() {
    if (sent || !go.classList.contains('on')) return;
    sent = true;
    const to = (email || input.value).trim(), text = ta.value.trim();
    // robots : le champ piège rempli, ou un second envoi dans les 30 s → rien ne part (la page fait comme si)
    let last = 0; try { last = +localStorage.getItem(K_LAST) || 0; } catch { /* */ }
    if (!trap.value && Date.now() - last > 30000) {
      sendNote({ kind: 'message', text, email: to, name: opts.name || '' });
      try { localStorage.setItem(K_LAST, String(Date.now())); } catch { /* */ }
    }
    document.activeElement?.blur?.();
    go.classList.remove('on'); form.inert = true;
    card.classList.add('gone');
    for (const x of [mail, go, form.querySelector('.ct-alt')]) Object.assign(x.style, { transition: 'opacity .5s', opacity: '0' });
    // « reçu. je te réponds. » tapé à la machine
    const done = el('div', 'ct-done', root); done.setAttribute('role', 'status');
    const msg = 'reçu.\nje te réponds.';
    let i = 0;
    const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
    setTimeout(strike, reduced ? 0 : 900);
    setTimeout(() => { remove(); opts.onDone?.(); }, reduced ? 1600 : 3600);
  }
}
