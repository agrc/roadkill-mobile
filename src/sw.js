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

importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.0.0/workbox-sw.js');

if (workbox) {
  workbox.precaching.precacheAndRoute(REQUIRED_FILES);
  workbox.googleAnalytics.initialize();
}
