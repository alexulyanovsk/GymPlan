/**
 * Файл: sw.js
 * Версия: 3.0.0 (Кэширует ТОЛЬКО картинки. HTML и JS всегда грузятся из сети)
 */

const CACHE_NAME = 'gymplan-images-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
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

  // Кэшируем ТОЛЬКО картинки с CDN (они не меняются, экономим трафик)
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

  // Для HTML, JS, CSS и остального — НЕ ВМЕШИВАЕМСЯ.
  // Браузер сам скачает свежие файлы с GitHub.
});
