const CACHE_NAME = 'ai-photo-tour-cache-v1';
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    'https://cdn.tailwindcss.com/',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event: precache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache app shell', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: serve from cache, fall back to network, and cache new requests
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests. Don't cache API calls.
    if (event.request.method !== 'GET' || event.request.url.includes('generativelanguage.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Try to get the response from the cache.
            const cachedResponse = await cache.match(event.request);
            
            // Return the cached response if it's found.
            if (cachedResponse) {
                return cachedResponse;
            }

            // If it's not in the cache, fetch it from the network.
            try {
                const networkResponse = await fetch(event.request);
                // If the network request is successful, cache it and return it.
                if (networkResponse.ok) {
                    // We need to clone the response to cache it because a response can only be consumed once.
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                console.error('Service Worker: Network request failed, and not in cache.', event.request.url, error);
                // This will happen if the user is offline and requests something not in the cache.
                throw error;
            }
        })
    );
});
