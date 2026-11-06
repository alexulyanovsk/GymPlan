const CACHE_NAME = 'gymplan-v6';
const APP_SHELL = [
  '/GymPlan/',
  '/GymPlan/index.html',
  '/GymPlan/styles.css',
  '/GymPlan/manifest.json',
  '/GymPlan/icon.svg',
  '/GymPlan/js/boot.js',
  '/GymPlan/js/main.js',
  '/GymPlan/js/ui.js',
  '/GymPlan/js/state.js',
  '/GymPlan/js/data.js',
  '/GymPlan/js/db.js',
  '/GymPlan/js/bridge.js',
  '/GymPlan/js/utils.js',
  '/GymPlan/js/generator.js' // <--- ДОБАВЛЕНО
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
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

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/GymPlan/index.html') || caches.match('/GymPlan/'))
    );
    return;
  }

  if (url.pathname.startsWith('/GymPlan/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});
