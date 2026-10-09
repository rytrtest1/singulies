// L'enveloppe (scène 3, extraite de sheet.js le 09/10) : ses mesures, le tableau de ses durées, ses champs, et
// l'encre qu'on y tape (destinataire, expéditeur, coup de tampon). La mise en scène reste dans sheet.js (même
// caméra, même lampe, même horloge que la feuille).
import { CARD } from '../cards/cardRenderer.js';
import { TYPE } from '../cards/ink.js';
import { createRng } from '../field/rng.js';
import { typeLines } from './typewriter.js';

// l'enveloppe (C5 noire, 229 × 162 mm, même papier) : poche ouverte en haut, rabat pointu. La carte se pose sur la
// feuille, la feuille pivote et se glisse dans la poche avec elle, l'enveloppe se retourne, rabat encore ouvert ;
// on tape l'adresse dessus, à la machine. POSTER : coup de tampon, elle se retourne, le rabat se ferme, le cachet
// s'écrase, puis elle bascule jusqu'à sa tranche (09/10 : le cachet vient du geste de la personne, plus avant).
export const ENV = { w: 229, h: 162, r: 0.8, t: 0.12 };
export const ENV_BACK_H = 155, FLAP_H = 78, ENV_Z = -3;
export const SEAL_D = 27, SEAL_K = 0.4, SEAL_IN = 8.6, SEAL_WOB = 0.085;   // cachet : diamètre (mm), logo ≈ 15 mm dans l'empreinte (rayon 8,6), bord ondulé
// (le dos monte presque jusqu'en haut — la poche : rien ne se voit à l'intérieur une fois fermée)

// ---- LE TABLEAU DES DURÉES (s) -----------------------------------------------------------------------------------
// Chaque étape : [nom, durée, décalage]. Elle commence à la fin de l'étape précédente + décalage (négatif : elles se
// chevauchent). Changer une durée décale tout ce qui suit. Résultat : nom → [début, fin].
function chain(steps) {
  let t = 0; const o = {};
  for (const [k, d, gap = 0] of steps) { const a = t + gap; o[k] = [a, a + d]; t = a + d; }
  return o;
}
// l'arrivée (horloge de l'enveloppe, déjà × 1,45 : SPEED dans sheet.js) — la feuille s'y glisse, elle se retourne
export const E = chain([
  ['fade', 0.7],             // la feuille (ou la commande) passe au second plan
  ['cam', 2.0, -0.6],        // la vue descend vers l'enveloppe
  ['rise', 1.7, -1.7],       // l'enveloppe monte du fond, sous la feuille
  ['cIn', 1.1, -0.8],        // la carte quitte le bord pour se poser sur la feuille
  ['rot', 1.05, -0.2],       // la feuille pivote (paysage), DEVANT la poche (ses coins balaient plus bas que le bord)
  ['drop', 0.3, -0.05],      // au-dessus de l'ouverture, elle passe derrière le devant de la poche
  ['slide', 1.25, -0.05],    // elle y descend (06/10 : elle traversait le devant de la poche en pivotant)
  ['flip', 1.4, 0.2],        // l'enveloppe se retourne (face adresse ; le rabat ouvert dépasse en haut)
  ['cam2', 1.8, -1.5],       // la vue s'approche du coin de l'expéditeur
]);
// le destinataire : là où on l'écrit sur une vraie enveloppe C5 — la zone de la fenêtre normalisée (20 mm du bord
// droit, 15 mm du bas, 100 × 45 mm) ; mm depuis le coin haut-gauche
export const ADDR = { x: 112, y: 107, lead: 6.35, lines: 5, chars: 34 };
// l'expéditeur, en haut à gauche (08/10) : tapé à la machine pendant que l'enveloppe se retourne, vue rapprochée
export const SENDER = { x: 14, y: 17, lead: 5.4, lines: ['@e.t.ernel', 'SINGULIES', 'Paris'] };
const S_AT = E.flip[0] + 1.25, S_CH = 0.055, S_NL = 0.28;      // début (horloge de l'enveloppe), par caractère, par ligne
const S_LEN = SENDER.lines.reduce((n, l) => n + l.length + 1, 0);
const S_END = S_AT + SENDER.lines.join('').length * S_CH + (SENDER.lines.length - 1) * S_NL;
E.cam3 = [S_END + 0.35, S_END + 1.75]; E.write = S_END + 1.75;  // puis la vue va à l'adresse ; on peut écrire
// caractères de l'expéditeur déjà tapés (espaces de fin de ligne compris), à l'instant ev
export function senderCount(ev) {
  let t = ev - S_AT, n = 0;
  if (t < 0) return 0;
  for (const l of SENDER.lines) {
    const k = Math.min(l.length, Math.floor(t / S_CH) + 1);
    if (t < l.length * S_CH) return n + Math.max(0, k);
    n += l.length + 1; t -= l.length * S_CH + S_NL;
    if (t < 0) return n;
  }
  return S_LEN;
}
// envoyée (08/10, réordonné le 09/10) : un coup de tampon blanc (le logo SS-cœur dans un cercle) dans le coin
// haut-droit de l'adresse, jamais incliné pareil ; l'enveloppe se retourne (le dos, rabat ouvert), le rabat se ferme,
// le cachet de cire tombe et s'écrase sur sa pointe ; puis elle bascule jusqu'à ne plus montrer que sa tranche
// inférieure, comme glissée dans une boîte aux lettres ; la tranche devient le champ de l'email (mount.js) et le reste
// se fond dans le noir. Horloge propre (s), réversible (le retour défait tout) jusqu'à ce que la tranche soit le champ.
export const STAMP = { x: 31, y: 27, r: 12.5, logo: 16.5 };   // tampon : centre (mm, depuis le coin haut-droit), rayon, logo
export const PO = chain([
  ['cam', 1.1],              // la vue recule jusqu'à l'enveloppe entière (le coup de tampon tombe à PO.hit)
  ['turn', 1.2, 0.5],        // elle se retourne : le dos, rabat ouvert
  ['flap', 0.9, 0.1],        // le rabat se ferme
  ['seal', 0.6, -0.05],      // le cachet de cire tombe et s'écrase sur sa pointe
  ['tip', 1.2, 0.25],        // elle bascule jusqu'à ne plus montrer que sa tranche
  ['away', 1.4, 0.05],       // la tranche seule : elle avance dans la fente (rétrécit jusqu'à MAIL_W px)
]);
PO.hit = 0.75;                                                 // le coup de tampon (pendant le recul de la vue)
PO.end = PO.tip[1];                                            // la tranche est devenue le champ de l'email
PO.fade = [PO.away[1] - 0.3, PO.away[1] + 0.7];                // puis l'enveloppe se fond, la ligne reste
export const MAIL_W = 190;
// l'adresse en champs (06/10, Maxence : « clarifier le moment de l'adresse ») : chacun sa ligne, son invitation
// tapée en léger tant qu'il est vide ; Entrée = le champ suivant. Destinataire en bas à droite, expéditeur (email,
// téléphone : demandés après). POSTER dès que nom, adresse, code postal et ville sont là.
export const FIELDS = [
  { id: 'nom', hint: 'prénom nom', zone: 'addr', line: 0, chars: 34, req: true, ac: 'name', im: 'text', cap: 'words', label: 'Prénom et nom' },
  { id: 'rue', hint: 'adresse', zone: 'addr', line: 1, chars: 34, req: true, ac: 'address-line1', im: 'text', cap: 'words', label: 'Adresse' },
  { id: 'cplt', hint: 'complément', zone: 'addr', line: 2, chars: 34, ac: 'address-line2', im: 'text', cap: 'words', label: "Complément d'adresse (facultatif)" },
  // 08/10 : la ville d'abord, le code postal en dernier
  { id: 'ville', hint: 'ville', zone: 'addr', line: 3, chars: 34, req: true, ac: 'address-level2', im: 'text', cap: 'words', label: 'Ville' },
  { id: 'cp', hint: 'code postal', zone: 'addr', line: 4, chars: 10, req: true, ac: 'postal-code', im: 'numeric', cap: 'none', label: 'Code postal' },
];
// (06/10 : l'email ou le téléphone ne sont plus sur l'enveloppe — demandés après, sur le noir, « pour te tenir au
// courant » : mount.js)
export const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());
export const telOk = v => (v || '').replace(/\D/g, '').length >= 8 && /^[\d\s+().-]+$/.test((v || '').trim());
export const fieldsReady = f => FIELDS.every(d => !d.req || (f[d.id] || '').trim());
// ce qui part (email, lien, PDF) : les lignes de l'adresse et le moyen de joindre
export const fieldsOut = f => ({
  address: [f.nom, f.rue, f.cplt, [f.cp, f.ville].filter(x => (x || '').trim()).join(' ')].map(x => (x || '').trim()).filter(Boolean),
  email: emailOk(f.email) ? f.email.trim() : '', tel: telOk(f.tel) ? f.tel.trim() : '',
  contact: [emailOk(f.email) ? f.email.trim() : '', telOk(f.tel) ? f.tel.trim() : ''].filter(Boolean).join(' · '),
});

// pour joindre la personne : son email ou son numéro (tapé par elle) ; tant qu'il est vide, l'invitation est
// tapée en léger (encre à peine posée)
export const CONTACT_HINT = 'ton email ou ton numéro';
export const CONTACT = { x: 12, y: 22, chars: 30 };          // l'expéditeur, en haut à gauche de l'enveloppe (mm)
export const contactOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || (v.replace(/\D/g, '').length >= 8 && /^[\d\s+().-]+$/.test(v.trim()));
export const cleanContact = v => v.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' ').slice(0, CONTACT.chars);

// encre de l'enveloppe (face, 10 px/mm) : l'expéditeur (email ou numéro) en haut à gauche, l'adresse en bas à droite
const ENV_PX = 10;
// l'enveloppe à remplir : chaque champ sur sa ligne, son invitation en léger tant qu'il est vide ; curseur au champ actif
export const fieldPos = d => d.zone === 'addr' ? { x: ADDR.x, y: ADDR.y + d.line * ADDR.lead } : { x: CONTACT.x, y: CONTACT.y + d.line * ADDR.lead };
// l'expéditeur seul, dans sa zone (pour le taper lettre à lettre sans refaire toute l'encre de l'enveloppe)
const S_BOX = { x: SENDER.x - 3, y: SENDER.y - 6, w: 12 * TYPE.pitch + 8, h: 2 * SENDER.lead + 10 };
export function senderInk(seed, n) {
  const PX = ENV_PX, cv = new OffscreenCanvas(Math.round(S_BOX.w * PX), Math.round(S_BOX.h * PX)), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  cx.translate(-Math.round(S_BOX.x * PX), -Math.round(S_BOX.y * PX));
  typeLines(cx, PX, SENDER.lines, SENDER.x, SENDER.y, SENDER.lead, seed + 53, 0.9, '#fff', n);
  return { canvas: cv, x: Math.round(S_BOX.x * PX), y: Math.round(S_BOX.y * PX) };
}
// un coup de tampon : encre blanche inégale (appui plus fort d'un côté, manques, grain du papier qui ne prend pas)
export function stampInk(cx, PX, mask, x, y, rot, seed) {
  const r = createRng(seed >>> 0), S = Math.ceil(2 * (STAMP.r + 1.5) * PX), c = new OffscreenCanvas(S, S), g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff'; g.lineWidth = 0.55 * PX;
  g.beginPath(); g.arc(0, 0, STAMP.r * PX, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 0.28 * PX;
  g.beginPath(); g.arc(0, 0, (STAMP.r - 1.3) * PX, 0, Math.PI * 2); g.stroke();
  const L = STAMP.logo / 0.62 * PX;                              // le logo occupe ≈ 62 % de son carré
  g.drawImage(mask, -L / 2, -L / 2, L, L);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // appui inégal : un côté du tampon plus chargé que l'autre
  const a = r() * Math.PI * 2, gr = g.createLinearGradient(S / 2 - Math.cos(a) * S / 2, S / 2 - Math.sin(a) * S / 2, S / 2 + Math.cos(a) * S / 2, S / 2 + Math.sin(a) * S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,' + r.range(0.45, 0.65) + ')'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // manques : quelques taches plus pâles, et le grain du papier où l'encre ne prend pas
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const px = r() * S, py = r() * S, rr = r.range(1.5, 5) * PX, q = g.createRadialGradient(px, py, 0, px, py, rr);
    q.addColorStop(0, 'rgba(0,0,0,' + r.range(0.25, 0.6) + ')'); q.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = q; g.fillRect(px - rr, py - rr, 2 * rr, 2 * rr);
  }
  for (let i = 0; i < 520; i++) {
    g.fillStyle = 'rgba(0,0,0,' + r.range(0.4, 1) + ')';
    g.beginPath(); g.arc(r() * S, r() * S, r.range(0.08, 0.3) * PX, 0, Math.PI * 2); g.fill();
  }
  cx.save(); cx.globalCompositeOperation = 'lighter'; cx.translate(x * PX, y * PX); cx.rotate(rot);
  cx.drawImage(c, -S / 2, -S / 2); cx.restore();
}
// stamp : { mask, rot, dx, dy, seed } — le coup de tampon, une fois l'enveloppe envoyée ; alors les noms des champs
// restés vides ne se voient plus (le formulaire est rempli)
// hints : invitations propres à cette enveloppe (09/10 : « Léa nom » au lieu de « prénom nom »)
export function fieldsInk(f, seed, active, stamp = null, senderN = Infinity, hints = {}) {
  const PX = ENV_PX, cv = new OffscreenCanvas(Math.round(ENV.w * PX), Math.round(ENV.h * PX)), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  let cursor = null;
  FIELDS.forEach((d, k) => {
    const v = f[d.id] || '', p = fieldPos(d);
    // un vrai formulaire tapé à la machine : chaque champ souligné (on voit où écrire), son nom lisible tant qu'il
    // est vide (06/10 : à 0,42 l'encre ne prenait plus, on ne savait pas quoi écrire)
    typeLines(cx, PX, ['_'.repeat(Math.min(d.chars, 30))], p.x, p.y + 0.9, 0, seed + k * 31 + 7, 0.78);
    // le nom du champ : frappé comme le reste, mais d'une encre nettement plus pâle que ce qu'on y tape (08/10 ; rouge
    // seul dans la carte d'encre = encre pâle, cardRenderer)
    if (v || !stamp) typeLines(cx, PX, [v || hints[d.id] || d.hint], p.x, p.y, 0, seed + k * 31, 1, v ? '#fff' : '#f00');
    if (d.id === active) cursor = { x: p.x + v.length * TYPE.pitch - 0.35, y: p.y };
  });
  typeLines(cx, PX, SENDER.lines, SENDER.x, SENDER.y, SENDER.lead, seed + 53, 0.9, '#fff', senderN);
  if (stamp) stampInk(cx, PX, stamp.mask, ENV.w - STAMP.x + stamp.dx, STAMP.y + stamp.dy, stamp.rot, stamp.seed);
  return { canvas: cv, cursor: cursor || { x: ADDR.x, y: ADDR.y } };
}
export function addressInk(text, seed, contact = '', zone = 'addr') {
  const PX = ENV_PX, Wc = Math.round(ENV.w * PX), Hc = Math.round(ENV.h * PX);
  const cv = new OffscreenCanvas(Wc, Hc), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, Wc, Hc);
  const lines = text.split('\n');
  typeLines(cx, PX, lines, ADDR.x, ADDR.y, ADDR.lead, seed);
  typeLines(cx, PX, [contact || CONTACT_HINT], CONTACT.x, CONTACT.y, 0, seed + 17, contact ? 1 : 0.72);
  const last = lines[lines.length - 1] || '';
  const cursor = zone === 'contact'
    ? { x: CONTACT.x + contact.length * TYPE.pitch - 0.35, y: CONTACT.y }
    : { x: ADDR.x + last.length * TYPE.pitch - 0.35, y: ADDR.y + (lines.length - 1) * ADDR.lead };
  return { canvas: cv, cursor };
}

// encre d'une carte « en direct » retournée : l'email ou le numéro, centré (24 px/mm, comme les cartes)
export function contactCardInk(contact, seed) {
  const PX = 24, Wc = Math.round(CARD.w * PX), Hc = Math.round(CARD.h * PX);
  const cv = new OffscreenCanvas(Wc, Hc), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, Wc, Hc);
  const t = contact || CONTACT_HINT, x0 = (CARD.w - t.length * TYPE.pitch) / 2;
  typeLines(cx, PX, [t], x0, CARD.h / 2 + 1.2, 0, seed, contact ? 1 : 0.72);
  return { canvas: cv, cursor: { x: x0 + contact.length * TYPE.pitch - 0.35, y: CARD.h / 2 + 1.2 } };
}
