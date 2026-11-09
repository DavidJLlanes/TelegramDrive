// Service worker: app shell offline. La API y los medios NUNCA se cachean (son datos privados y pesados).
// El servidor rellena la versión y la lista de archivos al servirlo (server/services/shell.js): no se edita nada a mano.
importScripts('sw-share-target.js'); // compartir hacia la aplicación (Android)
const VERSION = '__BUILD__';
const CACHE = `tgdrive-shell-${VERSION}`;
const SHELL = ['__SHELL__'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('tgdrive-shell-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const AUDIO_CACHE = 'tgdrive-audio-v1';

/** Sirve el audio guardado (con soporte de Range para poder avanzar); si no está guardado, va a la red. */
async function offlineAudio(request) {
  const cached = await (await caches.open(AUDIO_CACHE)).match(request.url);
  if (!cached) return fetch(request);
  const blob = await cached.blob();
  const type = cached.headers.get('Content-Type') || 'audio/mpeg';
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
  if (!m) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': blob.size, 'Accept-Ranges': 'bytes' } });
  const start = m[1] === '' ? Math.max(blob.size - Number(m[2]), 0) : Number(m[1]);
  const end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), blob.size - 1) : blob.size - 1;
  if (start > end || start >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206, headers: { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${blob.size}`, 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Única excepción en /api: audio guardado para escuchar sin conexión (el resto va siempre a la red).
  if (/\/api\/files\/\d+\/content$/.test(url.pathname) && !url.search) { event.respondWith(offlineAudio(request)); return; }
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/healthz')) return; // red directa

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('index.html')) || caches.match('offline.html')));
    return;
  }
  // Estáticos: caché primero, y se refresca en segundo plano.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const network = fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
