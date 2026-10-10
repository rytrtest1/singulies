// Version alternative (10/10) : après le champ de prénoms, la feuille qui attend — l'acrostiche tapé, les vraies
// photos, le prix, COMMANDER (Stripe). La question vient après le paiement (merci.html), jamais avant.
import '../basique/basique.css';
import './offre.css';
import { acrostic } from '../basique/basique.js';
import { mountExemples } from './exemples.js';
import { count } from '../app/count.js';
import { PRIX, ENVOI, STRIPE, STRIPE_PK, PAIEMENT_URL, PHOTOS, FEUILLE_PHOTO, LIENS } from './config.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') !== '0';
const K_ORDER = 'singulies.order';
// (10/10) payé dans la page : alt.html enchaîne lui-même (la feuille se défait, la carte est tirée) ; sans lui (pas de
// WebGL2, ou Stripe a dû rediriger) : merci.html
let onPaidHere = null;
const readOrder = () => { try { return JSON.parse(localStorage.getItem(K_ORDER) || 'null'); } catch { return null; } };
const saveOrder = o => { try { localStorage.setItem(K_ORDER, JSON.stringify(o)); } catch { /* */ } };
const BACK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
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
  const s = Math.min(1, room / ((SHEET_Y1 - SHEET_Y0) * H)), T = SHEET_Y0 * H * s - 10;
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
function paidHere(name, ref, extra = {}) {
  const o = { ...(readOrder() || {}), name, ref, paid: true, ...extra };
  saveOrder(o);
  count('alt/paye');
  if (!onPaidHere) { location.href = merciUrl(extra.simule ? { simule: '1' } : {}); return; }
  closePanel();
  onPaidHere(o);
}
// Apple Pay / Google Pay dans le bandeau fermé : un toucher, sans rien ouvrir. Sans portefeuille (pas de carte
// enregistrée, navigateur d'Instagram, ordinateur sans Chrome…) : rien ne change, COMMANDER → le panneau (carte, PayPal).
let barWallet = '';   // '' : pas essayé · 'pending' : bouton créé, réponse attendue · 'yes' : dans le bandeau · 'no' : aucun
function barWalletSetup(root, name) {
  if (!(STRIPE_PK && PAIEMENT_URL) || Q.get('paiement') === 'faux') return;
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
      if (r && r.type === 'success') paidHere(name, ref, { session: r.session?.id || '', gift: !!readOrder()?.gift });
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
      <div class="of-pay-title"><span class="of-pay-sub">un poème à ton prénom</span>
        <span class="of-pay-p">${esc(PRIX)}, port compris · posté le ${esc(ENVOI)}</span></div>
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
      <p class="of-pay-legal">${fake ? 'paiement d’essai : rien n’est débité.<br>' : ''}paiement sécurisé par stripe.<br>un poème à ton prénom est fait pour toi : il ne peut être ni repris ni échangé.</p>
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
  // pour moi / pour offrir (10/10) : offert, le prénom écrit est le sien ; après le paiement, je demande comment l'écrire
  let gift = !!readOrder()?.gift;
  const setFor = g => {
    gift = g;
    root.querySelectorAll('[data-for]').forEach(b => { const on = (b.dataset.for === 'offrir') === g; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    root.querySelector('.of-pay-sub').textContent = g ? 'un poème à son prénom' : 'un poème à ton prénom';
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
    addrHost.innerHTML = ['prénom et nom', 'adresse', 'code postal', 'ville'].map(l => `<input class="of-pin of-fake-in" placeholder="${l}" aria-label="${l}">`).join('');
    pmHost.innerHTML = `<div class="of-fake-tabs"><span class="on">carte</span><span>apple pay</span><span>paypal</span></div>
      <input class="of-pin of-fake-in" placeholder="numéro de carte" aria-label="numéro de carte" inputmode="numeric">`;
    const upd = () => { go.disabled = !mailOk(mail.value); };
    mail.addEventListener('input', upd);
    go.addEventListener('click', () => { if (!go.disabled) paidNow({ simule: true }); });
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
        if (r && r.type === 'success') { paidNow({ session: r.session?.id || '' }); return; }
        if (r && r.type === 'error') msg(r.error?.message || 'le paiement n’est pas passé.');
      });
    } catch (e) { console.warn('portefeuille (panneau)', e); }   // jamais au détriment de la carte
    checkout.createShippingAddressElement().mount(addrHost);
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
      if (r && r.type === 'success') { paidNow({ session: r.session?.id || '' }); return; }
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

// opts : { name (capitales), onBack(), over (la vraie feuille est dessous, dans la scène des cartes) }
export function mountOffer({ name, onBack, over = false, onPaid = null }) {
  onPaidHere = onPaid;
  const root = document.createElement('div');
  root.id = 'offre'; root.className = 'of' + (over ? ' over' : '');
  root.innerHTML = `
    <button class="of-back" type="button" aria-label="Changer le prénom">${BACK_SVG}</button>
    <main>
      ${over ? '<div class="of-hole" aria-hidden="true"></div>' : '<div class="sheet of-sheet"><div class="ac empty" aria-hidden="true"></div></div>'}
      <p class="of-note">ces lignes n’existent pas encore.<br>je les tape pour toi, à la machine.${over ? '<br><span>la carte, je la retourne après ta commande.</span>' : ''}</p>
      <div class="of-rest">
      <section class="of-ex" aria-label="D’autres poèmes"><h2 class="of-h">d’autres prénoms, d’autres poèmes</h2><div class="of-ex-host"></div>
        <p class="of-ex-note">chacun avec la carte de sa question, glissée dans l’enveloppe.</p></section>
      <section class="of-vrai" aria-label="De vrais envois">
        <div class="of-track"></div>
        <div class="of-dots" aria-hidden="true"></div>
      </section>
      <ul class="of-what">
        <li>l’original : tapé une seule fois, à la machine, pour toi. pas une impression, pas une copie.</li>
        <li>une feuille A5 noire, ton prénom en colonne, signé de ma main à la machine.</li>
        <li>une carte du jeu glissée avec : ta question, ta réponse au dos.</li>
        <li>une enveloppe noire fermée à la cire, postée le ${esc(ENVOI)}.</li>
      </ul>
      <p class="of-after">juste après le paiement, je tire une carte pour toi. ta réponse sera le thème du poème — ou tu passes, et j’improvise sur ton prénom.</p>
      <p class="of-legal">paiement sécurisé par stripe · ton adresse à l’étape suivante.<br>un poème à ton prénom est fait pour toi : il ne peut être ni repris ni échangé.</p>
      <p class="of-gift">c’est pour offrir ? <button type="button" class="of-link" data-act="back">écris son prénom</button> à la place du tien, et dis-le au paiement : la personne pourra même répondre elle-même à sa question.</p>
      <footer class="of-foot">
        <a href="${esc(LIENS.jeu)}">le jeu</a> · <a href="${esc(LIENS.livres)}" target="_blank" rel="noopener">mes livres</a> · <a href="${esc(LIENS.instagram)}" target="_blank" rel="noopener">@e.t.ernel</a>
      </footer>
      </div>
    </main>
    <div class="of-shade" aria-hidden="true"></div>
    <div class="of-bar">
      <div class="of-price"><b>${esc(PRIX)}</b>, port compris<br><span>posté le ${esc(ENVOI)}</span></div>
      <button class="of-go" type="button">COMMANDER</button>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('of-open');

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
  // les photos
  const track = root.querySelector('.of-track'), dots = root.querySelector('.of-dots');
  for (const p of PHOTOS) track.appendChild(slide(p));
  const syncDots = () => {
    const n = track.children.length;
    root.querySelector('.of-vrai').hidden = n === 0;
    dots.innerHTML = n > 1 ? '<i></i>'.repeat(n) : '';
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  };
  track.addEventListener('scroll', () => requestAnimationFrame(syncDots), { passive: true });
  setTimeout(syncDots, 600); syncDots();

  // en faisant défiler : une ombre en haut, sous la flèche retour (elle ne passe plus sur le texte)
  root.addEventListener('scroll', () => root.classList.toggle('scrolled', root.scrollTop > 24), { passive: true });

  // gestes
  const back = () => { count('alt/retour'); onBack?.(); };
  root.querySelector('.of-back').addEventListener('click', back);
  root.querySelector('[data-act="back"]').addEventListener('click', back);
  root.querySelector('.of-go').addEventListener('click', () => pay(name));
  barWalletSetup(root, name);
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.isConnected) back(); });

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
  return { root, shown, hide };
}
