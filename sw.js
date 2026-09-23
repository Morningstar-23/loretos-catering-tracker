/* ==========================================================================
   sw.js — Loreto's Catering Tracker (Service Worker)
   - Cache-first app shell for 100% offline operation on iPhone 5s (iOS 12)
   - Dynamic version broadcaster for Settings view
   - Controlled update lifecycle (waits for user prompt / reload)
   ========================================================================== */

var CACHE = 'lct-v24';

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

// 1. Install: Pre-cache all shell assets
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    })
  );
});

// 2. Activate: Clear old caches and claim clients
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

// 3. Fetch: Cache-first, fallback to network
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

// 4. Communication: Handle update activation and version query
self.addEventListener('message', function (e) {
  if (!e.data) return;

  // Activate newly downloaded service worker
  if (e.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  // Broadcast current cache version back to index.html and Settings view
  if (e.data.action === 'getVersion') {
    if (e.source) {
      e.source.postMessage({ action: 'version', version: CACHE });
    }
  }
});