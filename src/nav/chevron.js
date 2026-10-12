// Les flèches du bandeau (12/10, Maxence, option 3 : « de fins chevrons, dans la matière du fil ») : le fil du bandeau
// court jusqu'au bout et s'y termine en pointe de flèche — deux brins repliés, du même fil (le corps, l'ombre, une ligne
// de lumière, la torsion) ; la flèche, c'est le bout du fil. À droite elle pointe vers la page suivante, à gauche vers la
// précédente ; touchée, elle donne un petit coup vers son bord (nav.js), et le fil coulisse avec les noms.
export const CHEV_GAP = 14;            // de la pointe au bord de l'écran, au repos (px)
const ARM = 7.5;                       // longueur d'un brin (px)
const ANG = 0.78;                      // ouverture d'un brin (rad, ≈ 45°)

// x : contexte 2D (px CSS) ; tip : la pointe [x, y] ; side : +1 (vers la droite) / −1 ; a : opacité
export function drawChevron(x, tip, side, a = 1) {
  if (a <= 0.01) return;
  const bx = -side * Math.cos(ANG) * ARM, by = Math.sin(ANG) * ARM;
  const p1 = [tip[0] + bx, tip[1] - by], p2 = [tip[0] + bx, tip[1] + by];
  // (chaque brin s'arrondit à peine, comme un fil plié, pas une ligne droite)
  const arm = (p, dy = 0) => { const mx = (p[0] + tip[0]) / 2 - side * 0.35, my = (p[1] + tip[1]) / 2; x.moveTo(p[0], p[1] + dy); x.quadraticCurveTo(mx, my + dy, tip[0], tip[1] + dy); };
  const stroke = (col, w, dy = 0) => { x.beginPath(); arm(p1, dy); arm(p2, dy); x.strokeStyle = col; x.lineWidth = w; x.stroke(); };
  x.save(); x.globalAlpha = a; x.lineCap = 'round'; x.lineJoin = 'round';
  stroke('rgba(0,0,0,.5)', 2.6, 0.9);                 // l'ombre portée
  stroke('rgb(66,64,60)', 1.35);                      // le corps : le même fil, un peu plus clair (il se lit)
  stroke('rgba(0,0,0,.35)', 0.35, 0.4);               // le bas plus sombre
  stroke('rgba(196,191,180,.38)', 0.45, -0.3);        // la ligne de lumière
  // la torsion : deux fins reflets en biais sur chaque brin
  for (const p of [p1, p2]) for (const u of [0.32, 0.68]) {
    const qx = p[0] + (tip[0] - p[0]) * u, qy = p[1] + (tip[1] - p[1]) * u;
    x.beginPath(); x.moveTo(qx - 0.5, qy - 0.55); x.lineTo(qx + 0.45, qy + 0.2); x.strokeStyle = 'rgba(175,170,160,.22)'; x.lineWidth = 0.4; x.stroke();
  }
  x.restore();
}
