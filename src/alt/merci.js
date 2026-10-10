// merci.html (version alternative, 10/10) : on arrive de Stripe, c'est payé. La cérémonie : je tire une carte,
// la personne répond (ou passe : j'improvise), la feuille, l'enveloppe qui se ferme et part seule (l'adresse est
// dans Stripe). La demande part par email avec la référence de la commande (send.js, setOrder).
import './offre.css';
import { norm } from '../basique/basique.js';
import { installSend, setOrder, settled, send } from '../app/send.js';
import { installCount, count } from '../app/count.js';
import { ENVOI } from './config.js';

const Q = new URLSearchParams(location.search);
const K_ORDER = 'singulies.order';
const canvas = document.getElementById('c');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));

function readOrder() { try { return JSON.parse(localStorage.getItem(K_ORDER) || 'null'); } catch { return null; } }
function saveOrder(o) { try { localStorage.setItem(K_ORDER, JSON.stringify(o)); } catch { /* */ } }

function screen(html) {
  const d = document.createElement('div'); d.className = 'mc'; d.innerHTML = html;
  document.body.appendChild(d);
  void d.offsetWidth; setTimeout(() => d.classList.add('on'), 20);   // (pas de requestAnimationFrame : suspendu si la page est en arrière-plan)
  return d;
}
const leave = d => { d.classList.remove('on'); setTimeout(() => d.remove(), 1000); };

// le prénom perdu (Stripe ouvert dans un autre navigateur, mémoire effacée) : on le redemande, une ligne
function askName() {
  return new Promise(res => {
    const d = screen(`<h1>MERCI</h1><p>pour quel prénom j’écris ?</p>
      <input autocomplete="given-name" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done" maxlength="30" aria-label="Prénom">
      <button class="go" type="button">CONTINUER</button>`);
    const i = d.querySelector('input'), go = () => { const n = norm(i.value).trim(); if (n) { leave(d); res(n); } };
    d.querySelector('.go').addEventListener('click', go);
    i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) go(); });
  });
}

// (10/10) seconde fin (?fin=mail) : après la carte, merci et l'email, pour être tenu au courant (facultatif)
const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
function askMail(name) {
  return new Promise(res => {
    const d = screen(`<h1>${esc(name)}</h1><p>merci. ton email, pour te tenir au courant de ton poème ?</p>
      <input class="mail" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="email" aria-label="Ton email">
      <button class="go" type="button" disabled>ENVOYER</button>
      <p class="small"><a href="#" data-later>plus tard</a></p>`);
    const i = d.querySelector('input'), go = d.querySelector('.go');
    const done = v => { leave(d); res(v); };
    i.addEventListener('input', () => { go.disabled = !mailOk(i.value); });
    go.addEventListener('click', () => { if (mailOk(i.value)) done(i.value.trim()); });
    i.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && mailOk(i.value)) done(i.value.trim()); });
    d.querySelector('[data-later]').addEventListener('click', e => { e.preventDefault(); done(''); });
  });
}

function final(order) {
  order.done = true; saveOrder(order);
  canvas.classList.remove('on');
  const home = new URL('./alt.html', document.baseURI), k = new URLSearchParams(location.search);
  k.delete('session'); k.delete('simule'); home.search = k.toString();
  setTimeout(() => {
    screen(`<h1>${esc(order.name)}</h1><p>c’est noté. je tape ton poème le ${esc(ENVOI)}, et je le poste chez toi.</p>
      <p class="small">stripe t’a envoyé le reçu par email.</p>
      <div class="ref">réf. ${esc(order.ref)}</div>
      <p class="small" style="margin-top:26px"><a href="${esc(new URL('./jeu', document.baseURI).href)}">pose une de mes questions à quelqu’un</a></p>
      <p class="small" style="margin-top:6px"><a href="${esc(home.href)}">retour</a></p>`);
  }, 1100);
}

async function run() {
  installSend(); installCount('merci');
  let order = readOrder();
  const session = Q.get('session') || '';
  if (!order || (session && order.session && order.session !== session)) {
    order = { name: await askName(), ref: 'SANS-REF-' + Math.random().toString(36).slice(2, 8), at: Date.now() };
  }
  if (session) order.session = session;
  if (Q.get('simule') === '1') order.simule = true;
  saveOrder(order);
  count('alt/paye');
  if (order.done) { final(order); return; }   // page rechargée à la fin : pas une seconde demande
  setOrder({ ref: order.ref, session: order.session || '', simule: !!order.simule });

  // l'avant : merci, et ce qui va se passer
  const intro = screen(`<h1>${esc(order.name)}</h1><p>merci. maintenant je tire une carte pour toi.</p>
    <p class="small">ta réponse sera le thème du poème.<br>tu peux aussi passer : j’improviserai sur ton prénom.</p>`);
  const name = order.name.toUpperCase();
  const done = () => { count('alt/fini'); settled().finally(() => final(order)); };

  // (la préparation de la scène est lourde : elle attend que le merci soit posé, sinon il ne s'affiche pas)
  const FIN_MAIL = Q.get('fin') === 'mail';
  const endMail = async d => {
    canvas.classList.remove('on');
    const c = await askMail(order.name);
    send({ ...d, mode: 'poste', address: [], ...(c ? { contact: c, email: c, tel: '' } : {}) });
    done();
  };
  const cards = wait(1300).then(() => import('../cards/mount.js')).then(({ mountCards }) => mountCards({ name, base: './', canvas, onDone: done,
    ...(FIN_MAIL ? { sheet: false, onEnd: d => { setTimeout(() => endMail(d), 1600); } } : { onEnd: () => {} }) }))
    .catch(e => { console.error(e); return null; });
  const [m] = await Promise.all([cards, Promise.race([wait(4200), new Promise(r => intro.addEventListener('click', r, { once: true }))])]);
  leave(intro);
  if (m) { await wait(600); m.start(); canvas.classList.add('on'); window.__scene = m; return; }
  // sans WebGL2 : la même cérémonie en version simple
  const { mountSimpleFlow } = await import('../simple/simple.js');
  mountSimpleFlow({ name, onDone: done, onExit: () => {} });   // (la seconde fin n'existe pas en version simple : l'enveloppe)
}
run();
