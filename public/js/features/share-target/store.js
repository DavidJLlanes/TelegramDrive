// Lee los archivos que el service worker dejó en la caché temporal al compartir hacia la aplicación.
export const SHARE_CACHE = 'tgdrive-share';

/** `storage`: CacheStorage (inyectable para probar). Devuelve File[]; la caché se vacía al leerla. */
export async function takeShared(storage = globalThis.caches) {
  if (!storage) return [];
  const cache = await storage.open(SHARE_CACHE);
  const keys = (await cache.keys()).sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true }));
  const files = [];
  for (const request of keys) {
    const res = await cache.match(request);
    if (!res) continue;
    const name = decodeURIComponent(res.headers.get('X-Filename') || 'archivo');
    files.push(new File([await res.blob()], name, { type: res.headers.get('Content-Type') || '' }));
    await cache.delete(request);
  }
  return files;
}
