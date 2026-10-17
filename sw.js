// Offline support for the installed app. Every page and asset is cached on
// install; pages are then served network-first (updates show up as soon as
// the visitor is online) and assets cache-first (their URLs are versioned).
// scripts/build.mjs fills the block below in dist/sw.js: a new VERSION
// replaces the cache.

// build:precache
const VERSION = "aefde6ca84";
const PRECACHE = [
  "./",
  "fr/",
  "ar/",
  "bg/",
  "ca/",
  "cs/",
  "da/",
  "de/",
  "el/",
  "es/",
  "fi/",
  "he/",
  "hi/",
  "hr/",
  "hu/",
  "id/",
  "it/",
  "ja/",
  "ko/",
  "nl/",
  "no/",
  "pl/",
  "pt-br/",
  "pt-pt/",
  "ro/",
  "ru/",
  "sk/",
  "sv/",
  "tr/",
  "uk/",
  "vi/",
  "zh-cn/",
  "zh-tw/",
  "assets/css/app.css?v=2540335137",
  "assets/fonts/Doto-Black.ttf",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/images/chrome-web-store.svg",
  "assets/images/tabqr-icon.svg",
  "assets/js/app.js?v=d7fec6bf03",
  "assets/js/language.js?v=49cc316a84",
  "assets/js/translations.js?v=1a6137ab72",
  "assets/js/vendor/qrcode-generator.js?v=18ae399f81",
  "manifest.webmanifest",
];
// /build:precache

const CACHE = `tabqr-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("tabqr-") && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match("./"))),
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
