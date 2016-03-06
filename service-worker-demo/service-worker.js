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

	module.exports = __webpack_require__(3);


/***/ },
/* 1 */,
/* 2 */,
/* 3 */
/***/ function(module, exports) {

	'use strict';
	
	// installing状态时触发, 可使用event.waitUtil block install过程
	self.addEventListener('install', function (event) {
	    // event.waitUntil(
	    // caches.open(CURRENT_CACHES['prefetch']).then(function(cache) {
	    //     cache.addAll(urlsToPrefetch.map(function(urlToPrefetch) {
	    //         return new Request(urlToPrefetch, {mode: 'no-cors'});
	    //     })).then(function() {
	    //         console.log('All resources have been fetched and cached.');
	    //     })
	    // }).catch(function(error) {
	    //     console.error('Pre-fetching failed:', error);
	    // })
	    // );
	});
	
	// service worker在activated之前触发
	self.addEventListener('activate', function (ev) {});
	
	// 客户端请求service worker控制的域名时触发
	self.addEventListener('fetch', function (ev) {
	    console.log('fetch');
	    ev.respondWith(new Response('gotach!', {
	        headers: { 'Content-Type': 'text/plain' }
	    }));
	    // return fetch(ev.request);
	});

/***/ }
/******/ ]);
//# sourceMappingURL=service-worker.js.map