// Service worker: app shell offline. La API y los medios NUNCA se cachean (son datos privados y pesados).
const VERSION = 'v1.3.0';
const CACHE = `tgdrive-shell-${VERSION}`;
const SHELL = [
  './', 'index.html', 'offline.html', 'manifest.webmanifest',
  'css/fonts.css', 'css/tokens.css', 'css/base.css', 'css/components.css', 'css/layout.css',
  'css/explorer.css', 'css/players.css', 'css/lightbox.css', 'css/library.css',
  'fonts/figtree-latin-wght-normal.woff2', 'fonts/bricolage-grotesque-latin-wght-normal.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/main.js', 'js/core/api.js', 'js/core/color.js', 'js/core/text.js', 'js/core/dom.js', 'js/core/drive.js', 'js/core/format.js',
  'js/core/icons.js', 'js/core/router.js', 'js/core/store.js', 'js/core/tags.js', 'js/core/library.js', 'js/core/playback.js',
  'js/ui/actions.js', 'js/ui/app-shell.js', 'js/ui/covers.js', 'js/ui/download.js', 'js/ui/page-header.js', 'js/ui/sidebar.js',
  'js/ui/explorer.js', 'js/ui/login.js', 'js/ui/menu.js', 'js/ui/modal.js', 'js/ui/sorting.js',
  'js/ui/toast.js', 'js/ui/topbar.js', 'js/ui/uploader.js', 'js/ui/library.js', 'js/ui/library-head.js', 'js/ui/more-button.js', 'js/ui/play-buttons.js',
  'js/players/audio-player.js', 'js/players/audio-queue.js', 'js/players/lightbox.js', 'js/players/video-player.js', 'js/players/viewer.js',
  'js/pwa/register.js',
];

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

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
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
