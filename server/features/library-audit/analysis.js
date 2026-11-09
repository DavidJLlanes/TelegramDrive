// Análisis puro de la biblioteca (sin base de datos ni red): recibe filas de canciones y devuelve hallazgos.
const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Clave de comparación: sin acentos ni signos, y con las palabras ordenadas ("Faroles, Los" = "Los Faroles"). */
export const nameKey = (s) => strip(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const albumKey = (s) => strip(s).replace(/[^a-z0-9]+/g, ' ').trim();

function groupBy(rows, keyOf) {
  const map = new Map();
  for (const r of rows) { const k = keyOf(r); if (k) map.set(k, [...(map.get(k) ?? []), r]); }
  return map;
}

const mostCommon = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
};

/** Números de pista que faltan entre 1 y la mayor (por disco). */
export function missingTracks(tracks) {
  const byDisc = groupBy(tracks.filter((t) => t.track > 0), (t) => String(t.disc || 1));
  const missing = [];
  for (const [disc, items] of byDisc) {
    const have = new Set(items.map((t) => t.track));
    const max = Math.max(...have);
    for (let n = 1; n < max; n += 1) if (!have.has(n)) missing.push({ disc: Number(disc), track: n });
  }
  return missing;
}

/**
 * `rows`: { id, folder, name, tagged, title, artist, band, album, track, disc, year };
 * `pathOf(folderId)`: ruta de la carpeta; `limits`: { maxItems, maxMissingShown }.
 */
export function analyze(rows, pathOf, { maxItems = 200, maxMissingShown = 30 } = {}) {
  const tagged = rows.filter((r) => r.tagged === 1);
  const cap = (list) => ({ total: list.length, items: list.slice(0, maxItems) });
  const albums = groupBy(tagged.filter((r) => r.album), (r) => `${albumKey(r.album)}|${r.folder}`);

  const incomplete = []; const duplicates = []; const mixed = [];
  for (const group of albums.values()) {
    const first = group[0];
    const base = { album: mostCommon(group.map((r) => r.album)), artist: mostCommon(group.map((r) => r.band || r.artist)), path: pathOf(first.folder), tracks: group.length };
    const missing = missingTracks(group);
    if (missing.length) incomplete.push({ ...base, missing: missing.slice(0, maxMissingShown), missingCount: missing.length });

    const seen = new Map();
    for (const t of group.filter((r) => r.track > 0)) seen.set(`${t.disc || 1}-${t.track}`, [...(seen.get(`${t.disc || 1}-${t.track}`) ?? []), t]);
    const clash = [...seen.values()].filter((l) => l.length > 1);
    if (clash.length) duplicates.push({ ...base, numbers: clash.map((l) => ({ disc: l[0].disc || 1, track: l[0].track, files: l.map((t) => t.name) })).slice(0, maxMissingShown) });

    const years = [...new Set(group.map((r) => r.year).filter(Boolean))];
    const bands = [...new Set(group.map((r) => r.band || r.artist).filter(Boolean).map(nameKey))];
    if (years.length > 1 || bands.length > 1) mixed.push({ ...base, years: years.sort(), artists: bands.length > 1 ? [...new Set(group.map((r) => r.band || r.artist).filter(Boolean))].slice(0, 6) : [] });
  }

  const artistVariants = [...groupBy(tagged, (r) => nameKey(r.artist)).values()]
    .map((group) => {
      const counts = new Map();
      group.forEach((r) => counts.set(r.artist, (counts.get(r.artist) ?? 0) + 1));
      return [...counts].sort((a, b) => b[1] - a[1]).map(([name, tracks]) => ({ name, tracks }));
    })
    .filter((variants) => variants.length > 1);

  const untagged = rows.filter((r) => r.tagged !== 1).map((r) => ({ id: r.id, name: r.name, path: pathOf(r.folder), pending: r.tagged === 0 }));
  const byPath = (a, b) => a.path.localeCompare(b.path, 'es') || String(a.album).localeCompare(String(b.album), 'es');

  return {
    totals: { tracks: rows.length, tagged: tagged.length, untagged: untagged.length, albums: albums.size },
    incompleteAlbums: cap(incomplete.sort(byPath)), duplicateTracks: cap(duplicates.sort(byPath)), mixedAlbums: cap(mixed.sort(byPath)),
    artistVariants: cap(artistVariants), untagged: cap(untagged),
  };
}
