// Compartir hacia la aplicación (Android/Chrome): el sistema envía los archivos con un POST a ./share-target.
// Se guardan en una caché temporal y se abre la aplicación, que pregunta en qué carpeta subirlos (features/share-target).
// Se carga desde sw.js con importScripts.
const SHARE_CACHE = 'tgdrive-share';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'POST' || !new URL(request.url).pathname.endsWith('/share-target')) return;
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') { event.respondWith(Response.redirect(new URL('./', self.registration.scope).href, 303)); return; } // una web ajena no puede dejar archivos en la cola
  event.respondWith((async () => {
    try {
      const form = await request.formData();
      const cache = await caches.open(SHARE_CACHE);
      for (const key of await cache.keys()) await cache.delete(key); // solo vale el último reparto
      let n = 0;
      for (const file of form.getAll('files')) {
        if (!(file instanceof File) || file.size === 0) continue;
        await cache.put(new URL(`shared-files/${n}`, self.registration.scope), new Response(file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name || `archivo-${n}`) },
        }));
        n += 1;
      }
      return Response.redirect(new URL(`./?shared=${n}`, self.registration.scope).href, 303);
    } catch {
      return Response.redirect(new URL('./?shared=0', self.registration.scope).href, 303);
    }
  })());
});
