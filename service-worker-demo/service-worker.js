self.addEventListener('install', ev => {
});

self.addEventListener('activate', ev => {
});

self.addEventListener('fetch', ev => {
    var reqUrl = ev.request.url;
    console.log('hijack request: ' + reqUrl);
    console.log(ev.request);
    
    // 若是text.css的请求被拦截，返回伪造信息
    if (reqUrl.indexOf('text.css') > -1) {
        console.log('hijack text.css');
        ev.respondWith(
            new Response('hahah', {
                headers: {'Content-Type': 'text/css'}
            })
        );
    }
    // 继续请求
    else {
        ev.respondWith(fetch(ev.request));
    }
});
