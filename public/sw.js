const CACHE_NAME = "cityphone-v5";
const APP_SHELL = ["/Cityphone/", "/Cityphone/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isNextAsset = isSameOrigin && url.pathname.includes("/_next/");
  const isAppDocument = isSameOrigin && url.pathname.startsWith("/Cityphone/") && (event.request.destination === "document" || event.request.destination === "script" || event.request.destination === "style");

  if (isNavigation || isNextAsset || isAppDocument) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/Cityphone/")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response && response.ok && isSameOrigin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/Cityphone/")))
  );
});
