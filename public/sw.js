// Service worker: app shell offline. La API y los medios NUNCA se cachean (son datos privados y pesados).
// El servidor rellena la versión y la lista de archivos al servirlo (server/services/shell.js): no se edita nada a mano.
importScripts('sw-share-target.js'); // compartir hacia la aplicación (Android)
const VERSION = '__BUILD__';
const CACHE = `tgdrive-shell-${VERSION}`;
const SHELL = ['__SHELL__'];

// Instalación: descarga la versión completa en su propia caché (sin pasar por la caché HTTP) y se activa sola.
// Cada versión vive en su caché y nunca se mezcla con otra: así se puede servir todo desde la caché (arranque instantáneo).
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })))); // si alguno falla, ese se pedirá a la red
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('tgdrive-shell-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const AUDIO_CACHE = 'tgdrive-audio-v1';

/** Sirve el audio guardado (con soporte de Range para poder avanzar); si no está en la caché, va a la red. */
async function offlineAudio(request) {
  const url = new URL(request.url);
  url.search = ''; // la caché guarda la URL sin «?offline=1»
  const cached = await (await caches.open(AUDIO_CACHE)).match(url.href);
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
  // Única excepción en /api: audio guardado para escuchar sin conexión, que el cliente pide con ?offline=1. El resto del streaming
  // (audio, vídeo, imágenes) no pasa por el service worker: así el navegador gestiona los rangos y el segundo plano por su cuenta.
  if (/\/api\/files\/\d+\/content$/.test(url.pathname) && url.search === '?offline=1') { event.respondWith(offlineAudio(request)); return; }
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/healthz')) return; // red directa

  const appPage = url.pathname === new URL('./', self.registration.scope).pathname || url.pathname.endsWith('/index.html');
  if (request.mode === 'navigate') {
    // La app (índice) sale de la caché de su misma versión: HTML y código siempre coinciden. Otras páginas (enlaces compartidos), de la red.
    event.respondWith((async () => {
      if (appPage) { const hit = await (await caches.open(CACHE)).match('./'); if (hit) return hit; }
      try { return await fetch(request); } catch { return (await caches.match('./')) || caches.match('offline.html'); }
    })());
    return;
  }
  // Estáticos: de la caché de esta versión; lo que no esté (o falló al instalar), de la red.
  event.respondWith((async () => (await (await caches.open(CACHE)).match(request)) || fetch(request))());
});
