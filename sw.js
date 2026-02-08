const CACHE = 'eaukcija-v1';
const URLS = ['/', '/index.html', '/app.js', '/style.css', '/manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});