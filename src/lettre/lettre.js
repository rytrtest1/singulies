// « un poème par mois » (11/10) : la page de la correspondance des singuliers. En attendant le SIRET (et donc
// l'abonnement Stripe), une liste d'attente : l'email part chez Maxence (sendNote, modèle des demandes), rien n'est
// débité. L'email déjà connu (donné ailleurs sur le site) est déjà écrit. Retour : la page d'avant, sinon l'accueil.
import { sendNote } from '../app/send.js';
import { knownEmail, EMAIL_RE } from '../app/storage.js';
import { installCount, count } from '../app/count.js';
import { menuFonts } from '../menu/menu.js';

const main = document.querySelector('.lt');
menuFonts('./').finally(() => requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('on'))));
installCount('lettre');

document.querySelector('.lt-back').addEventListener('click', () => {
  let same = false; try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch { /* */ }
  if (same && history.length > 1) history.back(); else location.href = new URL('./', document.baseURI).href;
});

const form = document.querySelector('.lt-wait'), mail = form.querySelector('.lt-mail'), trap = form.querySelector('.lt-trap');
const go = form.querySelector('.lt-go'), done = document.querySelector('.lt-done');
const known = knownEmail();
if (known) mail.value = known;
const check = () => go.classList.toggle('on', EMAIL_RE.test(mail.value.trim()));
mail.addEventListener('input', check); check();

let sent = false;
form.addEventListener('submit', e => {
  e.preventDefault();
  if (sent || !go.classList.contains('on')) return;
  sent = true;
  if (!trap.value) sendNote({ kind: 'club', email: mail.value.trim() });
  count('lettre/reservee');
  mail.blur();
  form.classList.add('sent');
  // « c'est noté. » tapé à la machine
  const msg = 'c’est noté.\nje t’écris pour la première lettre.';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const strike = () => { if (i <= msg.length) { done.textContent = msg.slice(0, i++); setTimeout(strike, reduced ? 0 : 55 + Math.random() * 90); } };
  strike();
});
