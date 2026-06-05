/* Chess Cadet service worker — offline-first app shell + runtime caching.
 *
 * Strategy:
 *  - Precache the app shell, manifest, icons, and the Stockfish engine.
 *  - Navigations: network-first (so a fresh deploy is picked up online),
 *    falling back to the cached shell when offline.
 *  - Everything else (hashed JS/CSS bundles, piece art, the Tailwind CDN
 *    script and Google Fonts): stale-while-revalidate — instant from cache,
 *    refreshed in the background. Cross-origin opaque responses are cached too
 *    so styling/fonts survive offline.
 *
 * Bump CACHE when you change a STABLE-named asset (e.g. a regenerated piece
 * PNG) and want every client to drop the old copy. Hashed bundles don't need it.
 */
const CACHE = 'chess-cadet-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './logo192.png',
  './logo512.png',
  './stockfish/stockfish.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // a missing optional file shouldn't block install
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // App navigations -> network-first, cached shell as offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((c) => c || caches.match('./')))
    );
    return;
  }

  // Static assets + CDNs -> stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
