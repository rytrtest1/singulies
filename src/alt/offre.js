// Version alternative (10/10) : après le champ de prénoms, la feuille qui attend — l'acrostiche tapé, les vraies
// photos, le prix, COMMANDER (Stripe). La question vient après le paiement (merci.html), jamais avant.
import '../basique/basique.css';
import './offre.css';
import { acrostic } from '../basique/basique.js';
import { count } from '../app/count.js';
import { PRIX, ENVOI, STRIPE, PHOTOS, FEUILLE_PHOTO, LIENS } from './config.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') !== '0';
const K_ORDER = 'singulies.order';
const BACK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// le paiement : le prénom part dans client_reference_id (A–Z, chiffres, - et _), et reste ici pour merci.html
export function orderRef(name) {
  const r = Math.random().toString(36).slice(2, 8);
  return (name.replace(/[^A-Z ]/g, '').trim().replace(/ +/g, '_') || 'X') + '-' + r;
}
function pay(name) {
  const ref = orderRef(name);
  try { localStorage.setItem(K_ORDER, JSON.stringify({ name, ref, at: Date.now() })); } catch { /* */ }
  count('alt/commander');
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
  const img = new Image(); img.alt = p.alt; img.decoding = 'async'; img.loading = 'lazy';
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

// opts : { name (capitales), onBack() }
export function mountOffer({ name, onBack }) {
  const root = document.createElement('div');
  root.id = 'offre'; root.className = 'of';
  root.innerHTML = `
    <button class="of-back" type="button" aria-label="Changer le prénom">${BACK_SVG}</button>
    <main>
      <div class="sheet of-sheet"><div class="ac empty" aria-hidden="true"></div></div>
      <p class="of-note">ces lignes n’existent pas encore.<br>je les tape pour toi, à la machine.</p>
      <section class="of-vrai" aria-label="De vrais envois">
        <div class="of-track"></div>
        <div class="of-dots" aria-hidden="true"></div>
      </section>
      <ul class="of-what">
        <li>une feuille A5 noire, ton prénom en colonne, chaque vers tapé à la machine.</li>
        <li>une carte du jeu glissée avec : ta question, ta réponse au dos.</li>
        <li>une enveloppe noire fermée à la cire, postée le ${esc(ENVOI)}.</li>
      </ul>
      <p class="of-after">juste après le paiement, je tire une carte pour toi. ta réponse sera le thème du poème — ou tu passes, et j’improvise sur ton prénom.</p>
      <p class="of-legal">paiement sécurisé par stripe · ton adresse à l’étape suivante.<br>un poème à ton prénom est fait pour toi : il ne peut être ni repris ni échangé.</p>
      <p class="of-gift">c’est pour offrir ? <button type="button" class="of-link" data-act="back">écris son prénom</button> à la place du tien, et son adresse au paiement.</p>
      <footer class="of-foot">
        <a href="${esc(LIENS.jeu)}">le jeu</a> · <a href="${esc(LIENS.livres)}" target="_blank" rel="noopener">mes livres</a> · <a href="${esc(LIENS.instagram)}" target="_blank" rel="noopener">@e.t.ernel</a>
      </footer>
    </main>
    <div class="of-bar">
      <div class="of-price"><b>${esc(PRIX)}</b>, port compris<br><span>posté le ${esc(ENVOI)}</span></div>
      <button class="of-go" type="button">COMMANDER</button>
    </div>`;
  document.body.appendChild(root);
  document.body.classList.add('of-open');

  // la feuille : dessinée par le moteur, ou une vraie feuille photographiée (FEUILLE_PHOTO)
  const sheet = root.querySelector('.of-sheet'), col = root.querySelector('.ac');
  if (FEUILLE_PHOTO) {
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

  // gestes
  const back = () => { count('alt/retour'); onBack?.(); };
  root.querySelector('.of-back').addEventListener('click', back);
  root.querySelector('[data-act="back"]').addEventListener('click', back);
  root.querySelector('.of-go').addEventListener('click', () => pay(name));
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.isConnected) back(); });

  // l'entrée : la couche se pose sur le prénom seul, puis l'acrostiche se tape, puis la barre du prix
  count('alt/offre');
  void root.offsetWidth; setTimeout(() => root.classList.add('on'), 20);
  const shown = new Promise(res => setTimeout(res, 950));
  setTimeout(() => acrostic(col, name), 700);
  const letters = name.replace(/ /g, '').length;
  setTimeout(() => root.classList.add('bar-on'), 900 + letters * 90 + 600);
  return { root, shown };
}
