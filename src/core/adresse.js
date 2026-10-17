// L'adresse du destinataire, en France (décision 6) : saisie assistée par la Base Adresse Nationale, code postal vérifié.
// Le service est la Géoplateforme de l'IGN (vérifié le 17/10/2026 : réponse 200, CORS ouvert, aucune clé, 50 requêtes/s
// par IP) ; l'ancien api-adresse.data.gouv.fr répond encore mais c'est la voie migrée. Ce que la personne tape (le début
// de sa rue) part vers ce service : à dire dans la page de confidentialité. La saisie libre reste toujours possible.

export const BAN_URL = 'https://data.geopf.fr/geocodage/search/';
export const MIN_CARACTERES = 3;      // en dessous, on ne demande rien
export const DELAI_FRAPPE_MS = 320;   // pause entre deux frappes avant d'appeler (le service limite le débit)
export const MAX_SUGGESTIONS = 5;

// --- code postal : 5 chiffres, France -------------------------------------------------------------------------------
// 01–95 : métropole (20 = Corse) ; 97 : outre-mer. 98 (Monaco, Polynésie, Nouvelle-Calédonie…) et 96/99 : refusés ici.
export function validerCodePostal(brut) {
  const cp = String(brut ?? '').replace(/[\s.]/g, '');
  if (cp === '') return { ok: false, cp, code: 'vide', message: 'il manque le code postal.' };
  if (!/^\d{5}$/.test(cp)) return { ok: false, cp, code: 'format', message: 'le code postal : cinq chiffres.' };
  const dep = +cp.slice(0, 2);
  if (dep < 1 || dep === 96 || dep >= 98) return { ok: false, cp, code: 'hors-france', message: 'ce code postal n’est pas en France : j’envoie en France seulement.' };
  return { ok: true, cp, code: '', message: '', zone: dep === 97 ? 'outre-mer' : 'metropole' };
}

// --- suggestions ----------------------------------------------------------------------------------------------------
// Une proposition de la Géoplateforme (GeoJSON) → { label, rue, cp, ville, id }, de quoi remplir rue, code postal, ville.
export function lireSuggestions(json) {
  const f = json && Array.isArray(json.features) ? json.features : [];
  const sorties = [];
  for (const x of f) {
    const p = x && x.properties;
    if (!p || !p.postcode || !p.city) continue;
    const rue = p.name || [p.housenumber, p.street].filter(Boolean).join(' ');
    if (!rue) continue;
    sorties.push({ label: p.label || [rue, p.postcode, p.city].join(' '), rue, cp: String(p.postcode), ville: p.city, id: p.id || p.banId || p.label });
    if (sorties.length >= MAX_SUGGESTIONS) break;
  }
  return sorties;
}

export function urlSuggestions(q, limit = MAX_SUGGESTIONS) {
  const u = new URL(BAN_URL);
  u.searchParams.set('q', String(q).trim());
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('autocomplete', '1');
  return u.href;
}

// Une fonction de recherche qui attend une pause dans la frappe et abandonne la demande précédente :
//   const chercher = creerRecherche(); const liste = await chercher('8 rue de la pa'); // [] si trop court ou annulée
// `appel` et `attendre` sont injectables (tests).
export function creerRecherche({ appel = (...a) => fetch(...a), attendre = ms => new Promise(r => setTimeout(r, ms)), delai = DELAI_FRAPPE_MS } = {}) {
  let n = 0, ctl = null;
  return async function chercher(q) {
    const moi = ++n;
    if (ctl) ctl.abort();
    const t = String(q ?? '').trim();
    if (t.length < MIN_CARACTERES) return [];
    await attendre(delai);
    if (moi !== n) return [];                      // une frappe plus récente a pris le relais
    ctl = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      const r = await appel(urlSuggestions(t), ctl ? { signal: ctl.signal } : undefined);
      if (!r.ok) return [];
      const json = await r.json();
      return moi === n ? lireSuggestions(json) : [];
    } catch { return []; }                        // réseau coupé, annulée : la saisie libre continue
  };
}

// Choix au clavier dans la liste : flèches haut / bas (en boucle), Échap referme ; Entrée valide l'élément actif.
// → { index, ouvert, valider } ; index = -1 : aucun élément actif (la saisie libre garde Entrée).
export function toucheListe({ index, taille, ouvert }, touche) {
  if (!taille || !ouvert) return { index: -1, ouvert: false, valider: false };
  if (touche === 'ArrowDown') return { index: index < 0 ? 0 : (index + 1) % taille, ouvert: true, valider: false };
  if (touche === 'ArrowUp') return { index: index <= 0 ? taille - 1 : index - 1, ouvert: true, valider: false };
  if (touche === 'Escape') return { index: -1, ouvert: false, valider: false };
  if (touche === 'Enter') return { index, ouvert: index < 0, valider: index >= 0 };
  return { index, ouvert, valider: false };
}
