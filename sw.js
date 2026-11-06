/**
 * Файл: sw.js
 * Версия: 39.0.0
 * Описание: Исправлен fallback для навигации, проверка res.ok, безопасные catch.
 */

const CACHE_NAME = 'gymplan-v39';
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

function safePut(cache, request, response) {
  if (!response || !response.ok) return;
  try { cache.put(request, response.clone()); } catch(_) {}
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'reload' }).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      )
    )
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

  // 1. Шрифты Google — Cache First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          return res;
        }).catch(() => cached || Response.error());
      })
    );
    return;
  }

  // 2. Картинки с CDN — Cache First
  if (url.hostname === 'd3d2ynhodh9o1z.cloudfront.net') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          return res;
        }).catch(() => cached || Response.error());
      })
    );
    return;
  }

  // 3. Навигация (HTML) — Network First, корректный fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          }
          return res;
        })
        .catch(async () => {
          return (await caches.match('/GymPlan/index.html')) ||
                 (await caches.match('/GymPlan/')) ||
                 new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 4. Локальная статика (JS, CSS) — Stale-While-Revalidate
  if (url.pathname.startsWith('/GymPlan/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          }
          return res;
        }).catch(() => cached || Response.error());
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 5. Остальное — из кэша или сети
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => Response.error()))
  );
});
