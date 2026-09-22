/* sw.js — cache-first app shell. Bump CACHE when you ship changes. */
var CACHE = 'lct-v19';
var SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/db.js',
  './js/image.js',
  './js/store.js',
  './js/ui.js',
  './js/views/dashboard.js',
  './js/views/inventory.js',
  './js/views/catering.js',
  './js/views/history.js',
  './js/views/settings.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-splash-640x1136.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(e.request, copy);
          });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});