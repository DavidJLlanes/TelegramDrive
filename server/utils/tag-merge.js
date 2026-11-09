// Etiquetas efectivas = etiquetas leídas del archivo + correcciones del usuario (guardadas en el pie del mensaje).
export const TAG_KEYS = ['title', 'artist', 'album', 'band', 'genre', 'track', 'disc', 'year'];
const NUMERIC = new Set(['track', 'disc', 'year']);

export const hasAny = (t) => Boolean(t?.title || t?.artist || t?.album);

/** Limpia un objeto de correcciones: solo claves conocidas y valores no vacíos. */
export function cleanOverrides(input = {}) {
  const out = {};
  for (const key of TAG_KEYS) {
    const value = input[key];
    if (value === undefined || value === null || value === '' || !['string', 'number'].includes(typeof value)) continue;
    if (NUMERIC.has(key)) { const n = Math.trunc(Number(value)); if (Number.isInteger(n) && n > 0 && n < 100000) out[key] = n; } else out[key] = String(value).trim().slice(0, 80);
  }
  return out;
}

export function effectiveTags(raw = {}, ovr = {}) {
  const merged = { title: '', artist: '', album: '', band: '', genre: '', track: 0, disc: 0, year: 0, ...raw, ...ovr };
  if (ovr.artist && !ovr.band && raw.band === raw.artist) merged.band = ovr.artist; // sin "artista del álbum", agrupa por el artista
  return merged;
}
