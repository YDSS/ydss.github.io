/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	__webpack_require__(2);
	
	if ('serviceWorker' in navigator) {
	    navigator.serviceWorker.register('service-worker.js', {
	        // 控制整个domain
	        scope: '/test/'
	    }).then(function (registration) {
	        var serviceWorker;
	
	        if (registration.installing) {
	            serviceWorker = registration.installing;
	            document.querySelector('#kind').textContent = 'installing';
	            // 安装完成，但还为替换原先的service worker
	        } else if (registration.waiting) {
	                serviceWorker = registration.waiting;
	                document.querySelector('#kind').textContent = 'waiting';
	                // 已生效
	            } else if (registration.active) {
	                    serviceWorker = registration.active;
	                    document.querySelector('#kind').textContent = 'active';
	                }
	        if (serviceWorker) {
	
	            serviceWorker.addEventListener('statechange', function (e) {
	                // logState(e.target.state);
	            });
	        }
	    }).catch(function (error) {
	        // Something went wrong during registration. The service-worker.js file
	        // might be unavailable or contain a syntax error.
	    });
	} else {
	        // The current browser doesn't support service workers.
	    }
	
	window.onload = function () {
	    fetch('/test/test.css').then(function (response) {
	        return response.text();
	    }).then(function (text) {
	        console.log(text);
	        return text;
	    });
	};

/***/ },
/* 2 */
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ }
/******/ ]);
//# sourceMappingURL=app.js.map