// Qué se pregunta a LRCLIB por una canción y cuánto se parece cada respuesta. Sin red ni base de datos.

const EXT = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|weba)$/i;
// Lo que añaden las tiendas, los rips y YouTube y no forma parte del título: «(Remastered 2011)», «- Live», «[Official Video]», «(feat. X)»…
const NOISE = /\s*[([](?:[^)\]]*\b(?:remaster(?:ed)?|live|official|video|audio|lyrics?|letra|hd|4k|mono|stereo|bonus|explicit|version|versión|edit|deluxe|demo|acoustic|acústic[oa]|radio)\b[^)\]]*|feat\.?[^)\]]*|ft\.?[^)\]]*|con [^)\]]*)[)\]]/gi;
const DASH_NOISE = /\s+[-–—]\s+(?:\d{4}\s+)?(?:remaster(?:ed)?(?:\s+\d{4})?|live\b.*|single version|radio edit|mono|stereo|bonus track|\d{4} version)\s*$/i;
const TRACK_PREFIX = /^\s*(?:\d{1,3}\s*[-–.)_]\s*)+/;

export const clean = (text) => String(text ?? '').replace(NOISE, '').replace(DASH_NOISE, '').replace(/\s{2,}/g, ' ').trim();

/** `{ title, artist, album, duration }` a partir de las etiquetas; si faltan, del nombre del archivo («Artista - Título.mp3»). */
export function queryFor(file) {
  const tags = file.tags ?? {};
  let title = clean(tags.title);
  let artist = clean(tags.artist || tags.band);
  if (!title) {
    const base = String(file.name ?? '').replace(EXT, '').replace(TRACK_PREFIX, '').replace(/_/g, ' ');
    const m = /^(.{2,80}?)\s+[-–—]\s+(.{2,120})$/.exec(base);
    if (m) { if (!artist) artist = clean(m[1]); title = clean(m[2]); } else title = clean(base);
  }
  return { title, artist, album: clean(tags.album), duration: Math.round(Number(tags.duration) || 0) };
}

export const fold = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** 0-1: iguales → 1; uno contiene al otro → 0.8; si no, parte de palabras compartidas. */
export function similarity(a, b) {
  const x = fold(a); const y = fold(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  const sx = new Set(x.split(' ')); const sy = new Set(y.split(' '));
  let shared = 0;
  for (const w of sx) if (sy.has(w)) shared += 1;
  return shared / (sx.size + sy.size - shared);
}

const durationFit = (wanted, got) => {
  if (!wanted || !got) return null; // se desconoce: ni suma ni resta
  const d = Math.abs(wanted - got);
  return d <= 2 ? 1 : d <= 5 ? 0.6 : d <= 10 ? 0.2 : 0;
};

/** Puntúa una respuesta de LRCLIB frente a lo buscado. `confident`: es seguro guardarla sin preguntar. */
export function score(query, candidate) {
  const title = similarity(query.title, candidate.title);
  const artist = query.artist ? similarity(query.artist, candidate.artist) : null;
  const time = durationFit(query.duration, candidate.duration);
  const value = 0.5 * title + 0.3 * (artist ?? 0.5) + 0.2 * (time ?? 0.5) + (candidate.synced ? 0.05 : 0);
  const confident = title >= 0.8 && (artist === null || artist >= 0.5) && (time === null || time >= 0.6);
  return { value, confident };
}
