/**
 * SafeRoute service worker — deliberately minimal.
 *
 * Precaches ONLY static app shell assets (the icon set and the offline
 * navigation fallback). API traffic (rides, hazards, telemetry), live GPS
 * and sensor data are NEVER cached: everything under /api/ and every
 * non-GET request always goes to the network, uncached.
 */

const CACHE_NAME = 'saferoute-static-v1';
const PRECACHE_URLS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin static assets only. Everything else (APIs, Mapbox tiles,
  // telemetry, fonts) goes straight to the network.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket')) return;

  // Network-first with cache fallback for same-origin GETs of static files.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
