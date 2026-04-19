// Service Worker — Advanced offline support
// Strategy:
//   - HTML (navigation)      → Network-first, fallback to cache → offline page
//   - Hashed JS/CSS assets   → Cache-first (immutable)
//   - Images                 → Cache-first with network update + max size 50
//   - External CDN (LIFF)    → Stale-while-revalidate
//   - API (GAS)              → Never cached

const VERSION     = 'v5';
const CACHE_SHELL = `exam-shell-${VERSION}`;   // HTML + core assets
const CACHE_ASSET = `exam-asset-${VERSION}`;   // JS / CSS
const CACHE_IMG   = `exam-img-${VERSION}`;     // รูปภาพ
const CACHE_CDN   = `exam-cdn-${VERSION}`;     // CDN ภายนอก (LIFF / confetti / fonts)

const BASE = '/online-exam-system';
const OFFLINE_URL = `${BASE}/index.html`;

// pre-cache shell (app จะเปิดได้แม้ offline ตั้งแต่ครั้งที่ 2)
const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`,
];

// ══ Install ══════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ══ Activate — cleanup old caches ══════════════════════
self.addEventListener('activate', event => {
  const keep = new Set([CACHE_SHELL, CACHE_ASSET, CACHE_IMG, CACHE_CDN]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ══ Fetch router ════════════════════════════════════
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) API calls — ไม่ cache (GAS + Google APIs)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // 2) HTML / navigation — Network-first → cache → offline
  if (req.mode === 'navigate' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req, CACHE_SHELL));
    return;
  }

  // 3) รูปภาพ — Cache-first, trim cache
  if (req.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstWithTrim(req, CACHE_IMG, 50));
    return;
  }

  // 4) External CDN (LIFF SDK / fonts / confetti) — Stale-while-revalidate
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CACHE_CDN));
    return;
  }

  // 5) Assets ภายใน (JS/CSS hashed) — Cache-first
  event.respondWith(cacheFirstWithTrim(req, CACHE_ASSET, 60));
});

// ── Strategies ─────────────────────────────────────────

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // fallback: offline page
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || new Response(
      '<h1 style="font-family:sans-serif;text-align:center;padding:40px">📵 คุณอยู่ offline</h1>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function cacheFirstWithTrim(request, cacheName, maxItems) {
  const cached = await caches.match(request);
  if (cached) {
    // update background (no await)
    fetch(request).then(res => {
      if (res && res.status === 200) {
        caches.open(cacheName).then(c => {
          c.put(request, res.clone());
          trimCache(cacheName, maxItems);
        });
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone()).catch(() => {});
      trimCache(cacheName, maxItems);
    }
    return res;
  } catch (_) {
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(res => {
    if (res && res.status === 200) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // ลบของเก่าสุด
      await Promise.all(keys.slice(0, keys.length - maxItems).map(k => cache.delete(k)));
    }
  } catch (_) {}
}

// ══ Message channel — ฝั่ง client สั่ง skipWaiting ได้ ══
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});
