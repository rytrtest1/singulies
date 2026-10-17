// Version alternative (10/10) : après le champ de prénoms, la feuille qui attend — l'acrostiche tapé, les vraies
// photos, le prix, COMMANDER (Stripe). La question vient après le paiement (merci.html), jamais avant.
import '../basique/basique.css';
import '../app/pay.css';
import './offre.css';
import { acrostic } from '../basique/basique.js';
import { mountExemples } from './exemples.js';
import MACHINE from './machine.json';   // { loop, duration, rest[] } : voir tools/machine-cut.py
import { NAV_TOP, safeTop } from '../app/stage.js';
import { count } from '../app/count.js';
import { stitch } from './stitch.js';
import { PRIX, STRIPE, STRIPE_PK, PAIEMENT_URL, FEUILLE_PHOTO, SHEET_INSET, RESERVATION, EN_VRAI, DELAI_COURT } from './config.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') !== '0';
// (10/10) réservation sans paiement (en attendant le SIRET) ; ?paiement=… : le paiement quand même (essais)
const RESERVE = RESERVATION && !Q.get('paiement');
const K_ORDER = 'singulies.order';
// (10/10) payé dans la page : alt.html enchaîne lui-même (la feuille se défait, la carte est tirée) ; sans lui (pas de
// WebGL2, ou Stripe a dû rediriger) : merci.html
let onPaidHere = null;
const readOrder = () => { try { return JSON.parse(localStorage.getItem(K_ORDER) || 'null'); } catch { return null; } };
const saveOrder = o => { try { localStorage.setItem(K_ORDER, JSON.stringify(o)); } catch { /* */ } };
// (10/10) la vitrine : ce qu'il y a dans l'envoi, une chose à la fois, JOUÉ EN DIRECT dans la scène de la feuille
// (src/vitrine/vitrine.js) : une seule histoire qui s'enchaîne, de sa feuille à tout l'envoi posé à plat. Dessous, la
// description (flèches de part et d'autre, ou glisser l'objet), RECEVOIR, le prix. Quatre étapes, la vue ne bouge pas,
// un fil noir les relie (Maxence 11/10) ; un tour tout seul, il s'arrête sur la dernière ; dès qu'on touche aux flèches, plus de défilé automatique.
// (11/10, Maxence) le cachet de cire AVANT la carte mystère ; les coupures de lignes sont choisies (\n)
// (16/10, Maxence : « un tap permet de zoomer sur l'objet, en description : dimensions, papier, le process ») more :
// ce qu'on lit quand on touche l'objet (un second toucher, ou glisser, rend la description) — À COMPLÉTER par Maxence
// (grammage, papier) : seulement des faits sûrs ici
const OBJETS = [
  { id: 'feuille', txt: 'l’exemplaire unique de ton poème\ntapé à la machine à écrire', more: 'une feuille noire A4 · 21 × 29,7 cm\ntapée une seule fois · l’original' },
  { id: 'carte', txt: 'une question du jeu SINGULIES\nla réponse inspire le poème', more: 'une carte noire · 8,7 × 5,2 cm\nencre blanche · logo gaufré au dos' },
  { id: 'cachet', txt: 'le tout dans une enveloppe\nscellée à la cire', more: 'une enveloppe noire fermée à la main\ncachet de cire argentée · 27 mm' },
  // (17/10, Maxence) la carte mystère garde son mystère : la toucher ne dit rien de plus, on la voit de près (look)
  { id: 'mystere', txt: 'une carte mystère et un fil…\npour rester liés', look: true },
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// le paiement : le prénom part dans client_reference_id (A–Z, chiffres, - et _), et reste ici pour merci.html
export function orderRef(name) {
  const r = Math.random().toString(36).slice(2, 8);
  return (name.replace(/[^A-Z ]/g, '').trim().replace(/ +/g, '_') || 'X') + '-' + r;
}
// l'après (merci.html), avec les réglages de l'adresse (?envoi=0, ?fin=mail…)
function merciUrl(extra = {}) {
  const u = new URL('./merci.html', document.baseURI), k = new URLSearchParams(location.search);
  k.delete('paiement'); for (const [a, b] of Object.entries(extra)) k.set(a, b);
  u.search = k.toString(); return u.href;
}

// le panneau de paiement : il monte du bandeau, le formulaire Stripe dedans (iframe sécurisée de Stripe) ;
// Stripe ramène ensuite vers merci.html?session=… (on reste sur le site)
let panel = null;
function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/endive/stripe.js';
    s.onload = () => (window.Stripe ? res(window.Stripe) : rej(new Error('stripe.js')));
    s.onerror = () => rej(new Error('stripe.js'));
    document.head.appendChild(s);
  });
}
// le panneau est à nous (mise en page, textes, PAYER, en noir, Garamond et machine) ; seuls les champs sensibles
// (adresse, carte, Apple Pay / Google Pay) sont des cadres de Stripe, habillés aux couleurs et polices du site
// (Checkout Sessions, ui_mode 'elements' : stripe.initCheckoutElementsSdk). Stripe ramène ensuite vers merci.html.
const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
function appearance() {
  return {
    theme: 'night', labels: 'floating',
    variables: {
      colorPrimary: '#ece8e0', colorBackground: '#0f0f0e', colorText: '#d6d2ca', colorTextSecondary: '#9a958c',
      colorTextPlaceholder: '#5f5b55', colorDanger: '#e08a7a', iconColor: '#9a958c',
      fontFamily: '"SG Machine", "Courier New", monospace', fontSizeBase: '16px', borderRadius: '2px', spacingUnit: '4px',
    },
    rules: {
      '.Input': { backgroundColor: '#0f0f0e', border: '1px solid #2c2a27', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #8f897f', boxShadow: 'none' },
      '.Label': { color: '#8f897f' },
      '.Tab': { backgroundColor: '#0f0f0e', border: '1px solid #2c2a27', boxShadow: 'none' },
      '.Tab--selected': { border: '1px solid #ece8e0' },
    },
  };
}
// (10/10) payer depuis le bandeau : il grandit vers le haut (jamais plein écran) et la feuille — le prénom — reste
// visible au-dessus : la scène remonte et se réduit pour tenir dans ce qui reste (la feuille occupe ≈ 21–79 % de la hauteur)
function liftSheet(on, panelEl) {
  const cv = document.querySelector('canvas.sc-c');
  const of = document.getElementById('offre');
  if (of) { of.classList.toggle('paying', on); if (on) of.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (!cv) return;
  cv.style.transition = 'transform .6s cubic-bezier(.2,.7,.3,1)';
  cv.style.transformOrigin = '50% 0';
  if (!on) { cv.style.transform = ''; return; }
  const H = innerHeight, room = H - panelEl.getBoundingClientRect().height - 18;
  // (10/10) la feuille est cadrée dans la hauteur utile (au-dessus de la légende et du bandeau) : ≈ 5–95 % de celle-ci
  const He = H - SHEET_INSET, y0 = 0.05 * He, y1 = 0.95 * He;
  const s = Math.min(1, room / (y1 - y0)), T = y0 * s - 10;
  cv.style.transform = `translateY(${(-T).toFixed(1)}px) scale(${s.toFixed(3)})`;
}
// (10/10) une seule session de paiement par commande, partagée par le bandeau (Apple Pay / Google Pay) et le panneau
let ctx = null;
function stripeCtx(name, ref) {
  if (ctx && ctx.ref === ref) return ctx.p;
  const p = loadStripe().then(async Stripe => {
    const stripe = Stripe(STRIPE_PK, { locale: 'fr' });
    const clientSecret = fetch(PAIEMENT_URL.replace(/\/$/, '') + '/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: name, ref, retour: merciUrl() }),
    }).then(r => r.json()).then(d => { if (!d.clientSecret) throw new Error(d.error || 'session'); return d.clientSecret; });
    const fonts = new URL('./fonts/', document.baseURI).href;
    const checkout = stripe.initCheckoutElementsSdk({
      clientSecret,
      elementsOptions: { appearance: appearance(), fonts: [
        { family: 'SG Machine', src: `url(${fonts}CourierPrime-latin.woff2)`, weight: '400' },
        { family: 'SG Garamond', src: `url(${fonts}EBGaramond-500.woff2)`, weight: '500' },
      ] },
    });
    const la = await checkout.loadActions();
    if (la.type === 'error') throw new Error(la.error?.message || 'actions');
    return { checkout, actions: la.actions };
  });
  ctx = { ref, p };
  p.catch(() => { if (ctx && ctx.p === p) ctx = null; });
  return p;
}
// la référence de la commande : celle déjà en cours pour ce prénom, sinon une nouvelle
function ensureRef(name) {
  const o = readOrder();
  if (o && o.name === name && !o.done && o.ref) return o.ref;
  const ref = orderRef(name);
  saveOrder({ name, ref, at: Date.now() });
  return ref;
}
// payé : la suite ici même si la page sait enchaîner, sinon merci.html
let closePanel = () => {};
// pour moi / pour offrir : choisi dans le panneau de paiement (12/10 : plus dans le bandeau)
let giftPref = null, syncBarFor = () => {};
// (10/10) payé par Apple Pay / Google Pay : l'adresse et l'email viennent du portefeuille — ils iront sur l'enveloppe,
// tapés tout seuls après la cérémonie, puis l'email dans le champ de la fin
function walletOut(ev, r) {
  const sa = ev && ev.shippingAddress, bd = (ev && ev.billingDetails) || {}, a = (sa && sa.address) || {};
  const nm = String((sa && sa.name) || bd.name || '').trim().split(/\s+/).filter(Boolean);
  const address = a.line1 && a.city && a.postal_code ? { prenom: nm[0] || '', nom: nm.slice(1).join(' '), rue: a.line1, cplt: a.line2 || '', ville: a.city, cp: a.postal_code } : null;
  return { email: bd.email || (r && r.session && r.session.email) || '', ...(address ? { address } : {}) };
}
// (10/10) l'adresse donnée dans le panneau (Stripe) : elle s'écrira seule sur l'enveloppe, après
function sessionAddr(r) {
  const s = r && r.session, sa = s && (s.shippingAddress || s.shipping), a = (sa && sa.address) || {};
  const nm = String((sa && sa.name) || '').trim().split(/\s+/).filter(Boolean);
  return a.line1 && a.city && a.postal_code ? { address: { prenom: nm[0] || '', nom: nm.slice(1).join(' '), rue: a.line1, cplt: a.line2 || '', ville: a.city, cp: a.postal_code } } : {};
}
function paidHere(name, ref, extra = {}) {
  const o = { ...(readOrder() || {}), name, ref, paid: true, ...extra };
  saveOrder(o);
  count('alt/paye');
  if (!onPaidHere) { location.href = merciUrl(extra.reserve ? { reserve: '1' } : extra.simule ? { simule: '1' } : {}); return; }
  closePanel();
  onPaidHere(o);
}
// Apple Pay / Google Pay dans le bandeau fermé : un toucher, sans rien ouvrir. Sans portefeuille (pas de carte
// enregistrée, navigateur d'Instagram, ordinateur sans Chrome…) : rien ne change, COMMANDER → le panneau (carte, PayPal).
let barWallet = '';   // '' : pas essayé · 'pending' : bouton créé, réponse attendue · 'yes' : dans le bandeau · 'no' : aucun
function barWalletSetup(root, name) {
  if (RESERVE || !(STRIPE_PK && PAIEMENT_URL) || Q.get('paiement') === 'faux') return;
  const bar = root.querySelector('.of-bar'), go = bar.querySelector('.of-go');
  const right = document.createElement('div'); right.className = 'of-bar-r';
  const host = document.createElement('div'); host.className = 'of-bar-wallet';
  const card = document.createElement('button'); card.type = 'button'; card.className = 'of-bar-card'; card.textContent = 'ou par carte';
  go.replaceWith(right); right.append(go, host, card);
  card.addEventListener('click', () => pay(name));
  const ref = ensureRef(name);
  stripeCtx(name, ref).then(({ checkout, actions }) => {
    const el = checkout.createExpressCheckoutElement({
      buttonHeight: 46, buttonTheme: { applePay: 'white', googlePay: 'white' }, buttonType: { applePay: 'buy', googlePay: 'buy' },
      paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'never', paypal: 'never', amazonPay: 'never', klarna: 'never' },
      layout: { maxColumns: 1, maxRows: 1, overflow: 'never' },
    });
    barWallet = 'pending';   // (un seul bouton de portefeuille par session : le panneau n'en crée pas d'autre)
    el.mount(host);
    let decided = false;
    const decide = pm => {
      if (decided) return; decided = true;
      const ok = !!(pm && (pm.applePay || pm.googlePay));
      barWallet = ok ? 'yes' : 'no';
      bar.classList.toggle('wallet', ok);
      if (ok) count('alt/portefeuille');
      else { host.remove(); card.remove(); }
    };
    el.on('ready', e => decide(e && e.availablePaymentMethods));
    el.on('availablepaymentmethodschange', e => decide(e && e.paymentMethods));
    el.on('confirm', async ev => {
      const r = await actions.confirm({ expressCheckoutConfirmEvent: ev, redirect: 'if_required' });
      if (r && r.type === 'success') paidHere(name, ref, { session: r.session?.id || '', gift: !!readOrder()?.gift, ...walletOut(ev, r) });
      else if (r && r.type === 'error') console.warn('portefeuille', r.error);
    });
  }).catch(e => { console.warn('portefeuille', e); host.remove(); card.remove(); });
}

function openPanel(name, ref) {
  if (panel) { panel.root.classList.add('on'); panel.veil.classList.add('on'); requestAnimationFrame(() => liftSheet(true, panel.root)); return; }
  const fake = Q.get('paiement') === 'faux' || !(STRIPE_PK && PAIEMENT_URL);   // ?paiement=faux : toujours le faux formulaire
  const veil = document.createElement('div'); veil.className = 'of-pay-veil';
  const root = document.createElement('div'); root.className = 'of-pay'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Paiement');
  root.innerHTML = `<button class="of-pay-x" type="button" aria-label="Fermer">×</button>
    <div class="of-pay-body">
      <div class="of-pay-title"><span class="of-pay-sub">un prénom, un poème</span>
        <span class="of-pay-p">${esc(PRIX)} tout compris</span></div>
      <div class="of-express"></div>
      <p class="of-or" hidden><span>ou par carte</span></p>
      <label class="of-pf"><span>ton email</span>
        <input class="of-pin" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next"></label>
      <div class="of-pf"><span class="of-where" hidden></span><div class="of-addr"></div></div>
      <div class="of-pf"><span>le paiement</span><div class="of-pm"></div></div>
      <button class="of-go of-pay-go" type="button" disabled>PAYER ${esc(PRIX)}</button>
      <button class="of-pay-skip" type="button">PASSER (test)</button>
      <p class="of-pay-msg" role="alert"></p>
      <p class="of-pay-legal">${fake ? 'paiement d’essai : rien n’est débité.<br>' : ''}paiement sécurisé par stripe.<br>un prénom, un poème : fait pour une personne, il ne peut être ni repris ni échangé.</p>
    </div>`;
  document.body.append(veil, root);
  panel = { root, veil };
  const close = () => { root.classList.remove('on'); veil.classList.remove('on'); liftSheet(false); };
  closePanel = close;
  veil.addEventListener('click', close);
  root.querySelector('.of-pay-x').addEventListener('click', close);
  void root.offsetWidth; setTimeout(() => { root.classList.add('on'); veil.classList.add('on'); liftSheet(true, root); }, 20);
  addEventListener('resize', () => { if (root.classList.contains('on')) liftSheet(true, root); });
  const mail = root.querySelector('.of-pin'), go = root.querySelector('.of-pay-go'), msg = t => { root.querySelector('.of-pay-msg').textContent = t || ''; };
  const addrHost = root.querySelector('.of-addr'), pmHost = root.querySelector('.of-pm');
  // pour moi / pour offrir (10/10) : (17/10, Maxence : « friction en plus, le prénom est déjà écrit ») retiré pour le
  // moment — toujours pour soi
  let gift = false;
  const setFor = g => {
    gift = g;
    root.querySelectorAll('[data-for]').forEach(b => { const on = (b.dataset.for === 'offrir') === g; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    root.querySelector('.of-pay-sub').textContent = g ? 'un prénom, un poème · à offrir' : 'un prénom, un poème';
    // (17/10, Maxence : « enlève « à qui je l'envoie » ») plus d'indication au-dessus de l'adresse
    const o = readOrder(); if (o && o.ref === ref) saveOrder({ ...o, gift: g });
    giftPref = g; syncBarFor();
  };
  setFor(gift);
  // payé : ici même si la page sait enchaîner, sinon merci.html
  const paidNow = extra => paidHere(name, ref, { gift, ...extra });
  // (12/10, Maxence) le paiement de Stripe est en mode test : PASSER (test) va directement à la suite, sans rien payer
  // (13/10) ce qui a été écrit dans le panneau (email, adresse — même le champ d'adresse de Stripe, lu à chaque frappe)
  // part aussi avec PASSER (test) : l'enveloppe s'écrit seule comme après un vrai paiement
  let shipNow = {};
  const typed = () => ({ ...(mailOk(mail.value) ? { email: mail.value.trim() } : {}), ...shipNow });
  root.querySelector('.of-pay-skip').addEventListener('click', () => paidNow({ simule: true, ...typed(), ...(fake ? fakeAddrNow() : {}) }));
  let fakeAddrNow = () => ({});

  const expressHost = root.querySelector('.of-express'), orEl = root.querySelector('.of-or');
  if (fake) {
    // le même panneau, avec des champs d'essai à l'allure des vrais (et un faux bouton Apple Pay en tête)
    expressHost.innerHTML = '<button type="button" class="of-fake-apple">Payer avec Apple Pay</button>';
    expressHost.querySelector('button').addEventListener('click', () => paidNow({ simule: true }));
    orEl.hidden = false;
    addrHost.innerHTML = ['prénom et nom', 'adresse', 'code postal', 'ville'].map(l => `<input class="of-pin of-fake-in" placeholder="${l}" aria-label="${l}">`).join('');
    pmHost.innerHTML = `<div class="of-fake-tabs"><span class="on">carte</span><span>apple pay</span><span>paypal</span></div>
      <input class="of-pin of-fake-in" placeholder="numéro de carte" aria-label="numéro de carte" inputmode="numeric">`;
    const upd = () => { go.disabled = !mailOk(mail.value); };
    mail.addEventListener('input', upd);
    const fakeAddr = () => {
      const v = [...addrHost.querySelectorAll('input')].map(i => i.value.trim()), nm = (v[0] || '').split(/\s+/).filter(Boolean);
      return v[1] && v[2] && v[3] ? { address: { prenom: nm[0] || '', nom: nm.slice(1).join(' '), rue: v[1], cplt: '', cp: v[2], ville: v[3] } } : {};
    };
    fakeAddrNow = fakeAddr;
    go.addEventListener('click', () => { if (!go.disabled) paidNow({ simule: true, email: mail.value.trim(), ...fakeAddr() }); });
    return;
  }

  pmHost.innerHTML = '<p class="of-pay-wait">un instant…</p>';
  const fail = () => {
    pmHost.innerHTML = `<p class="of-pay-wait">le paiement ne répond pas.${STRIPE ? ' <a href="#" data-link>payer sur la page de stripe</a>' : ' réessaie dans un instant.'}</p>`;
    pmHost.querySelector('[data-link]')?.addEventListener('click', e => { e.preventDefault(); goLink(ref); });
  };
  stripeCtx(name, ref).then(({ checkout, actions }) => {
    pmHost.innerHTML = '';
    // en tête : Apple Pay / Google Pay / PayPal en un toucher (l'adresse et l'email viennent du portefeuille) — sauf si
    // le bandeau porte déjà le bouton du portefeuille (un seul par session) ou qu'aucun n'existe sur cet appareil
    if (!barWallet) try {
      const express = checkout.createExpressCheckoutElement({
        buttonHeight: 48, buttonTheme: { applePay: 'white', googlePay: 'white' },
        buttonType: { applePay: 'buy', googlePay: 'buy', paypal: 'buynow' }, layout: { maxColumns: 1, overflow: 'never' },
      });
      express.mount(expressHost);
      express.on('availablepaymentmethodschange', ({ paymentMethods }) => { orEl.hidden = !paymentMethods; requestAnimationFrame(() => liftSheet(true, root)); });
      express.on('confirm', async ev => {
        msg('');
        const r = await actions.confirm({ expressCheckoutConfirmEvent: ev, redirect: 'if_required' });
        if (r && r.type === 'success') { paidNow({ session: r.session?.id || '', ...walletOut(ev, r) }); return; }
        if (r && r.type === 'error') msg(r.error?.message || 'le paiement n’est pas passé.');
      });
    } catch (e) { console.warn('portefeuille (panneau)', e); }   // jamais au détriment de la carte
    const shipEl = checkout.createShippingAddressElement();
    shipEl.mount(addrHost);
    // (13/10) l'adresse écrite dans le champ de Stripe, à chaque frappe (le nom, la rue, la ville, le code postal) : elle
    // s'écrira seule sur l'enveloppe — même si la session ne la rend pas après le paiement
    shipEl.on('change', e => { const v = e && e.value; shipNow = v ? sessionAddr({ session: { shippingAddress: v } }) : {}; });
    checkout.createPaymentElement().mount(pmHost);
    let busy = false;
    const upd = () => { go.disabled = busy || !mailOk(mail.value); };
    mail.addEventListener('input', upd);
    mail.addEventListener('change', () => { if (mailOk(mail.value)) actions.updateEmail?.(mail.value.trim()); });
    go.addEventListener('click', async () => {
      if (go.disabled) return;
      busy = true; upd(); msg('');
      // (10/10) sans redirection quand c'est possible (carte, Apple Pay, Google Pay) : la suite se joue ici ; sinon
      // (3-D Secure, PayPal…) Stripe ramène vers merci.html
      const r = await actions.confirm({ email: mail.value.trim(), redirect: 'if_required' });
      if (r && r.type === 'success') { paidNow({ session: r.session?.id || '', email: mail.value.trim(), ...shipNow, ...sessionAddr(r) }); return; }
      if (r && r.type === 'error') msg(r.error?.message || 'le paiement n’est pas passé.');
      busy = false; upd();
    });
    panel.checkout = checkout;
  }).catch(e => { console.warn('paiement', e); fail(); });
}
function goLink(ref) {
  const u = new URL(STRIPE);
  u.searchParams.set('client_reference_id', ref);
  u.searchParams.set('locale', 'fr');
  location.href = u.href;
}

function pay(name) {
  let ref = null;
  try { const o = JSON.parse(localStorage.getItem(K_ORDER) || 'null'); if (o && o.name === name && !o.done) ref = o.ref; } catch { /* */ }
  ref = ref || orderRef(name);
  try { localStorage.setItem(K_ORDER, JSON.stringify({ name, ref, at: Date.now(), gift: !!giftPref })); } catch { /* */ }
  // réservation : rien à payer, la suite tout de suite (la demande part marquée « à payer »)
  // (17/10, Maxence) plus de « pour moi / pour offrir » (askFor dans fin.js, gardé) : la suite tout de suite
  if (RESERVE) { giftPref = false; count('alt/reserve'); paidHere(name, ref, { reserve: true, gift: false }); return; }
  count('alt/commander');
  if ((STRIPE_PK && PAIEMENT_URL) || Q.get('paiement') === 'faux' || (!STRIPE && onPaidHere)) { openPanel(name, ref); return; }
  if (STRIPE) {
    const u = new URL(STRIPE);
    u.searchParams.set('client_reference_id', ref);
    u.searchParams.set('locale', 'fr');
    location.href = u.href;
  } else {
    // paiement simulé : directement l'après (les réglages de l'adresse — ?envoi=0… — suivent)
    const u = new URL('./merci.html', document.baseURI), k = new URLSearchParams(location.search);
    k.set('simule', '1'); u.search = k.toString();
    location.href = u.href;
  }
}

function slide(p) {
  const fig = document.createElement('figure'); fig.className = 'of-slide';
  const box = document.createElement('div'); box.className = 'of-img';
  // une vidéo (.mp4) : muette, en boucle, lue dans la page (iPhone : playsinline), son image fixe en attendant
  const vid = /\.mp4$/i.test(p.src);
  const img = vid ? document.createElement('video') : new Image();
  if (vid) { Object.assign(img, { muted: true, loop: true, autoplay: true, playsInline: true, preload: 'metadata' }); img.setAttribute('playsinline', ''); img.setAttribute('aria-label', p.alt); if (p.poster) img.poster = new URL(p.poster, document.baseURI).href; }
  else { img.alt = p.alt; img.decoding = 'async'; img.loading = 'lazy'; }
  img.src = new URL(p.src, document.baseURI).href;
  img.onerror = () => {
    if (!TEST) { fig.remove(); return; }
    img.remove(); box.classList.add('todo'); box.dataset.todo = 'photo à mettre dans public/' + p.src + ' : ' + p.todo;
  };
  box.appendChild(img);
  const cap = document.createElement('figcaption'); cap.textContent = p.legende;
  fig.append(box, cap);
  return fig;
}

// opts : { name (capitales), over (la vraie feuille est dessous, dans la scène des cartes), onPaid(order),
//          scene : { vitrine, canvas } (la scène des cartes : la vitrine s'y joue) }
// nav : le bandeau des pages (src/nav/nav.js) — glisser l'objet mène aux pages voisines
// VOIR EN VRAI (17/10, Maxence : « l'idée, c'est de ne pas quitter la page ») : par-dessus la page, les vraies photos
// (EN_VRAI) — tant qu'il n'y en a pas, d'autres prénoms déjà écrits (les feuilles en direct). Retour : la flèche, Échap.
let vrai = null;
function openVrai() {
  if (!vrai) {
    const ov = document.createElement('div'); ov.className = 'of-vr'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'En vrai');
    ov.innerHTML = `<button class="of-vr-x" type="button" aria-label="Retour"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></button>
      <p class="of-vr-t">EN VRAI</p><div class="of-vr-host"></div>`;
    document.body.appendChild(ov);
    const host = ov.querySelector('.of-vr-host');
    if (EN_VRAI.length) host.innerHTML = `<div class="of-vr-ph">${EN_VRAI.map(p => `<figure><img src="${esc(new URL(p.src, document.baseURI).href)}" alt="${esc(p.legende || '')}" loading="lazy" decoding="async" onerror="this.parentNode.remove()"><figcaption>${esc(p.legende || '')}</figcaption></figure>`).join('')}</div>`;
    else mountExemples(host, { root: ov });
    const close = () => { ov.classList.remove('on'); setTimeout(() => { if (!ov.classList.contains('on')) ov.hidden = true; }, 420); };
    ov.querySelector('.of-vr-x').addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('on') && !document.querySelector('.ex-veil3.on, .ex-veil.on')) { e.preventDefault(); close(); } });
    vrai = ov;
  }
  vrai.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => vrai.classList.add('on')));
}

export function mountOffer({ name, over = false, onPaid = null, scene = null, nav = null, onName = null }) {
  onPaidHere = onPaid;
  const root = document.createElement('div');
  root.id = 'offre'; root.className = 'of' + (over ? ' over' : '');
  root.style.setProperty('--inset', SHEET_INSET + 'px');
  // (11/10, Maxence) sous l'objet : sa description, la petite flèche qui fait descendre la page ; puis RECEVOIR et le
  // prix. (12/10 soir, Maxence) les points reviennent : glisser l'objet de côté avance (ou recule) dans l'histoire,
  // comme descendre ; l'invitation à descendre : un fil vertical où une lueur coule vers le bas (pas une flèche)
  const CAP = `<div class="of-cap"><div class="of-vit" role="group" aria-roledescription="carrousel" aria-label="Ce que tu reçois">
        <p class="of-vit-t" aria-live="polite"></p>
        <div class="of-dots">${OBJETS.map((o, i) => `<button class="of-dot" type="button" data-k="${i}" aria-label="${esc(o.txt.replace(/\n/g, ' '))}"><i></i></button>`).join('')}</div>
      </div></div>`;
  root.innerHTML = `
    <!-- (11/10) ni flèche retour ni menu : le bandeau des pages, en haut (src/nav/nav.js) -->
    <main>
      ${over ? `<div class="of-stage"><div class="of-hole" aria-hidden="true"><div class="of-mvw"><video class="of-mv" muted playsinline disablepictureinpicture preload="auto" tabindex="-1" poster="${esc(new URL('vrai/machine-7.jpg', document.baseURI).href)}" src="${esc(new URL('vrai/machine-7.mp4', document.baseURI).href)}"></video></div></div>${CAP}<div class="of-story" aria-hidden="true"></div></div><div class="of-edges" aria-hidden="true"></div>` : `<div class="sheet of-sheet"><div class="ac empty" aria-hidden="true"></div></div>${CAP}`}
      <div class="of-rest">
      <!-- (12/10) chaque section de la suite porte son nom (data-nom) : le signe du bas l'annonce et y mène -->
      <!-- (17/10, Maxence) plus de section « d'autres prénoms » ni « en vrai » : VOIR EN VRAI, sur l'objet (openVrai) -->
      <!-- (17/10, Maxence) d'autres prénoms (les preuves), puis les questions qu'on se pose avant de commander ; qui t'écrit : dans le menu (A PROPOS) -->
      <section class="of-ex of-sec" data-nom="d’autres prénoms" aria-label="D’autres prénoms, d’autres poèmes"><h2 class="of-sh of-ex-t">DES PRENOMS, DES POEMES</h2><div class="of-ex-host"></div></section>
      <!-- (17/10, Maxence) « tes questions » : dans le menu (QUESTIONS), plus sous la page -->
      <!-- (16/10) les pages légales, tout en bas, discrètes -->
      <nav class="of-legal of-sec" data-nom="les mentions"><a href="./mentions.html">MENTIONS</a><a href="./conditions.html">CONDITIONS</a><a href="./confidentialite.html">CONFIDENTIALITE</a></nav>
      </div>
    </main>
    <div class="of-shade" aria-hidden="true"></div>
    <div class="of-bar">
      <button class="of-go" type="button">RECEVOIR</button>
      <div class="of-price"><span class="p1"><b>${esc(PRIX)}</b> tout compris</span><span class="p2">${esc(DELAI_COURT)}</span></div>
      <!-- (12/10, Maxence) l'invitation à descendre, APRÈS l'action : la fin de cette section, le nom de la suivante -->
      <button class="of-down" type="button"><svg class="arw" viewBox="0 0 18 11" aria-hidden="true"><path d="M1.5 1.5 L9 9 L16.5 1.5"/></svg></button>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('of-open');
  // (17/10, Maxence : « en défilant, les poèmes avec les autres prénoms, comme avant : une preuve de plus ») les feuilles des autres
  mountExemples(root.querySelector('.of-ex-host'));
  // le fond de la page = celui du canvas (6) : quand la feuille remonte au défilement, aucune limite ne se voit
  document.documentElement.style.background = document.body.style.background = '#060606';

  // la feuille : dessinée par le moteur, ou une vraie feuille photographiée (FEUILLE_PHOTO)
  const sheet = root.querySelector('.of-sheet'), col = root.querySelector('.ac');
  if (sheet && FEUILLE_PHOTO) {
    const im = new Image();
    im.onload = () => {
      const z = FEUILLE_PHOTO.zone;
      sheet.classList.add('photo');
      Object.assign(sheet.style, { aspectRatio: String(FEUILLE_PHOTO.ratio || im.naturalWidth / im.naturalHeight), backgroundImage: `url("${im.src}")` });
      Object.assign(col.style, { left: z.left + '%', top: z.top + '%', width: z.width + '%', right: 'auto' });
      col.style.setProperty('--lh', `min(${z.width * 0.1}cqw, calc(${z.height}cqw * 1.0 / var(--n, 1)))`);
    };
    im.src = new URL(FEUILLE_PHOTO.src, document.baseURI).href;
  }

  // (17/10, Maxence : « enlève le VOIR EN VRAI pour l'instant ») le bouton et son raccordement sont retirés (openVrai reste prêt)
  // ---- la vitrine (11/10) : jouée dans la scène (envelope.vitrine) — rien ne bouge tout seul. On avance d'une étape en
  // faisant défiler la page (la scène reste en place pendant ce temps : un espace transparent sous elle, .of-story ; puis
  // les autres poèmes montent et la feuille avec eux) ou avec les flèches ; on recule pareil, à tout moment, et tout se
  // rejoue dans l'ordre. Sans la scène (pas de WebGL2) : seulement les mots.
  const txt = root.querySelector('.of-vit-t'), hole = root.querySelector('.of-hole'), story = root.querySelector('.of-story');
  const vit = scene && scene.vitrine ? scene.vitrine : null;
  const busyMode = () => root.classList.contains('paying');
  const N = OBJETS.length;
  // (11/10, Maxence) le défilement EST le temps : chaque étape a une longueur de page proportionnelle à sa durée réelle
  // (la carte 1,8 s, l'enveloppe et la carte mystère 7 s, le cachet 2,4 s) — aucune partie en accéléré
  const KEYS = vit ? vit.state().keys : OBJETS.map((o, i) => i);
  const PXS = () => innerHeight * 0.18;                                      // px de défilement par seconde d'animation
  // (12/10, Maxence : « la carte mystère n'est pas assez sensible au scroll, on galère ») la dernière étape demande
  // moitié moins de défilement que sa durée (elle suit toujours le doigt, à 2,2 × au plus)
  const WK = [1, 1, 0.5];
  const segL = i => (KEYS[i + 1] - KEYS[i]) * (WK[i] ?? 1) * PXS();
  const keyY = i => { let y = 0; for (let j = 0; j < i; j++) y += segL(j); return y; };
  // (17/10, Maxence : « quand on fait défiler depuis RECEVOIR et dessous, la page défile directement, comme si l'objet
  // était une section à part ») l'histoire ne se joue plus au défilement de la page : la page défile vers la suite ;
  // l'histoire, ce sont les gestes sur l'objet (glisser de côté, vers le haut ou le bas, la molette sur lui), les points
  const storyLen = () => 0;
  const pOf = y => { y = Math.max(0, y); for (let i = 0; i < N - 1; i++) { const l = segL(i); if (y < l) return i + y / l; y -= l; } return N - 1; };
  // (des repères d'arrêt : la page se pose doucement sur chaque étape — scroll-snap)
  const sizeStory = () => {
    if (!story) return;
    story.style.height = storyLen() + 'px';
    // (pas de repère à la fin de l'histoire : la page continue librement vers les autres prénoms, au doigt comme à la molette)

  };
  sizeStory(); addEventListener('resize', sizeStory);
  let cur = -1;
  const dotsOn = k => root.querySelectorAll('.of-dot').forEach((b, i) => b.classList.toggle('on', i === k));
  // la description glisse (de droite à gauche quand on avance) : l'ancienne part d'un côté, la nouvelle arrive de l'autre
  // (12/10 soir, Maxence) la description se tape à la machine, lettre à lettre (l'ancienne s'efface d'un souffle) ;
  // deux lignes choisies, sans virgule en fin de ligne
  let typeT = 0;
  // (12/10, Maxence) l'exemplaire original (l'étape 0) : la première ligne paraît en fondu, la seconde se tape
  const slideTxt = (s, intro = false) => {
    txt.setAttribute('aria-label', s.replace(/\n/g, ' '));
    clearTimeout(typeT);
    for (const old of txt.querySelectorAll('i:not(.out)')) { old.classList.add('out'); old.style.opacity = '0'; setTimeout(() => old.remove(), 400); }
    const box = document.createElement('i'); txt.appendChild(box);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { box.textContent = s; return; }
    // les lettres à venir sont déjà là, invisibles : la mise en page ne bouge jamais pendant la frappe
    const nl = s.indexOf('\n');
    if (intro && nl > 0) {
      box.innerHTML = '<span class="tw"><span class="fd">' + esc(s.slice(0, nl)) + '</span><br>' + [...s.slice(nl + 1)].map(ch => `<b>${esc(ch)}</b>`).join('') + '</span>';
      requestAnimationFrame(() => requestAnimationFrame(() => box.querySelector('.fd')?.classList.add('on')));
    } else box.innerHTML = '<span class="tw">' + [...s].map(ch => ch === '\n' ? '<br>' : `<b>${esc(ch)}</b>`).join('') + '</span>';
    const ks = [...box.querySelectorAll('b')];
    let n = 0;
    // (17/10, Maxence : « ne remets pas la vidéo des mains si déjà jouée, sur la même page : du dernier au premier point, juste le
    // mécanisme, qui recommence à taper à "tapé à la machine" ») la première fois : les mains pendant que la première ligne paraît,
    // puis le mécanisme avec la frappe de la seconde ; ensuite : la première ligne paraît, le mécanisme repart avec la seconde
    const again = intro && nl > 0 && vidStarted && !!vid;
    if (again) { try { vid.currentTime = VID_LOOP; } catch { /* */ } }
    else vidPlay(true);
    const strike = () => {
      if (!box.isConnected) return;
      if (again && n === 0) vidPlay(true);              // (le mécanisme repart avec la frappe de la seconde ligne)
      if (n >= ks.length) { vidPlay(false); return; }   // (la description est posée : la machine s'arrête, image figée)
      ks[n++].classList.add('on');
      const ch = ks[n - 1].textContent;
      typeT = setTimeout(strike, (ch === ' ' ? 70 : 32) + Math.random() * 46);
    };
    typeT = setTimeout(strike, again ? 900 : intro && nl > 0 ? Math.round(MACHINE.loop * 1000) + 60 : 140);
  };
  // (le temps de l'entrée de l'étape 0 : fondu + frappe)
  const introMs = s => Math.round(MACHINE.loop * 1000) + 60 + Math.max(0, s.length - s.indexOf('\n')) * 56 + 200;
  const clearTxt = () => { clearTimeout(typeT); vidPlay(false); for (const old of txt.querySelectorAll('i:not(.out)')) { old.classList.add('out'); old.style.opacity = '0'; setTimeout(() => old.remove(), 400); } };
  // les petits mots restent avec le suivant (jamais « à » seul en fin de ligne)
  const nbsp = s => { const r = /(^|[\s\u00a0])(à|a|de|du|la|le|un|et|y|me|ton|pour|au) /gi, f = x => x.replace(r, (m, a, w) => a + w + '\u00a0'); return f(f(s)); };
  // revenir à la feuille d'un coup, sans qu'on voie le saut (RECEVOIR depuis une autre étape)
  const sceneCv = () => scene && scene.canvas;
  const fadeJump = (k, then) => {
    const c = sceneCv(); if (!c || !vit) { then && then(); return; }
    c.style.transition = 'opacity .3s ease'; c.style.opacity = '0';
    setTimeout(() => { vit.jump(k); cur = k; slideTxt(nbsp(OBJETS[k].txt), k === 0); dotsOn(k); then && then(); setTimeout(() => { c.style.opacity = '1'; }, 60); }, 320);
  };
  // la description de l'étape k (le défilement, lui, mène l'animation : scrub)
  // (12/10, Maxence) en reculant (on remonte, on glisse après le dernier point, on touche le premier), la description
  // s'efface et ne revient qu'une fois arrivé : l'étape 0 aussitôt (l'exemplaire original), une autre quand la page
  // s'est posée dessus — on ne voit plus défiler les textes de toutes les étapes
  let txtT = 0;
  const txtFor = k => slideTxt(nbsp(OBJETS[k].txt), k === 0);
  // (16/10) toucher l'objet : ce qu'il est vraiment (more), tapé à la place de la description ; encore = la description
  let detail = false;
  // (17/10, Maxence : « chaque toucher zoome sur l'objet touché, en image et en descriptif — dimensions, fiche
  // technique — et VOIR EN VRAI ») : la vue s'approche de l'objet (vit.look), sa fiche se tape à la place de la
  // description, VOIR EN VRAI paraît sous elle ; encore = la vue revient, la description aussi. La carte mystère garde
  // son mystère : on la voit de près, sans rien de plus.
  const toggleDetail = () => {
    if (cur < 0) return;
    const ob = OBJETS[cur], want = !detail;
    const zoomed = vit?.look ? vit.look(want) : false;
    if (want && !zoomed && !ob.more) return;
    detail = want;
    root.classList.toggle('detail', detail && !ob.look);
    if (ob.more) { clearTimeout(txtT); slideTxt(nbsp(detail ? ob.more : ob.txt), false); }
    if (detail) count('alt/detail-' + ob.id);
  };
  // (17/10, Maxence : « c'est la machine qui tape la description ») la machine (les mains sur les touches, puis le mécanisme
  // seul) apparaît quand la première description se tape, et reste pendant TOUTES les étapes ; elle joue seule (muette) :
  // les mains une fois, puis le mécanisme en boucle. Elle s'efface pendant l'enveloppe et le paiement. Mouvement réduit :
  // l'image fixe.
  const vid = root.querySelector('.of-mv'), vidW = root.querySelector('.of-mvw');
  let vidArmed = false, vidStarted = false;
  const VID_LOOP = MACHINE.loop;                         // (après les mains et leur fondu : le début du mécanisme)
  // (17/10, Maxence : « la machine frappe à une vraie allure, jamais figée quand le marteau touche le papier ») le film
  // (tools/machine-cut.py) : les mains, puis seulement les frappes, accélérées. Il ne joue que pendant la frappe d'une
  // description ; quand elle est posée, il continue jusqu'à la prochaine FENÊTRE DE REPOS (le marteau n'est nulle part
  // près du papier) et s'y fige — jamais au milieu d'un coup.
  let vidStop = false, vidRaf = 0;
  const inRest = t => MACHINE.rest.some(([a, b]) => t >= a && t <= b);
  const vidWatch = () => {
    cancelAnimationFrame(vidRaf); vidRaf = 0;
    if (!vid || vid.paused) return;
    const t = vid.currentTime;
    if (t >= MACHINE.duration - 0.12) { try { vid.currentTime = VID_LOOP; } catch { /* */ } }   // (rebouclé de repos à repos)
    else if (vidStop && t >= VID_LOOP && inRest(t)) { vid.pause(); vidStop = false; return; }
    vidRaf = requestAnimationFrame(vidWatch);
  };
  const vidPlay = on => {
    if (!vid) return;
    if (!on) { if (!vid.paused) { vidStop = true; vidWatch(); } return; }
    vidStop = false;
    if (!vidW.classList.contains('on') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { const p = vid.play(); p && p.catch(() => { /* */ }); } catch { /* */ }
    cancelAnimationFrame(vidRaf); vidRaf = requestAnimationFrame(vidWatch);
  };
  // (17/10, Maxence : « sûr certain que c'est au bon endroit à chaque fois, chaque appareil ») la position n'est plus un
  // décalage fixe : elle est MESURÉE sur les points de navigation (le haut de la vidéo juste sous eux), au chargement, à
  // chaque changement de taille et quand la machine paraît ; seulement en haut de page (les points restent collés pendant
  // que le reste défile : la mesure n'aurait plus de sens)
  const vidPlace = () => {
    if (!vidW || root.scrollTop > 2) return;
    const d = root.querySelector('.of-dots'), h = root.querySelector('.of-hole');
    if (!d || !h) return;
    const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
    if (!dr.height || !hr.height) return;
    vidW.style.top = Math.round(dr.bottom - hr.top + 4) + 'px';
  };
  if (vidW) {
    addEventListener('resize', vidPlace);
    if (window.ResizeObserver) { const ro = new ResizeObserver(vidPlace); ro.observe(root); const c = root.querySelector('.of-cap'); if (c) ro.observe(c); }
    document.fonts && document.fonts.ready && document.fonts.ready.then(vidPlace);
    for (const t of [300, 1200, 2500, 5000]) setTimeout(vidPlace, t);
    // (la mise en page peut bouger après l'événement — unités svh, polices, barre d'adresse du téléphone : on remesure
    // aussi deux fois par seconde, deux lectures de position, sans coût)
    const vidTick = setInterval(() => { if (!root.isConnected) clearInterval(vidTick); else vidPlace(); }, 400);
  }
  const vidSet = on => {
    if (!vid || on === vidW.classList.contains('on')) return;
    if (on) {
      vidPlace();
      vidW.classList.add('on');
      if (!vidStarted && !matchMedia('(prefers-reduced-motion: reduce)').matches) { vidStarted = true; try { vid.currentTime = 0; } catch { /* */ } vidPlay(true); }
    } else {
      vidW.classList.remove('on');
      setTimeout(() => { if (!vidW.classList.contains('on')) { vidStop = false; vid.pause(); } }, 1500);
    }
  };
  const show = k => {
    k = Math.max(0, Math.min(N - 1, k));
    if (k === cur) return;
    detail = false; root.classList.remove('detail');
    const back = cur >= 0 && k < cur; cur = k;
    dotsOn(k);
    root.classList.toggle('vit-last', k === N - 1);
    clearTimeout(txtT);
    if (!back || k === 0) { txtFor(k); return; }
    clearTxt();
    const wait = () => { txtT = setTimeout(() => { if (cur !== k) return; if (drive || touching || (vit && !vit.state()?.arrived)) { wait(); return; } txtFor(k); }, vit ? 120 : 450); };
    wait();
  };
  // les flèches : la page défile jusqu'à l'étape voulue À L'ALLURE DE L'ÉTAPE (1 × en avançant, 1,5 × en reculant) ;
  // depuis la dernière, la flèche de droite rembobine tout, un peu plus vite (2,2 ×). Un geste (molette, doigt) l'arrête.
  let drive = 0;
  const stopDrive = () => { if (drive) { cancelAnimationFrame(drive); drive = 0; root.style.scrollSnapType = ''; } };
  const driveTo = (y, speed, done) => {
    stopDrive();
    root.style.scrollSnapType = 'none';
    let pos = root.scrollTop, last = performance.now();
    const f = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const d = y - pos, mv = Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      pos += mv; root.scrollTop = pos;
      if (Math.abs(y - pos) < 0.5 || Math.abs(root.scrollTop - pos) > 1.5) { drive = 0; setTimeout(() => { if (!drive) root.style.scrollSnapType = ''; }, 120); try { syncDown(); } catch { /* */ } done && done(); return; }   // (17/10) la flèche du bas se remet à jour à l'arrivée : pendant le défilement guidé elle n'était plus lue — restait « sans suite » après être remonté ; et on s'arrête à la butée de la page
      drive = requestAnimationFrame(f);
    };
    drive = requestAnimationFrame(f);
  };
  for (const ev of ['wheel', 'touchstart']) root.addEventListener(ev, stopDrive, { passive: true });
  // (12/10) la page se pose sur une étape (plus d'aimant CSS : il ramenait à l'étape d'avant au milieu de la carte
  // mystère) — dès que le défilement s'arrête, entre deux étapes : un petit geste suffit, elle finit dans le sens où l'on
  // allait (au-delà de 12 % de l'étape), sinon elle revient
  let touching = false, sDir = 0, sLast = 0, settleT = 0;
  root.addEventListener('touchstart', () => { touching = true; clearTimeout(settleT); }, { passive: true });
  const touchOff = () => { touching = false; armSettle(); };
  root.addEventListener('touchend', touchOff, { passive: true });
  root.addEventListener('touchcancel', touchOff, { passive: true });
  // (17/10, Maxence : « quand on scrolle au doigt, que la section s'arrête pile ») sous l'histoire, la page se pose sur le haut d'une section
  // (le même point où la flèche du bas l'amène : secTop) dès que le défilement s'arrête, dans le sens où l'on allait (au-delà de 12 %) ; une
  // section plus haute que l'écran se lit librement entre ses deux bouts
  function snapSection(y, L) {
    const maxY = Math.max(0, root.scrollHeight - root.clientHeight);
    const pts = [L, ...secs().map(secTop).filter(t => t > L + 4)].map(t => Math.min(t, maxY)).filter((t, i, a) => i === 0 || t > a[i - 1] + 4);
    let tgt = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      if (y < a || y >= b) continue;
      const f = (y - a) / (b - a);
      if (b - a > innerHeight * 1.15) { const e = innerHeight * 0.15; tgt = y - a < e ? a : b - y < e ? b : null; }
      else tgt = sDir > 0 ? (f > 0.12 ? b : a) : sDir < 0 ? (f < 0.88 ? a : b) : (f < 0.5 ? a : b);
      break;
    }
    if (tgt != null && Math.abs(tgt - y) > 1) driveTo(tgt, Math.max(innerHeight * 1.1, 640));
  }
  function armSettle() {
    clearTimeout(settleT);
    settleT = setTimeout(() => {
      if (touching || drive || busyMode() || !(vit && story)) return;
      const y = root.scrollTop, L = storyLen();
      if (y >= L - 1) { snapSection(y, L); return; }
      const p = pOf(y), i = Math.floor(p), f = p - i;
      if (f < 0.004 || f > 0.996) return;
      const k = sDir > 0 ? (f > 0.12 ? i + 1 : i) : sDir < 0 ? (f < 0.88 ? i : i + 1) : Math.round(p);
      driveTo(keyY(k), PXS() * 1.4);
    }, 220);
  }
  root.addEventListener('scroll', () => { const y = root.scrollTop; if (Math.abs(y - sLast) > 0.5) sDir = Math.sign(y - sLast); sLast = y; if (!drive) armSettle(); }, { passive: true });
  // une étape : l'histoire y va à son allure (en reculant, vite) ; depuis la dernière, la suite revient au début
  const goTo = k => { k = Math.max(0, Math.min(N - 1, k)); if (vit) vit.go(k); show(k); };
  const goStep = d => {
    if (busyMode()) return;
    count('alt/vitrine');
    const c = Math.max(0, cur);
    if (d > 0 && c >= N - 1) { goTo(0); return; }      // depuis la fin : tout rembobiner
    goTo(c + d);
  };
  // (11/10) une seule grammaire : vertical = avancer dans la page (les étapes suivent le défilement) ; les pages : les
  // flèches du bandeau (12/10 : plus de glissé pour changer de page, nav.js)
  // pendant l'enveloppe et le paiement : la feuille
  new MutationObserver(() => { if (busyMode()) vidSet(false); else if (vidArmed) vidSet(true);
    if (busyMode() && cur !== 0) { cur = 0; txtFor(0); dotsOn(0); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  // un point = une étape : la page y défile, à l'allure de chaque étape traversée
  root.querySelectorAll('.of-dot').forEach(b => b.addEventListener('click', () => {
    if (busyMode()) return;
    const k = +b.dataset.k; count('alt/vitrine');
    goTo(k);
  }));
  // glisser l'objet de côté (doigt, souris tenue) : vers la gauche = l'étape suivante, vers la droite = la précédente
  // (12/10, Maxence : « le plus intuitif avec les points, c'est de slide ») partout où est l'objet, à toutes les étapes —
  // pas seulement sur sa place du haut de page (.of-hole monte avec le défilement : passé la feuille, le geste tombait
  // sur la page) : la bande de l'écran entre le bandeau des pages et la description, tant qu'on est dans l'histoire
  if (hole) {
    let sx = null, sy = 0, st = 0;
    const inObj = (x, y, tg) => {
      if (busyMode() || root.classList.contains('past') || root.scrollTop > storyLen() + 30) return false;
      if (tg && tg.closest && tg.closest('a, button, input, .of-bar, .of-rest, .of-pay')) return false;
      // (17/10, Maxence : « il faut pouvoir slide sur le texte descriptif partout ») la description compte comme l'objet : on y glisse
      const cr = root.querySelector('.of-cap')?.getBoundingClientRect(), capBottom = cr ? cr.bottom + 6 : innerHeight * 0.8;
      return y > 78 && y < capBottom;
    };
    let onCap = false;
    const s0 = (x, y, tg) => { if (!inObj(x, y, tg)) { sx = null; return; } sx = x; sy = y; st = performance.now(); onCap = y >= (root.querySelector('.of-cap')?.getBoundingClientRect().top ?? 1e9); };
    const s1 = (x, y) => {
      if (sx == null) return; const dx = x - sx, dy = y - sy; sx = null;
      // (16/10, Maxence) toucher le prénom sur la feuille = revenir au champ pour le changer (une faute, un autre prénom)
      if (onCap && Math.hypot(dx, dy) < 10) return;     // (un simple toucher sur la description : rien — seulement glisser)
      if (onName && Math.hypot(dx, dy) < 10 && performance.now() - st < 600 && root.scrollTop < 20) {
        const b = onName.box(); if (b && x > b[0] && x < b[2] && y > b[1] && y < b[3]) { onName.go(); return; }
      }
      if (Math.hypot(dx, dy) < 10 && performance.now() - st < 600) { toggleDetail(); return; }
      if (performance.now() - st > 1500) return;
      if (Math.abs(dx) > 36 && Math.abs(dx) > 1.3 * Math.abs(dy)) goStep(dx < 0 ? 1 : -1);
      // (17/10) vers le haut = l'étape suivante (après la dernière : la suite de la page), vers le bas = la précédente
      else if (Math.abs(dy) > 36 && Math.abs(dy) > 1.3 * Math.abs(dx)) {
        if (dy < 0) { if (cur >= N - 1) { const n = nextSec(); if (n) descend(n); } else goStep(1); }
        else if (cur > 0) goStep(-1);
      }
    };
    // (12/10) au doigt, le geste est décidé PENDANT qu'il se fait : en mode appli (écran d'accueil de l'iPhone), dès que
    // le doigt dérive un peu verticalement la page commence à défiler et iOS annule le toucher (touchcancel, jamais de
    // touchend) — le glissé n'était jamais vu ; dans Safari ou Instagram, le touchend arrivait quand même
    let lx = 0, ly = 0;
    root.addEventListener('touchstart', e => { if (e.touches.length === 1) { s0(e.touches[0].clientX, e.touches[0].clientY, e.target); lx = e.touches[0].clientX; ly = e.touches[0].clientY; } else sx = null; }, { passive: true });
    root.addEventListener('touchmove', e => {
      const t = e.touches[0]; if (!t || sx == null) return;
      if (onCap && Math.abs(t.clientY - sy) > Math.abs(t.clientX - sx) + 4) { sx = null; return; }   // (sur la description : seulement de côté ; vers le haut / le bas, la page défile)
      if (e.cancelable) e.preventDefault();            // (sur l'objet, en haut de page : la page ne défile pas, l'histoire avance)
      lx = t.clientX; ly = t.clientY;
      const dx = lx - sx, dy = ly - sy;
      if ((Math.abs(dx) > 36 && Math.abs(dx) > 1.3 * Math.abs(dy)) || (Math.abs(dy) > 36 && Math.abs(dy) > 1.3 * Math.abs(dx))) s1(lx, ly);
    }, { passive: false });
    // la molette sur l'objet, en haut de page : une étape par geste ; après la dernière, la page défile
    let wAcc = 0, wAt = 0, wLock = false;
    root.addEventListener('wheel', e => {
      if (e.ctrlKey || !inObj(e.clientX, e.clientY, e.target) || root.scrollTop > 2) return;
      if (e.deltaY > 0 && cur >= N - 1 && !wLock) return;
      if (e.deltaY < 0 && cur <= 0 && !wLock) return;
      e.preventDefault();
      const now = performance.now(); if (now - wAt > 260) wAcc = 0; wAt = now; wAcc += e.deltaY;
      if (wLock || Math.abs(wAcc) < 40) return;
      wLock = true; wAcc = 0; goStep(Math.sign(e.deltaY)); setTimeout(() => { wLock = false; }, 700);
    }, { passive: false });
    root.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) s1(t.clientX, t.clientY); }, { passive: true });
    root.addEventListener('touchcancel', () => s1(lx, ly), { passive: true });
    root.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) s0(e.clientX, e.clientY, e.target); });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse') s1(e.clientX, e.clientY); });
  }
  // (12/10, Maxence) l'entrée, dans l'ordre : la feuille et le prénom en colonne (déjà là) ; « l'exemplaire unique de ton
  // poème » en fondu ; « tapé à la machine à écrire » à la machine ; puis les bandeaux et RECEVOIR ; puis la
  // démonstration du bandeau des pages (nav.js) ; puis la flèche vers le bas
  const INTRO_AT = over ? 600 : 900, BAR_AT = INTRO_AT + introMs(OBJETS[0].txt);
  setTimeout(() => show(0), INTRO_AT);
  setTimeout(() => { vidArmed = true; if (!busyMode()) vidSet(true); }, INTRO_AT + 60);   // (17/10) les mains dès que « l'exemplaire unique de ton poème » paraît
  setTimeout(() => root.classList.add('txt-on'), INTRO_AT);
  // (17/10, Maxence : « feuille ; « l'exemplaire unique… », les mains, ETERNEL et SINGULIES ; puis « tapé à la machine à écrire » et le reste ») le bandeau des pages
  // paraît avec la frappe de la seconde ligne (txt2-on), pas avec la première
  setTimeout(() => root.classList.add('txt2-on'), INTRO_AT + Math.round(MACHINE.loop * 1000) + 60);                          // (17/10, Maxence) le menu paraît avec le premier texte
  // (12/10, Maxence : « l'invitation à descendre n'est pas assez claire ») comme sur la plupart des sites : le signe du bas
  // dit où il mène — le nom de la section suivante (« d'autres prénoms »), sous une flèche vers le bas — et y va
  // directement (la scène s'efface le temps du saut, l'histoire est posée à sa fin). Les étapes de l'objet : les points,
  // le glissé, le défilement. Les sections à venir n'ont qu'à porter leur nom (.of-sec[data-nom]) : le signe annonce
  // toujours la prochaine.
  const down = root.querySelector('.of-down');
  const secs = () => [...root.querySelectorAll('.of-sec')];
  // (17/10, Maxence : « la flèche nous amène pile à la section d'après, sans la couper en haut ») le haut de la section se pose juste sous
  // la ligne du haut et le bandeau (NAV_TOP), pas dessous
  const secOff = () => NAV_TOP + safeTop() + 8;
  const secTop = el => el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - secOff();
  // (13/10, Maxence : « la flèche qui reste quand elle est inutile ») une section compte comme « à venir » tant que son
  // haut est encore dans le bas de l'écran ; déjà à l'écran, la flèche s'en va
  const nextSec = () => secs().find(el => el.getBoundingClientRect().top > innerHeight * 0.55) || null;
  const exTop = () => { const f = secs()[0]; return f ? secTop(f) : storyLen(); };
  // (12/10, Maxence) la flèche seule, sans le nom de la section (son nom reste pour la lecture d'écran)
  const syncDown = () => { const n = nextSec(); down.setAttribute('aria-label', n ? n.dataset.nom : 'Faire défiler'); down.classList.toggle('none', !n); };
  syncDown();
  root.addEventListener('scroll', () => { if (!drive) syncDown(); }, { passive: true });
  // (12/10, Maxence) descendre / remonter : une vraie descente (la feuille monte avec la page, les poèmes arrivent du
  // bas), sans rejouer l'histoire ; l'étape où l'on était en haut est gardée — en remontant, on la retrouve
  let skip = false, memo = null;
  const FAST = () => Math.max(innerHeight * 1.7, 900);
  const descend = el => {
    count('alt/autres');
    stopDrive();
    driveTo(secTop(el), FAST());
  };
  const ascend = () => { stopDrive(); driveTo(0, FAST()); };
  // (la flèche vers le haut : en haut, une fois en bas de la page)
  const up = document.createElement('button'); up.type = 'button'; up.className = 'of-up'; up.setAttribute('aria-label', 'Remonter');
  up.innerHTML = '<svg class="arw" viewBox="0 0 18 11" aria-hidden="true"><path d="M1.5 9.5 L9 2 L16.5 9.5"/></svg>';
  root.appendChild(up);
  up.addEventListener('click', ascend);
  // (ni l'une ni l'autre pendant qu'on lit un poème ouvert, qu'on paie, ou qu'on remplit l'enveloppe)
  setInterval(() => {
    const busy = busyMode() || !!document.querySelector('.ex-veil3.on, .ex-veil.on');
    root.classList.toggle('arrows-off', busy);
  }, 250);
  const downAt = () => { let rv = false; try { rv = !!sessionStorage.getItem('sg.nav.reveal'); } catch { /* */ } return BAR_AT + (rv ? 1200 : 6500); };
  // (17/10, Maxence : « le signe vers le bas, seulement si l'utilisateur ne fait rien sur la page dézoomée normale ») la flèche paraît
  // quand rien n'a bougé depuis 5 s, en haut de page, hors vue rapprochée, paiement ou enveloppe ; au moindre geste, elle repart
  let lastAct = performance.now(), peeked = false;
  for (const ev of ['pointerdown', 'touchstart', 'wheel', 'keydown']) addEventListener(ev, e => { lastAct = performance.now(); if (down.contains(e.target)) return;   /* (17/10, Maxence : la flèche ne marchait pas) toucher la flèche elle-même ne la retire plus : elle devenait intouchable (pointer-events) avant le clic */
    if (down.classList.contains('on')) down.classList.remove('on'); }, { passive: true, capture: true });
  setTimeout(() => setTimeout(() => { down.dataset.shown = '1'; }, downAt() - BAR_AT), BAR_AT);
  setInterval(() => {
    if (!root.isConnected) return;
    const idle = down.dataset.shown === '1' && performance.now() - lastAct > 5000 && !detail && !busyMode() && root.scrollTop < 8 && !drive;
    if (idle && !down.classList.contains('on')) { down.classList.add('on'); if (!peeked) { peeked = true; setTimeout(() => { if (down.classList.contains('on') && performance.now() - lastAct > 5000) peek(); else peeked = false; }, 6000); } }   // (17/10, Maxence : « laisse du temps avant le scroll d'exemple : 6 s après la dernière apparition ») la page ne descend un peu qu'après 6 s de plus, si rien n'a bougé
    else if (!idle && down.classList.contains('on') && (detail || busyMode() || root.scrollTop >= 8)) down.classList.remove('on');
  }, 300);
  // (17/10, Maxence) quand la flèche paraît, la page descend un peu, le temps de montrer ce qui suit (ETERNEL, qui
  // t'écrit), et remonte — une fois par visite ; ensuite, la flèche seule
  function peek() {
    let seen = false; try { seen = !!sessionStorage.getItem('sg.peek'); sessionStorage.setItem('sg.peek', '1'); } catch { /* */ }
    const n = secs()[0];
    if (seen || !n || touching || root.scrollTop > 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bh = root.querySelector('.of-bar')?.getBoundingClientRect().height || 200;
    const y = Math.max(60, Math.min(innerHeight * 0.42, secTop(n) + secOff() + 10 - (innerHeight - bh - 70)));
    driveTo(y, 520, () => setTimeout(() => { if (!touching && !drive && Math.abs(root.scrollTop - y) < 4) driveTo(0, 620); }, 1300));
  }
  // (13/10) le bandeau du bas est fixe : un doigt qui y glisse ne faisait pas défiler la page (rien ne bougeait, ou la
  // flèche partait) — le geste est rendu à la page, avec son élan ; l'histoire suit comme partout ailleurs
  {
    const bar = root.querySelector('.of-bar');
    let g = null, inert = 0;
    bar.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) { g = null; return; }
      cancelAnimationFrame(inert); stopDrive();
      g = { y: e.touches[0].clientY, x: e.touches[0].clientX, top: root.scrollTop, v: 0, ly: e.touches[0].clientY, lt: performance.now(), on: false };
    }, { passive: true });
    bar.addEventListener('touchmove', e => {
      if (!g) return;
      const t = e.touches[0], dy = t.clientY - g.y, dx = t.clientX - g.x;
      if (!g.on) { if (Math.abs(dy) < 6 || Math.abs(dx) > Math.abs(dy)) return; g.on = true; touching = true; }
      if (e.cancelable) e.preventDefault();
      const now = performance.now(), dt = Math.max(1, now - g.lt);
      g.v = 0.7 * g.v + 0.3 * ((t.clientY - g.ly) / dt); g.ly = t.clientY; g.lt = now;
      root.scrollTop = g.top - dy;
    }, { passive: false });
    const endG = () => {
      if (!g) return; const gg = g; g = null;
      if (!gg.on) return;
      touching = false;
      let v = -gg.v * 1000, last = performance.now();          // px/s, dans le sens du défilement
      if (performance.now() - gg.lt > 120) v = 0;
      const f = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; v *= Math.exp(-dt * 3.2); root.scrollTop += v * dt; if (Math.abs(v) > 20) inert = requestAnimationFrame(f); else armSettle(); };
      inert = requestAnimationFrame(f);
    };
    bar.addEventListener('touchend', endG, { passive: true });
    bar.addEventListener('touchcancel', endG, { passive: true });
  }
  // (13/10, Maxence : « si on fait défiler dans la zone de la flèche, ça descend sans l'animation ») un défilement qui
  // commence sur la flèche n'est pas un toucher : seul un vrai toucher (sans bouger, sans que la page ait défilé) la prend
  let press = null;
  down.addEventListener('pointerdown', e => { press = { x: e.clientX, y: e.clientY, top: root.scrollTop, t: performance.now() }; });
  addEventListener('pointermove', e => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) press.moved = true; }, { passive: true });
  root.addEventListener('scroll', () => { if (press && Math.abs(root.scrollTop - press.top) > 2) press.moved = true; }, { passive: true });
  down.addEventListener('click', e => {
    const pr = press; press = null;
    if (pr && (pr.moved || Math.abs(root.scrollTop - pr.top) > 2)) { e.preventDefault(); return; }
    if (busyMode()) return;
    const n = nextSec(); if (n) descend(n);
  });
  // en descendant : d'abord l'histoire (la scène reste en place), puis la feuille remonte avec la page
  const cv = () => document.querySelector('canvas.sc-c');
  let sRaf = 0;
  root.addEventListener('scroll', () => {
    if (!over || sRaf) return;
    sRaf = requestAnimationFrame(() => {
      sRaf = 0;
      if (root.classList.contains('paying') || busyMode()) return;
      let y = root.scrollTop; const L = storyLen();
      // (revenu dans l'histoire après une descente par la flèche : l'étape où l'on était — l'objet n'a pas bougé)
      // (passé l'histoire : la description et ses points s'effacent, ils ne restent pas sous le bandeau)
      root.classList.toggle('past', y > L + 30);
      if (vidW) { if (y > L + 30) { if (vidW.classList.contains('on')) { vidSet(false); vidW.dataset.past = '1'; } } else if (vidW.dataset.past) { delete vidW.dataset.past; if (vidArmed && !busyMode()) vidSet(true); } }
      up.classList.toggle('on', y > L + innerHeight * 0.5);
      const c = cv(); if (!c) return;
      c.style.transition = 'none'; c.style.transformOrigin = '50% 0';
      const off = Math.max(0, y - L);
      c.style.transform = off > 0 ? `translateY(${(-off).toFixed(1)}px)` : '';
      // (11/10) en montant, l'objet s'efface : aux autres prénoms, il ne reste qu'eux sous le bandeau
      c.style.opacity = '';   // (17/10) l'objet monte avec la page, comme une section : il ne s'efface plus
    });
  }, { passive: true });
  // en faisant défiler : une ombre en haut, sous la flèche retour (elle ne passe plus sur le texte)
  root.addEventListener('scroll', () => root.classList.toggle('scrolled', root.scrollTop > storyLen() + 24), { passive: true });
  // (11/10) tout ce qui est souligné l'est par un bout de fil noir, cousu (stitch.js)
  stitch(root.querySelector('.of-bar .of-go'), { seed: 'RECEVOIR'.length * 13 });

  // gestes
  const go = root.querySelector('.of-go');
  // (10/10, Maxence) RECEVOIR : directement le paiement (ou la réservation) — plus d'adresse sur l'enveloppe avant ;
  // l'enveloppe vient après, avec la cérémonie (l'adresse connue s'y tape seule, sinon on l'y écrit)
  go.addEventListener('click', () => {
    const st = vit && vit.state();
    if (st && (st.vt > 0 || st.target > 0)) { root.scrollTo({ top: 0 }); fadeJump(0, () => pay(name)); } else pay(name);
  });
  barWalletSetup(root, name);
  // (12/10, Maxence) pour moi / pour offrir : seulement au moment du paiement (le panneau)
  giftPref = !!readOrder()?.gift;

  // (17/10, Maxence : « sur PC les flèches naviguent entre les points, on peut aussi cliquer sur les points ») ← → : le point d'avant / d'après
  // (depuis le dernier, tout se rembobine) ; pas en écrivant, ni menu ou page de la section ouverts, ni passé l'histoire (les autres poèmes ont leurs flèches)
  addEventListener('keydown', e => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || busyMode() || !root.isConnected) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !a.readOnly && getComputedStyle(a).opacity !== '0') return;
    if (document.querySelector('.nv-pan.on, .mn-au, .mn-ct, .mn-jeu, .ex-veil3.on, .ex-veil.on, .of-vr.on')) return;
    if (root.scrollTop > storyLen() + 30) return;
    e.preventDefault(); goStep(e.key === 'ArrowRight' ? 1 : -1);
  });
  // l'entrée : la couche se pose sur le prénom seul, puis l'acrostiche se tape, puis la barre du prix
  count('alt/offre');
  void root.offsetWidth; setTimeout(() => root.classList.add('on'), 20);
  const shown = new Promise(res => setTimeout(res, 950));
  if (col) setTimeout(() => acrostic(col, name), 700);
  const letters = name.replace(/ /g, '').length;
  setTimeout(() => root.classList.add('bar-on'), over ? BAR_AT : Math.max(BAR_AT, 900 + letters * 90 + 600));
  // payé : l'offre s'efface, la feuille reste seule (la suite se joue dessous)
  const hide = () => {
    root.classList.remove('bar-on');
    root.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { root.classList.remove('on'); root.style.pointerEvents = 'none'; }, 350);
    setTimeout(() => { root.remove(); document.body.classList.remove('of-open'); panel?.root.remove(); panel?.veil.remove(); panel = null; }, 1400);
  };
  // (pour le bandeau des pages) l'objet de la page : la scène (ou la feuille dessinée) et sa description
  // (11/10) la description suit le doigt par son contenu, jamais par le bloc collant lui-même (.of-cap, sticky) : Safari
  // repositionne mal un élément collant qu'on a décalé puis remis — le texte restait décalé après un aller-retour
  const stage = () => [sceneCv() || root.querySelector('.of-sheet'), root.querySelector('.of-cap .of-vit')];
  // (17/10) la flèche retour du haut : la vue rapprochée se referme ; descendu dans la page : on remonte
  const back = () => { if (detail) { toggleDetail(); return true; } if (root.scrollTop > 30) { ascend(); return true; } return false; };
  return { root, shown, hide, stage, storyLen, back, get top() { return root.scrollTop; } };
}
