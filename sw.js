// Service Worker — Network-first for HTML, Cache-first for static assets
const CACHE_NAME = 'exam-system-v3';
const BASE = '/online-exam-system';

self.addEventListener('install', e => {
  // Pre-cache only non-HTML assets; skip HTML to always get fresh content
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls → Network only, no cache
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    return; // let browser handle normally
  }

  // HTML files → Network first (always get fresh HTML so new JS hashes load correctly)
  if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // JS / CSS / Images → Cache first, fallback to network and update cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || fetchPromise;
    })
  );
});
