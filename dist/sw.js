const CACHE_NAME = "bell-fresh-v3";
const APP_BASE_URL = new URL("./", self.location.href);
const OFFLINE_URL = new URL("offline.html", APP_BASE_URL).toString();
const CORE_ASSETS = ["", "index.html", "manifest.webmanifest", "bell-fresh-icon.svg", "offline.html"].map(
  (assetPath) => new URL(assetPath, APP_BASE_URL).toString(),
);

function isCacheableResponse(request, response) {
  return (
    response &&
    response.status === 200 &&
    request.url.startsWith(self.location.origin)
  );
}

async function cacheResponse(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (isCacheableResponse(request, networkResponse)) {
      await cacheResponse(request, networkResponse);
    }

    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    return cachedResponse ?? caches.match(OFFLINE_URL);
  }
}

async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (isCacheableResponse(request, networkResponse)) {
      await cacheResponse(request, networkResponse);
    }

    return networkResponse;
  } catch {
    return cachedResponse ?? Response.error();
  }
}

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

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  event.respondWith(handleAssetRequest(event.request));
});
