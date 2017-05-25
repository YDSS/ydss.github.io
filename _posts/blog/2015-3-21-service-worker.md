---
bg: "tools.jpg"
layout: post
title:  "Service Worker 学习笔记"
crawlertitle: "Service Worker 学习笔记"
summary: "Service Worker 学习笔记"
date:   2015-03-21 18:00:00 +0700
categories: blog
type: blog
tags: ['front-end']
author: YDSS
---
Service Worker挺有意思的，前段时间看了相关的资料，自己动手调了调demo，记录一下学习过程。文中不仅会介绍Service Worker的使用，对`fetch`、`push`、`cache`等Service Worker配套的API都会涉及，毕竟Service Worker与这些API配合使用才能发挥出真正的威力

Chrome对Service Worker的开发者支持较好，**Dev tools**里可以简单的调试，Firefox还未提供调试用的工具，但是对API的支持更好。建议开发和测试的话，在Chrome上进行

文中有把**Service Worker**简写**SW**，不要觉得奇怪~

## Service Worker

> Service workers essentially act as proxy servers that sit between web applications, and the browser and network (when available). They are intended to (amongst other things) enable the creation of effective offline experiences, intercepting network requests and taking appropriate action based on whether the network is available and updated assets reside on the server. They will also allow access to push notifications and background sync APIs.

### Lifecycle

一个ServiceWorker从被加载到生效，有这么几个生命周期：

1. **Installing** 这个阶段可以监听`install`事件，并使用`event.waitUtil`来做Install完成前的准备，比如cache一些数据之类的，另外还有`self.skipWaiting`在serviceworker被跳过install过程时触发

	> for example by creating a cache using the built in storage API, and placing assets inside it that you'll want for running your app offline.

2. **Installed** 加载完成，等待被激活，也就是新的serverworker替换旧的
3. **Activating** 也可以使用`event.waitUtil`事件，和`self.clients.clainm`

	> If there is an **existing** service worker available, the new version is installed in the background, but not yet **activated** — at this point it is called the worker in waiting. **It is only activated when there are no longer any pages loaded that are still using the old service worker**. As soon as there are no more such pages still loaded, the new service worker activates (becoming the active worker).

	**这说明serviceWorker被替换是有条件的，即使有新的serviceworker，也得等旧的没有被使用才能替换**。最明显的体现是，刷新页面并不一定能加载到新闻serviceworker

4. **Activated** 文章上的解释是*the service worker can now handle functional events*
5. **Redundant** 被替换，即被销毁

## Fetch

`fetch`是新的`Ajax`标准接口，已经有很多浏览器原生支持了，用来代替繁琐的`XMLHttpRequest`和`jQuery.ajax`再好不过了。对于还未支持的浏览器，可以用[isomorphic-fetch](https://www.npmjs.com/package/isomorphic-fetch) polyfill。

fetch的API很简洁，[这篇文档](http://github.github.io/fetch/)讲的很清晰。下面记录一下之前被我忽略的2个API

### Response

`Response` 写个fetch的栗子

```js
fetch('/style.css')
        // 这里的response，就是一个Response实例
	.then(response => response.text())
	.then(text => {
		console.log(text);
	});
```

Response的API，列几个比较常用的：

- `Response.clone()` Creates a clone of a Response object. 这个经常用在cache直接缓存返回结果的场景
- `Body.blob()` 这里写的是`Body`，其实调用接口还是用`response`，这里取`Blob`数据的数据流。**MDN**是这么说的：

	> Response implements Body, so it also has the following methods available to it:
- `Body.json()`
- `Body.text()`
- `Body.formData()` Takes a Response stream and reads it to completion. It returns a promise that resolves with a FormData object.

### Request

`Request`应该不会单独`new`出来使用，因为很多Request相关的参数，在Request的实例中都是**只读**的，而真正可以配置Request属性的地方，是`fetch`的第二个参数：

```js
// fetch的第一个参数是URI路径，第二个参数则是生成Request的配置，
// 而如果直接传给fetch一个request对象，其实只有URI是可配置的，
// 因为其他的配置如headers都是readonly，不能直接从Request处配置
let request = new Request('./style.css');

request.method = 'POST'; // Uncaught TypeError: Cannot set property method of #<Request> which has only a getter

fetch(request).then(response => response.text())
    .then(text => {
        console.log(text);
    });
```

## Cache

[Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)是Service Worker衍生出来的API，配合Service Worker实现对**资源请求**的缓存。

有意思的是cache并不直接缓存字符串（想想localstorage），而是直接缓存资源请求（css、js、html等）。cache也是`key-value`形式，一般来说key就是**request**，value就是**response**

### API

- `caches.open(cacheName)` 打开一个cache，`caches`是*global*对象，返回一个带有cache返回值的`Promise`
- `cache.keys()` 遍历cache中所有键，得到value的集合

	```js
	caches.open('v1').then(cache => {
	    // responses为value的数组
	    cache.keys().then(responses => {
	        responses.forEach((res, index) => {
	            console.log(res);
	        });
	    });
	});
	```
- `cache.match(Request|url)` 在cache中匹配传入的request，返回`Promise`；`cache.matchAll`只有第一个参数与match不同，需要一个request的数组，当然返回的结果也是response的数组
- `cache.add(Request|url)` 并不是单纯的add，因为传入的是request或者url，**在cache.add内部会自动去调用fetch取回request的请求结果**，然后才是把response存入cache；`cache.addAll`类似，通常在`sw` install的时候用`cache.addAll`把所有需要缓存的文件都请求一遍
- `cache.put(Request, Response)` 这个相当于`cache.add`的第二步，即fetch到response后存入cache
- `cache.delete(Request|url)` 删除缓存

### Tips

> Note: Cache.put, Cache.add, and Cache.addAll only allow GET requests to be stored in the cache.
>
> As of Chrome 46, the Cache API will only store requests from secure origins, meaning those served over HTTPS.

## Service Worker通信

Service Worker是`worker`的一种，跟`Web Worker`一样，不在浏览器的主线程里运行，因而和`Web Worker`一样，有跟主线程通信的能力。

### postMessage

`window.postMessage(message, target[, transfer])`这个API之前也用过，在`iframe`之间通信（`onmessage`接收信息）。简单记下参数：

- message 可以是字符串，或者是JSON序列化后的字符串，在接收端保存在`event.data`里
- target 需要传输的URL域，具体看[API文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- transfer 用mdn的说法，是一个`transferable`的对象，比如`MessagePort`、`ArrayBuffer`

另外说明一点，postMessage的调用者是被push数据一方的引用，即我要向sw post数据，就需要sw的引用

**注意，上面的postMessage是在document中使用的。在sw的context里使用略有不同：*没有target参数*。**具体看这个[API文档](https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage)

### 在sw中与主线程通信

先看个栗子：

```js
// main thread
if (serviceWorker) {
	// 创建信道
        var channel = new MessageChannel();
        // port1留给自己
        channel.port1.onmessage = e => {
            console.log('main thread receive message...');
            console.log(e);
        }

	// port2给对方
        serviceWorker.postMessage('hello world!', [channel.port2]);
        serviceWorker.addEventListener('statechange', function (e) {
            // logState(e.target.state);
        });
    }

// sw
self.addEventListener('message', ev => {
    console.log('sw receive message..');
    console.log(ev);
    // 取main thread传来的port2
    ev.ports[0].postMessage('Hi, hello too');
});
```

在sw里需要传递`MessagePort`，这个是由`MessageChannel`生成的通信的两端，在己方的一端为`channel.port1`，使用`channel.port1.onmessage`即可监听从另一端返回的信息。而需要在postMessage里传的是`channel.port2`，给另一端postMessage使用。在sw端通过监听`message`事件就可以监听到主线程的postMessage，在`message`的`event.ports[0]`里即可找到主线程传过来的port，之后就可以用`event.ports[0].postMessage`来向主线程发送信息了。

### MessageChannel

这里用到了[`MessageChannel`](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API)。这是一个很简单的APi，完成在两个不同的cotext中通信的功能。

在上面已经提到了，MessageChannel在一端创建，然后用`channel.port1.onmesssage`监听另一端post的message，而将`channel.port2`通过postMessage的第二个参数（transfer）传给另一端，让另一端也能用`MessagePort`做同样的操作。

**需要注意的是`channel`的port1和port2的区别**：port1是`new` MessageChannel的一方需要使用的，port2是另一方使用的

## Push API

如果说`fetch`事件是sw拦截*客户端请求*的能力，那么`push`事件就是sw拦截*服务端“请求”*的能力。这里的“请求”打了引号，你可以把Push当成`WebSocket`，也就是服务端可以主动推送消息到客户端。

与WebSocket不同的是，服务端的消息在到达客户端之前会被sw拦截，要不要给浏览器，给什么，可以在sw里控制，这就是Push API的作用。

### push-api-demo

MDN上有个[push-api-demo](https://github.com/chrisdavidmills/push-api-demo)，是个简易聊天器。具体搭建的方法在这个repo上有，不再赘述。因为有些Push API只有**Firefox Nightly**版本支持，所以demo也只能跑在这个浏览器上，我还没下好，没跑起来，等明天看吧~

记几个Push API：

- `ServiceWorkerRegistration.showNotification(title, options)` 这个可以理解成`alert`的升级版，网页版的wechat的通知就是这个。
- `Notification.requestPermission()` 提示用户是否允许浏览器通知
- `PushManager` Push API的核心对象，注册Push API从这里开始，放在` ServiceWorkerRegistration`里
	- `PushManager.subscribe` 返回一个带有[PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription)的Promise，通过PushSubscription对象才能生成公钥（`PushSubscription.getKey()`，这个方法只有firefox有，这也是chrome不能执行的原因），获取`endpoint`
	- `PushManager.getSubscription()` 获取当前注册好的PushSubscription对象
- `atob()`和`btob()` 意外捡到两个API，用于浏览器编码、解码base64

还是看个栗子：

```js
// 浏览器端的main.js, 代码来自push-api-demo
navigator.serviceWorker.ready.then(function(reg) {
	// 注册push
        reg.pushManager.subscribe({userVisibleOnly: true})
           // 得到PushSubscription对象
          .then(function(subscription) {
            // The subscription was successful
            isPushEnabled = true;
            subBtn.textContent = 'Unsubscribe from Push Messaging';
            subBtn.disabled = false;

            // Update status to subscribe current user on server, and to let
            // other users know this user has subscribed
            var endpoint = subscription.endpoint;
            // 生成公钥
            var key = subscription.getKey('p256dh');
            // 这一步是个ajax，把公钥和endpoint传给server，因为是https所以不怕公钥泄露
            updateStatus(endpoint,key,'subscribe');
          })
});

// 服务端 server.js，接收并存下公钥、endpoint
...
} else if(obj.statusType === 'subscribe') {
// bodyArray里是ajax传上来的key和endpoint
    fs.appendFile('endpoint.txt', bodyArray + '\n', function (err) {
      if (err) throw err;
      fs.readFile("endpoint.txt", function (err, buffer) {
        var string = buffer.toString();
        var array = string.split('\n');
        for(i = 0; i < (array.length-1); i++) {
          var subscriber = array[i].split(',');
          webPush.sendNotification(subscriber[2], 200, obj.key, JSON.stringify({
            action: 'subscribe',
            name: subscriber[1]
          }));
        };
      });
    });
  }
  ...

  // 还是服务端 server.js，推送信息到service worker
  if(obj.statusType === 'chatMsg') {
  	// 取出客户端传来的公钥和endpoint
    fs.readFile("endpoint.txt", function (err, buffer) {
      var string = buffer.toString();
      var array = string.split('\n');
      for(i = 0; i < (array.length-1); i++) {
        var subscriber = array[i].split(',');
     // 这里用了web-push这个node的库，sendNotification里有key，说明对信息加密了
        webPush.sendNotification(subscriber[2], 200, obj.key, JSON.stringify({
          action: 'chatMsg',
          name: obj.name,
          msg: obj.msg
        }));
      };
    });
  }
```

### Client端

1. 进入页面后先注册`ServiceWorker`，然后**subscribe** `PushManager`，把**公钥**和**endpoint**传给Server端（ajax）保存下来，便于之后的通信（都是加密的）
2. 然后创建一个`MessageChannel`与`ServiceWorker`通信

准备工作到这里就做完了。Client与Server端的通信还是ajax，聊天室嘛就是传用户发送的消息。`ServiceWorker`去监听`push`事件接住Server端push来的数据，在这个demo里都是Server端接到Client的ajax请求的响应，当然也可以又Server端主动发起一个push。**当同时有两个以上的Client都与这个Server通信，那么这几个Client能看到所有与Server的消息，这才是聊天室嘛，不过要验证至少需要两台机器**

### Server端

一个*HTTPS*服务，加了`Web-Push`这个module，这里面肯定有用公钥和endpoint给push信息加密的功能。`webPush.sendNotification`这个API能把Server端的push消息**广播**到所有的Client端

[Web-push](https://www.npmjs.com/package/web-push)这个库还得看看

## MDN Demo：sw-test

MDN上有[一个完整的使用Service Worker的Demo](https://github.com/mdn/sw-test/)，一个简易的聊天室，可以自己玩玩儿。

这个demo的思路是：`install`时`fetch`需要缓存的文件，用`cache.addAll`缓存到`cacheStorage`里。在`fetch`事件触发时，先`cache.match`这些缓存，若存在则直接返回，若不存在则用`fetch`抓这个request，然后在`cache.put`进缓存。

## 调试ServiceWorker

### Dev tools

> Chrome has **chrome://inspect/#service-workers**, which shows current service worker activity and storage on a device, and **chrome://serviceworker-internals**, which shows more detail and allows you to start/stop/debug the worker process. In the future they will have throttling/offline modes to simulate bad or non-existent connections, which will be a really good thing.

最新的`Chrome`版本，`Dev tools`的**Resource**选项卡里已经添加了`Service Workers`，可以查看当前页面是否有使用Service Worker，和它当前的生命周期

### 卸载上一个activated的service worker的方法

`service worker`很顽强，一个新的`service worker` install之后不能直接`active`，需要等到所有使用这个service worker的页面都卸载之后能替换，不利于调试。今天试出来一个**100%能卸载的方法**：

1. `chrome://inspect/#service-workers`中terminate相应的service worker
2. `chrome://serviceworker-internals/`中unregister相应的service worker
3. 关闭调试页面，再打开

调试service worker可以在`chrome://inspect/#service-workers`里inspect相应的Devtool

## Tricks

- 如果在缓存中找不到对应的资源，把拦截的请求发回原来的流程

	> If a match wasn’t found in the cache, you could tell the browser to simply fetch the default network request for that resource, to get the new resource from the network if it is available:

	> ```js
	fetch(event.request)
	```

- 复制response的返回结果，下次直接从cache里取出来用

	> ```js
	this.addEventListener('fetch', function(event) {
	  event.respondWith(
	    caches.match(event.request).catch(function() {
	      return fetch(event.request).then(function(response) {
	        return caches.open('v1').then(function(cache) {
	          cache.put(event.request, response.clone());
	          return response;
	        });  
	      });
	    })
	  );
	});
	```

- cache未命中且网络不可用的情况，这里`Promise`用了两次`catch`，第一次还报错的话第二次catch才会执行

	>```js
	this.addEventListener('fetch', function(event) {
	  event.respondWith(
	    caches.match(event.request).catch(function() {
	      return fetch(event.request).then(function(response) {
	        return caches.open('v1').then(function(cache) {
	          cache.put(event.request, response.clone());
	          return response;
	        });  
	      });
	    }).catch(function() {
	      return caches.match('/sw-test/gallery/myLittleVader.jpg');
	    })
	  );
	});
	```

- `activated`之前清除不需要的缓存

	```js
	this.addEventListener('activate', function(event) {
	  var cacheWhitelist = ['v2'];

	  event.waitUntil(
	    caches.keys().then(function(keyList) {
	      return Promise.all(keyList.map(function(key) {
	        if (cacheWhitelist.indexOf(key) === -1) {
	          return caches.delete(key);
	        }
	      }));
	    })
	  );
	});
	```

- 伪造Response

	```js
	// service-worker.js
	self.addEventListener('fetch', ev => {
	    var reqUrl = ev.request.url;
	    console.log('hijack request: ' + reqUrl);
	    console.log(ev.request);

	    // 若是text.css的请求被拦截，返回伪造信息
	    if (reqUrl.indexOf('test.css') > -1) {
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
	```

	```js
	// app.js
	window.onload = () => {
	    // 请求test.css
	    fetch('/service-worker-demo/test.css')
	    .then(response => {
	        return response.text();
	    })
	    .then(text => {
	        console.log('text.css: ' + text); // 在service worker install时返回真实的文本，在sw active时返回hahah，即伪造的文本
	        return text;
	    });
	}
	```

## 未解之谜

1. `serviceworker.register(url, { scope: 'xxx' })`，这里的`scope`似乎没用。在这个scope上级的静态资源请求也会被`fetch`拦截，在`HTTPS`上也无效，可以看看[这个demo](https://ydss.github.io/service-worker-demo/)



## Reference

- [Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Using the Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Using_the_Push_API)
- [PushManager](https://developer.mozilla.org/en-US/docs/Web/API/PushManager)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker MDN demo](https://github.com/mdn/sw-test/)
- [当前端也拥有 Server 的能力](http://www.barretlee.com/blog/2016/02/16/when-fe-has-the-power-of-server)
