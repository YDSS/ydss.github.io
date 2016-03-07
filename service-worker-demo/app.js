if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker-demo/service-worker.js', {
        scope: '/service-worker-demo/'
    }).then(function (reg) {
        var serviceWorker;

        if(reg.installing) {
            console.log('Service worker installing');
        } else if(reg.waiting) {
            console.log('Service worker installed');
        } else if(reg.active) {
            console.log('Service worker active');
        }

        if (serviceWorker) {
            serviceWorker.addEventListener('statechange', function (e) {

            });
        }
    }).catch (function (error) {

    });
}

window.onload = () => {
    // fetch('/service-worker-demo/test.css')
    //     .then(response => {
    //         return response.text();
    //     })
    //     .then(text => {
    //         console.log('text.css: ' + text);
    //         return text;
    //     });
    fetch('/root.css')
        .then(response => {
            return response.text();
        })
        .then(text => {
            console.log('root.css: ' + text);
        });
}
