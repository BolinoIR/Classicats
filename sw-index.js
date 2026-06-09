var cacheName = 'classicats-root-v2';
var offlineUrl = '/offline.html';
// our fake endpoint to store data
const SHARED_DATA_ENDPOINT = '/store-data-service-worker';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(
                [
                    offlineUrl,
                ]
            );
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) {
                if (key !== cacheName && key !== SHARED_DATA_ENDPOINT) {
                    return caches.delete(key);
                }
            }));
        }).then(function() {
            return clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    const {
        request,
        request: {
            url,
            method,
        },
    } = event;

    if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request.url).catch(error => {
                // Return the offline page
                return caches.match(offlineUrl);
            })
        );
    } else if (event.request.url.match(SHARED_DATA_ENDPOINT)) {

        if (url.match(SHARED_DATA_ENDPOINT)) {
            if (method === 'POST') {
                request.json().then(body => {
                    caches.open(SHARED_DATA_ENDPOINT).then(function(cache) {
                        cache.put(SHARED_DATA_ENDPOINT, new Response(JSON.stringify(body)));
                    });
                });
                return new Response('{}');
            } else {
                event.respondWith(
                    caches.open(SHARED_DATA_ENDPOINT).then(function(cache) {
                        return cache.match(SHARED_DATA_ENDPOINT).then(function(response) {
                            return response || new Response('{}');
                            ;
                        }) || new Response('{}');
                    })
                );
            }
        } else {
            return event;
        }

    } else {
        if (event.request.url.match(/visualstudio/)) return event;
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
    }
});
