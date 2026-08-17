// IBI Multi-Calculator — service worker
// Network-first for the page itself (so updates arrive immediately),
// cache-first for static assets. Bump CACHE on each release.
const CACHE = 'ibi-calc-v4.11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './ibi-logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  // {cache:'reload'} bypasses the HTTP cache — plain addAll() can precache a
  // STALE file the browser already holds, shipping old JS under a new badge.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page navigations: network first, fall back to cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Product catalogue feed: network first, so an edit in the Google master
  // shows up on the next load. Cached under a fixed key (the page requests it
  // with a ?t= cache-buster) so an offline launch still gets the last good copy.
  if (url.origin === location.origin && url.pathname.endsWith('/catalogue.json')) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./catalogue.json', copy)); return res; })
        .catch(() => caches.match('./catalogue.json'))
    );
    return;
  }

  // Same-origin static assets: cache first, then network (and cache it)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
  // Cross-origin (fonts, OCR engine CDN): let the browser handle it normally
});
