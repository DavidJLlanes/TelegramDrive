// Letra sincronizada en formato LRC («[mm:ss.xx] línea»). Sin DOM. Si el texto no lleva marcas de tiempo es letra normal.
const STAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const META = /^\s*\[[a-z]{2,}:[^\]]*\]\s*$/i; // [ar:…] [ti:…] [by:…]

/** → { synced, lines: [{ t, text }] } (t en segundos; null si no está sincronizada). */
export function parseLrc(text) {
  const rows = String(text ?? '').split(/\r?\n/);
  const lines = [];
  for (const raw of rows) {
    if (META.test(raw)) continue;
    const content = raw.replace(STAMP, '').trim();
    for (const m of raw.matchAll(STAMP)) lines.push({ t: Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0), text: content });
  }
  if (!lines.length) return { synced: false, lines: rows.map((text) => ({ t: null, text })) };
  return { synced: true, lines: lines.sort((a, b) => a.t - b.t) };
}

/** Índice de la línea que suena en `time` (-1 antes de la primera). */
export function activeLine(lines, time) {
  let lo = 0; let hi = lines.length - 1; let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= time) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}
