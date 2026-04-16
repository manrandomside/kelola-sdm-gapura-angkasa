var CACHE_VERSION = "v2";
var CACHE_NAME = "kelola-sdm-" + CACHE_VERSION;

// Install event
self.addEventListener("install", function () {
  self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — network first, fallback to cache
self.addEventListener("fetch", function (event) {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
