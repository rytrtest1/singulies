// Version alternative (10/10) : après le champ de prénoms, la feuille qui attend — l'acrostiche tapé, les vraies
// photos, le prix, COMMANDER (Stripe). La question vient après le paiement (merci.html), jamais avant.
import '../basique/basique.css';
import './offre.css';
import { acrostic } from '../basique/basique.js';
import { mountExemples } from './exemples.js';
import { count } from '../app/count.js';
import { stitch } from './stitch.js';
import { PRIX, STRIPE, STRIPE_PK, PAIEMENT_URL, PHOTOS, FEUILLE_PHOTO, LIENS, SHEET_INSET, RESERVATION } from './config.js';

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
const OBJETS = [
  { id: 'feuille', txt: 'l’exemplaire unique de ton poème,\ntapé à la machine à écrire' },
  { id: 'carte', txt: 'la question du jeu SINGULIES,\ntirée au hasard' },
  { id: 'cachet', txt: 'le tout scellé à la cire' },
  { id: 'mystere', txt: 'une carte mystère et un fil…\npour rester liés' },
];
const CHEV = d => `<svg viewBox="0 0 24 24" width="16" height="16"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
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
const SHEET_Y0 = 0.21, SHEET_Y1 = 0.79;
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
let envAddr = null;   // (10/10) l'adresse tapée sur l'enveloppe : { prenom, nom, rue, cplt, ville, cp }
const stripeAddr = f => ({ name: [f.prenom, f.nom].filter(Boolean).join(' ').trim(),
  address: { line1: f.rue || '', line2: f.cplt || '', city: f.ville || '', postal_code: f.cp || '', country: 'FR' } });
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
  const o = { ...(readOrder() || {}), name, ref, paid: true, ...(envAddr ? { address: envAddr } : {}), ...extra };
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
  if (panel && !!panel.env !== !!envAddr) { panel.root.remove(); panel.veil.remove(); panel = null; }
  if (panel) { panel.root.classList.add('on'); panel.veil.classList.add('on'); requestAnimationFrame(() => liftSheet(true, panel.root)); return; }
  const fake = Q.get('paiement') === 'faux' || !(STRIPE_PK && PAIEMENT_URL);   // ?paiement=faux : toujours le faux formulaire
  const veil = document.createElement('div'); veil.className = 'of-pay-veil';
  const root = document.createElement('div'); root.className = 'of-pay'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Paiement');
  root.innerHTML = `<button class="of-pay-x" type="button" aria-label="Fermer">×</button>
    <div class="of-pay-body">
      <div class="of-pay-title"><span class="of-pay-sub">un prénom, un poème</span>
        <span class="of-pay-p">${esc(PRIX)} tout compris</span></div>
      <div class="of-for" role="radiogroup" aria-label="Pour qui">
        <button type="button" class="on" data-for="moi" role="radio" aria-checked="true">pour moi</button>
        <button type="button" data-for="offrir" role="radio" aria-checked="false">pour offrir</button></div>
      <div class="of-express"></div>
      <p class="of-or" hidden><span>ou par carte</span></p>
      <label class="of-pf"><span>ton email</span>
        <input class="of-pin" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next"></label>
      <div class="of-pf"><span class="of-where">où je te l’envoie</span><div class="of-addr"></div></div>
      <div class="of-pf"><span>le paiement</span><div class="of-pm"></div></div>
      <button class="of-go of-pay-go" type="button" disabled>PAYER ${esc(PRIX)}</button>
      <p class="of-pay-msg" role="alert"></p>
      <p class="of-pay-legal">${fake ? 'paiement d’essai : rien n’est débité.<br>' : ''}paiement sécurisé par stripe.<br>un prénom, un poème : fait pour une personne, il ne peut être ni repris ni échangé.</p>
    </div>`;
  document.body.append(veil, root);
  panel = { root, veil, env: !!envAddr };
  const close = () => { root.classList.remove('on'); veil.classList.remove('on'); liftSheet(false); };
  closePanel = close;
  veil.addEventListener('click', close);
  root.querySelector('.of-pay-x').addEventListener('click', close);
  void root.offsetWidth; setTimeout(() => { root.classList.add('on'); veil.classList.add('on'); liftSheet(true, root); }, 20);
  addEventListener('resize', () => { if (root.classList.contains('on')) liftSheet(true, root); });
  const mail = root.querySelector('.of-pin'), go = root.querySelector('.of-pay-go'), msg = t => { root.querySelector('.of-pay-msg').textContent = t || ''; };
  const addrHost = root.querySelector('.of-addr'), pmHost = root.querySelector('.of-pm');
  // pour moi / pour offrir (10/10) : offert, le prénom écrit est le sien ; après le paiement, je demande comment l'écrire
  let gift = !!readOrder()?.gift;
  const setFor = g => {
    gift = g;
    root.querySelectorAll('[data-for]').forEach(b => { const on = (b.dataset.for === 'offrir') === g; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    root.querySelector('.of-pay-sub').textContent = g ? 'un prénom, un poème · à offrir' : 'un prénom, un poème';
    root.querySelector('.of-where').textContent = g ? 'où je l’envoie' : 'où je te l’envoie';
    const o = readOrder(); if (o && o.ref === ref) saveOrder({ ...o, gift: g });
  };
  root.querySelectorAll('[data-for]').forEach(b => b.addEventListener('click', () => setFor(b.dataset.for === 'offrir')));
  setFor(gift);
  // payé : ici même si la page sait enchaîner, sinon merci.html
  const paidNow = extra => paidHere(name, ref, { gift, ...extra });

  const expressHost = root.querySelector('.of-express'), orEl = root.querySelector('.of-or');
  if (fake) {
    // le même panneau, avec des champs d'essai à l'allure des vrais (et un faux bouton Apple Pay en tête)
    expressHost.innerHTML = '<button type="button" class="of-fake-apple">Payer avec Apple Pay</button>';
    expressHost.querySelector('button').addEventListener('click', () => paidNow({ simule: true }));
    orEl.hidden = false;
    if (envAddr) addrHost.closest('.of-pf').hidden = true;   // l'adresse est sur l'enveloppe
    else addrHost.innerHTML = ['prénom et nom', 'adresse', 'code postal', 'ville'].map(l => `<input class="of-pin of-fake-in" placeholder="${l}" aria-label="${l}">`).join('');
    pmHost.innerHTML = `<div class="of-fake-tabs"><span class="on">carte</span><span>apple pay</span><span>paypal</span></div>
      <input class="of-pin of-fake-in" placeholder="numéro de carte" aria-label="numéro de carte" inputmode="numeric">`;
    const upd = () => { go.disabled = !mailOk(mail.value); };
    mail.addEventListener('input', upd);
    const fakeAddr = () => {
      const v = [...addrHost.querySelectorAll('input')].map(i => i.value.trim()), nm = (v[0] || '').split(/\s+/).filter(Boolean);
      return v[1] && v[2] && v[3] ? { address: { prenom: nm[0] || '', nom: nm.slice(1).join(' '), rue: v[1], cplt: '', cp: v[2], ville: v[3] } } : {};
    };
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
    // l'adresse : déjà tapée sur l'enveloppe → elle part chez Stripe (pas de second formulaire) ; sinon ses champs
    if (envAddr) { addrHost.closest('.of-pf').hidden = true; actions.updateShippingAddress?.(stripeAddr(envAddr)); }
    else checkout.createShippingAddressElement().mount(addrHost);
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
      if (envAddr) await actions.updateShippingAddress?.(stripeAddr(envAddr));
      const r = await actions.confirm({ email: mail.value.trim(), redirect: 'if_required' });
      if (r && r.type === 'success') { paidNow({ session: r.session?.id || '', email: mail.value.trim(), ...sessionAddr(r) }); return; }
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
  try { localStorage.setItem(K_ORDER, JSON.stringify({ name, ref, at: Date.now() })); } catch { /* */ }
  // réservation : rien à payer, la suite tout de suite (la demande part marquée « à payer »)
  if (RESERVE) { count('alt/reserve'); paidHere(name, ref, { reserve: true }); return; }
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

// opts : { name (capitales), onBack(), over (la vraie feuille est dessous, dans la scène des cartes), onPaid(order),
//          envelope : { open(), back() } (la scène sait glisser la feuille dans l'enveloppe ; alors COMMANDER y mène) }
// nav : le bandeau des pages (src/nav/nav.js) — glisser l'objet mène aux pages voisines
export function mountOffer({ name, onBack, over = false, onPaid = null, envelope = null, nav = null }) {
  onPaidHere = onPaid;
  const root = document.createElement('div');
  root.id = 'offre'; root.className = 'of' + (over ? ' over' : '');
  root.style.setProperty('--inset', SHEET_INSET + 'px');
  // (11/10, Maxence) sous l'objet : sa description, des points (une étape chacun, au lieu des flèches), la petite
  // flèche qui fait descendre la page ; puis RECEVOIR et le prix (deux lignes)
  const CAP = `<div class="of-cap"><div class="of-vit" role="group" aria-roledescription="carrousel" aria-label="Ce que tu reçois">
        <p class="of-vit-t" aria-live="polite"></p>
        <div class="of-dots">${OBJETS.map((o, i) => `<button class="of-dot" type="button" data-k="${i}" aria-label="${esc(o.txt)}"><i></i></button>`).join('')}</div>
      </div><button class="of-down" type="button" aria-label="Descendre"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 9.5 L12 15.5 L18 9.5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg></button></div>`;
  root.innerHTML = `
    <!-- (11/10) ni flèche retour ni menu : le bandeau des pages, en haut (src/nav/nav.js) -->
    <main>
      ${over ? `<div class="of-stage"><div class="of-hole" aria-hidden="true"></div>${CAP}<div class="of-story" aria-hidden="true"></div></div><div class="of-edges" aria-hidden="true"></div>` : `<div class="sheet of-sheet"><div class="ac empty" aria-hidden="true"></div></div>${CAP}`}
      <div class="of-rest">
      <section class="of-ex" aria-label="D’autres prénoms, d’autres poèmes"><div class="of-ex-host"></div></section>
      <button class="of-contact" type="button">écris-moi</button>
      </div>
    </main>
    <div class="of-shade" aria-hidden="true"></div>
    <div class="of-bar">
      <button class="of-go" type="button">RECEVOIR</button>
      <div class="of-price"><b>${esc(PRIX)}</b> tout compris</div>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('of-open');
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

  mountExemples(root.querySelector('.of-ex-host'));
  // ---- la vitrine (11/10) : jouée dans la scène (envelope.vitrine) — rien ne bouge tout seul. On avance d'une étape en
  // faisant défiler la page (la scène reste en place pendant ce temps : un espace transparent sous elle, .of-story ; puis
  // les autres poèmes montent et la feuille avec eux) ou avec les flèches ; on recule pareil, à tout moment, et tout se
  // rejoue dans l'ordre. Sans la scène (pas de WebGL2) : seulement les mots.
  const txt = root.querySelector('.of-vit-t'), hole = root.querySelector('.of-hole'), story = root.querySelector('.of-story');
  const vit = envelope && envelope.vitrine ? envelope.vitrine : null;
  const busyMode = () => root.classList.contains('paying') || root.classList.contains('env');
  const N = OBJETS.length;
  // (11/10, Maxence) le défilement EST le temps : chaque étape a une longueur de page proportionnelle à sa durée réelle
  // (la carte 1,8 s, l'enveloppe et la carte mystère 7 s, le cachet 2,4 s) — aucune partie en accéléré
  const KEYS = vit ? vit.state().keys : OBJETS.map((o, i) => i);
  const PXS = () => innerHeight * 0.18;                                      // px de défilement par seconde d'animation
  const keyY = i => KEYS[i] * PXS();
  const storyLen = () => (vit && story ? keyY(N - 1) : 0);
  const pOf = y => { const t = Math.max(0, y) / PXS(); for (let i = 0; i < N - 1; i++) if (t < KEYS[i + 1]) return i + (t - KEYS[i]) / (KEYS[i + 1] - KEYS[i]); return N - 1; };
  // (des repères d'arrêt : la page se pose doucement sur chaque étape — scroll-snap)
  const sizeStory = () => {
    if (!story) return;
    story.style.height = storyLen() + 'px';
    // (pas de repère à la fin de l'histoire : la page continue librement vers les autres prénoms, au doigt comme à la molette)
    if (vit && !story.children.length) for (let i = 0; i < N - 1; i++) { const m = document.createElement('i'); m.className = 'of-snap'; story.appendChild(m); }
    [...story.children].forEach((m, i) => { m.style.top = (keyY(i) - story.offsetTop) + 'px'; });
  };
  sizeStory(); addEventListener('resize', sizeStory);
  let cur = -1;
  // la description glisse (de droite à gauche quand on avance) : l'ancienne part d'un côté, la nouvelle arrive de l'autre
  const slideTxt = (s, dir = 1) => {
    txt.setAttribute('aria-label', s);
    for (const old of txt.querySelectorAll('i:not(.out)')) {
      old.classList.add('out'); old.style.transform = `translateX(${-dir * 46}px)`; old.style.opacity = '0';
      setTimeout(() => old.remove(), 700);
    }
    const box = document.createElement('i'); box.textContent = s;
    box.style.transform = `translateX(${dir * 46}px)`; box.style.opacity = '0';
    txt.appendChild(box); void box.offsetWidth;
    box.style.transform = ''; box.style.opacity = '';
  };
  // les petits mots restent avec le suivant (jamais « à » seul en fin de ligne)
  const nbsp = s => { const r = /(^|[\s\u00a0])(à|a|de|du|la|le|un|et|y|me|ton|pour|au) /gi, f = x => x.replace(r, (m, a, w) => a + w + '\u00a0'); return f(f(s)); };
  // revenir à la feuille d'un coup, sans qu'on voie le saut (RECEVOIR depuis une autre étape)
  const sceneCv = () => envelope && envelope.canvas;
  const fadeJump = (k, then) => {
    const c = sceneCv(); if (!c || !vit) { then && then(); return; }
    c.style.transition = 'opacity .3s ease'; c.style.opacity = '0';
    setTimeout(() => { vit.jump(k); cur = k; slideTxt(nbsp(OBJETS[k].txt), -1); then && then(); setTimeout(() => { c.style.opacity = '1'; }, 60); }, 320);
  };
  // la description de l'étape k (le défilement, lui, mène l'animation : scrub)
  const show = k => {
    k = Math.max(0, Math.min(N - 1, k));
    if (k === cur) return;
    const dir = cur < 0 || k > cur ? 1 : -1; cur = k;
    slideTxt(nbsp(OBJETS[k].txt), dir);
    root.classList.toggle('vit-last', k === N - 1);
    root.querySelectorAll('.of-dot').forEach((b, i) => b.classList.toggle('on', i === k));
  };
  // les flèches : la page défile jusqu'à l'étape voulue À L'ALLURE DE L'ÉTAPE (1 × en avançant, 1,5 × en reculant) ;
  // depuis la dernière, la flèche de droite rembobine tout, un peu plus vite (2,2 ×). Un geste (molette, doigt) l'arrête.
  let drive = 0;
  const stopDrive = () => { if (drive) { cancelAnimationFrame(drive); drive = 0; root.style.scrollSnapType = ''; } };
  const driveTo = (y, speed) => {
    stopDrive();
    root.style.scrollSnapType = 'none';
    let pos = root.scrollTop, last = performance.now();
    const f = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const d = y - pos, mv = Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      pos += mv; root.scrollTop = pos;
      if (Math.abs(y - pos) < 0.5) { drive = 0; setTimeout(() => { if (!drive) root.style.scrollSnapType = ''; }, 120); return; }
      drive = requestAnimationFrame(f);
    };
    drive = requestAnimationFrame(f);
  };
  for (const ev of ['wheel', 'touchstart']) root.addEventListener(ev, stopDrive, { passive: true });
  const goStep = d => {
    if (busyMode()) return;
    count('alt/vitrine');
    if (!(vit && story)) { show(cur + d); return; }
    const p = pOf(root.scrollTop);
    if (d > 0 && p > N - 1.02) { driveTo(0, PXS() * 2.2); return; }      // depuis la fin : tout rembobiner
    const k = Math.max(0, Math.min(N - 1, d > 0 ? Math.floor(p + 0.02) + 1 : Math.ceil(p - 0.02) - 1));
    driveTo(keyY(k), PXS() * (d > 0 ? 1 : 1.5));
  };
  // un point = une étape : la page y défile, à l'allure de chaque étape traversée
  const goTo = k => {
    if (busyMode()) return;
    count('alt/vitrine');
    if (!(vit && story)) { show(k); return; }
    const y = keyY(k), back = y < root.scrollTop;
    driveTo(y, PXS() * (back ? (k === 0 && cur === N - 1 ? 2.2 : 1.5) : 1));
  };
  root.querySelectorAll('.of-dot').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.k)));
  // glisser la description = l'étape suivante / précédente ; glisser l'objet = la page voisine (le bandeau, nav.js)
  {
    const z = root.querySelector('.of-vit');
    let x0 = null, y0 = 0;
    const end = (x, y) => { if (x0 == null) return; const dx = x - x0, dy = y - y0; x0 = null; if (Math.abs(dx) > 34 && Math.abs(dx) > 1.4 * Math.abs(dy)) goStep(dx < 0 ? 1 : -1); };
    z.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    z.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t) end(t.clientX, t.clientY); }, { passive: true });
    z.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { x0 = e.clientX; y0 = e.clientY; } }, { passive: true });
    z.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(e.clientX, e.clientY); });
  }
  if (nav && hole) nav.swipe(hole, 'poeme');
  // (téléphone, une fois) l'objet esquisse le geste vers la page voisine
  if (nav) setTimeout(() => { if (innerWidth < 760 && root.scrollTop < 30 && !busyMode()) nav.nudge(); }, over ? 3600 : 4200);
  // pendant l'enveloppe et le paiement : la feuille
  new MutationObserver(() => { if (busyMode() && cur !== 0) { cur = 0; slideTxt(nbsp(OBJETS[0].txt), -1); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  setTimeout(() => show(0), over ? 700 : 900);
  // (11/10, Maxence) la petite flèche, sous la description : la page descend, du même défilement — l'étape suivante, à
  // son allure ; après la dernière, les autres prénoms (la suite de la page). Jamais un saut.
  const down = root.querySelector('.of-down');
  // (le haut des autres prénoms, juste sous le bandeau : la position dans la page, indépendante du défilement en cours)
  const exTop = () => { const r = root.querySelector('.of-rest'); return r ? r.offsetTop - 50 : storyLen(); };
  const toRest = () => { count('alt/autres'); driveTo(exTop(), Math.max(innerHeight * 1.4, 700)); };
  setTimeout(() => { down.dataset.shown = '1'; if (!busyMode()) down.classList.add('on'); }, over ? 1800 : 2400);
  down.addEventListener('click', () => {
    if (busyMode()) return;
    if (!(vit && story)) { toRest(); return; }
    const p = pOf(root.scrollTop);
    if (root.scrollTop >= storyLen() - 2 || p > N - 1.02) { toRest(); return; }
    goStep(1);
  });
  // en descendant : d'abord l'histoire (la scène reste en place), puis la feuille remonte avec la page
  const cv = () => document.querySelector('canvas.sc-c');
  let sRaf = 0;
  root.addEventListener('scroll', () => {
    if (!over || sRaf) return;
    sRaf = requestAnimationFrame(() => {
      sRaf = 0;
      if (root.classList.contains('paying') || busyMode()) return;
      const y = root.scrollTop, L = storyLen();
      // (passé l'histoire : la description et ses points s'effacent, ils ne restent pas sous le bandeau)
      root.classList.toggle('past', y > L + 30);
      // l'histoire suit le doigt : on descend, elle avance ; on remonte, elle rembobine (tout de suite)
      if (vit && story) { const p = pOf(Math.min(y, L)); vit.scrub(p); show(Math.round(p)); }
      const c = cv(); if (!c) return;
      c.style.transition = 'none'; c.style.transformOrigin = '50% 0';
      const off = Math.max(0, y - L);
      c.style.transform = off > 0 ? `translateY(${(-off).toFixed(1)}px)` : '';
      // (11/10) en montant, l'objet s'efface : aux autres prénoms, il ne reste qu'eux sous le bandeau
      c.style.opacity = off > 0 ? Math.max(0, 1 - off / (innerHeight * 0.5)).toFixed(3) : '';
    });
  }, { passive: true });
  // en faisant défiler : une ombre en haut, sous la flèche retour (elle ne passe plus sur le texte)
  root.addEventListener('scroll', () => root.classList.toggle('scrolled', root.scrollTop > storyLen() + 24), { passive: true });
  // (11/10) tout ce qui est souligné l'est par un bout de fil noir, cousu (stitch.js)
  stitch(root.querySelector('.of-bar .of-go'), { seed: 'RECEVOIR'.length * 13 });
  root.querySelector('.of-contact').addEventListener('click', () => import('../menu/contact.js').then(m => m.openContact({ base: './', name })));

  // gestes
  // l'enveloppe (10/10) : ouverte, la page s'efface sur elle ; adresse complète → le bandeau du paiement
  let inEnv = false;
  const go = root.querySelector('.of-go');
  const enterEnv = () => {
    inEnv = true; envAddr = null; count('alt/enveloppe');
    root.classList.add('env'); root.classList.remove('env-ready');
    root.scrollTo({ top: 0, behavior: 'smooth' });
    go.textContent = RESERVE ? 'RESERVER' : 'PAYER';
    const st = vit && vit.state();
    if (st && (st.vt > 0 || st.target > 0)) fadeJump(0, () => envelope.open()); else envelope.open();
  };
  const leaveEnv = () => { inEnv = false; envAddr = null; root.classList.remove('env', 'env-ready'); go.textContent = 'RECEVOIR'; };
  const back = () => {
    if (inEnv) { closePanel(); envelope.back(); leaveEnv(); return; }
    count('alt/retour'); onBack?.();
  };
  // (10/10, Maxence) RECEVOIR : directement le paiement (ou la réservation) — plus d'adresse sur l'enveloppe avant ;
  // l'enveloppe vient après, avec la cérémonie (l'adresse connue s'y tape seule, sinon on l'y écrit)
  go.addEventListener('click', () => {
    const st = vit && vit.state();
    if (st && (st.vt > 0 || st.target > 0)) { root.scrollTo({ top: 0 }); fadeJump(0, () => pay(name)); } else pay(name);
  });
  barWalletSetup(root, name);
  // (11/10) plus de retour au prénom (on peut toujours recharger la page) ; Échap défait seulement l'enveloppe
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.isConnected && inEnv) back(); });

  // l'entrée : la couche se pose sur le prénom seul, puis l'acrostiche se tape, puis la barre du prix
  count('alt/offre');
  void root.offsetWidth; setTimeout(() => root.classList.add('on'), 20);
  const shown = new Promise(res => setTimeout(res, 950));
  if (col) setTimeout(() => acrostic(col, name), 700);
  const letters = name.replace(/ /g, '').length;
  setTimeout(() => root.classList.add('bar-on'), over ? 700 : 900 + letters * 90 + 600);
  // payé : l'offre s'efface, la feuille reste seule (la suite se joue dessous)
  const hide = () => {
    root.classList.remove('bar-on');
    root.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { root.classList.remove('on'); root.style.pointerEvents = 'none'; }, 350);
    setTimeout(() => { root.remove(); document.body.classList.remove('of-open'); panel?.root.remove(); panel?.veil.remove(); panel = null; }, 1400);
  };
  // la scène dit où en est l'enveloppe : ouverte (on y écrit), adresse complète (on peut payer), refermée
  const onEnvelope = e => {
    if (!inEnv) return;
    if (e.closed) { leaveEnv(); return; }
    envAddr = e.canPost ? e.fields : null;
    root.classList.toggle('env-ready', !!e.canPost);
  };
  // (pour le bandeau des pages) l'objet de la page : la scène (ou la feuille dessinée) et sa description
  const stage = () => [sceneCv() || root.querySelector('.of-sheet'), root.querySelector('.of-cap')];
  return { root, shown, hide, onEnvelope, stage, storyLen, get top() { return root.scrollTop; } };
}
