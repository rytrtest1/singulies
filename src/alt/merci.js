// merci.html (version alternative, 10/10) : on arrive de Stripe, c'est payé (le paiement fini dans la page, alt.html
// enchaîne lui-même ; on vient ici seulement si Stripe a dû rediriger : 3-D Secure, PayPal…).
// pour.html (10/10) : la personne à qui l'on offre le poème ouvre le lien, tire sa carte et répond (?r=référence). La cérémonie : je tire une carte,
// la personne répond (ou passe : j'improvise), la feuille, l'enveloppe qui se ferme et part seule (l'adresse est
// dans Stripe). La demande part par email avec la référence de la commande (send.js, setOrder).
import './offre.css';
import { norm } from '../basique/basique.js';
import { installSend, setOrder, settled, send } from '../app/send.js';
import { installCount, count } from '../app/count.js';
import { PAIEMENT_URL } from './config.js';
import { esc, readOrder, saveOrder, screen, leave, finalScreen, askHow, shareGift } from './fin.js';

const Q = new URLSearchParams(location.search);
const POUR = document.documentElement.dataset.page === 'pour';
const canvas = document.getElementById('c');
const wait = ms => new Promise(r => setTimeout(r, ms));

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
  order.done = true;
  if (POUR) { try { localStorage.setItem('singulies.pour.' + order.ref, '1'); } catch { /* */ } } else saveOrder(order);
  canvas.classList.remove('on');
  const home = new URL('./alt.html', document.baseURI), k = new URLSearchParams(location.search);
  for (const x of ['session', 'simule', 'r']) k.delete(x); home.search = k.toString();
  setTimeout(() => finalScreen(order, POUR ? null : home.href), 1100);
}

// pour.html : la commande vient du lien (?r=LEA-k3j9x2 : le prénom est dans la référence)
function pourOrder() {
  const ref = (Q.get('r') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
  const name = ref.split('-')[0].replace(/_/g, ' ').toUpperCase().replace(/[^A-Z ]/g, '').trim();
  return name ? { name, ref, gift: true, pour: true, at: Date.now() } : null;
}

async function run() {
  installSend(); installCount(POUR ? 'pour' : 'merci');
  if (POUR) { await runPour(); return; }
  let order = readOrder();
  const session = Q.get('session') || '';
  if (!order || (session && order.session && order.session !== session)) {
    order = { name: await askName(), ref: 'SANS-REF-' + Math.random().toString(36).slice(2, 8), at: Date.now() };
  }
  if (session) order.session = session;
  // paiement dans la page : la fonction dit si la session est vraiment payée (réseau en panne : on continue)
  if (PAIEMENT_URL && /^cs_/.test(session) && !order.done) {
    const st = await fetch(PAIEMENT_URL.replace(/\/$/, '') + '/status?session_id=' + encodeURIComponent(session)).then(r => r.json()).catch(() => null);
    if (st && st.status && st.status !== 'complete') {
      const back = new URL('./alt.html', document.baseURI);
      screen(`<h1>${esc(order.name)}</h1><p>le paiement n’est pas passé.</p><p class="small"><a href="${esc(back.href)}">revenir à ta feuille</a></p>`);
      return;
    }
    if (st && st.prenom && !order.name) order.name = st.prenom;
  }
  if (Q.get('simule') === '1') order.simule = true;
  saveOrder(order);
  count('alt/paye');
  if (order.done) { final(order); return; }   // page rechargée à la fin : pas une seconde demande
  setOrder({ ref: order.ref, session: order.session || '', simule: !!order.simule, gift: !!order.gift });

  // un poème offert : comment je l'écris ? (le lien : elle répondra elle-même — la demande part tout de suite)
  let how = order.how || 'question';
  if (order.gift && !order.how) { how = order.how = await askHow(order.name); saveOrder(order); }
  if (how === 'lien') {
    send({ name: order.name, kind: 'lien', text: '', id: null, mode: 'poste', address: [] });
    await shareGift(order); order.lien = true;
    count('alt/fini'); settled().finally(() => final(order)); return;
  }
  // l'avant : merci, et ce qui va se passer
  const intro = screen(order.gift
    ? `<h1>${esc(order.name)}</h1><p>merci. ${how === 'blanche' ? 'écris le thème de son poème.' : how === 'impro' ? 'j’improvise sur son prénom.' : 'je tire une carte : ta réponse sera le thème de son poème.'}</p>`
    : `<h1>${esc(order.name)}</h1><p>merci. maintenant je tire une carte pour toi.</p>
    <p class="small">ta réponse sera le thème du poème.<br>tu peux aussi passer : j’improviserai sur ton prénom.</p>`);
  await ceremony(order, intro, how);
}

// la cérémonie : la carte tirée (ou la carte blanche, ou la feuille seule), la feuille, l'enveloppe qui part seule
async function ceremony(order, intro, how = 'question') {
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
    ...(how === 'impro' ? { sheetOnly: true } : {}),
    ...(FIN_MAIL ? { sheet: false, onEnd: d => { setTimeout(() => endMail(d), 1600); } } : { onEnd: () => {} }) }))
    .catch(e => { console.error(e); return null; });
  const [m] = await Promise.all([cards, Promise.race([wait(4200), new Promise(r => intro.addEventListener('click', r, { once: true }))])]);
  leave(intro);
  if (m) { await wait(600); m.start(); if (how === 'blanche') m.scene.resume(m.now(), 'blanche'); canvas.classList.add('on'); window.__scene = m; return; }
  // sans WebGL2 : la même cérémonie en version simple
  const { mountSimpleFlow } = await import('../simple/simple.js');
  mountSimpleFlow({ name, onDone: done, onExit: () => {} });   // (la seconde fin n'existe pas en version simple : l'enveloppe)
}
run();

// pour.html : la personne offerte — sa carte, sa réponse, sa feuille, l'enveloppe qui part (l'adresse est chez Stripe)
async function runPour() {
  const order = pourOrder();
  if (!order) { screen('<p>ce lien est incomplet.</p><p class="small">demande à la personne qui te l’a envoyé de le renvoyer.</p>'); return; }
  let done = false; try { done = localStorage.getItem('singulies.pour.' + order.ref) === '1'; } catch { /* */ }
  if (done) { finalScreen(order, null); return; }
  setOrder({ ref: order.ref, gift: true, pour: true });
  count('alt/pour');
  const intro = screen(`<h1>${esc(order.name)}</h1><p>on t’offre un poème.</p>
    <p class="small">je tire une carte pour toi : ta réponse en sera le thème.<br>tu peux aussi passer : j’improviserai sur ton prénom.</p>`);
  await ceremony(order, intro, 'question');
}
