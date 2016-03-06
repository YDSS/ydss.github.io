if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js', {
        scope: '/test/'
    }).then(function (registration) {
        var serviceWorker;

        if (registration.installing) {
            serviceWorker = registration.installing;
            document.querySelector('#kind').textContent = 'installing';
        } else if (registration.waiting) {
            serviceWorker = registration.waiting;
            document.querySelector('#kind').textContent = 'waiting';
        } else if (registration.active) {
            serviceWorker = registration.active;
            document.querySelector('#kind').textContent = 'active';
        }
        if (serviceWorker) {
            serviceWorker.addEventListener('statechange', function (e) {

            });
        }
    }).catch (function (error) {

    });
}

window.onload = () => {
    fetch('/test/test.css')
    .then(response => {
        return response.text();
    })
    .then(text => {
        console.log(text);
        return text;
    });
}
