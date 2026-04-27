const IS_DEV = self.location.search.includes("dev=1");
const STATIC_CACHE = IS_DEV ? "yimday-static-dev" : "yimday-static-v1";
const PAGE_CACHE = IS_DEV ? "yimday-pages-dev" : "yimday-pages-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/maskable-512.png",
  "/pwa/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== PAGE_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

function shouldHandleAsset(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/api/")) {
    return false;
  }

  return ["font", "image", "script", "style"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (IS_DEV && url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        if (IS_DEV) {
          try {
            return await fetch(request);
          } catch {
            return caches.match(OFFLINE_URL);
          }
        }

        const pageCache = await caches.open(PAGE_CACHE);

        try {
          const networkResponse = await fetch(request);

          if (networkResponse.ok) {
            await pageCache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch {
          const cachedResponse = await pageCache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          return caches.match(OFFLINE_URL);
        }
      })(),
    );
    return;
  }

  if (!shouldHandleAsset(request, url)) {
    return;
  }

  event.respondWith(
    (async () => {
      if (IS_DEV) {
        return fetch(request);
      }

      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        void fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              return cache.put(request, networkResponse.clone());
            }
          })
          .catch(() => undefined);

        return cachedResponse;
      }

      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })(),
  );
});
