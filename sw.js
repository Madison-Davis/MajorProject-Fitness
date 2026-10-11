const CACHE_NAME = "fitness-app-v1";

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

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});