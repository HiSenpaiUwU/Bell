const CACHE_NAME = "bell-fresh-v2";
const APP_BASE_URL = new URL("./", self.location.href);
const OFFLINE_URL = new URL("offline.html", APP_BASE_URL).toString();
const CORE_ASSETS = ["", "index.html", "manifest.webmanifest", "bell-fresh-icon.svg", "offline.html"].map(
  (assetPath) => new URL(assetPath, APP_BASE_URL).toString(),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheKeys) =>
      Promise.all(
        cacheKeys.map((cacheKey) => {
          if (cacheKey !== CACHE_NAME) {
            return caches.delete(cacheKey);
          }

          return Promise.resolve();
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return networkResponse;
        })
        .catch(() => cachedResponse ?? caches.match(OFFLINE_URL));

      return cachedResponse ?? fetchPromise;
    }),
  );
});
