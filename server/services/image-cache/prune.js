// LRU aproximado por mtime (se actualiza al servir). Límite combinado: miniaturas + previews.
import fs from 'node:fs/promises';
import path from 'node:path';
import { cacheRoots } from './paths.js';

export const TEN_GB = 10 * 1024 ** 3;
let busy = null;

async function collect(folder, out) {
  let entries;
  try { entries = await fs.readdir(folder, { withFileTypes: true }); }
  catch (err) { if (err.code === 'ENOENT') return; throw err; }
  for (const entry of entries) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) await collect(full, out);
    else if (entry.isFile() && /\.(webp|jpe?g)$/i.test(entry.name)) {
      try { const st = await fs.stat(full); out.push({ full, size: st.size, used: st.mtimeMs }); }
      catch (err) { if (err.code !== 'ENOENT') throw err; }
    }
  }
}

export function pruneCache(limit = TEN_GB) {
  if (busy) return busy;
  busy = (async () => {
    const entries = [];
    for (const root of Object.values(cacheRoots)) await collect(root, entries);
    let total = entries.reduce((sum, f) => sum + f.size, 0);
    if (total <= limit) return { total, removed: 0 };
    entries.sort((a, b) => a.used - b.used);
    let removed = 0;
    for (const f of entries) {
      if (total <= limit * 0.9) break;
      try { await fs.rm(f.full); total -= f.size; removed++; }
      catch (err) { if (err.code !== 'ENOENT') console.warn('[caché] limpieza:', err.message); }
    }
    return { total, removed };
  })().finally(() => { busy = null; });
  return busy;
}

let scheduled;
export function schedulePrune() {
  if (scheduled) return;
  scheduled = setTimeout(() => {
    scheduled = null;
    pruneCache().catch((e) => console.warn('[caché] limpieza:', e.message));
  }, 30_000);
  scheduled.unref?.();
}
