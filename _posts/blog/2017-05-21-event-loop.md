---
bg: "tools.jpg"
layout: post
title:  "JavaScript Event Loop"
crawlertitle: "JavaScript Event Loop"
summary: "JavaScript Event Loop"
date:   2017-05-21 21:00:47 +0700
categories: blog
type: blog
tags: ['front-end']
author: YDSS
---
最近遇到一个面试题，内如如下:
```javascript
// 问：打印的顺序
(function () {
    setTimeout(() => console.log(1)); // line 1
    console.log(2);  // line 2
    setTimeout(() => console.log(3)); // line 3
}());
```

乍一看很简单，执行顺序是 2 1 3，答案也是如此，但是被面试官的一个问题问倒了：**为什么line 1会在line 3前面执行？**想了半天，直觉上多次setTimeout，需要执行的callbacks应该会放到一个**先进先出**的队列里，所以line 1的执行优先级比line 3高，line 1先执行。姑且不论这个说法是不是对的，反正当时没有底气，面试完后痛定思痛，决定把它搞清楚

**强烈建议先看看[Philip Roberts: What the heck is the event loop anyway?](http://2014.jsconf.eu/speakers/philip-roberts-what-the-heck-is-the-event-loop-anyway.html)这个video，能让你对Event Loop有个大致的认识，作者讲的也很有趣且易懂**

## Call Stack 与 Task Queue

在JavaScript的执行环境中有一个调用栈，即`call stack`，我们执行的方法都要先压栈，再执行。如下面的栗子：

```javascript
console.log('wow');

function sayHi() {
    console.log(' Hi there');
}

sayHi();

console.log('bye');
```

上述代码的执行过程是这样的：

![sync_process](https://cloud.githubusercontent.com/assets/6086537/26039688/87f4d3ce-3950-11e7-8984-7cbdbcf6aeb9.gif)


如果`sayHi`是一个异步操作呢:

```javascript
console.log('wow');

function sayHi() {
    console.log(' Hi there');
}

setTimeout(sayHi, 0);

console.log('bye');
```

![async_process](https://cloud.githubusercontent.com/assets/6086537/26039693/9b8fd924-3950-11e7-9c93-33f8f74f9f95.gif)

从图中可以看到，setTimeout的callback没有直接压到call stack里，而是消失了5000ms的时间，然后被放到了一个叫`task queue`的队列里。之后再放到call stack里执行。

Task Queue是一个存放js异步操作的队列，setTimeout、setInterval的callbacks都会先放到这里，等timer到约定时间了，再提取出来执行。

有一点值得注意的地方，timer的callbacks并非在执行setTImeout等api时就把callback放到task queue里，而是等timer约定的时间到了，才被放进去

ps：上面的gif是在[javascript执行可视化tool](http://latentflip.com/loupe/)录制的，这个工具可以展示js代码执行过程，是一个非常有意思的工具，大家可以去试一试！

## JS与WebAPI

我们经常把browser提供的api当做是JS语言的API，比如AJAX，就像很多前端小鲜肉总把JQuery和原生JS傻傻分不清一样。**JS是单线程的，在V8或者其他编译器里运行，但是browser是多线程的，它提供了一些能和JS交互的API，是可以并行执行的**。这其中就包括`setTimeout`，`setInterval`这些的我们平时非常常用的API。

有了这个概念，js异步的过程就很清晰了：在`main thread`（js执行线程）里执行代码遇到异步操作，调用浏览器或者底层系统的api（其他线程）执行，把callbacks放到`task queue`里，main thread继续往下执行。等处理结果返回时，执行task queue里的callbacks，把处理结果返回给js

这里有个新的问题：**谁**，去执行task queue里的callbacks呢？Obviously，是Event Loop

## Event Loop的运行机制

> The event loop is what allows Node.js to perform non-blocking I/O operations — despite the fact that JavaScript is single-threaded — by offloading operations to the system kernel whenever possible
> \-\- 取自[node官方文档](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)

上一节我们知道了event loop的职责：**执行task queue里的callbacks**，这一节我们深入分析event loop是怎么做的

loop是循环的意思，简单的说就是`while(true) {}`，event loop就是一个循环，在一个独立的线程里执行（不在main thread里），在browser或者node启动时就开始循环。它一边监听call stack的变化，一边监听task queue的变化，**当call stack为空，且task queue不为空时，开始把task queue里的callbacks放到call stack（JS Runtime）里执行**

![event_loop](https://gw.alicdn.com/tfs/TB1EOntRXXXXXXjXpXXXXXXXXXX-1674-996.png)

- timers: 执行到（或者过了）约定时间的setTimeout()、setInterval()的回调函数
- I/O callbacks: 除了`close callbacks`、timers阶段执行的回调、setImmediate的回调之外，其他callbacks都执行。别被名字骗了，这个阶段并不是只执行I/O相关的回调，并且不是I/O相关的回调都在这里执行，比如`fs.readFile`的回调在`poll`执行
- idle, prepare: only used internally.
- poll: 很重要也最难理解的一个阶段，下一节专门讲
- check: 执行setImmediate()的callbacks
- close callbacks: 像socket.on('close', ...)这样的callbacks在这里执行

## Poll Phase

Poll阶段是event loop里最难理解的阶段，很容易跟timer混淆。从字面上理解，是**投票、决策**的意思。在这个阶段，做两件事儿：

> 1. Executing scripts for timers whose threshold has elapsed, then
> 2. Processing events in the poll queue.

我用流程图来梳理一下：

![poll_phase](https://gw.alicdn.com/tfs/TB1pGGMRXXXXXbdapXXXXXXXXXX-1672-898.png)

> 1. 当event loop进入 poll 阶段，并且 没有设定的timers（there are no timers scheduled），会发生下面两件事之一：

>    - 如果 poll 队列不空，event loop会遍历队列并同步执行回调，直到队列清空或执行的回调数到达系统上限；
>    - 如果 poll 队列为空，则发生以下两件事之一：
>        - 如果代码已经被setImmediate()设定了回调, event loop将结束 poll 阶段进入 check 阶段来执行 check 队列（里的回调）。
>        - 如果代码没有被setImmediate()设定回调，event loop将阻塞在该阶段等待回调被加入 poll 队列，并立即执行。

> 2. 但是，当event loop进入 poll 阶段，并且 有设定的timers，一旦 poll 队列为空（poll 阶段空闲状态）：event loop将检查timers,如果有1个或多个timers的下限时间已经到达，event loop将绕回 **timers** 阶段，并执行 **timer** 队列。

需要注意的是，在poll阶段**先判断是否有timer到了约定的时间**，如果有的话直接返回timer阶段

## MicroTask和MacroTask

对于进入task queue里的callbacks，还有更细的区分，即**MicroTask**和**MacroTask**

MicroTask包含：

- process.nextTick
- Promise
- Object.observe(deprecated)

MacroTask包含：

- setTimeout
- setInterval
- setImmediate
- I/O callbacks

我们在前面几节都在研究MacroTask，下面看一个MicroTask的栗子：

```javascript
console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => {  
  console.log('promise 1')
}).then(() => {
  console.log('promise 2')
});

console.log('end');
```

运行结果是：打印start，打印end， 打印Promise1，打印Promise2，打印timeout

先来说说microtask的执行时机。所有microtask在当前event loop里加入的microtask会在**当前task queue执行完成后，下一个event loop开始前**执行。

再来说上面的栗子，setTimeout和promise.then压栈之后，event loop开始运行。setTimeout的callback在下一个event loop执行，这是task queue是空的，开始执行microtask，打印promise1 2。下一个event loop里，执行setTimeout callback

留一道思考题：

```javascript
(function test() {
    setTimeout(function() {console.log(4)}, 0);
    new Promise(function executor(resolve) {
        console.log(1);
        for( var i=0 ; i<10000 ; i++ ) {
            i == 9999 && resolve();
        }
        console.log(2);
    }).then(function() {
        console.log(5);
    });
    console.log(3);
})()
```

答案在[这里](https://github.com/creeperyang/blog/issues/21)

## 实战

Event Loop的知识点讲完啦，是时候实战一把了。

### setTimeout 0 vs setImmediate

先看栗子1：

```javascript
// timeout_vs_immediate.js
setTimeout(function timeout () {
  console.log('timeout');
},0);

setImmediate(function immediate () {
  console.log('immediate');
});
```

是timeout先执行还是immediate先执行呢？结果是先后顺序是随机的，why？先普及一个知识点，setTimeout 0 === setTimeout 1，因为定时器没有0ms这一说。

我们来还原一下执行过程：

1. setTimeout压栈(call stack)，执行setTimeout，把setTimeout的callback添加到task queue，timer开始计时
2. setImmediate压栈，执行setImmediate，把setImmediate的callback添加到task queue
3. call stack为空，event loop开始介入main thread。
4. 进入timer phase
    - 这时如果已经过去1ms了，那么立即执行setTimeout的callback，打印`timeout` => **timeout先执行**
    - 如果还没有到1ms，继续往下执行
5. 忽略不相关的阶段，直接到poll phase
    - 如果setTimeout的callback没有在time phase执行，那么这里还会在判断一下timer是否到了约定时间，如果到了，返回timer阶段执行 => **timeout先执行**
    - 如果setTimeout的callback没执行且timer也没到约定时间，直接进入下一个阶段`check`，执行setImmediate => **immediate先执行**

再看栗子2：

```javascript
// timeout_vs_immediate.js
var fs = require('fs')

fs.readFile(__filename, () => {
  setTimeout(() => {
    console.log('timeout')
  }, 0)
  setImmediate(() => {
    console.log('immediate')
  })
})
```

这个栗子永远是**immediate先执行**。这里还是要科普一个知识点：`fs.readFile`的callback在**poll phase**里执行。下面还是还原执行过程：

1. fs.readFile压栈，执行readFile
2. call stack为空
2. readFile执行完成后，把事件（[MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/EventLoop)上称其为message)加到**task queue**。
3. event loop结束无操作的循环，进入poll阶段（前几个阶段没有操作）。取出task queue里readFile的callback，压栈到call stack。执行callback。有意思的来了！
4. setTimeout压栈，执行setTimeout，setTimeout的callback进入task queue
5. setImmediate压栈，执行setImmediate，setImmediate的callback进入task queue
6. 因为没有timer，且有setImmediate，直接进入check阶段
7. 在check阶段里，执行setImmediate的callback => **immediate先执行！**

## setTimeout 0 vs process.nextTick

```javascript
console.log('start');

setTimeout(() => console.log('timeout'), 0);

process.nextTick(() => {
  console.log('nextTick')
});

console.log('end');
```

打印结果是：start end nextTick timeout。如果没想明白，往回看看`MicroTask和MacroTask`这一节

## 疑问

- 为什么`readFile`的回调不是在`I/O callbacks`执行，而是在`poll`执行呢？

    本文直接用了结论，并没有解释原因。我自己也拿不准，只说下我的推测。`fs.readFile`无疑是一个有`I/O`操作的API，它的callback也是底层读文件后返回的data，看上去应该在`I/O callbacks`里执行。但是node的API大都通过`eventEmitter`注册回调，我想`fs.readFile`是底层通过event的方式把数据返回给node的，所以在poll里执行。就像socket的`data事件`一样

## Reference

- [node官方文档](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [官方文档的中文翻译版](https://github.com/creeperyang/blog/issues/26)
- [Philip Roberts: What the heck is the event loop anyway?](http://2014.jsconf.eu/speakers/philip-roberts-what-the-heck-is-the-event-loop-anyway.html)
- [Understanding the Node.js Event Loop](https://blog.risingstack.com/node-js-at-scale-understanding-node-js-event-loop/)
- [Concurrency model and Event Loop](https://developer.mozilla.org/en/docs/Web/JavaScript/EventLoop)
- [Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)
- [从Promise来看JavaScript中的Event Loop、Tasks和Microtasks](https://github.com/creeperyang/blog/issues/21)
- [HTML Living Standard](https://html.spec.whatwg.org/multipage/webappapis.html#task-queue)
