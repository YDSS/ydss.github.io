self.addEventListener('install', ev => {
    console.log('service worker installing...');
});

self.addEventListener('activate', ev => {
    console.log('service worker will activate...');
});

self.addEventListener('fetch', ev => {
    console.log('service worker fetched something...');
    ev.respondWith(new Response('hijack success !'));
});
