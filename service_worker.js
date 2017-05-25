var TAG = '[Service Worker]:';
var filesToCache = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/js/scripts.js',
    '/assets/fonts/03aPdn7fFF3H6ngCgAlQzAzyDMXhdD8sAj6OAJTFsBI.woff2',
    '/assets/fonts/3Nwg9VzlwLXPq3fNKwVRMAsYbbCjybiHxArTLjt7FRU.woff2',
    '/assets/fonts/5hX15RUpPERmeybVlLQEWBkAz4rYn47Zy2rvigWQf6w.woff2',
    '/assets/fonts/CPRt--GVMETgA6YEaoGitxkAz4rYn47Zy2rvigWQf6w.woff2',
    '/assets/fonts/I-OtoJZa3TeyH6D9oli3iXYhjbSpvc47ee6xR_80Hnw.woff2',
    '/assets/fonts/O_WhD9hODL16N4KLHLX7xQsYbbCjybiHxArTLjt7FRU.woff2',
    '/assets/fonts/QABk9IxT-LFTJ_dQzv7xpF4sYYdJg5dU2qzJEVSuta0.woff2',
    '/assets/fonts/QABk9IxT-LFTJ_dQzv7xpIgp9Q8gbYrhqGlRav_IXfk.woff2',
    '/assets/fonts/QABk9IxT-LFTJ_dQzv7xpKE8kM4xWR1_1bYURRojRGc.woff2',
    '/assets/fonts/QABk9IxT-LFTJ_dQzv7xpPZraR2Tg8w2lzm7kLNL0-w.woff2',
    '/assets/fonts/b31S45a_TNgaBApZhTgE6AsYbbCjybiHxArTLjt7FRU.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nACS0ZgDg4kY8EFPTGlvyHP2Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nAro84VToOve-uw23YSmBS72Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nBYyuMfI6pbvLqniwcbLofP2Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nGPMCwzADhgEiQ8LZ-01G1L2Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nIT75Viso9fCesWUO0IzDUX2Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nL8EBb1YR1F8PhofwHtObrz2Ot9t5h1GRSTIE78Whtoh.woff2',
    '/assets/fonts/b9QBgL0iMZfDSpmcXcE8nPX2or14QGUHgbhSBV1Go0E.woff2',
    '/assets/fonts/fU0HAfLiPHGlZhZpY6M7dBkAz4rYn47Zy2rvigWQf6w.woff2',
    '/assets/images/bg.svg',
    '/assets/images/owl.jpg',
    '/assets/images/rails.jpg',
    '/assets/images/tag.jpg',
    '/assets/images/tools.jpg'
];
var assetsCacheName = 'assets_cache';
var env = 'debug';
var Debug = env === 'debug' ? console.log : function() {};

// sw install event, cache all the asset files
self.addEventListener('install', function (ev) {
    Debug(TAG + 'Installed');
    ev.waitUntil(
        caches.open(assetsCacheName).then(function (cache) {
            Debug(TAG + 'cache storing');
            return cache.addAll(filesToCache);
        })
    );
});

// sw activate event, remove old caches
self.addEventListener('activate', function (ev) {
    Debug(TAG + 'Activated');
    ev.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== assetsCacheName) {
                    Debug(TAG + 'Remove old cache ' + key);
                    return caches.delete(key);
                }
            }))
        })
    );

    return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    Debug(TAG, e.request.url);
    e.respondWith(
      caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
      })
    );
});
