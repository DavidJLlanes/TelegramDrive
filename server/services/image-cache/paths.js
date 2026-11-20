// Cache legible: data/thumbs/Suki/Vacaciones/123.webp (id estable, sin colisiones de nombres).
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../../config/index.js';
import { normalizePath } from '../../utils/paths.js';

export const cacheRoots = { thumb: config.thumbsDir, preview: path.join(config.dataDir, 'previews') };

export function cacheFolder(kind, folder = '/') {
  const root = cacheRoots[kind];
  if (!root) throw new Error('Tipo de caché desconocido');
  const parts = normalizePath(folder).split('/').filter(Boolean);
  if (parts.some((p) => p.includes('\\') || p.includes('\0'))) throw new Error('Ruta de caché no válida');
  return path.join(root, ...parts);
}

export function cachePath(kind, parent, id, ext = 'webp') {
  const number = Number(id);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('ID de archivo no válido');
  return path.join(cacheFolder(kind, parent), String(number) + '.' + ext);
}

async function move(from, to) {
  if (from === to) return;
  try {
    await fs.mkdir(path.dirname(to), { recursive: true, mode: 0o700 });
    await fs.rename(from, to);
  } catch (err) { if (err.code !== 'ENOENT') console.warn('[caché] traslado:', err.message); }
}

/** Los movimientos de carpetas arrastran todas las subcarpetas de caché con una operación. */
export async function moveCacheFolder(oldPath, newPath) {
  await Promise.all(Object.keys(cacheRoots).map((kind) => move(cacheFolder(kind, oldPath), cacheFolder(kind, newPath))));
}

export async function moveCacheFile(id, oldParent, newParent) {
  if (oldParent === newParent) return;
  await Promise.all(Object.keys(cacheRoots).flatMap((kind) => ['webp', 'jpg'].map((ext) =>
    move(cachePath(kind, oldParent, id, ext), cachePath(kind, newParent, id, ext)))));
}

export async function dropCacheFile(id, parent) {
  await Promise.all(Object.keys(cacheRoots).flatMap((kind) => ['webp', 'jpg'].map((ext) =>
    fs.rm(cachePath(kind, parent, id, ext), { force: true }))));
  await fs.rm(path.join(config.thumbsDir, String(Number(id)) + '.jpg'), { force: true }); // formato anterior
}

export async function dropCacheFolder(folder) {
  await Promise.all(Object.keys(cacheRoots).map((kind) => fs.rm(cacheFolder(kind, folder), { recursive: true, force: true })));
}
