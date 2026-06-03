// Keep this version in sync with APP_VERSION in index.html.
const CACHE_NAME = "lineup-pwa-v59";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./offline.html",
  "./icons/favicon-32.png",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./assets/LineUp_Header_Wordmark_2x.png",
  "./assets/LineUp_Splash_Wordmark_2x.png",
  "./assets/LineUp_Wordmark_Transparent_2x.png",
  "./brand-assets/gentle-bens-logo.png",
  "./brand-assets/frog-firkin-logo.png",
  "./brand-assets/fuku-logo.png",
  "./brand-assets/agave-house-logo.png",
  "./brand-assets/no-anchovies-logo.png",
  "./brand-assets/saddle-logo.png",
  "./brand-assets/blind-pig-logo.png",
  "./brand-assets/petes-logo.png"
];
const STATIC_EXTENSIONS = [".png", ".svg", ".webmanifest", ".html", ".css", ".js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./offline.html")))
    );
    return;
  }

  if (!isSameOrigin || !STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => Response.error());
      return cached || network;
    })
  );
});
