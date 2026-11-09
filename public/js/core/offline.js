// Música sin conexión: se guardan los archivos en la Cache API; el service worker los sirve (con Range) cuando no hay red.
import { contentUrl } from './api.js';

const CACHE = 'tgdrive-audio-v1';
const META = 'tgd.offline';

const readMeta = () => { try { return JSON.parse(localStorage.getItem(META) || '{}'); } catch { return {}; } };
const writeMeta = (meta) => { try { localStorage.setItem(META, JSON.stringify(meta)); } catch { /* sin almacenamiento */ } };
const slim = (f) => ({ id: f.id, name: f.name, parent: f.parent, size: f.size, kind: f.kind, mime: f.mime, thumb: f.thumb, date: f.date, tags: f.tags });

export const offlineSupported = () => 'caches' in window && 'serviceWorker' in navigator;
export const offlineTracks = () => Object.values(readMeta());
export const isSaved = (id) => String(id) in readMeta();

/** Guarda `files` (audios). `onProgress(hecho, total)`. Devuelve cuántos se guardaron. */
export async function saveOffline(files, onProgress) {
  const cache = await caches.open(CACHE);
  navigator.storage?.persist?.().catch(() => {});
  const meta = readMeta();
  let saved = 0;
  for (const [i, file] of files.entries()) {
    onProgress?.(i, files.length);
    if (String(file.id) in meta) { saved += 1; continue; }
    const res = await fetch(contentUrl(file.id), { credentials: 'same-origin' });
    if (!res.ok || res.status === 206) throw new Error(`No se pudo guardar «${file.name}»`);
    await cache.put(contentUrl(file.id), res);
    meta[file.id] = slim(file);
    writeMeta(meta);
    saved += 1;
  }
  onProgress?.(files.length, files.length);
  return saved;
}

export async function removeOffline(ids) {
  const cache = await caches.open(CACHE);
  const meta = readMeta();
  for (const id of ids) { await cache.delete(contentUrl(id)); delete meta[id]; }
  writeMeta(meta);
}

export async function storageInfo() {
  const e = await navigator.storage?.estimate?.();
  return e ? { used: e.usage ?? 0, quota: e.quota ?? 0 } : null;
}
