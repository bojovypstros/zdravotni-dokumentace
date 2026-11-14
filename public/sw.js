/* Zdravotní dokumentace – static app-shell service worker.
 *
 * Cache Storage may contain ONLY:
 *   - this offline fallback HTML (no patient data)
 *   - PWA icons / static shell assets
 *   - hashed /_next/static/* bundles
 *
 * Never cache: /api/*, authenticated HTML documents, exports, documents.
 */
const SHELL_CACHE = "zd-shell-v1";
const STATIC_CACHE = "zd-static-v1";

const PRECACHE_URLS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (keep.has(key) ? undefined : caches.delete(key))),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNextStatic(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isShellAsset(url) {
  if (url.pathname === "/offline.html") return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  if (url.pathname === "/sw.js") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated / clinical APIs — network only, never Cache Storage.
  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation / HTML documents — network only; offline shell fallback.
  // Do not put HTML responses (may contain patient data) into cache.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match("/offline.html");
          return (
            cached ||
            new Response("Server nedostupný – záznamy nelze uložit.", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Hashed Next static assets — cache-first (no private data).
  if (isNextStatic(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Precached shell assets only.
  if (isShellAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
  // All other GETs: default browser network (no SW caching).
});
