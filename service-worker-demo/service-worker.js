self.addEventListener('install', ev => {
});

self.addEventListener('activate', ev => {
});

self.addEventListener('fetch', ev => {
    var reqUrl = ev.request.url;
    console.log('hijack request: ' + reqUrl);
    console.log(ev.request);
    
    // 若是text.css的请求被拦截，返回伪造信息
    // if (reqUrl.indexOf('test.css') > -1) {
    if (reqUrl.indexOf('root.css') > -1) {
        console.log('hijack root.css');
        ev.respondWith(
            new Response('scope not working!', {
                headers: {'Content-Type': 'text/css'}
            })
        );
    }
    // 继续请求
    else {
        ev.respondWith(fetch(ev.request));
    }
    // 验证scope是否有效，
    // 若能拦截到root.css，即在/service-worker-demo/的上层，在说明scope无效
    // if (reqUrl.indexOf('root.css') > -1) {
    //     console.log('hijack root.css');
    //     ev.respondWith(
    //         new Response('scope not working!', {
    //             headers: {'Content-Type': 'text/css'}
    //         })
    //     );
    // }
    // // 继续请求
    // else {
    //     ev.respondWith(fetch(ev.request));
    // }
});
