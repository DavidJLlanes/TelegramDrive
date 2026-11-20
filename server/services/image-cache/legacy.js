// Reorganiza las miniaturas JPEG antiguas del directorio plano, sin volver a descargarlas.
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { cachePath } from './paths.js';

export async function migrateLegacyThumbs(catalog) {
  let entries;
  try { entries = await fs.readdir(config.thumbsDir, { withFileTypes: true }); }
  catch (err) { if (err.code === 'ENOENT') return; throw err; }
  let moved = 0;
  for (const item of entries) {
    if (!item.isFile() || !/^\d+\.jpg$/.test(item.name)) continue;
    const id = Number(item.name.slice(0, -4));
    let entry;
    try { entry = catalog.getFile(id); } catch { continue; }
    if (entry.kind !== 'image') continue;
    const oldFile = path.join(config.thumbsDir, item.name);
    const target = cachePath('thumb', entry.parent, id, 'jpg');
    try {
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      try { await fs.access(target); await fs.rm(oldFile); }
      catch (err) { if (err.code === 'ENOENT') await fs.rename(oldFile, target); else throw err; }
      moved++;
    } catch (err) { if (err.code !== 'ENOENT') console.warn('[caché] migración:', err.message); }
  }
  if (moved) console.log('[caché] miniaturas antiguas reorganizadas: ' + moved);
}
