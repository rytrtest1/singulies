// `npm run build` : le site principal (dist/), puis les trois versions (dist/v1, dist/v2, dist/v3), chacune construite
// à part avec SG_VERSION (voir vite.config.js). Le site principal d'abord : sa construction vide dist/.
// Une version qui échoue n'empêche pas les autres d'être construites, mais le build entier échoue à la fin
// (mieux vaut ne rien publier qu'une version cassée) ; SG_VERSIONS=2,3 ne construit que celles-là (essais).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = resolve(racine, 'node_modules/vite/bin/vite.js');
const voulues = (process.env.SG_VERSIONS || '1,2,3').split(',').map(s => s.trim()).filter(v => /^[123]$/.test(v));
const sansPrincipal = process.env.SG_SANS_PRINCIPAL === '1';

const echecs = [];
function construire(version) {
  const nom = version ? 'version ' + version : 'site principal';
  console.log('\n=== ' + nom + ' ===');
  const r = spawnSync(process.execPath, [vite, 'build'], { cwd: racine, stdio: 'inherit', env: { ...process.env, SG_VERSION: version } });
  if (r.status !== 0) echecs.push(nom);
}

if (!sansPrincipal) construire('');
for (const v of voulues) construire(v);

if (echecs.length) { console.error('\nÉchec : ' + echecs.join(', ')); process.exit(1); }
console.log('\nTout est construit : dist/' + (voulues.length ? ' + ' + voulues.map(v => 'dist/v' + v).join(', ') : ''));
