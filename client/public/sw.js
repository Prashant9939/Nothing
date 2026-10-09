const CACHE = 'app-shell-v2';
const OFFLINE_URL = '/offline.html';

// Assets are content-hashed JS/CSS/images — NEVER HTML. A missing asset can
// briefly get answered with index.html (SPA fallback) during a deploy race;
// caching or serving that would poison the URL forever, because the next
// import() would receive HTML instead of JS even after a refresh.
const isAssetResponse = (response) =>
  !(response.headers.get('content-type') || '').toLowerCase().includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/offline.js']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        return (
          offline ||
          new Response('You are currently offline. Please check your internet connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname === '/offline.js') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached && isAssetResponse(cached)) return cached;
        if (cached) {
          // Heal a previously poisoned entry (old SW cached an HTML fallback).
          caches.open(CACHE).then((cache) => cache.delete(request));
        }
        return fetch(request).then((response) => {
          if (response.ok && isAssetResponse(response)) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
