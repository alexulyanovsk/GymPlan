const CACHE_NAME = 'gymplan-v2'; // ОБНОВЛЕНО НА v2
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './icon.svg',
  './js/main.js',
  './js/data.js',
  './js/state.js',
  './js/db.js',
  './js/ui.js',
  './js/utils.js',
  './js/bridge.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  if (url.hostname === 'd3d2ynhodh9o1z.cloudfront.net') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then((res) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(e.request, res.clone());
        return res;
      });
    }).catch(() => caches.match(e.request))
  );
});
