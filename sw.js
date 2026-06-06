const CACHE_NAME = 'livros-online-v15';

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

const CDN_URLS = [
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// Install: pre-cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache shell files (may fail on first load if offline, that's fine)
      return cache.addAll(SHELL_URLS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell + CDN, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Supabase API calls
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;

  const isCDN = CDN_URLS.some(u => event.request.url.startsWith(u)) ||
                url.hostname === 'unpkg.com' ||
                url.hostname === 'cdn.jsdelivr.net' ||
                url.hostname === 'accounts.google.com';

  const isShell = SHELL_URLS.includes(url.pathname) || url.pathname === '/';

  if (isShell || isCDN) {
    // Cache-first strategy
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
  // All other requests: network only (no caching)
});
