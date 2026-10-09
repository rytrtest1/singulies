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
export const SEAL_D = 27, SEAL_K = 0.35, SEAL_IN = 8.8, SEAL_WOB = 0.055;   // cachet : diamètre (mm), logo ≈ 15 mm dans l'empreinte (rayon 10,2 : ≈ 75 % du cachet, d'après la référence du 09/10), bord à 5–6 lobes
// le cachet : matière (argent sombre, satiné, grainé) et forme (réglées le 09/10 ; banc : cachet.html)
export const SEAL_LOOK0 = { lightR: 150, metal: 0.4, albedo: 0.085, env: 0.065, rough: 0.38, spec: 2.0, sheen: 0.15, glint: 0.7, grain: 0.8, fiber: 0.012, envSpec: 1.2, h: 0.2, b: 0.28, foot: 0.65, footW: 0.12, crease: 0.08, edge: 0, diffRough: 0.4 };   // cire à pigment argenté (pas un métal) ; lightR : reflet d'une source moyenne
// envAz : direction de la lampe sur l'enveloppe (en haut à gauche : le relief se lit bombé) ; lamp : sa distance (× cartes)
export const SEAL_SHAPE0 = { hd: 0.35, hc: 1.1, crest: 0.45, ring: 0.09, offX: 0, offY: 0, coule: 0.7, peau: 0.02, pits: 0.5, cavWall: 0.7, cavEdge: 0.15, ao: 0.1, aoW: 0.8, marbre: 1.4, envAz: -0.8, lamp: 1.3, film: 0.8, sss: 0.65 };   // film : épaisseur (mm) sous laquelle la cire est translucide ; sss : diffusion dans la cire
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
export const STAMP = { x: 31, y: 27, r: 12.5, logo: 13.5 };   // tampon : centre (mm, depuis le coin haut-droit), rayon, logo
export const PO = chain([
  ['cam', 1.1],              // la vue recule jusqu'à l'enveloppe entière
  // (09/10, Maxence : plus de coup de tampon — on passe directement au cachet)
  ['turn', 1.2, -0.45],      // elle se retourne (la vue finit de reculer) : le dos, rabat ouvert
  ['flap', 0.9, 0.1],        // le rabat se ferme
  ['seal', 1.5, -0.05],      // le cachet se fait sur la pointe (la vue s'en est approchée) : la cire est là, le sceau appuie, elle refroidit
  ['zoomOut', 1.0, 0.7],     // on le regarde un instant, puis la vue recule jusqu'à l'enveloppe entière (cadrage de la tranche)
  ['tip', 1.2, 0.05],        // elle bascule jusqu'à ne plus montrer que sa tranche
  ['away', 1.4, 0.05],       // la tranche seule : elle avance dans la fente (rétrécit jusqu'à MAIL_W px)
]);
PO.zoomIn = [PO.flap[0] + 0.2, PO.flap[1] + 0.05];              // la vue s'approche du cachet pendant que le rabat se ferme
// sans tampon (STAMPED false) : à cet instant, l'enveloppe vue par la tranche, les noms des champs restés vides s'effacent
export const STAMPED = false;
PO.hit = (PO.turn[0] + PO.turn[1]) / 2;
PO.end = PO.tip[1];                                            // la tranche est devenue le champ de l'email
PO.fade = [PO.away[1] - 0.3, PO.away[1] + 0.7];                // puis l'enveloppe se fond, la ligne reste
export const MAIL_W = 190;
// l'adresse en champs (06/10, Maxence : « clarifier le moment de l'adresse ») : chacun sa ligne, son invitation
// tapée en léger tant qu'il est vide ; Entrée = le champ suivant. Destinataire en bas à droite, expéditeur (email,
// téléphone : demandés après). POSTER dès que nom, adresse, code postal et ville sont là.
export const FIELDS = [
  // 09/10 : la ligne du destinataire en deux champs côte à côte — le prénom déjà écrit (celui du poème, accentué ;
  // on peut le changer), et le nom à côté ; col : décalage sur la ligne (en frappes)
  { id: 'prenom', hint: 'prénom', zone: 'addr', line: 0, col: 0, chars: 15, req: true, ac: 'given-name', im: 'text', cap: 'words', label: 'Prénom' },
  { id: 'nom', hint: 'nom', zone: 'addr', line: 0, col: 16, chars: 14, req: true, ac: 'family-name', im: 'text', cap: 'words', label: 'Nom' },
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
  address: [[f.prenom, f.nom].map(x => (x || '').trim()).filter(Boolean).join(' '), f.rue, f.cplt, [f.cp, f.ville].filter(x => (x || '').trim()).join(' ')].map(x => (x || '').trim()).filter(Boolean),
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
export const fieldPos = d => d.zone === 'addr' ? { x: ADDR.x + (d.col || 0) * TYPE.pitch, y: ADDR.y + d.line * ADDR.lead } : { x: CONTACT.x, y: CONTACT.y + d.line * ADDR.lead };
// l'expéditeur seul, dans sa zone (pour le taper lettre à lettre sans refaire toute l'encre de l'enveloppe)
const S_BOX = { x: SENDER.x - 3, y: SENDER.y - 6, w: 12 * TYPE.pitch + 8, h: 2 * SENDER.lead + 10 };
export function senderInk(seed, n) {
  const PX = ENV_PX, cv = new OffscreenCanvas(Math.round(S_BOX.w * PX), Math.round(S_BOX.h * PX)), cx = cv.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
  cx.translate(-Math.round(S_BOX.x * PX), -Math.round(S_BOX.y * PX));
  typeLines(cx, PX, SENDER.lines, SENDER.x, SENDER.y, SENDER.lead, seed + 53, 0.9, '#fff', n);
  return { canvas: cv, x: Math.round(S_BOX.x * PX), y: Math.round(S_BOX.y * PX) };
}
// un coup de tampon (09/10, refait) : encre blanche sur papier noir — l'encre s'accumule au bord des traits (le
// caoutchouc l'écrase vers l'extérieur), le centre des pleins est plus pâle ; appui inégal (un côté peut presque
// manquer) ; elle ne prend que sur les fibres du papier (grain étiré, pas des points ronds) ; parfois un léger doublé
export function stampInk(cx, PX, mask, x, y, rot, seed) {
  const r = createRng(seed >>> 0), S = Math.ceil(2 * (STAMP.r + 1.5) * PX), c = new OffscreenCanvas(S, S), g = c.getContext('2d', { willReadFrequently: true });
  const shape = () => {
    g.strokeStyle = '#fff'; g.lineWidth = 0.6 * PX;
    g.beginPath(); g.arc(0, 0, STAMP.r * PX, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 0.25 * PX;
    g.beginPath(); g.arc(0, 0, (STAMP.r - 1.25) * PX, 0, Math.PI * 2); g.stroke();
    const L = STAMP.logo / 0.62 * PX;                            // le logo occupe ≈ 62 % de son carré
    g.drawImage(mask, -L / 2, -L / 2, L, L);
  };
  g.translate(S / 2, S / 2); shape();
  const A = g.getImageData(0, 0, S, S).data;                     // la forme nette
  // la forme adoucie : pour savoir où l'on est au bord d'un trait, où au milieu d'un plein (flou fait à la main :
  // ctx.filter n'existe pas sur Safari avant iOS 18)
  const B = new Float32Array(S * S), tmp = new Float32Array(S * S), R = Math.max(1, Math.round(0.35 * PX));
  for (let k = 0; k < S * S; k++) B[k] = A[k * 4 + 3] / 255;
  for (let pass = 0; pass < 2; pass++) {
    for (let yy = 0; yy < S; yy++) { let acc = 0; for (let xx = -R; xx < S + R; xx++) { if (xx + R < S && xx + R >= 0) acc += B[yy * S + xx + R]; if (xx - R - 1 >= 0 && xx - R - 1 < S) acc -= B[yy * S + xx - R - 1]; if (xx >= 0 && xx < S) tmp[yy * S + xx] = acc / (2 * R + 1); } }
    for (let xx = 0; xx < S; xx++) { let acc = 0; for (let yy = -R; yy < S + R; yy++) { if (yy + R < S && yy + R >= 0) acc += tmp[(yy + R) * S + xx]; if (yy - R - 1 >= 0 && yy - R - 1 < S) acc -= tmp[(yy - R - 1) * S + xx]; if (yy >= 0 && yy < S) B[yy * S + xx] = acc / (2 * R + 1); } }
  }
  // bruit doux (valeurs sur une grille, interpolées) ; étiré pour les fibres
  const grid = (n) => { const a = new Float32Array((n + 1) * (n + 1)); for (let k = 0; k < a.length; k++) a[k] = r(); return a; };
  const noise = (G, n, u, v) => { u = Math.max(0, Math.min(n - 1e-3, u)); v = Math.max(0, Math.min(n - 1e-3, v));
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv), w = n + 1;
    return (G[j * w + i] * (1 - su) + G[j * w + i + 1] * su) * (1 - sv) + (G[(j + 1) * w + i] * (1 - su) + G[(j + 1) * w + i + 1] * su) * sv; };
  const nP = 6, nF = 90, nM = 22, GP = grid(nP), GF = grid(nF), GM = grid(nM);
  const pa = r() * Math.PI * 2, pc = Math.cos(pa), ps = Math.sin(pa), lo = r.range(0.42, 0.65);   // côté qui a moins appuyé
  const fa = r() * Math.PI, fc = Math.cos(fa), fs = Math.sin(fa);                                  // sens des fibres
  const out = g.createImageData(S, S), O = out.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const k = (yy * S + xx) * 4, a = A[k + 3] / 255;
    if (a < 0.01) continue;
    const b = B[k >> 2], u = xx / S, v = yy / S;
    // bord des traits : là où la forme nette dépasse la forme adoucie (l'encre y est plus dense)
    const edge = Math.max(0, Math.min(1, (a - b) * 3 + (1 - b) * 0.6));
    // appui : un dégradé franc d'un côté à l'autre, ondulé
    const t = ((u - 0.5) * pc + (v - 0.5) * ps) * 1.7 + (noise(GP, nP, u * nP, v * nP) - 0.5) * 0.9;
    const press = Math.max(0, Math.min(1, lo + (1 - lo) * (0.5 + t)));
    // fibres : bruit fin étiré dans un sens ; l'encre ne prend que sur leurs sommets
    const fu2 = (u * fc + v * fs) * nF * 0.35, fv2 = (-u * fs + v * fc) * nF;
    const fib = noise(GF, nF, ((fu2 % nF) + nF) % nF, ((fv2 % nF) + nF) % nF);
    const mott = noise(GM, nM, u * nM, v * nM);
    // (09/10 : plus proche de l'encre tapée — trait plein et net, appui qui varie doucement ; les fibres ne mordent
    // que là où le tampon a vraiment moins appuyé)
    let ink = a * (0.84 + 0.16 * edge) * (0.88 + 0.12 * mott) * (0.64 + 0.36 * press);
    const thr = (1 - press) * 0.5 - edge * 0.15;
    ink *= Math.max(0, Math.min(1, (fib - thr) * 4 + 0.8));
    const val = Math.max(0, Math.min(1, ink)) * 0.95;
    O[k] = O[k + 1] = O[k + 2] = 255; O[k + 3] = Math.round(val * 255);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.putImageData(out, 0, 0);
  cx.save(); cx.globalCompositeOperation = 'lighter'; cx.translate(x * PX, y * PX); cx.rotate(rot);
  cx.drawImage(c, -S / 2, -S / 2);
  // parfois le tampon a glissé : un doublé très pâle, décalé de quelques dixièmes de millimètre
  if (r() < 0.45) { const d = r.range(0.25, 0.5) * PX, da = r() * Math.PI * 2; cx.globalAlpha = r.range(0.12, 0.22); cx.drawImage(c, -S / 2 + Math.cos(da) * d, -S / 2 + Math.sin(da) * d); }
  cx.restore();
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
  if (stamp && !stamp.off) stampInk(cx, PX, stamp.mask, ENV.w - STAMP.x + stamp.dx, STAMP.y + stamp.dy, stamp.rot, stamp.seed);
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

// un cachet n'est jamais le même (09/10) : le bord, le côté où la cire a coulé (décentrage de l'empreinte, jusqu'à
// « coule » mm), le bourrelet, le sens de l'inclinaison — tirés une fois ; le logo reste droit
export function sealDraw(rnd, coule = SEAL_SHAPE0.coule) {
  const a = rnd() * Math.PI * 2, m = coule * (0.45 + 0.55 * rnd());
  return { wobPhase: rnd() * Math.PI * 2, crest: rnd() * Math.PI * 2, tilt: rnd() * Math.PI * 2, offX: m * Math.cos(a), offY: m * Math.sin(a) };
}

// la pose du cachet (u : 0 → 1, sur PO.seal) : la cire liquide brille (lisse, reflet net), puis refroidit et prend son
// aspect satiné ; l'empreinte (logo, double filet) et la peau n'apparaissent qu'avec la pression
// sur l'enveloppe, la pose commence à la pression (Maxence 09/10 : la flaque qui coule avant n'est pas réaliste) :
// u (0 → 1 sur PO.seal) → forme 0,42 → 1
export const SEAL_PRESS0 = 0.42;
export function sealForm(u, look, shape) {
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const press = ss(0.5, 0.8, u), cool = ss(0.55, 1, u);
  const L = { ...look, rough: look.rough + (0.12 - look.rough) * (1 - cool), spec: look.spec + (4 - look.spec) * (1 - cool),
    env: look.env + (0.09 - look.env) * (1 - cool), h: look.h * press, crease: look.crease * press, grain: look.grain * cool, glint: look.glint * cool };
  return { form: u, look: L, ring: shape.ring * press, peau: shape.peau * cool, pits: shape.pits * cool, cavWall: shape.cavWall * press };
}

// l'enveloppe pleine (09/10) : un léger bombé (la feuille et la carte dedans ; bulge 0 → 1) et l'ombre fine sous le bord
// des rabats (closed : le rabat du haut fermé, 0 → 1) — ce que chaque pièce reçoit (cardRenderer : uPillow, uTriA/B)
export const ENV_BULGE = 1.2, FLAP_SH = 0.38, FOLD_W = 2.5;
export function envPieces(bulge, closed) {
  const A = ENV_BULGE * bulge, c2 = closed * closed;
  const flapTri = [FLAP_SH * c2, ENV.h / 2, ENV.h / 2 - FLAP_H, ENV.w / 2], botTri = [FLAP_SH, -ENV.h / 2, -ENV.h / 2 + ENV.h * 0.58, ENV.w / 2];
  const sy = ENV.h / 2 - FLAP_H + 7, wSeal = 1 - (sy / (ENV.h / 2)) ** 2;
  return {
    front: { pillow: [A, 0, 1, -1] },
    // les bords : le dos (à 1,6–1,9 mm de la face) s'y referme en pli arrondi sur les 2,5 derniers mm (côtés, bas ; le rabat
    // fermé, en haut) — sans cela on voyait deux feuilles plates séparées par une fente
    back: { pillow: [A, -(ENV.h - ENV_BACK_H) / 2, 1, 1], triA: flapTri, triB: botTri, foldZ: [1.4, FOLD_W] },
    bot: { pillow: [A, 0, 1, 1], triA: flapTri, foldZ: [1.54, FOLD_W] },
    flap: { pillow: [A * c2, ENV.h / 2 - FLAP_H / 2, -1, -1], foldZ: [1.7 * c2, FOLD_W] },
    sealDz: A * c2 * wSeal,                                      // le cachet monte avec le rabat bombé
  };
}
