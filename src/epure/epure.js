// Version épurée (17/10). Maxence : « le site en fait trop… plus simple et straightforward », puis « un juste milieu
// entre l'aisance d'usage et l'esthétique, le poétique ». Verdict de la réunion (docs/reunion-2/VERDICT.md, corrigé) :
// une seule page, un seul chemin, tout visible (la feuille, RECEVOIR et le prix dès l'arrivée, aucun geste caché) — et
// la poésie du site : le champ de prénoms vivant derrière la feuille (ses lettres s'allument quand on tape), le prénom
// qui se pose en colonne et coud ses lignes, les mains d'Eternel une fois sans un mot, la carte du jeu qu'on retourne,
// l'adresse qui s'écrit sur l'enveloppe, la cire qui scelle à la fin (rendue par le moteur).
// RESERVER → la demande part comme sur le site (send.js : email à Maxence marqué réservation + réf., récapitulatif à
// la personne, suivi des commandes). ?envoi=0 : rien ne part (essais).
import { siteFonts } from '../app/fonts.js';
import { send, sendNote, setOrder, installSend } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { count, installCount } from '../app/count.js';
import { PRIX, DELAI_COURT } from '../alt/config.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { AUTEUR } from '../menu/auteur.js';
import { stitch, paintThread } from '../alt/stitch.js';
import { norm, pick } from '../basique/basique.js';
import { mountChamp } from './champ.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const url = p => new URL(p, document.baseURI).href;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches;
const EXEMPLES = ['isabelle', 'anais', 'marysol', 'julie'];

const fontsReady = siteFonts('./');
installCount('epure');
installSend();

// le temps jusqu'au premier affichage (objection de Lucas : le mesurer, pas le supposer)
try {
  new PerformanceObserver(l => {
    const e = l.getEntries().pop(); if (!e) return;
    const s = e.startTime / 1000, b = s < 1 ? 'moins-1s' : s < 2 ? '1-2s' : s < 4 ? '2-4s' : 'plus-4s';
    count('epure/affichage/' + b);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch { /* */ }

// images, prix, textes repris du site
$$('[data-src]').forEach(i => { i.src = url(i.dataset.src); i.decoding = 'async'; });
for (const [k, f] of [['feuille', 'simple/feuille.jpg'], ['vierge', 'simple/vierge.jpg'], ['dos', 'simple/dos.jpg'], ['enveloppe', 'simple/enveloppe.jpg']])
  document.documentElement.style.setProperty('--' + k, `url(${url(f)})`);
$$('.prix').forEach(e => { e.textContent = PRIX; });
$$('.delai').forEach(e => { e.textContent = DELAI_COURT; });
$('#faq').innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('(menu en haut à droite, CONTACT)', '(plus bas)'))}</p></details>`).join('');
$('#auteur').innerHTML = AUTEUR.map(p => `<p>${esc(p)}</p>`).join('');
for (const d of $$('#faq details')) d.addEventListener('toggle', () => { if (d.open) for (const o of $$('#faq details')) if (o !== d) o.open = false; });

// le fil cousu sous ce qui flotte (ETERNEL, les titres, les signes, SINGULIES) ; les signes d'une vue cachée se cousent
// quand elle paraît (ResizeObserver de stitch)
fontsReady.then(() => $$('.sew').forEach((el, i) => stitch(el, { seed: 5 + i * 3 })));

// ——— la frappe à la machine : lettre après lettre, appui inégal, rythme irrégulier ———
function typeText(el, text, { delay = 0, speed = 1 } = {}) {
  const tok = (el._tt = (el._tt || 0) + 1);
  el.textContent = '';
  if (REDUCED) { el.textContent = text; return Promise.resolve(); }
  // (un seul élément dans el : dans une carte, el est une boîte flex — une lettre par élément y perdrait les espaces)
  const box = el.appendChild(document.createElement('span'));
  return new Promise(res => {
    let i = 0;
    const step = () => {
      if (el._tt !== tok || i >= text.length) return res();
      const c = text[i++];
      if (c === '\n') box.appendChild(document.createElement('br'));
      else { const s = document.createElement('span'); s.textContent = c; s.style.opacity = (0.78 + Math.random() * 0.22).toFixed(2); box.appendChild(s); }
      setTimeout(step, (c === ' ' ? 26 : c === '\n' ? 240 : /[,.:]/.test(c) ? 170 : 34 + Math.random() * 52) / speed);
    };
    setTimeout(step, delay);
  });
}

// ——— la feuille : le prénom en colonne, une ligne de fil par lettre ———
// (en cqw, l'unité de la feuille : 100 = la largeur du papier, 139,4 = sa hauteur)
const G = { top: 24.5, colC: 19.15, x0: 28.7, x1: 86.2, lhMax: 7, room: 104, gap: 0.6 };
const sheet = $('#sheet'), col = $('#col'), cur = $('#cur'), inv = $('#inv'), nameIn = $('#name'), rules = $('#rules');
let shown = '';                      // le prénom affiché (A–Z, espaces)
const born = new Map();              // ligne → instant où son fil a commencé à se coudre
let lay = { rows: [], lh: G.lhMax, next: 0 };

// le champ de prénoms derrière la feuille ; point de fuite au centre de la feuille
const champCv = $('#champ');
const champ = mountChamp(champCv, {
  reduced: REDUCED,
  center: () => { const a = champCv.getBoundingClientRect(), b = $('#paper').getBoundingClientRect(); return [b.left - a.left + b.width / 2, b.top - a.top + b.height / 2]; },
});

function layout(s) {
  const L = [...s.trimEnd()];
  const units = L.reduce((u, c) => u + (c === ' ' ? G.gap : 1), 0);
  const lh = Math.min(G.lhMax, G.room / Math.max(units + 1, 1));
  let y = 0;
  const rows = L.map(c => { const r = { c, y }; y += c === ' ' ? lh * G.gap : lh; return r; });
  if (s.endsWith(' ') && L.length) y += lh * G.gap;      // une espace tapée : le curseur descend d'une ligne blanche
  return { rows, lh, next: y };
}
function render() {
  const s = norm(nameIn.value);
  if (s === shown) return place();
  const old = shown.trimEnd(); shown = s;
  lay = layout(s);
  const kids = [...col.children];
  let keep = 0;
  while (keep < kids.length && keep < lay.rows.length && kids[keep].dataset.c === lay.rows[keep].c) keep++;
  kids.slice(keep).forEach(k => k.remove());
  for (const k of [...born.keys()]) if (k >= keep) born.delete(k);
  lay.rows.slice(keep).forEach((r, j) => {
    const b = document.createElement('b');
    b.dataset.c = r.c; b.textContent = r.c === ' ' ? '' : r.c;
    if (r.c !== ' ') { b.className = 'in'; born.set(keep + j, performance.now() + j * 40); }
    col.appendChild(b);
  });
  champ.setName(s);
  if (s.trim() && !old) count('epure/prenom');
  place(); dockPlace();
}
// les tailles et places (cqw) ; le fil se coud
function place() {
  const { rows, lh, next } = lay;
  [...col.children].forEach((b, i) => {
    const r = rows[i]; if (!r) return;
    Object.assign(b.style, { top: (G.top + r.y) + 'cqw', fontSize: (lh * 0.9) + 'cqw', lineHeight: lh + 'cqw', height: lh + 'cqw' });
  });
  const full = shown.trimEnd().length >= 22;
  Object.assign(cur.style, { top: (G.top + next + lh * 0.1) + 'cqw', height: (lh * 0.8) + 'cqw' });
  cur.classList.toggle('off', full || (document.activeElement !== nameIn && !!shown.trim()));
  inv.style.top = (G.top + lh * 0.36) + 'cqw';
  inv.style.opacity = shown.trim() ? 0 : 1;
  sew();
}
let sewRaf = 0;
function sew() {
  cancelAnimationFrame(sewRaf);
  const W = sheet.clientWidth, H = sheet.clientHeight, cq = W / 100, dpr = Math.min(3, devicePixelRatio || 1);
  if (!W) return;
  if (rules.width !== Math.round(W * dpr)) { rules.width = Math.round(W * dpr); rules.height = Math.round(H * dpr); }
  const x = rules.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const now = performance.now();
  let more = false;
  lay.rows.forEach((r, i) => {
    if (r.c === ' ') return;
    const t0 = born.get(i), p = REDUCED || t0 == null ? 1 : Math.max(0, Math.min(1, (now - t0 - 90) / 420));
    if (p < 1) more = true;
    if (p <= 0) return;
    const e = 1 - Math.pow(1 - p, 3), a = G.x0 * cq, b = a + (G.x1 - G.x0) * cq * e;
    if (b - a > 6) paintThread(x, a, b, (G.top + r.y + lay.lh * 0.8) * cq, 11 + i * 7, null, { g0: i * 37, sag: 0.3 });
  });
  if (more) sewRaf = requestAnimationFrame(sew);
}
new ResizeObserver(() => sew()).observe(sheet);
nameIn.addEventListener('input', render);
nameIn.addEventListener('focus', () => { place(); dockPlace(); });
nameIn.addEventListener('blur', () => { place(); sayFor(); dockPlace(); setTimeout(hands, 350); });
nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameIn.blur(); } });
// ordinateur : une lettre tapée n'importe où va sur la feuille
addEventListener('keydown', e => {
  if (!$('#ov').hidden || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || !/\p{L}/u.test(e.key)) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  nameIn.focus({ preventScroll: true });
});

// sous la feuille : la phrase, tapée ; elle prend le prénom une fois écrit
const say = $('#say');
let said = null;
function sayFor() {
  const n = shown.trim();
  if (n === said) return;
  said = n;
  typeText(say, 'un poème pour ' + (n || 'un prénom') + ',\ntapé à la machine et posté chez toi.', { speed: n ? 1.4 : 1 });
}
fontsReady.then(() => {
  setTimeout(sayFor, 450);
  setTimeout(() => { if (!shown.trim()) typeText(inv, 'écris le prénom'); }, 1500);
});

// ——— les mains d'Eternel : une fois, quand le prénom est écrit et le clavier fermé ; sans un mot ———
const handsV = $('#hands'), handsBox = $('#handsBox');
// (src/alt/machine.json : les mains durent 1,75 s, puis le film passe au mécanisme en fondu : on s'arrête avant,
// sur les mains, nettes)
const HANDS_END = 1.4;
handsV.src = url('vrai/machine-7.mp4');
handsV.poster = url('epure/mains.jpg');
let handsDone = false;
function hands(desk) {
  if (handsDone || !shown.trim() || (!desk && document.activeElement === nameIn)) return;
  handsDone = true;
  handsBox.classList.add('on');
  count('epure/mains');
  if (REDUCED) return;
  try { handsV.currentTime = 0; } catch { /* */ }
  const p = handsV.play(); p && p.catch(() => {});
}
// (timeupdate ne passe que toutes les ≈ 250 ms : on regarde à chaque image)
// (et si on l'a dépassé — onglet en arrière-plan, images sautées — on revient sur les mains)
const endHands = () => { handsV.pause(); if (handsV.currentTime > HANDS_END + 0.05) try { handsV.currentTime = HANDS_END; } catch { /* */ } };
const watchHands = () => { if (handsV.currentTime >= HANDS_END) endHands(); else if (!handsV.paused) requestAnimationFrame(watchHands); };
handsV.addEventListener('play', () => requestAnimationFrame(watchHands));
handsV.addEventListener('timeupdate', () => { if (handsV.currentTime >= HANDS_END) endHands(); });
// ordinateur : pas de clavier qui se ferme — la phrase et les mains quand on s'arrête de taper
let idleT = 0;
nameIn.addEventListener('input', () => {
  clearTimeout(idleT);
  if (!TOUCH) idleT = setTimeout(() => { if (shown.trim()) { sayFor(); hands(true); } }, 1600);
});

// ——— RECEVOIR au-dessus du clavier, pendant la frappe (téléphone) ———
const dock = $('#dock'), vv = window.visualViewport;
function dockPlace() {
  const kb = vv && innerHeight - vv.height > 120;
  const on = TOUCH && kb && document.activeElement === nameIn && shown.trim().length >= 2 && $('#ov').hidden;
  dock.hidden = !on;
  if (on) dock.style.top = (vv.offsetTop + vv.height - 54) + 'px';
}
if (vv) { vv.addEventListener('resize', dockPlace); vv.addEventListener('scroll', dockPlace); }
dock.addEventListener('pointerdown', e => e.preventDefault());           // le toucher ne ferme pas le clavier avant le clic
dock.addEventListener('click', () => { nameIn.blur(); $('#go').click(); });

// ——— ce qu'il y a dans l'enveloppe : les lignes se tapent quand on y arrive ———
const io = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  io.unobserve(en.target);
  typeText(en.target, en.target.dataset.type.replace(/\\n/g, '\n'), { delay: 200 });
}), { threshold: 0.5 });
$$('[data-type]').forEach(f => io.observe(f));

// ——— des poèmes envoyés, en grand ———
const lb = $('#lb'), lbImg = lb.querySelector('img');
$('#ex').innerHTML = EXEMPLES.map(n => `<button type="button" aria-label="voir le poème de ${n.toUpperCase()}"><img src="${url('exemples/' + n + '.jpg')}" alt="le poème de ${n.toUpperCase()}, tapé à la machine sur une feuille noire" loading="lazy" decoding="async"><span>${n.toUpperCase()}</span></button>`).join('');
$$('#ex button').forEach((b, i) => b.addEventListener('click', () => {
  lbImg.src = url('exemples/' + EXEMPLES[i] + '.jpg'); lbImg.alt = b.querySelector('img').alt;
  lb.hidden = false; document.documentElement.style.overflow = 'hidden';
  count('epure/exemple');
}));
function closeLb() { if (lb.hidden) return; lb.hidden = true; if ($('#ov').hidden) document.documentElement.style.overflow = ''; }
lb.addEventListener('click', closeLb);
$$('[data-c]').forEach(a => a.addEventListener('click', () => count('epure/' + a.dataset.c)));

// ——— la page de commande (par-dessus ; le bouton retour du téléphone la ferme) ———
const ov = $('#ov');
let view = null;
function show(v) {
  for (const id of ['#vWho', '#vOrder', '#vDone', '#vMois']) $(id).hidden = id !== v;
  view = v; ov.scrollTop = 0;
}
function openOv(v) {
  show(v);
  ov.hidden = false; void ov.offsetWidth; ov.classList.add('on');
  document.documentElement.style.overflow = 'hidden';
  champ.stop(); dockPlace();
  if (!(history.state && history.state.ov)) history.pushState({ ov: 1 }, '');
}
function closeOv(fromPop) {
  if (ov.hidden) return;
  ov.classList.remove('on');
  document.documentElement.style.overflow = '';
  setTimeout(() => { if (!ov.classList.contains('on')) ov.hidden = true; }, 360);
  if (!REDUCED) champ.start();
  if (!fromPop && history.state && history.state.ov) history.back();
}
ov.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeOv();
  else if (e.target.closest('[data-back]')) { if (view === '#vOrder') show('#vWho'); else closeOv(); }
});
addEventListener('popstate', () => closeOv(true));
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!lb.hidden) closeLb(); else closeOv(); } });
const fail = (form, m) => { const p = form.querySelector('.err'); p.textContent = m; p.hidden = !m; };
const val = (form, n) => (form.elements[n]?.value || '').trim();

// RECEVOIR : sans prénom, la feuille le redemande (le curseur se secoue) ; sinon « pour toi, ou pour quelqu'un ? »
const order = $('#order'), ans = $('#ans'), ansPh = $('#ansPh'), addr = $('#addr'), flip = $('#flip'), qText = $('#qText');
let name = '', gift = false, silent = false, q = pick();
$('#go').addEventListener('click', e => {
  e.preventDefault();
  name = shown.trim();
  if (!name) {
    $('.hero').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    nameIn.focus({ preventScroll: true });
    cur.classList.remove('nudge'); void cur.offsetWidth; cur.classList.add('nudge');
    return;
  }
  $('#wName').textContent = name;
  openOv('#vWho');
  typeText($('#wAsk'), 'c’est pour toi, ou pour quelqu’un ?', { delay: 300 });
  count('epure/recevoir');
});
$$('[data-for]').forEach(b => b.addEventListener('click', () => {
  gift = b.dataset.for === 'offrir';
  count('epure/pour-' + b.dataset.for);
  $('#oName').textContent = name;
  $('#oFor').textContent = gift ? 'à offrir · ' : '';
  $('#qHead').textContent = gift ? 'une question du jeu SINGULIES, pour ' + name : 'une question du jeu SINGULIES';
  setSilent(false);
  const who = order.elements.who;
  if (!who.value.trim()) who.value = nameIn.value.trim().replace(/\s+/g, ' ').replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase()) + ' ';
  if (!order.elements.email.value) order.elements.email.value = knownEmail() || '';
  fail(order, ''); upAddr(); upAns();
  show('#vOrder');
}));

// la carte : face cachée ; un toucher, elle se retourne ; « une autre question » la retourne et en tire une autre
let flipped = false;
qText.textContent = q.q;
flip.addEventListener('click', () => {
  if (flipped) return;
  flipped = true; flip.classList.add('on');
  $('#touch').hidden = true; $('#qOther').hidden = false;
  $('#answer').hidden = false;
  count('epure/carte');
});
$('#qOther').addEventListener('click', () => {
  flip.classList.remove('on');
  setTimeout(() => { q = pick(); qText.textContent = q.q; flip.classList.add('on'); }, REDUCED ? 0 : 640);
  count('epure/autre-question', { once: false });
});
// la voix de la carte réponse (Sami)
function setSilent(on) {
  silent = on;
  $('.ans').classList.toggle('mute', on);
  ans.disabled = on;
  $('#ansNote').textContent = on ? 'alors j’écris à partir de ' + name + ', seulement.'
    : gift ? 'ta réponse, c’est de ça que parlera son poème.' : 'ta réponse, c’est de ça que parlera le poème.';
  $('#silent').textContent = on ? 'finalement, je réponds' : 'je préfère ne rien dire';
  if (on) count('epure/silence');
}
$('#silent').addEventListener('click', () => { setSilent(!silent); if (!silent) ans.focus(); });
const upAns = () => { ansPh.style.opacity = ans.value || document.activeElement === ans ? 0 : 1; };
ans.addEventListener('input', upAns); ans.addEventListener('focus', upAns); ans.addEventListener('blur', upAns);
// l'adresse s'écrit sur l'enveloppe à mesure
function upAddr() {
  const f = order;
  addr.textContent = [val(f, 'who'), val(f, 'rue'), val(f, 'cplt'), (val(f, 'cp') + ' ' + val(f, 'ville')).trim()].filter(Boolean).join('\n');
}
order.addEventListener('input', upAddr);
// Entrée dans un champ : le suivant
order.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  const ins = [...order.querySelectorAll('input')], i = ins.indexOf(e.target);
  if (i < ins.length - 1) ins[i + 1].focus(); else order.requestSubmit();
});

// ——— RESERVER → la cire, « c'est noté » ———
const cire = $('#cire');
cire.poster = url('epure/cire.jpg');
let sending = false;
order.addEventListener('submit', e => {
  e.preventDefault();
  if (sending) return;
  const f = order, text = flipped && !silent ? ans.value.trim() : '', email = val(f, 'email'), cp = val(f, 'cp').replace(/\s+/g, '');
  if (!val(f, 'who') || !val(f, 'rue') || !cp || !val(f, 'ville')) return fail(f, 'il manque un morceau de l’adresse.');
  if (!/^\d{5}$/.test(cp)) return fail(f, 'le code postal : cinq chiffres.');
  if (!EMAIL_RE.test(email)) return fail(f, 'ton email ne semble pas complet.');
  fail(f, '');
  sending = true;
  const ref = (name.replace(/ +/g, '_') || 'X') + '-' + Math.random().toString(36).slice(2, 8);
  const address = [val(f, 'who'), val(f, 'rue'), val(f, 'cplt'), cp + ' ' + val(f, 'ville')].filter(Boolean);
  setOrder({ ref, reserve: true, gift });
  send({ name, kind: text ? 'reponse' : 'improvisation', id: text ? q.id : null, text, mode: 'poste', address, email, contact: email });
  count('epure/reserve');
  if (text) count(`q/${q.id}/repondue`);
  $('#dName').textContent = name;
  $('#dRef').textContent = 'réf. ' + ref + ' · rien n’a été débité · un récapitulatif t’est envoyé par email';
  show('#vDone');
  // la cire se forme (1,5 s), puis « c'est noté » se tape
  if (!cire.src) cire.src = url('epure/cire.mp4');
  if (!REDUCED) { try { cire.currentTime = 0; } catch { /* */ } const p = cire.play(); p && p.catch(() => {}); }
  typeText($('#dTxt'), gift
    ? 'c’est noté.\nje t’écris par email pour le paiement.\nune fois réglé, j’écris le poème de ' + name + ',\nje le tape à la machine et je le poste chez elle, chez lui.'
    : 'c’est noté.\nje t’écris par email pour le paiement.\nune fois réglé, j’écris ton poème,\nje le tape à la machine et je le poste.', { delay: REDUCED ? 0 : 1700 });
  // une autre commande repart de zéro (une carte face cachée, la carte réponse vide)
  ans.value = ''; q = pick(); qText.textContent = q.q; flipped = false; flip.classList.remove('on');
  $('#touch').hidden = false; $('#qOther').hidden = true; $('#answer').hidden = true;
  sending = false;
});

// ——— un poème par mois (liste d'attente) ———
$('#mois').addEventListener('click', () => {
  const c = $('#club');
  c.hidden = false; $('#clubDone').hidden = true; fail(c, '');
  if (!c.elements.email.value) c.elements.email.value = knownEmail() || '';
  openOv('#vMois');
  typeText($('#mTxt'), 'un poème inédit chaque mois,\ntapé une fois à la machine, puis imprimé.\nau dos, mes pensées pendant qu’il s’écrivait.\nchaque mois, l’original part chez un membre tiré au sort.', { delay: 700 });
  count('epure/mois');
});
$('#club').addEventListener('submit', e => {
  e.preventDefault();
  const c = e.target, email = val(c, 'email');
  if (!EMAIL_RE.test(email)) return fail(c, 'ton email ne semble pas complet.');
  sendNote({ kind: 'club', email });
  count('epure/mois-reserve');
  c.hidden = true;
  const d = $('#clubDone'); d.hidden = false; typeText(d, 'c’est noté.\nje t’écris dès que ça commence.');
});

// ——— écris-moi ———
let lastNote = 0;
$('#ct').addEventListener('submit', e => {
  e.preventDefault();
  const c = e.target, text = val(c, 'text'), email = val(c, 'email');
  if (val(c, 'site')) return;                                      // piège à robots
  if (!text) return fail(c, 'écris d’abord ton message.');
  if (!EMAIL_RE.test(email)) return fail(c, 'ton email ne semble pas complet.');
  if (Date.now() - lastNote < 30e3) return fail(c, 'un instant : ton message vient de partir.');
  lastNote = Date.now();
  sendNote({ kind: 'message', text, email });
  count('epure/contact');
  c.hidden = true;
  const d = $('#ctDone'); d.hidden = false; typeText(d, 'reçu. je te réponds.');
});
const ctMail = $('#ct').elements.email;
if (!ctMail.value) ctMail.value = knownEmail() || '';

// (en dernier : tout ce que render() touche existe — le dock, la phrase)
render();
