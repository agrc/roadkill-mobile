var CACHE_NAME = 'dependencies-cache';

var REQUIRED_FILES = [
    'app/css/core.css',
    'app/css/images/ajax-loader.gif',
    'app/css/images/ajax-loader.png',
    'app/css/images/icons-18-black.png',
    'app/css/images/icons-18-white.png',
    'app/css/images/icons-36-black.png',
    'app/css/images/icons-36-white.png',

    'app/images/icon.png',
    'app/images/splash.png',

    'jquery-mobile-bower/css/images/ajax-loader.gif',

    'dojo/dojo.js',

    'index.html',
    '/'
];

self.addEventListener('install', function (event) {
  // Perform install step:  loading each required file into cache
    event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // Add all offline dependencies to the cache
          return cache.addAll(REQUIRED_FILES);
      })
      .then(function () {
        // At this point everything has been cached
          return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // Cache hit - return the response from the cached version
          if (response) {
              return response;
          }

        // Not in cache - return the result from the live server
        // `fetch` is essentially a "fallback"
          return fetch(event.request);
      })
  );
});

self.addEventListener('activate', function (event) {
    // Calling claim() to force a "controllerchange" event on navigator.serviceWorker
    event.waitUntil(self.clients.claim());
});
