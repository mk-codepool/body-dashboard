// Body Dashboard PWA - Service Worker
const CACHE_NAME = 'body-dashboard-shell-v1';

// Zasoby powłoki aplikacji (App Shell) do wstępnego buforowania
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable.png',
  '/icons/apple-touch-icon.png'
];

// Instalacja Service Workera - pre-cache kluczowych zasobów
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Błąd buforowania zasobów początkowych:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Aktywacja Service Workera - czyszczenie starych wersji cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Obsługa zapytań (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Zapytania do API (/api/*) oraz Google OAuth pomijają cache Service Workera!
  // Za ich lokalną persystencję i synchronizację offline odpowiada MeasurementsService.
  if (url.pathname.startsWith('/api') || url.hostname.includes('google') || url.hostname.includes('gstatic')) {
    return;
  }

  // Zapytania nawigacyjne (otwarcie strony / przeładowanie)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedResponse = await caches.match('/index.html');
        return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Zasoby statyczne (skrypty, style, czcionki, obrazy): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Błąd sieci (np. offline) - jeśli mamy w cache, to zadziała
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
