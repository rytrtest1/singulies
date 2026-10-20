// Scène 2 montée dans une page : canvas WebGL2 propre, champ natif de la réponse, signes (donner, PASSER,
// retour) et gestes (toucher, glisser, relire, inclinaison). Utilisée par l'accueil (après la transition) et par
// la page d'essai scene-cartes.html. Rien n'est dessiné avant start().
import { vk, EST_VERSION, EST_V2 } from '../core/version.js';
import '../v2/v2.css';
import { lierAdresse } from '../core/suggestions.js';
import { validerCodePostal } from '../core/adresse.js';
import { creerNote } from '../core/note.js';
import { createCardScene } from './scene.js';
import { createSheetScene, FIELDS, MAIL_W, NOADDR } from '../sheet/sheet.js';
import { fieldsReady } from '../sheet/envelope.js';
import { dpr3d } from '../app/perf.js';
import QUESTIONS from './questions.json';

const CSS = `
.sc-c { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: pinch-zoom; }
/* champ natif : reçoit le clavier, invisible (le texte est tapé sur la carte) */
.sc-answer { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0;
  font-size: 16px; resize: none; background: transparent; color: transparent; caret-color: transparent; outline: none;
  overflow: hidden; -webkit-tap-highlight-color: transparent; -webkit-user-select: text; z-index: 12; }
.sc-sign { position: fixed; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity .8s; pointer-events: none; z-index: 13; cursor: pointer; }
/* signes discrets : une seule opacité dans toute l'app (0,4 ; survol 0,6) */
.sc-sign.on { opacity: .62; pointer-events: auto; }
.sc-sign.on:hover, .sc-pass.on:hover { opacity: .85; }
/* PASSER (sur la carte blanche, après quelques secondes sans frappe) : discret, placé par le script */
.sc-pass { position: fixed; left: 0; right: 0; top: 85%; text-align: center; z-index: 13; cursor: pointer;
  opacity: 0; transition: opacity 1.2s; pointer-events: none;
  font: 500 14px/44px 'SG Garamond', serif; letter-spacing: 0.45em; padding-left: 0.45em; color: #fff; }   /* (12/10 : le même interlettrage que tous les signes) */
.sc-pass.on { opacity: .62; pointer-events: auto; }
.sc-pass.nosub .sc-sub { display: none; }
.sc-pass.ou { pointer-events: none !important; cursor: default; }   /* (20/10) « OU » : un mot, pas un bouton */
/* (17/10, Maxence) plus d'air entre PASSER et la parenthèse ; ailleurs (une autre page du bandeau) : rien des cartes */
.sg-away .sc-pass, .sg-away .sc-sign { display: none; }
/* (17/10, Maxence : « tire une carte, en police typewriter, au-dessus du jeu ») après la réservation, tapé à la machine au-dessus du paquet */
.sc-tire { position: fixed; z-index: 13; left: 0; right: 0; text-align: center; white-space: pre; pointer-events: none; opacity: 0; transition: opacity .7s ease;
  font: 15px/1.4 'SG Machine', 'Courier New', monospace; letter-spacing: .02em; color: rgb(226, 222, 214); }
.sc-tire.on { opacity: .78; }
.sc-pass .sc-sub { transition: opacity .55s ease; }
.sc-pass .sc-sub { display: block; margin-top: -11px;   /* (20/10, Maxence : « rapproche la parenthèse de PASSER ») */ font-size: 13px; line-height: 1.2; letter-spacing: .04em; padding-left: 0; opacity: .55; }
.sc-back { left: max(6px, env(safe-area-inset-left)); top: max(6px, env(safe-area-inset-top)); }
/* (17/10, Maxence) au-dessus de l'adresse : « a qui je l'envoie ? » — on comprend qu'on peut l'offrir */
.sc-who { position: fixed; z-index: 13; transform: translateY(-100%); white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .8s;
  font: 500 16px/1.2 'SG Garamond', serif; color: #fff; }
.sc-who.on { opacity: .62; }
/* (18/10, décision 7) le portefeuille (Apple Pay / Google Pay) à l'enveloppe : un geste qui paie et donne l'adresse et l'email */
.sc-wallet { position: fixed; left: 50%; bottom: calc(28px + env(safe-area-inset-bottom)); transform: translateX(-50%); width: 230px; min-height: 46px; z-index: 14;
  opacity: 0; pointer-events: none; transition: opacity .6s ease; }
.sc-wallet.on { opacity: 1; pointer-events: auto; }
.sg-away .sc-wallet { display: none; }
.sg-away .sc-who { display: none; }
/* (18/10, V3) la ligne sur l'enveloppe tient sur deux lignes au besoin */
[data-version] .sc-who { white-space: normal; width: min(78vw, 17em); line-height: 1.3; }
/* feuille : boutons accessibles (clavier, lecteur d'écran) posés sur la carte et la commande ; le toucher passe au canvas */
.sc-hit { position: fixed; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; font-size: 1px;
  pointer-events: none; z-index: 13; outline: none; }
.sc-hit:focus-visible { outline: 1px solid rgba(255,255,255,.35); outline-offset: 4px; }
/* POSTER : sous l'enveloppe, il la suit ; apparaît en fondu, part vite */
.sc-pass.sc-on-env { left: 0; right: auto; top: 0; width: 20em; margin-left: -10em; }
.sc-pass.sc-on-env:not(.on) { transition: opacity .35s; }
/* la fin : la tranche de l'enveloppe devient le champ de l'email (08/10) */
.sc-mail { position: fixed; z-index: 13; opacity: 0; transition: opacity 1.1s; pointer-events: none; }
.sc-mail.on { opacity: 1; pointer-events: auto; }
.sc-mail .sc-field { position: relative; }
/* le champ natif reçoit la frappe ; ce qu'on voit est tapé à la machine par-dessus (.sc-type) */
.sc-mail input { display: block; width: 100%; box-sizing: border-box; font: 16px/1.5 'SG Machine', 'Courier New', monospace; color: transparent;
  text-align: center; background: transparent; border: 0; border-radius: 0; padding: 0 0 5px; margin: 0; outline: none;
  caret-color: rgba(255,255,255,.7); -webkit-appearance: none; appearance: none; }
/* (10/10) « email » n'apparaît qu'une fois l'enveloppe disparue, quand on peut écrire */
.sc-mail input::placeholder { color: transparent; transition: color .8s; }
.sc-mail.ready input::placeholder { color: rgba(255,255,255,.3); }
/* remplissage automatique : pas de fond coloré ni de rectangle derrière l'email */
.sc-mail input:-webkit-autofill, .sc-mail input:-webkit-autofill:hover, .sc-mail input:-webkit-autofill:focus, .sc-mail input:autofill {
  -webkit-text-fill-color: transparent; -webkit-box-shadow: 0 0 0 1000px #060606 inset; box-shadow: 0 0 0 1000px #060606 inset;
  background-color: transparent !important; transition: background-color 600000s 0s, color 600000s 0s; caret-color: rgba(255,255,255,.7); }
.sc-mail input::selection { background: rgba(255,255,255,.18); }
.sc-mail .sc-line { height: 1px; background: rgba(255,255,255,.3); }
/* le prénom au-dessus du champ de l'email (09/10 : le fil de tout le parcours, jusqu'au bout) — comme partout */
.sc-mail .sc-name { position: absolute; left: 50%; bottom: calc(100% + 30px); transform: translateX(-50%); white-space: pre; text-align: center;
  font: 500 32px/1.25 'SG Garamond', Georgia, serif; letter-spacing: .45em; padding-left: .45em; color: rgb(251,251,251); pointer-events: none; }   /* (12/10 : la clarté du prénom partout, 0,986) */
.sc-mail .sc-type { position: absolute; left: 0; right: 0; top: 0; padding: 0 0 5px; font: 16px/1.5 'SG Machine', 'Courier New', monospace;
  color: rgb(214,214,214); text-align: center; white-space: pre; pointer-events: none; overflow: visible; }
.sc-mail .sc-type span { display: inline-block; }
.sc-mail .sc-type span.hit { animation: sc-hit .16s ease-out; }
@keyframes sc-hit { from { opacity: .25; transform: translateY(1.2px) scale(1.06); } }
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
.sc-ask .ask-q + input + .ask-q { margin-top: 44px; }
/* lecteur d'écran : ce que la 3D montre, dit à voix haute (invisible) */
.sc-sr { position: fixed; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.sc-veil { position: fixed; inset: 0; background: #000; opacity: 0; transition: opacity 1.4s; pointer-events: none; z-index: 14; }
`;

// opts : { name, base, seed, look, canvas?, onEnd(detail), onExit?() (retour depuis le paquet), log?(s), shot?,
//          sheet? (défaut : oui ; ?feuille=0 → l'ancienne fin, fondu au noir), onOrder?(detail) }
export async function mountCards(opts) {
  const { base = './', seed, look = {}, onEnd, onExit, log = () => {} } = opts;
  let name = opts.name;   // (12/10, alt) la scène peut être préparée avant que le prénom soit fini : api.setName
  const PAID = ['merci', 'pour'].includes(document.documentElement.dataset.page);   // (10/10) après le paiement : pas l'essai sans adresse
  const TEST = new URLSearchParams(location.search).get('test') === '1';   // (12/10, Maxence : l'écran d'essai de la fin retiré ; ?test=1 pour le revoir)
  const toSheet = opts.sheet ?? new URLSearchParams(location.search).get('feuille') !== '0';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // téléphone : le clavier ne s'ouvre jamais tout seul dans la scène des cartes (08/10, Android), et se ferme quand une carte est balayée
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!document.getElementById('sc-style')) {
    const st = document.createElement('style'); st.id = 'sc-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  const el = (tag, cls, html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; document.body.appendChild(e); return e; };
  const canvas = opts.canvas || el('canvas', 'sc-c');
  // invisible tant que la page ne la montre pas : un canvas WebGL neuf est noir et couvrirait l'accueil
  if (opts.hidden) Object.assign(canvas.style, { opacity: '0', pointerEvents: 'none', zIndex: '5' });
  const ta = el('textarea', 'sc-answer');
  Object.assign(ta, { autocomplete: 'off', spellcheck: false });
  // les champs de l'enveloppe : un vrai <input> par champ, tous dans un même <form>, chacun posé sur sa ligne (08/10 :
  // avec un seul champ qui changeait d'identité, le remplissage automatique du téléphone ne remplissait que le nom ;
  // ainsi il remplit nom, adresse, ville, code postal d'un coup)
  const form = el('form', '');
  Object.assign(form.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', margin: '0', zIndex: '12' });
  form.setAttribute('autocomplete', 'on'); form.setAttribute('aria-label', 'Adresse');
  form.addEventListener('submit', e => e.preventDefault());
  const fieldEls = {};
  for (const d of FIELDS) {
    const f = document.createElement('input'); f.className = 'sc-answer';
    Object.assign(f, { type: 'text', spellcheck: false, name: d.ac, id: 'sc-f-' + d.id });
    f.setAttribute('autocomplete', d.ac); f.setAttribute('inputmode', d.im); f.setAttribute('autocapitalize', d.cap);
    f.setAttribute('autocorrect', 'off'); f.setAttribute('aria-label', d.label);
    f.setAttribute('enterkeyhint', d === FIELDS[FIELDS.length - 1] ? 'done' : 'next');
    f.dataset.field = d.id; form.appendChild(f); fieldEls[d.id] = f;
  }
  const inputs = [ta, ...Object.values(fieldEls)];
  const isField = e => !!(e && e.dataset && e.dataset.field);
  let answer = ta;
  const useEl = e => { if (answer === e) return; if (!isField(answer)) { answer.style.width = '1px'; answer.style.height = '1px'; } answer = e; };
  const both = (ev, fn, o) => { for (const e of inputs) e.addEventListener(ev, fn, o); };
  // tous les champs → l'enveloppe (frappe, remplissage automatique, avec ou sans événement) ; valeurs nettoyées en retour
  let lastVals = '', envSynced = false;
  function syncFields() {
    if (!sheet) return;
    // l'enveloppe arrive avec des champs déjà écrits (le prénom du destinataire, une adresse gardée) : on les
    // donne d'abord aux vrais champs, sinon leur valeur vide effacerait l'enveloppe (09/10)
    if (!envSynced) { const st = sheet.state().env; if (!st) return; for (const d of FIELDS) fieldEls[d.id].value = st.fields[d.id] || ''; envSynced = true; }
    const vals = Object.fromEntries(FIELDS.map(d => [d.id, fieldEls[d.id].value]));
    const key = JSON.stringify(vals);
    if (key === lastVals) return;
    const c = sheet.setFields(vals);
    for (const d of FIELDS) {
      const e = fieldEls[d.id], v = c[d.id] || '';
      if (e.value !== v) { e.value = v; if (document.activeElement === e) try { e.setSelectionRange(v.length, v.length); } catch { /* */ } }
    }
    lastVals = JSON.stringify(Object.fromEntries(FIELDS.map(d => [d.id, fieldEls[d.id].value])));
  }
  for (const d of FIELDS) {
    fieldEls[d.id].addEventListener('change', syncFields);
    // toucher une ligne, ou les flèches du clavier de l'iPhone : ce champ devient le champ en cours
    fieldEls[d.id].addEventListener('focus', () => { if (sheet) sheet.selectField(d.id, now()); });
  }
  // (18/10, décision 6) saisie assistée de l'adresse, dans les versions : on tape la rue, la Base Adresse Nationale propose
  // l'adresse complète, un choix remplit la rue, la ville et le code postal (la saisie libre reste possible)
  if (EST_VERSION) lierAdresse(fieldEls.rue, {
    ancre: () => fieldEls.rue.getBoundingClientRect(),
    onChoix: s => { fieldEls.rue.value = s.rue; fieldEls.ville.value = s.ville; fieldEls.cp.value = s.cp; syncFields(); fieldEls.cplt.focus({ preventScroll: true }); },
  });
  answer.setAttribute('autocapitalize', 'none'); answer.setAttribute('enterkeyhint', 'done'); answer.setAttribute('aria-label', 'Réponse');
  const giveEl = el('div', 'sc-sign', '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19 V6 M6.5 11 L12 5.5 L17.5 11" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  let passTop = null, impAt = 0, ucAt = 0, syncK = '';
  if (EST_V2) { giveEl.textContent = 'envoyer →'; giveEl.classList.add('sc-envoyer'); }   // (V2) un mot, pas une flèche
  if (EST_VERSION) { giveEl.setAttribute('role', 'button'); giveEl.setAttribute('aria-label', 'Envoyer ma réponse'); giveEl.tabIndex = 0; giveEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); giveEl.click(); } }); }
  const passEl = el('div', 'sc-pass', 'PASSER<span class="sc-sub"></span>'); passEl.setAttribute('role', 'button');
  const tireEl = el('div', 'sc-tire', ''); tireEl.setAttribute('aria-hidden', 'true');
  const libreEl = el('div', 'sc-tire', ''); libreEl.setAttribute('aria-hidden', 'true');   // (20/10) « exprime-toi librement », au-dessus de la carte vierge
  // (V2, décision 5) « tirer une autre carte » : un mot, sans limite, en plus du paquet qu'on touche et de la question qu'on glisse
  const autreEl = EST_V2 ? el('div', 'sc-autre', 'tirer une autre carte') : null;
  if (autreEl) { autreEl.setAttribute('role', 'button'); autreEl.tabIndex = 0; autreEl.setAttribute('aria-label', 'Tirer une autre carte'); autreEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autreEl.click(); } }); }
  // le texte entre parenthèses sous PASSER : il se fond (au noir) et laisse la place au suivant
  let subT = 0;
  const setSub = txt => { const sb = passEl.querySelector('.sc-sub'); if (sb.textContent === txt) return; clearTimeout(subT); if (!sb.textContent) { sb.style.opacity = '0'; sb.textContent = txt; requestAnimationFrame(() => requestAnimationFrame(() => { sb.style.opacity = ''; })); return; } sb.style.opacity = '0'; subT = setTimeout(() => { sb.textContent = txt; sb.style.opacity = ''; }, 580); };
  const namePass = () => { if (passEl._free) return; passEl.setAttribute('aria-label', 'Passer : j’improvise ton poème avec ' + name); if (EST_VERSION) setSub('(j’improvise ton poème avec ' + name + ')'); else { passEl._imp = true; setSub(''); } };
  namePass();
  // l'enveloppe : POSTER (même signe que PASSER), dès que l'adresse a deux lignes, même clavier ouvert
  const postEl = el('div', 'sc-pass', 'POSTER'); postEl.setAttribute('role', 'button'); postEl.tabIndex = 0;
  const walletEl = el('div', 'sc-wallet', ''); walletEl.setAttribute('role', 'group'); walletEl.setAttribute('aria-label', 'Payer avec Apple Pay ou Google Pay');
  const whoEl = el('div', 'sc-who', '');
  whoEl.textContent = EST_VERSION ? 'à qui je l’envoie ? pour offrir, mets son adresse' : 'à qui je l’envoie ?';
  // pointerdown sans effet par défaut : le champ garde le focus, le clavier ne se ferme pas sous le doigt avant le clic
  postEl.addEventListener('pointerdown', e => { e.preventDefault(); });
  // (18/10, correctif C5) dans les versions, le code postal est vérifié au clic sur POSTER : cinq chiffres, en France
  // (avant : « ABC » partait tel quel)
  const noteEnv = EST_VERSION ? creerNote() : null;
  postEl.addEventListener('click', () => {
    if (noteEnv && sheet) {
      const es = sheet.state().env;
      if (es && es.canPost && !es.posted) {
        const v = validerCodePostal((es.fields || {}).cp);
        if (!v.ok) {
          const r = postEl.getBoundingClientRect();
          noteEnv.dire(v.message, { haut: r.top - 46 });
          sheet.selectField('cp', now()); fieldEls.cp.focus({ preventScroll: true });
          log('code postal refusé'); return;
        }
        noteEnv.taire();
        // (18/10, décision 7) le paiement, à la fin : après la réponse, l'adresse et l'email, AVANT la cire. La page (main.js) donne
        // l'étape (api.payStep) quand il y a quelque chose à payer ; elle rend l'email donné (qui se tapera seul à la fin), ou
        // null si l'on referme le panneau (on reste sur l'enveloppe, rien n'est scellé)
        // (V2, décision 7) d'abord le récapitulatif (la feuille, l'enveloppe, modifiables) et la carte « 39 € · payer »
        if (EST_V2 && !recapDone) {
          if (payBusy) return;
          payBusy = true; answer.blur();
          const d = chosen || {}, qq = d.kind === 'reponse' ? (QUESTIONS.find(x => x.id === d.id) || {}).q || '' : '';
          import('../v2/recap.js').then(m => m.recap({ name, kind: d.kind, text: d.text, question: qq ? qq.toLowerCase() : '', fields: { ...es.fields }, payer: !!api.payStep })).then(async c => {
            payBusy = false;
            if (c === 'payer') { recapDone = true; postEl.click(); }
            else if (c === 'reponse') {
              // revenir à la réponse : la flèche ← autant de fois qu'il faut (la réponse reste sur la carte)
              // (un retour déjà en cours refuse le suivant : on réessaie jusqu'à l'arrivée sur les cartes)
              const t1 = performance.now();
              while (api.level() > 3 && performance.now() - t1 < 90000) { stepBack(); await new Promise(r => setTimeout(r, 1500)); }
            }
          }, () => { payBusy = false; });
          return;
        }
        const etape = api.payStep;                       // une fonction ({ fields }) → promesse, posée par la page ; absente : rien à payer
        if (etape && !payDone) {
          if (payBusy) return;
          payBusy = true; answer.blur();
          Promise.resolve(etape({ fields: { ...es.fields } })).then(r => {
            payBusy = false;
            if (!r) { log('paiement : refermé'); return; }
            payDone = true; paidAuto = { fields: null, email: r.email || (paidAuto && paidAuto.email) || '' };
            log('payé avant la cire'); postEl.click();
          }, () => { payBusy = false; });
          return;
        }
      }
    }
    if (sheet && sheet.post(now())) { answer.blur(); log('postée'); }
  });
  postEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); postEl.click(); } });
  const backEl = el('div', 'sc-sign sc-back', '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M14.5 6 L8.5 12 L14.5 18" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>');
  backEl.setAttribute('role', 'button'); backEl.setAttribute('aria-label', 'Retour');
  const veil = el('div', 'sc-veil');
  // lecteur d'écran (09/10) : la question tirée n'existait que dessinée. Le champ où l'on écrit porte la question
  // comme nom (on entend « As-tu… ? , zone de texte »), et chaque carte, la feuille, l'enveloppe sont annoncées.
  const sr = el('div', 'sc-sr'); sr.setAttribute('aria-live', 'polite');
  const say = txt => { sr.textContent = ''; setTimeout(() => { sr.textContent = txt; }, 60); };
  let srLabel = 'Réponse';
  const labelAnswer = l => { srLabel = l; if (answer === ta) ta.setAttribute('aria-label', l); };

  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: !!opts.shot });
  if (!gl) return null;
  // horloge : réelle, ou pilotée image par image (tests, captures : api.manual / api.advance)
  let vclock = null;
  const t0 = performance.now(), now = () => vclock ?? (performance.now() - t0) / 1000;
  const vv = window.visualViewport;

  let chosen = null;   // (V2) ce qui a été donné : le récapitulatif le relit
  function finish(d) {
    chosen = d;
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
    sheet = createSheetScene(gl, { card: scene.renderer, nameR: scene.nameR, look: scene.look, from: scene.snapshot(), seed, reduced, hold: !!opts.hold && !paid,
      fast: !paid ? opts.sheetFast || 1 : 1, noTopCard: !!opts.noTopCard, placed: !paid && !!opts.placed, landAt: !paid && landAt ? { at: landAt, now: now() } : null,
      // (12/10, Maxence) payé : la même scène que la page (même cadrage) ; la vitrine se joue d'elle-même avec la carte de
      // la personne (story), puis l'enveloppe se retourne pour l'adresse
      // (13/10, Maxence) payé : la fin d'avant — la feuille dans l'enveloppe, l'expéditeur tapé de près, le destinataire
      // (l'adresse connue se tape seule, sinon à la main), POSTER, le cachet de près, la tranche, l'email ; plus d'histoire
      insetBottom: !paid ? opts.insetBottom : null, insetTop: !paid ? opts.insetTop : null, sheetZoom: !paid ? opts.sheetZoom : null,
      vitrine: !!opts.vitrine && !paid, story: false, base,
      // payé : l'adresse connue (panneau, portefeuille) se tape seule sur l'enveloppe ; sinon on l'y écrit, puis POSTER
      on: { back: closeSheet, order: d => { log('commande : ' + d.mode); opts.onOrder?.(d); say('l’enveloppe. écris l’adresse où envoyer ton poème, puis POSTER.'); },
        // l'enveloppe : on y tape l'adresse (même champ natif que la réponse, Entrée = ligne suivante)
        write: d => {
          useEl(d.field ? fieldEls[d.field.id] : ta);
          if (d.field) {
            // chaque champ garde ses propres réglages (autocomplete, clavier) : on n'y touche plus, on resynchronise
            for (const f of FIELDS) { const v = (d.fields || {})[f.id] || ''; if (fieldEls[f.id].value !== v) fieldEls[f.id].value = v; }
            lastVals = '';
          } else answer.value = d.text || '';
          if (d.field) { /* */ } else if (d.zone === 'contact') {
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
          if (d.mode === 'poste' && !d.test) { askMail(d); return; }             // « en direct » : le contact est déjà sur la carte
          const end = d => {
            if (d.test) {                                                   // essai sans adresse : la demande part telle quelle
              try { if (typeof window.onAddress === 'function') window.onAddress(d); } catch (e) { console.error(e); }
              window.dispatchEvent(new CustomEvent('singulies:address', { detail: d }));
            }
            // plus d'écran de fin (08/10) : directement le portail
            opts.onAddress?.(d); setTimeout(() => opts.onDone?.(d), 300);
          };
          if (TEST && !paid) askBeta(d, end); else end(d);
        } } });
    scene.hideName(true);
    sheetAt = now(); api.sheet = sheet;
    if (paid && paidAuto && paidAuto.fields) autoAddress(paidAuto.fields);
    say(name + ' : ton prénom en colonne, une lettre par ligne du poème, ' + [...name].filter(c => c !== ' ').join(', ') + '.');
  }
  // ---- l'enveloppe envoyée a basculé sur sa tranche : la tranche devient le champ de l'email (08/10). L'invitation
  // « ton email » en grisé, comme sur l'enveloppe ; COMMANDER (ou Entrée) dès qu'il est valable — pas d'autre issue.
  // La demande est gardée (brouillon) dès l'envoi : si l'on ferme la page ici, elle part à la visite suivante, sans
  // email. Ensuite, directement le portail.
  const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  let mail = null;
  function askMail(d) {
    try { localStorage.setItem(vk('singulies.draft'), JSON.stringify(d)); } catch { /* */ }
    answer.blur(); postEl.classList.remove('on'); whoEl.classList.remove('on');
    if (mail) mail.drop();
    const box = el('div', 'sc-mail');
    const inp = document.createElement('input');
    Object.assign(inp, { type: 'email', spellcheck: false, autocomplete: 'email', placeholder: 'email', name: 'email' });
    inp.setAttribute('inputmode', 'email'); inp.setAttribute('autocapitalize', 'none'); inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('enterkeyhint', 'done'); inp.setAttribute('aria-label', 'Ton email');
    const line = document.createElement('div'); line.className = 'sc-line';
    const field = document.createElement('div'); field.className = 'sc-field';
    const typed = document.createElement('div'); typed.className = 'sc-type'; typed.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span'); typed.appendChild(inner);
    field.append(inp, typed);
    box.append(field, line);
    // le prénom, au-dessus de la ligne (capitale ≈ 5,5 % de la largeur, comme sur l'accueil en portrait ; deux mots
    // trop larges : deux lignes, comme partout)
    const nm = document.createElement('div'); nm.className = 'sc-name'; nm.setAttribute('aria-hidden', 'true');
    box.appendChild(nm);
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const fitName = () => {
      const maxW = Math.min(innerWidth - 32, 720);
      let fs = Math.max(22, Math.min(40, innerWidth * 0.055 / 0.65));
      nm.style.fontSize = fs + 'px'; nm.textContent = words.join(' ');
      if (nm.scrollWidth > maxW && words.length > 1) nm.textContent = words.join('\n');
      while (nm.scrollWidth > maxW && fs > 14) { fs *= 0.92; nm.style.fontSize = fs + 'px'; }
    };
    fitName();
    // tapé à la machine : chaque caractère a son appui, son petit décalage, son inclinaison (tirés de son rang et de
    // sa lettre : un caractère ne bouge plus une fois tapé) ; le dernier frappé arrive d'un coup sec
    let shown = '';
    const draw = () => {
      const v = inp.value;
      if (v === shown) return;
      let same = 0; while (same < v.length && same < shown.length && v[same] === shown[same]) same++;
      while (inner.childNodes.length > same) inner.lastChild.remove();
      for (let i = same; i < v.length; i++) {
        const sp = document.createElement('span'), c = v[i], h = Math.sin((i + 1) * 12.9898 + c.charCodeAt(0) * 78.233) * 43758.5453, r = k => { const x = Math.sin(h * (k + 1)) * 9999; return x - Math.floor(x); };
        sp.textContent = c;
        sp.style.opacity = (0.72 + 0.28 * r(1)).toFixed(2);
        sp.style.transform = 'translate(' + ((r(2) - 0.5) * 0.5).toFixed(2) + 'px,' + ((r(3) - 0.5) * 1.1).toFixed(2) + 'px) rotate(' + ((r(4) - 0.5) * 2.4).toFixed(2) + 'deg)';
        if (v.length > shown.length && i >= shown.length) sp.className = 'hit';
        inner.appendChild(sp);
      }
      shown = v;
    };
    // (18/10, correctif C3) dans les versions, un seul nom pour le bouton final — TERMINER, à l'écran comme pour les lecteurs
    // d'écran (rien n'est acheté ici : COMMANDER trompait) — et rien ne dit « partie » avant l'envoi réel
    const FIN = EST_VERSION || paid ? 'TERMINER' : 'COMMANDER';
    const go = el('div', 'sc-pass', FIN); go.setAttribute('role', 'button'); go.tabIndex = 0;
    requestAnimationFrame(() => box.classList.add('on'));
    // ordinateur : le curseur y vient dès que l'enveloppe a disparu (placeMail) ; téléphone : toucher la ligne
    const ok = () => mailOk(inp.value);
    inp.addEventListener('input', () => { draw(); go.classList.toggle('on', ok()); if (mail) placeMail(); });
    inp.addEventListener('change', draw);
    let done = false;
    const finish = () => {
      if (done || !ok()) return; done = true; if (mail) mail.sending = true;
      const c = inp.value.trim(), out = { ...d, contact: c, email: c, tel: '' };
      try { localStorage.removeItem(vk('singulies.draft')); } catch { /* */ }
      inp.blur(); go.classList.remove('on'); box.classList.remove('on');
      if (TEST && !paid) { askBeta(out, send); return; }
      send(out);
    };
    const send = out => {
      try { if (typeof window.onAddress === 'function') window.onAddress(out); } catch (e) { console.error(e); }
      window.dispatchEvent(new CustomEvent('singulies:address', { detail: out }));
      opts.onAddress?.(out);
      log('email : ' + out.contact);
      setTimeout(() => { opts.onDone?.(out); }, 900);
    };
    go.addEventListener('pointerdown', e => e.preventDefault());       // le clavier ne se ferme pas sous le doigt
    go.addEventListener('click', finish);
    go.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); finish(); } });
    mail = { box, inp, go, inner, draw, ready: false, drop: () => { box.remove(); go.remove(); } };
    say(EST_VERSION ? 'l’enveloppe est scellée. il reste ton email : écris-le, puis ' + FIN + '.' : 'l’enveloppe est partie. ton email, puis COMMANDER.');
    api.ask = { input: inp, send: finish };
  }
  // ---- mode test (?test=1, et l'essai sans adresse ?adresse=0) : avant TERMINER, deux questions pour les testeurs ;
  // les réponses partent avec la demande (beta → contact_html, send.js). Rien d'obligatoire. ----
  function askBeta(d, then) {
    answer.blur(); postEl.classList.remove('on'); whoEl.classList.remove('on'); backEl.classList.remove('on');
    const box = el('div', 'sc-ask');
    const mk = (q, ph, label) => {
      const t = document.createElement('div'); t.className = 'ask-q'; t.textContent = q;
      const i = document.createElement('input');
      Object.assign(i, { type: 'text', spellcheck: false, autocomplete: 'off', placeholder: ph });
      i.setAttribute('autocorrect', 'off'); i.setAttribute('autocapitalize', 'none'); i.setAttribute('aria-label', label);
      box.append(t, i); return i;
    };
    const prix = mk('combien serais-tu prêt à payer\npour l’original du poème\nécrit à la main ?', '', 'Prix');
    const retours = mk('d’autres retours ?', '', 'Retours');
    prix.setAttribute('enterkeyhint', 'next'); retours.setAttribute('enterkeyhint', 'done');
    const go = document.createElement('div'); go.className = 'sc-pass on'; go.textContent = 'TERMINER'; go.setAttribute('role', 'button'); go.tabIndex = 0;
    box.appendChild(go);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('on')));
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => prix.focus({ preventScroll: true }), 900);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      prix.blur(); retours.blur();
      log('test : ' + prix.value + ' / ' + retours.value);
      then({ ...d, beta: { prix: prix.value.trim(), retours: retours.value.trim() } });
    };
    prix.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); retours.focus({ preventScroll: true }); } });
    retours.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); finish(); } });
    go.addEventListener('pointerdown', e => e.preventDefault());
    go.addEventListener('click', finish);
    go.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } });
    say('deux questions avant de terminer : combien serais-tu prêt à payer pour l’original du poème écrit à la main ? d’autres retours ?');
    api.beta = { prix, retours, send: finish };
  }
  // le champ de l'email suit la tranche (à l'écran) ; COMMANDER dessous (clavier ouvert : au-dessus du clavier)
  function placeMail() {
    const Ln = sheet && sheet.edgeLine(); if (!Ln) return;
    if (Ln.gone && !mail.ready) {
      mail.ready = true; mail.box.classList.add('ready');
      const known = paid && paidAuto && paidAuto.email;
      if (known) typeMail(paidAuto.email);                    // payé : l'email déjà donné se tape seul, on n'a plus qu'à confirmer
      else if (matchMedia('(pointer: fine)').matches) mail.inp.focus({ preventScroll: true });
    }
    mail.draw();                                     // (remplissage automatique sans événement)
    // la ligne : la tranche tant qu'elle se voit, puis MAIL_W ; elle s'allonge avec ce qu'on tape
    const tw = mail.inner.offsetWidth || 0;
    const x0 = Math.min(Ln.x0, Ln.x1), x1 = Math.max(Ln.x0, Ln.x1), y = (Ln.y0 + Ln.y1) / 2;
    const w = Math.min(innerWidth - 24, Math.max(MAIL_W, x1 - x0, tw + 36));
    const h = mail.box.offsetHeight || 30, cx = (x0 + x1) / 2;
    Object.assign(mail.box.style, { left: (cx - w / 2) + 'px', top: (y - h + 0.5) + 'px', width: w + 'px' });
    const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
    mail.go.style.top = Math.min(y + 18, kbTop - 50) + 'px';
  }
  // (10/10) payé : l'adresse connue se tape seule sur l'enveloppe, champ après champ (comme à la machine), puis elle part
  function autoAddress(f) {
    const ids = FIELDS.map(d => d.id).filter(id => (f[id] || '').trim());
    let k = 0, i = 0, done = {}, started = false;
    const iv = setInterval(() => {
      if (!sheet) { clearInterval(iv); return; }
      const es = sheet.state().env;
      if (!es || !es.write || es.posted || es.back) return;   // la vue est sur l'adresse : on peut écrire
      if (!started) { started = true; for (const id of ids) done[id] = ''; }
      if (k >= ids.length) { clearInterval(iv); setTimeout(() => { if (sheet) sheet.post(now()); }, 900); return; }
      const id = ids[k], full = String(f[id]).trim();
      i++; done[id] = full.slice(0, i);
      sheet.setFields({ ...es.fields, ...done });
      if (i >= full.length) { k++; i = 0; }
    }, 48);
  }
  function typeMail(v) {
    let i = 0;
    const iv = setInterval(() => {
      if (!mail || mail.inp.value.length > i || i >= v.length) { clearInterval(iv); return; }   // on a commencé à écrire : on s'arrête
      i++; mail.inp.value = v.slice(0, i); mail.inp.dispatchEvent(new Event('input'));
    }, 55);
  }
  function closeSheet() {
    if (!sheet) return;
    useEl(ta);
    for (const e of Object.values(fieldEls)) { e.blur(); e.style.width = '1px'; e.style.height = '1px'; }
    sheet.free(); sheet = null; api.sheet = null; placeHits(); postEl.classList.remove('on'); whoEl.classList.remove('on');
    answer.setAttribute('aria-label', srLabel); answer.setAttribute('enterkeyhint', 'done');
    answer.setAttribute('autocomplete', 'off'); answer.setAttribute('autocapitalize', 'none');
    scene.reopen(now());
    if (resumeHow) { scene.resume(now(), resumeHow); resumeHow = null; }
    log('retour aux cartes');
  }
  function focusAnswer() { if (document.activeElement !== answer) answer.focus({ preventScroll: true }); }
  const setValue = (s) => { if (answer.value !== s) { answer.value = s; try { answer.setSelectionRange(s.length, s.length); } catch { /* */ } } };
  const scene = await createCardScene(gl, { base, seed, look, toSheet, autoWrite: !coarse, firstQ: opts.firstQ ?? null, sheetOnly: !!opts.sheetOnly, on: { end: finish, write: focusAnswer, text: (d) => setValue(d.text),
    draw: d => { const q = QUESTIONS.find(x => x.id === d.id)?.q; if (q) { labelAnswer(q); say(q); } window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id: d.id, action: 'tiree' } })); },
    discard: d => window.dispatchEvent(new CustomEvent('singulies:question', { detail: { id: d.id, action: 'passee' } })),
    blank: () => { labelAnswer('carte blanche : le thème de ton poème'); say('carte blanche. écris le thème de ton poème.'); } } });
  scene.setName(name);

  // (10/10, alt.html) payé dans la page : la suite se joue ici, sans changer de page. how : 'question' (la feuille se
  // défait, le paquet arrive et tire), 'blanche' (la carte blanche d'emblée : un thème), 'impro' (la feuille part
  // telle quelle dans l'enveloppe). L'adresse est chez Stripe : l'enveloppe se ferme et part seule.
  let paid = false, resumeHow = null, paidAuto = null, payDone = false, recapDone = false, payBusy = false, walletTried = false, walletOk = false;
  // payé par le portefeuille : l'adresse et l'email viennent avec — l'enveloppe s'écrit seule, puis elle est scellée
  const onWallet = r => {
    payDone = true;
    const f = r.address && fieldsReady(r.address) ? { ...r.address } : null;
    paidAuto = { fields: f, email: r.email || '' };
    walletEl.classList.remove('on'); answer.blur(); log('payé par le portefeuille');
    if (f) autoAddress(f);
    else if (sheet && sheet.state().env && sheet.state().env.canPost) postEl.click();
  };
  function afterPay(how = 'question', auto = null) {
    paid = true;
    // (10/10) ce qu'on sait déjà : l'adresse (complète) et l'email — l'enveloppe et le champ de la fin les tapent seuls
    paidAuto = auto ? { fields: auto.fields && fieldsReady(auto.fields) ? { ...auto.fields } : null, email: auto.email || '' } : null;
    const t = now();
    if (!sheet) { scene.resume(t, how); return; }
    if (how === 'impro') { sheet.unhold(t, { noAddr: true }); return; }
    resumeHow = how;
    // (10/10) l'enveloppe ouverte (adresse tapée avant le paiement) : elle se défait d'abord, puis la feuille
    if (sheet.state().env) {
      sheet.back(t);
      const iv = setInterval(() => { if (!sheet) { clearInterval(iv); return; } if (!sheet.state().env) { clearInterval(iv); sheet.back(now()); } }, 120);
      return;
    }
    sheet.back(t);
  }

  let started = false, landAt = null;
  const api = { afterPay, scene, canvas, gl, now, started: () => started, frames: 0, start, nameTargets: (W, H) => scene.nameTargets(name, W, H),
    // (10/10, alt) la vitrine, jouée dans la scène de la feuille
    vitrine: { go: k => sheet?.vitrine?.go(k), jump: k => sheet?.vitrine?.jump(k), scrub: p => sheet?.vitrine?.scrub(p), look: v => !!sheet?.vitrine?.look?.(v), seek: v => sheet?.vitrine?.seek(v), state: () => sheet?.vitrine?.state() || null } };

  // (11/10, alt) les lettres sont déjà dans la colonne (venues de l'accueil) : la scène des cartes ne dessine jamais le
  // prénom en haut, pas même un instant
  if (opts.placed && opts.sheetOnly) scene.hideName(true);
  // (12/10, alt) préparée pendant qu'on écrit : le prénom définitif arrive au départ ; les lettres de la colonne
  // paraissent quand celles de l'accueil s'y posent (landAt : instants de cette horloge, une par lettre)
  api.setName = n => { name = n; scene.setName(n); namePass(); };
  api.landAt = list => { landAt = list; };
  // (17/10, Maxence : « rembobiner si l'on veut modifier le prénom, pas de fondu au noir ») la feuille se défait sans
  // bruit (le canvas est déjà effacé par la page) ; au prochain départ, la scène rejoue la feuille seule avec le prénom
  // corrigé (setName, landAt) — même canvas, même boucle
  let redoPending = false;
  api.redo = () => {
    if (sheet) { for (const e of Object.values(fieldEls)) e.blur(); sheet.free(); sheet = null; api.sheet = null; placeHits(); }
    api.sheetReady = false; landAt = null; redoPending = true;
  };
  function start() {
    if (started) { if (redoPending) { redoPending = false; scene.start(now()); } return; }
    started = true;
    scene.start(now());
    let last = performance.now();
    function frame(n, manualDt) {
      if (vclock != null && manualDt == null) return;            // horloge pilotée : pas de boucle
      const t = now(), dt = manualDt ?? Math.min(window.__dtMax || 0.05, (n - last) / 1000); last = n;   // (__dtMax : essais en rendu logiciel)
      const dpr = dpr3d(), W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(6 / 255, 6 / 255, 6 / 255, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (sheet) {
        const sh = sheet;
        sh.frame(t, dt, W, H);
        if (sheet !== sh) { if (manualDt == null) requestAnimationFrame(frame); return; }     // retour : la scène des cartes reprend
        passEl.classList.remove('on');
        backEl.classList.toggle('on', (!opts.hold || paid) && t - sheetAt > 2.5 && !sheet.state().backing && !(mail && mail.sending));
        if (opts.onSheetReady && !api.sheetReady && sheet.ready(true)) { api.sheetReady = true; opts.onSheetReady(); }
        // l'enveloppe : le champ natif sur le bloc d'adresse ; le signe « donner » = poster
        const ar = sheet.addrRect(), es = sheet.state().env;
        // chaque champ natif sur sa ligne de l'enveloppe ; la carte « en direct » : le champ de texte
        const fr = sheet.fieldRects();
        // (18/10, V3) cibles de 44 px : chaque ligne de l'adresse se touche sur au moins 44 px de haut (ou toute la distance
        // qui la sépare de sa voisine si elle est plus courte : jamais deux champs qui se recouvrent)
        let pitch = 44;
        if (EST_VERSION && fr) {
          const tops = FIELDS.map(f => fr[f.id] && fr[f.id].top).filter(v => v != null).sort((a, b) => a - b);
          for (let i = 1; i < tops.length; i++) { const dd = tops[i] - tops[i - 1]; if (dd > 4 && dd < pitch) pitch = dd; }
        }
        for (const d of FIELDS) {
          const e = fieldEls[d.id], q = fr && fr[d.id];
          if (q) { const h0 = q.bottom - q.top, h = EST_VERSION ? Math.max(h0, pitch) : h0;
            Object.assign(e.style, { left: q.left + 'px', top: (q.top - (h - h0) / 2) + 'px', width: (q.right - q.left) + 'px', height: h + 'px' }); }
          else { e.style.width = '1px'; e.style.height = '1px'; }
        }
        if (!isField(answer)) {
          if (ar) Object.assign(answer.style, { left: ar.left + 'px', top: ar.top + 'px', width: (ar.right - ar.left) + 'px', height: (ar.bottom - ar.top) + 'px' });
          else { answer.style.width = '1px'; answer.style.height = '1px'; }
        }
        if (es) syncFields(); else envSynced = false;   // remplissage automatique sans événement (Safari)
        giveEl.classList.remove('on');
        postEl.classList.toggle('on', !!(es && es.canPost && ar));
        if (es && postEl.textContent !== es.sign) postEl.textContent = es.sign;
        // posé sur l'enveloppe, sous l'adresse : il la suit (caméra, inclinaison, clavier), à son échelle
        const sa = es && sheet.signAt();
        if (sa) {
          postEl.classList.add('sc-on-env');
          const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
          Object.assign(postEl.style, { left: sa.x + 'px', top: Math.min(sa.y + 14, kbTop - 50) + 'px' });
        }
        // « à qui je l'envoie ? » au-dessus de la première ligne de l'adresse, tant qu'on l'écrit
        const qw = fr && fr.prenom;
        // (17/10, Maxence : « enlève « à qui je l'envoie » : on comprend bien qu'il faut écrire son adresse ») plus d'indication ici
        whoEl.classList.toggle('on', !!(EST_VERSION && es && es.write && !es.posted));   // (V3 : la ligne revient, plus claire)
        // le portefeuille à l'enveloppe (décision 7) : proposé dès qu'on peut écrire l'adresse, s'il en existe un sur l'appareil
        if (EST_VERSION && es && es.write && !es.posted && !es.back && api.walletStep && !payDone) {
          if (!walletTried) { walletTried = true; api.walletStep({ host: walletEl, done: onWallet }).then(ok => { walletOk = !!ok; }); }
          walletEl.classList.toggle('on', walletOk);
        } else walletEl.classList.remove('on');
        if (qw) Object.assign(whoEl.style, { left: qw.left + 'px', top: (qw.top - 6) + 'px' });
        if (mail) placeMail();
        const br = { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
        sheet.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
        placeHits();
        api.frames++;
        if (manualDt == null) requestAnimationFrame(frame);
        return;
      }
      scene.frame(t, dt, W, H);
      // signes : donner (sous la carte écrite, clavier fermé) ; passer (avec la carte blanche offerte)
      const st = scene.state(), r = scene.activeRect(), mk0 = autreEl ? scene.marks() : null;
      // la petite flèche est retirée (06/10) : Entrée, glisser vers le haut. (18/10, V3) elle revient « en plus d'Entrée » : un signe
      // visible pour envoyer la réponse quand elle est écrite
      giveEl.classList.toggle('on', !!(EST_VERSION && !sheet && !st.ended && st.active && st.active.text && !st.shuffling && st.mode !== 'free'));   // (sur la carte blanche : CONTINUER suffit)
      if (r) { giveEl.style.left = ((r.left + r.right) / 2 - (EST_V2 ? 0 : 22)) + 'px'; giveEl.style.top = (r.bottom + 10) + 'px'; }
      // (V2) « tirer une autre carte » : au-dessus de la question tirée, tant qu'on n'a pas répondu ailleurs
      if (autreEl) {
        const on = st.mode === 'q' && !!st.active && !st.ended && !st.shuffling && !st.kb;
        autreEl.classList.toggle('on', on);
        if (on && mk0 && mk0.qTop != null && r) { autreEl.style.left = ((r.left + r.right) / 2) + 'px'; autreEl.style.top = Math.max(60, mk0.qTop - 50) + 'px'; }
      }
      // PASSER : sur la carte blanche seulement, après 3 s sans frappe, sous la carte ; retour : en haut à gauche
      // (carte blanche → paquet ; paquet → accueil quand la page le permet)
      // PASSER : 3 s après que la carte blanche a pris la place du paquet, toujours visible ; clavier ouvert : entre
      // le bas de la carte et le haut du clavier
      const mk = scene.marks();
      // (20/10) deux cartes à écrire côte à côte (question / carte vierge) : le champ natif suit la carte qui a la main
      if (st.bfp) { const k = st.mode + ':' + (st.active && st.active.id); if (k !== syncK) { syncK = k; const tx = (st.active && st.active.text) || ''; if (answer.value !== tx) setValue(tx); } } else syncK = '';
      scene.setNameFy(document.querySelector('.nv-hd.on') ? 0.13 : 0.11);   // (le prénom sous le bandeau des pages quand il est là)
      // (20/10, Maxence) site principal, après RECEVOIR : le paquet en haut (« tire une question du jeu » dessous), « OU » au centre, « exprime-toi
      // librement » au-dessus de la carte vierge, en bas. Rien de choisi au bout de 10 s : les deux intitulés s'effacent, OU devient PASSER (toujours :
      // j'improvise) avec (j'improvise avec PRENOM) dessous. Un choix (toucher la carte vierge, écrire) efface tout ; clavier fermé : ça recommence.
      const NEWC = !EST_VERSION && !!st.paidMode && !!st.bfp;
      let ouOn = false, passerOn = false;
      if (NEWC) {
        const choosing = !st.bf || !!st.userWrite || !!(st.active && st.active.text);
        const nowMs = performance.now();
        if (choosing) ucAt = 0; else if (!ucAt && st.freeFor > 1.2) ucAt = nowMs;
        const el_ = ucAt ? (nowMs - ucAt) / 1000 : -1;
        ouOn = !st.ended && el_ >= 0 && el_ < 10; passerOn = !st.ended && el_ >= 11.4;
        // tire une question du jeu : tapé la première fois, sous le paquet
        if (ouOn !== tireEl._on) {
          tireEl._on = ouOn; clearTimeout(tireEl._t);
          if (ouOn) {
            const msg = 'tire une question du jeu';
            if (tireEl._typed) { tireEl.textContent = msg; tireEl.classList.add('on'); }
            else { tireEl._typed = true; let k = 0; tireEl.textContent = ''; tireEl.classList.add('on'); const step = () => { if (!tireEl._on) return; tireEl.textContent = msg.slice(0, ++k); if (k < msg.length) tireEl._t = setTimeout(step, 50 + Math.random() * 60); }; tireEl._t = setTimeout(step, 300); }
          } else tireEl.classList.remove('on');
        }
        if (ouOn !== libreEl._on) { libreEl._on = ouOn; if (ouOn) libreEl.textContent = 'exprime-toi librement'; libreEl.classList.toggle('on', ouOn); }
        if (mk && mk.deckBot != null && mk.blankBfTop != null) {
          tireEl.style.top = (mk.deckBot + 12) + 'px'; libreEl.style.top = (mk.blankBfTop - 33) + 'px';
          passTop = ((mk.deckBot + 33) + (mk.blankBfTop - 33)) / 2 - 22; passEl.style.top = passTop + 'px';
        }
        const want = passerOn ? 'PASSER' : 'OU';
        let showNow = ouOn || passerOn;
        if (showNow && passEl.firstChild.nodeValue !== want) { if (passEl.classList.contains('on')) showNow = false; else passEl.firstChild.nodeValue = want; }   // (le texte ne change jamais pendant qu'il se voit)
        passEl.classList.toggle('ou', ouOn); passEl.classList.toggle('on', showNow);
        if (passerOn) { passEl.setAttribute('aria-label', 'Passer : j’improvise ton poème avec ' + name); setSub('(j’improvise avec ' + name + ')'); } else { passEl.setAttribute('aria-label', 'ou'); setSub(''); }
      } else { libreEl._on = false; libreEl.classList.remove('on'); passEl.classList.remove('ou'); ucAt = 0; }
      // (17/10) « tire une carte », tapé à la machine au-dessus du paquet qui se mélange ; il s'efface quand on tire
      if (!NEWC) { const on = !!st.shuffling && !st.ended && !st.userWrite && !(st.bf && st.active && st.active.text);   // (20/10) un choix fait (la carte vierge touchée, un thème écrit, la fin) : plus de « tire une carte »
        if (on !== tireEl._on) {
          tireEl._on = on; clearTimeout(tireEl._t);
          // (18/10, carte vierge d'abord) « ou tire une carte » : sous le paquet, la carte vierge est au-dessus
          if (on) { const msg = 'tire une carte'; let k = 0; tireEl.textContent = ''; tireEl.classList.add('on'); const step = () => { if (!tireEl._on) return; tireEl.textContent = msg.slice(0, ++k); if (k < msg.length) tireEl._t = setTimeout(step, 70 + Math.random() * 80); }; tireEl._t = setTimeout(step, 600); }
          else tireEl.classList.remove('on');
        }
        if (on && mk && mk.deckTop != null) tireEl.style.top = Math.max(100, mk.deckTop - 46) + 'px'; }
      // (10/10) aussi quelques secondes après l'apparition de la carte blanche, même pas touchée (réponse vide)
      const blankIn = st.mode === 'q' && st.blankFor > 3.5 && !(st.active && st.active.text);
      // (12/10, Maxence) après le paiement : PASSER seul, sous la question posée (il mène à la carte vierge, « dis-moi ce
      // que tu veux », sous laquelle PASSER revient : j'improvise)
      const paidQ = st.paidMode && st.mode === 'q' && !st.shuffling && st.active && !st.active.text && st.idle > 1.2;
      // (18/10, Maxence : « au milieu PASSER apparaît après quelques secondes et (j'improvise avec PRENOM) ») entre la carte vierge et le paquet
      const bfOn = st.bf && st.freeFor > 3.5 && !(st.active && st.active.text) && !st.userWrite;   // (20/10) la carte vierge touchée = un choix : PASSER s'efface, il revient clavier fermé
      if (!NEWC) passEl.classList.toggle('on', !st.ended && (st.bf ? bfOn : ((st.mode === 'free' && (st.paidMode ? passTop != null : st.freeFor > 3) && (EST_VERSION || !st.userWrite)) || (st.paidMode ? paidQ : blankIn))));   // (après le paiement : il reste, à la même place, pendant que la carte se retourne)
      // (16/10, Maxence : « PASSER pouvait faire penser à passer la carte en cours ») sous la question : on dit où il mène
      { const free = !NEWC && !!st.paidMode && st.mode === 'q', sub = passEl.querySelector('.sc-sub');
        if (free !== passEl._free) { passEl._free = free; if (free) { passEl._imp = false; setSub('(si tu veux t’exprimer librement)'); passEl.setAttribute('aria-label', 'Passer : écrire librement'); } else namePass(); } }
      // (20/10, Maxence : « affiche (j’improvise avec PRENOM) seulement si 10 secondes sans choix ») site principal : la parenthèse paraît après 10 s
      // sans que la carte vierge soit touchée ni rien écrit ; un choix la remet à zéro
      if (!EST_VERSION && !NEWC && passEl._imp) {
        const choisi = !!st.userWrite || !!(st.active && st.active.text) || !passEl.classList.contains('on');
        if (choisi || !impAt) impAt = choisi ? 0 : performance.now();
        setSub(impAt && performance.now() - impAt > 10000 ? '(j’improvise avec ' + name + ')' : '');
      }
      // (18/10, correctif C6) un thème est écrit sur la carte blanche : PASSER devient CONTINUER (il mène à la suite AVEC ce
      // thème ; avant, PASSER l'effaçait et la demande partait en « improvisation »)
      { const ecrit = EST_VERSION && st.mode === 'free' && !!(st.active && st.active.text);
        if (ecrit !== !!passEl._ecrit) {
          passEl._ecrit = ecrit; passEl.firstChild.nodeValue = ecrit ? 'CONTINUER' : 'PASSER';
          if (ecrit) { setSub(''); passEl.setAttribute('aria-label', 'Continuer avec ton thème'); } else namePass();
        } }
      // (V2, décision 5) des PASSER explicites : sous la question, « passer : choisir mon thème » ; sur la carte blanche, « passer : laisse-moi
      // improviser » ; un thème écrit : CONTINUER
      if (EST_V2) {
        const lab = passEl._ecrit ? 'CONTINUER' : passEl._free ? 'PASSER : CHOISIR MON THEME' : 'PASSER : LAISSE-MOI IMPROVISER';
        if (passEl.firstChild.nodeValue !== lab) {
          passEl.firstChild.nodeValue = lab; passEl.classList.add('v2lab');
          passEl.setAttribute('aria-label', passEl._ecrit ? 'Continuer avec ton thème' : passEl._free ? 'Passer : choisir mon thème' : 'Passer : laisse-moi improviser ton poème avec ' + name);
        }
        if (passEl._free && !passEl._v2cut) { passEl._v2cut = true; setSub(''); } else if (!passEl._free) passEl._v2cut = false;
      }
      const kbTop = vv ? vv.offsetTop + vv.height : innerHeight;
      if (NEWC) { /* placé plus haut */ } else if (st.kb && r) passEl.style.top = Math.max(r.bottom + 2, (r.bottom + kbTop) / 2 - 22) + 'px';
      // (10/10) centré entre la question (et sa bande de réponse) et la carte blanche
      else if (st.bf && mk && mk.blankUpBottom != null) { passTop = (mk.deckBot + mk.blankBfTop) / 2 - (passEl.offsetHeight || 56) / 2; passEl.style.top = passTop + 'px'; }
      else if (st.mode === 'q' && mk && st.paidMode) { passTop = ((mk.qBottom || mk.deckBottom) + 34); passEl.style.top = passTop + 'px'; }
      else if (st.mode === 'free' && st.paidMode && passTop != null) passEl.style.top = passTop + 'px';
      else if (st.mode === 'q' && mk) passEl.style.top = (((mk.qBottom || mk.deckBottom) + mk.blankTop) / 2 - (passEl.offsetHeight || 60) / 2) + 'px';
      else if (mk) passEl.style.top = (mk.deckBottom + 34) + 'px';
      // respiration : la lumière et la carte en focus bougent d'elles-mêmes, très peu (le vivant, sans gyroscope)
      // la lampe respire d'elle-même (scene.js : breathAz / breathEl) ; carte en focus : elle respire aussi, moins que
      // celle en attente (Maxence 05/10)
      const br = { x: 0.42 * Math.sin(t * 0.52) + 0.16 * Math.sin(t * 0.97 + 1), y: 0.32 * Math.sin(t * 0.41 + 2) + 0.12 * Math.sin(t * 0.83) };
      scene.setTilt(ptr.x + 0.4 * br.x, ptr.y + 0.4 * br.y);
      backEl.classList.toggle('on', !st.ended && ((st.mode === 'free' && !st.bf && !st.bfp) || (!!onExit && !paid && t > 3 && !st.kb)));
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
  both('input', e => {
    if (sheet) {
      if (isField(e.target)) { syncFields(); return; }
      const c = sheet.setAddress(answer.value); if (c !== answer.value) setValue(c); return;
    }
    // Entrée qui a échappé à keydown (clavier Android, composition iPhone) : un retour à la ligne arrive dans le
    // texte — on le retire et c'est la suite, comme Entrée
    const NL = /[\r\n]+/g;
    // (18/10, V3) maj + Entrée : un retour à la ligne voulu, la réponse continue sur la ligne suivante (la carte les garde)
    if (EST_VERSION) {
      if (performance.now() - shiftNL < 400) keepNL = true;            // le retour à la ligne vient d'être voulu
      if (keepNL && /\n/.test(answer.value)) { scene.setText(answer.value); return; }
      if (!/\n/.test(answer.value)) keepNL = false;                    // plus aucun : on revient au comportement d'Entrée
    }
    if (NL.test(answer.value)) {
      setValue(answer.value.replace(NL, ' ').replace(/ +$/, ''));
      scene.setText(answer.value);
      if (!give('Entrée')) answer.blur();
      return;
    }
    scene.setText(answer.value);
  });
  let shiftNL = -1e9, keepNL = false;
  both('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (EST_VERSION && e.shiftKey && !sheet) { shiftNL = performance.now(); return; }   // (V3) maj + Entrée : à la ligne
    // enveloppe : Entrée = le champ suivant ; après le dernier, terminé
    if (sheet && sheet.state().env) {
      e.preventDefault();
      // (12/10, Maxence) l'adresse complète : Entrée = poster ; sinon le champ suivant
      const es = sheet.state().env;
      if (es.canPost && !es.posted) { postEl.click(); return; }
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
  let quietBlur = false;
  const closeKb = () => { if (!inputs.includes(document.activeElement)) { scene.stopWriting(); return; } quietBlur = true; try { answer.blur(); } finally { quietBlur = false; } };
  both('blur', e => {
    if (inputs.includes(e.relatedTarget)) return;
    if (sheet) {
      sheet.stopWriting();
      // (12/10) « OK » du clavier (fermé sans toucher ailleurs), l'adresse complète : poster
      const es = sheet.state().env;
      if (es && es.canPost && !es.posted && !quietBlur && performance.now() - lastPD > 400) postEl.click();
      return;
    }
    if (quietBlur) { scene.stopWriting(); return; }       // fermé par nous (carte balayée) : jamais « la suite »
    const st = scene.state();
    if (st.writing && st.active && st.active.text && !st.ended && performance.now() - lastPD > 400 && give('clavier fermé')) return;
    scene.stopWriting();
  });
  // (20/10) toucher la carte vierge, c'est le champ natif posé dessus qui le reçoit : c'est un choix (PASSER s'efface jusqu'à la fermeture du clavier)
  answer.addEventListener('pointerdown', () => { if (!sheet) scene.markWrite(); });
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
  canvas.addEventListener('pointerdown', e => { if (!started) return; if (sheet) { sheet.press(e.clientX, e.clientY); down = { x: e.clientX, y: e.clientY, sheet: true, d: 0, t: performance.now() }; return; } down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, v: false, on: scene.hitAt(e.clientX, e.clientY) }; scene.setPress(down.on); if (e.pointerType !== 'mouse') scene.setHover(down.on); });
  // effleurer (09/10) : la souris au-dessus d'une carte qu'on peut toucher la soulève un peu (et la main apparaît)
  canvas.addEventListener('pointerleave', () => { if (!sheet) { scene.setHover(null); scene.setPress(null); } canvas.style.cursor = ''; });
  addEventListener('pointercancel', () => { scene.setPress(null); scene.setHover(null); });
  // premier geste : si l'écriture attend le clavier, on l'ouvre (iPhone)
  addEventListener('touchend', e => { if (isField(e.target)) return; if (started && (sheet ? sheet.state().env?.writing : scene.state().writing)) focusAnswer(); }, { passive: true });
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
    if (es && es.write && !inputs.includes(document.activeElement) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { sheet.startWriting(); return; }
    if (es && inputs.includes(document.activeElement) && e.key !== 'Escape') return;
    if (e.key === 'Escape') { if (!mail || unMail()) { sheet.back(now()); backEl.classList.remove('on'); } }
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
    if (!down && !sheet && e.pointerType === 'mouse') { const id = scene.hitAt(e.clientX, e.clientY); scene.setHover(id); canvas.style.cursor = id ? 'pointer' : ''; }
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
    scene.setPress(null); if (e.pointerType !== 'mouse') scene.setHover(null);
    if (!down) return;
    if (down.sheet) { const mv = down.moved, f = down; down = null;
      if (isFlick(e.clientX - f.x, e.clientY - f.y, performance.now() - f.t)) flickUp(); sheet?.release(); if (!mv && sheet) { const r = sheet.tap(e.clientX, e.clientY, now()); if (r.type) log(r.type); } return; }
    const dx = e.clientX - down.x, dtm = Math.max(1, performance.now() - down.t);
    if (down.moved) { const r = scene.release(dx, dx / dtm, now(), down.on); if (r.type) log(r.type); if (coarse && (r.type === 'discard' || r.type === 'previous')) closeKb(); down = null; return; }
    if (down.took) { down = null; setValue(''); focusAnswer(); log('carte blanche'); return; }   // iPhone : le clavier s'ouvre au lâcher
    if (down.v) { const f = down; down = null; if (f.on !== 'blank' && isFlick(e.clientX - f.x, e.clientY - f.y, dtm)) flickUp(); return; }
    down = null;
    const r = scene.tap(e.clientX, e.clientY, now());
    if (r.type) log(r.type);
    if (coarse && r.type && r.type !== 'write' && r.type !== 'flip') closeKb();
    if (r.type === 'write') { answer.value = scene.state().active?.text || ''; focusAnswer(); }
  });
  // (13/10, Maxence) la flèche retour rembobine toujours jusqu'à l'étape d'avant — depuis l'email : l'enveloppe revient
  // sur l'adresse
  const unMail = () => { if (!mail || mail.sending) return false; mail.inp.blur(); mail.drop(); mail = null; api.ask = null; return true; };
  // (18/10, décision 8) un seul chemin pour revenir d'un cran : la flèche ← de la page, le bouton retour du navigateur
  // (main.js : l'historique par étape) et la flèche de la scène ; rend true si quelque chose a été rembobiné
  const stepBack = () => {
    if (sheet && mail) { if (mail.sending) return false; unMail(); sheet.back(now()); log('retour (email)'); return true; }
    if (sheet) { if (sheet.back(now())) { backEl.classList.remove('on'); log('retour'); return true; } return false; }
    // (20/10, Maxence : « la flèche revient à l'action d'avant ») site principal, après RECEVOIR : la carte vierge écrite → la question ; la question → la précédente, ou le paquet
    if (!EST_VERSION && scene.state().bfp) { if (scene.back(now())) { answer.blur(); log('retour'); return true; } return false; }
    if (scene.state().mode !== 'free') { if (onExit && !paid) { answer.blur(); onExit(); return true; } return false; }
    if (scene.back(now())) {
      answer.value = scene.state().active?.text || ''; focusAnswer(); log('retour');
      const q = QUESTIONS.find(x => x.id === scene.state().active?.id)?.q; if (q) labelAnswer(q);
      return true;
    }
    return false;
  };
  backEl.addEventListener('click', () => { stepBack(); });
  // l'étape où l'on est (de plus en plus avancée) : 2 le paquet / la question · 3 la carte blanche · 4 la feuille · 5 l'enveloppe
  // à écrire · 6 l'enveloppe postée, l'email
  api.stepBack = stepBack;
  api.level = () => {
    if (sheet) { if (mail) return 6; const es = sheet.state().env; return es && !es.back ? (es.posted ? 6 : 5) : 4; }
    const st = scene.state(); if (!EST_VERSION && st.bfp && st.paidMode) return st.bf ? 2 : 3;   // (20/10) le paquet et la carte vierge ensemble : la première étape ; une question tirée ou la carte vierge écrite : la suivante
    return st.mode === 'free' && !st.ended && !st.bf ? 3 : 2;   // (la carte vierge d'abord est la première étape)
  };
  // la suite : réponse (ou carte blanche) donnée
  function give(how) {
    const st = scene.state();
    if (!st.active || !st.active.text || st.ended || !scene.give(now())) return false;
    answer.blur(); log('donné (' + how + ')'); return true;
  }
  // glisser vers le haut = envoyer : la réponse (scène des cartes), l'enveloppe ou la carte « en direct » (si prêtes)
  function flickUp() {
    if (!sheet && scene.state().shuffling) {
      const st = scene.state();
      if (st.bf && st.active && st.active.text) { give('glissé'); return; }   // (carte vierge d'abord : ce qu'on a écrit part)
      if (scene.pioche(now())) log('pioche (glissé)'); return;
    }
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
  // (V2) tirer une autre carte, sans limite
  api.autre = () => { if (!scene.redraw || sheet) return false; if (scene.redraw(now())) { answer.blur(); log('autre carte'); import('../core/stats.js').then(m => m.count('question-retiree')); return true; } return false; };
  if (autreEl) autreEl.addEventListener('click', () => { api.autre(); });
  passEl.addEventListener('click', () => {
    if (passEl.classList.contains('ou')) return;      // (20/10) « OU » n'est pas un bouton ; PASSER = toujours : j'improvise
    if (passEl._ecrit) { give('continuer'); return; }      // (C6) un thème écrit n'est jamais effacé
    const st = scene.state();
    // (12/10) après le paiement, le premier PASSER : la carte vierge (le thème libre) ; le second : j'improvise
    if (st.paidMode && st.mode === 'q') { if (scene.chooseBlank(now())) { answer.blur(); log('carte vierge'); } return; }
    const r = scene.pass(now()); if (r) { answer.blur(); log('passé'); }
  });


  // ---- gyroscope : zéro = tenue normale de lecture (≈ 50° vers l'arrière, à plat de côté) ----
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    gyroLive = true;
    ptr.x = Math.max(-1, Math.min(1, e.gamma / 25)); ptr.y = Math.max(-1, Math.min(1, -(e.beta - 50) / 25));
  }
  let orientAsked = false;
  function askOrientation() {
    if (orientAsked) return;
    const DO = null;   // (13/10, Maxence) plus jamais l'orientation du téléphone : la respiration suffit
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
    const dpr = dpr3d(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
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
