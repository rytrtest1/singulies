// Version épurée (17/10, Maxence : « le site en fait trop… plus simple et straightforward ») : une boutique d'une
// seule page, sur le modèle des boutiques simples (l'objet, le prix, un champ, un bouton), dans la DA du site. Aucun
// WebGL : la feuille est une image, l'acrostiche du prénom s'y écrit en direct. RECEVOIR ouvre un panneau : la question
// du jeu (réponse facultative), l'adresse, l'email, RESERVER → la demande part comme sur le site (send.js : email à
// Maxence, récapitulatif à la personne, suivi des commandes), marquée « réservation, à payer ».
import { siteFonts } from '../app/fonts.js';
import { send, sendNote, setOrder, installSend } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { count, installCount } from '../app/count.js';
import { PRIX, DELAI_COURT } from '../alt/config.js';
import { QUESTIONS as FAQ } from '../alt/questions.js';
import { AUTEUR } from '../menu/auteur.js';
import { norm, acrostic, pick, showQuestion } from '../basique/basique.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const url = p => new URL(p, document.baseURI).href;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EXEMPLES = ['isabelle', 'anais', 'marysol', 'julie'];

siteFonts('./');
installCount('epure');
installSend();

// images, prix
$$('[data-src]').forEach(i => { i.src = url(i.dataset.src); i.decoding = 'async'; });
$$('[data-bg]').forEach(b => { b.style.backgroundImage = `url(${url(b.dataset.bg)})`; });
document.documentElement.style.setProperty('--feuille', `url(${url('simple/feuille.jpg')})`);
document.documentElement.style.setProperty('--vierge', `url(${url('simple/vierge.jpg')})`);
$$('.prix').forEach(e => { e.textContent = PRIX; });
$$('.delai').forEach(e => { e.textContent = DELAI_COURT; });

// les textes repris du site
$('#faq').innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a.replace('menu en haut à droite, CONTACT', 'plus bas, CONTACT'))}</p></details>`).join('');
$('#auteur').innerHTML = AUTEUR.map(p => `<p>${esc(p)}</p>`).join('');

// ——— la galerie : défilement natif (aimanté), vignettes ———
const track = $('#track'), thumbs = $$('#thumbs button');
let slide = 0;
const goSlide = k => track.scrollTo({ left: k * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
thumbs.forEach(b => b.addEventListener('click', () => goSlide(+b.dataset.k)));
track.addEventListener('scroll', () => {
  const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  if (k === slide) return;
  slide = k;
  thumbs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
}, { passive: true });
track.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') goSlide(Math.min(thumbs.length - 1, slide + 1));
  if (e.key === 'ArrowLeft') goSlide(Math.max(0, slide - 1));
});

// ——— le prénom → l'acrostiche sur la feuille ———
const nameIn = $('#name'), ac = $('#ac'), nameErr = $('#nameErr');
nameIn.addEventListener('input', () => {
  acrostic(ac, nameIn.value);
  nameErr.hidden = true;
  if (slide !== 0) goSlide(0);
});
nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameIn.blur(); } });

// ——— la question (la même dans la galerie et dans la commande) ———
let q = pick();
const qshow = $('#qshow'), qcard = $('#qcard');
showQuestion(qshow, q); showQuestion(qcard, q);
$('#qOther').addEventListener('click', () => { q = pick(); showQuestion(qcard, q); showQuestion(qshow, q); count('epure/autre-question', { once: false }); });

// ——— le panneau ———
const dw = $('#dw');
let lastFocus = null;
function openDw(view) {
  for (const v of ['#dwOrder', '#dwDone', '#dwMois']) $(v).hidden = v !== view;
  lastFocus = document.activeElement;
  dw.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  dw.querySelector('.dw-p').scrollTop = 0;
  void dw.offsetWidth;                                              // (sans attendre une image : la transition part de l'état fermé)
  dw.classList.add('on');
}
function closeDw() {
  if (dw.hidden) return;
  dw.classList.remove('on');
  document.documentElement.style.overflow = '';
  setTimeout(() => { if (!dw.classList.contains('on')) dw.hidden = true; }, 400);
  lastFocus?.focus?.({ preventScroll: true });
}
dw.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDw(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { closeDw(); closeLb(); } });

const fail = (form, m) => { const p = form.querySelector('.err'); p.textContent = m; p.hidden = !m; };
const val = (form, n) => (form.elements[n]?.value || '').trim();

// ——— RECEVOIR → la commande ———
const order = $('#order');
let name = '';
$('#go').addEventListener('click', () => {
  name = norm(nameIn.value).trim();
  if (!name) { nameErr.hidden = false; nameIn.focus(); return; }
  $('#rcName').textContent = name;
  acrostic($('#acMini'), name);
  const who = order.elements.who;
  if (!who.value.trim()) who.value = nameIn.value.trim().replace(/^./, c => c.toUpperCase()) + ' ';
  if (!order.elements.email.value) order.elements.email.value = knownEmail() || '';
  fail(order, '');
  $('#send').textContent = 'RESERVER';
  $('#payNote').textContent = 'rien n’est débité ici : je t’écris par email pour le paiement (' + PRIX + ', paypal), puis je le poste dans la semaine.';
  openDw('#dwOrder');
  count('epure/recevoir');
});

let sending = false;
order.addEventListener('submit', e => {
  e.preventDefault();
  if (sending) return;
  const f = order, text = val(f, 'text'), email = val(f, 'email'), cp = val(f, 'cp').replace(/\s+/g, '');
  if (!val(f, 'who') || !val(f, 'rue') || !cp || !val(f, 'ville')) return fail(f, 'il manque un morceau de l’adresse.');
  if (!/^\d{5}$/.test(cp)) return fail(f, 'le code postal : cinq chiffres.');
  if (!EMAIL_RE.test(email)) return fail(f, 'ton email ne semble pas complet.');
  fail(f, '');
  sending = true;
  const ref = (name.replace(/ +/g, '_') || 'X') + '-' + Math.random().toString(36).slice(2, 8);
  const address = [val(f, 'who'), val(f, 'rue'), val(f, 'cplt'), cp + ' ' + val(f, 'ville')].filter(Boolean);
  setOrder({ ref, reserve: true, gift: false });
  send({ name, kind: text ? 'reponse' : 'improvisation', id: text ? q.id : null, text, mode: 'poste', address, email, contact: email });
  count('epure/reserve');
  if (text) count(`q/${q.id}/repondue`);
  $('#doneName').textContent = name;
  $('#doneTxt').innerHTML = 'je t’écris par email pour le paiement.<br>une fois payé, je l’écris, je le tape à la machine et je le poste dans la semaine.';
  $('#doneRef').textContent = 'réf. ' + ref + ' · rien n’a été débité · un récapitulatif t’est envoyé par email';
  openDw('#dwDone');
  // une autre commande repart de zéro (nouvelle question, réponse vide)
  f.elements.text.value = ''; q = pick(); showQuestion(qcard, q); showQuestion(qshow, q);
  sending = false;
});

// ——— un poème par mois (liste d'attente) ———
$('#moisTxt').innerHTML = [
  'un poème inédit chaque mois, tapé une fois à la machine, puis imprimé',
  'au dos, mes pensées pendant qu’il s’écrivait',
  'glissé à la main dans une enveloppe noire',
  'chaque mois, l’original tapé part chez un membre tiré au sort',
].map(l => `<li>${esc(l)}</li>`).join('');
$('#mois').addEventListener('click', e => {
  e.preventDefault();
  const c = $('#club');
  c.hidden = false; $('#clubDone').hidden = true; fail(c, '');
  if (!c.elements.email.value) c.elements.email.value = knownEmail() || '';
  openDw('#dwMois');
  count('epure/mois');
});
$('#club').addEventListener('submit', e => {
  e.preventDefault();
  const c = e.target, email = val(c, 'email');
  if (!EMAIL_RE.test(email)) return fail(c, 'ton email ne semble pas complet.');
  sendNote({ kind: 'club', email });
  count('epure/mois-reserve');
  c.hidden = true; $('#clubDone').hidden = false;
});
$$('[data-c]').forEach(a => a.addEventListener('click', () => count('epure/' + a.dataset.c)));

// ——— des exemples, en grand ———
const lb = $('#lb'), lbImg = lb.querySelector('img');
$('#ex').innerHTML = EXEMPLES.map(n => `<button type="button" aria-label="voir le poème de ${n.toUpperCase()}"><img src="${url('exemples/' + n + '.jpg')}" alt="le poème de ${n.toUpperCase()}, tapé à la machine sur une feuille noire" loading="lazy" decoding="async"></button>`).join('');
$$('#ex button').forEach((b, i) => b.addEventListener('click', () => {
  lbImg.src = url('exemples/' + EXEMPLES[i] + '.jpg'); lbImg.alt = b.querySelector('img').alt;
  lb.hidden = false; document.documentElement.style.overflow = 'hidden';
  count('epure/exemple');
}));
function closeLb() { if (lb.hidden) return; lb.hidden = true; if (dw.hidden) document.documentElement.style.overflow = ''; }
lb.addEventListener('click', closeLb);

// ——— contact ———
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
  c.hidden = true; $('#ctDone').hidden = false;
});
const ctMail = $('#ct').elements.email;
if (!ctMail.value) ctMail.value = knownEmail() || '';
