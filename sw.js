// Bump this on every deploy. It's the only thing that makes the browser
// notice sw.js changed, install the new worker, and purge the old cache —
// without a bump, edits to any cached file (html/css/js) go on being served
// stale forever, even after you save new versions.
const CACHE_NAME = "fitness-app-v2";

const ASSETS = [
  "./",
  "index.html",
  "exercises.html",
  "logs.html",
  "charts.html",
  "css/styles.css",
  "js/data.js",
  "js/nav.js",
  "js/workout.js",
  "js/exercises.js",
  "js/logs.js",
  "js/charts.js",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Network-first for same-origin requests: always try to fetch the live file
// first (so you see your latest edits immediately while developing), and
// only fall back to the cache if the network is unavailable (offline use).
// Cache gets refreshed with whatever the network returns.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});