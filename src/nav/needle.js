// L'aiguille du bandeau (12/10, Maxence : « discrète, réaliste, et qu'on voie le fil bouger ») : une aiguille fine,
// couchée sur le fil, presque à plat, la pointe vers le bord (là où l'on va), dessinée de la même main que le fil
// (stitch.js) — acier sombre, une seule ligne de lumière, une ombre fine ; le fil entre dans le chas, un petit bout
// ressort et pend. Au repos, rien d'autre qu'un éclat très rare qui glisse sur la tige. Les gestes (tirer, le fil qui se
// tend, coulisse, les noms qui suivent) sont menés par nav.js : ici, seulement le dessin.
export const NEEDLE_LEN = 22;          // longueur (px)
export const NEEDLE_GAP = 12;          // de la pointe au bord de l'écran, au repos (px)
const TH = 1.45;                       // épaisseur au chas (px)
const TILT = 0.045;                    // presque à plat : la pointe à peine plus bas (rad)

// le point du chas où entre le fil (tip : la pointe [x, y] ; side : +1 pointe vers la droite, −1 vers la gauche)
export function needleEye(tip, side) {
  const c = Math.cos(TILT), s = Math.sin(TILT);
  return [tip[0] - side * c * (NEEDLE_LEN - 3.3), tip[1] - s * (NEEDLE_LEN - 3.3)];
}

// x : contexte 2D (px CSS) ; a : opacité ; glint ∈ [0, 1] (l'éclat le long de la tige) ou < 0
export function drawNeedle(x, tip, side, a = 1, glint = -1) {
  if (a <= 0.01) return;
  const c = Math.cos(TILT), s = Math.sin(TILT), ux = side * c, uy = s;
  // u : 0 au bout du chas → NEEDLE_LEN à la pointe ; v : vers le haut de l'écran
  const at = (u, v) => [tip[0] - ux * (NEEDLE_LEN - u) + s * v * side, tip[1] - uy * (NEEDLE_LEN - u) - c * v];
  // demi-épaisseur : la tête arrondie, la tige, la pointe effilée
  const hw = u => (u < 0.8 ? TH / 2 * Math.sqrt(Math.max(0, u / 0.8)) : u < 14 ? TH / 2 - 0.12 * (u / 14) : (TH / 2 - 0.12) * Math.pow(Math.max(0, (NEEDLE_LEN - u) / (NEEDLE_LEN - 14)), 0.9));
  const outline = () => {
    x.beginPath();
    for (let u = 0; u <= NEEDLE_LEN; u += 0.5) { const p = at(u, hw(u)); u ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    for (let u = NEEDLE_LEN; u >= 0; u -= 0.5) { const p = at(u, -hw(u)); x.lineTo(p[0], p[1]); }
    x.closePath();
  };
  x.save();
  x.globalAlpha = a;
  // l'ombre portée, très douce
  x.save(); x.translate(0, 0.9); outline(); x.fillStyle = 'rgba(0,0,0,.45)'; x.fill(); x.restore();
  // la tige : acier sombre, à peine plus clair que le fil
  outline(); x.fillStyle = 'rgb(62,61,58)'; x.fill();
  // le modelé : le bas plus sombre, une seule ligne de lumière en haut
  x.lineCap = 'round';
  const line = (u0, u1, v, col, w) => { x.beginPath(); for (let u = u0; u <= u1; u += 0.5) { const p = at(u, v * hw(u)); u > u0 ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.strokeStyle = col; x.lineWidth = w; x.stroke(); };
  line(0.6, NEEDLE_LEN - 1.2, -0.45, 'rgba(0,0,0,.45)', 0.4);
  line(1, NEEDLE_LEN - 2.2, 0.42, 'rgba(206,203,196,.36)', 0.38);
  // l'éclat : un point de lumière qui glisse (rare)
  if (glint >= 0 && glint <= 1) {
    const u = 2 + glint * (NEEDLE_LEN - 5), p = at(u, 0.4 * hw(u)), k = Math.sin(Math.PI * glint);
    const g = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], 2.2);
    g.addColorStop(0, `rgba(240,238,232,${(0.55 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(240,238,232,0)');
    x.fillStyle = g; x.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5);
  }
  // le chas : une fente fine, noire
  { const p0 = at(1.5, 0), p1 = at(5.1, 0);
    x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.strokeStyle = 'rgb(5,5,5)'; x.lineWidth = 0.55; x.stroke(); }
  x.restore();
}

// le fil dans le chas : il le traverse et un petit bout ressort de l'autre côté et pend (sway : il se balance un peu)
export function drawEyeTail(x, tip, side, a = 1, sway = 0) {
  if (a <= 0.01) return;
  const e = needleEye(tip, side), ux = side;
  x.save(); x.globalAlpha = a; x.lineCap = 'round';
  const path = () => { x.beginPath(); x.moveTo(e[0] - ux * 1.2, e[1]); x.quadraticCurveTo(e[0] + ux * 1.6, e[1] + 0.4, e[0] + ux * (1.9 + sway * 0.4), e[1] + 2.4); x.quadraticCurveTo(e[0] + ux * (2.1 + sway), e[1] + 4.2, e[0] + ux * (1.3 + sway), e[1] + 5.4); };
  path(); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; x.stroke();
  path(); x.strokeStyle = 'rgb(28,27,25)'; x.lineWidth = 1.1; x.stroke();
  path(); x.strokeStyle = 'rgba(120,116,108,.22)'; x.lineWidth = 0.38; x.stroke();
  x.restore();
}
