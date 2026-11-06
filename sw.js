/**
 * Файл: sw.js
 * Версия: 22.0.0 (Обновление кэша из-за правок в ui.js)
 */

const CACHE_NAME = 'gymplan-v22';
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
  '/GymPlan/js/generator.js'
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

  // 1. Шрифты Google - Cache First
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

  // 2. Картинки с CDN — Cache First
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

  // 3. Навигация (HTML) — Network First, fallback to Cache
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

  // 4. Локальная статика (JS, CSS) — Stale-While-Revalidate
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
