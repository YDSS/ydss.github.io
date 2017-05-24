---
bg: "tools.jpg"
layout: post
title:  "基于React的同构JS解决方案"
crawlertitle: "基于React的同构JS解决方案"
summary: "基于React的同构JS解决方案"
date:   2016-04-17 12:00:00 +0700
categories: blog
type: blog
tags: ['front-end']
author: YDSS
---
越来越多的开发者开始使用`react`来构建网站，`react`作为**用JS渲染页面**的技术，相比**Server端直出**的页面存在一些问题，比如`SEO`。当然，有很多思路可以解决这些问题，**同构JS**就是其中一种。我理解的同构JS，它解决问题的思路是让用`react`构建的页面在某些方面**更像**Server端直出的页面。以下列举了我在实践中遇到的几个问题：

### SEO

我自己写了一个Blog站点，放到了阿里云上，自己写得很High，但是Blog上的文章一篇都没被搜索引擎收录，因为现在的搜索引擎还不能很好的解析**JS动态生成的内容**。相信很多用`react`构建的站点都有**SEO**的问题（或者他们不在乎SEO）。

有很多思路可以解决这个问题（比如给搜索引擎一个html的快照），同构JS是最直接的一种。

### 性能问题

这里的性能问题主要是跟**非JS渲染的站点**相比。比如天猫基于**斑马平台**的页面，是在服务端就生成好了，浏览器直接渲染就可以了；而基于`react`的站点，需要等待**框架相关的JS资源**（如`webpack` core文件，`react`）加载完成、异步数据加载完成，才能开始渲染。

### 路由问题

还是回到我写的Blog站点。我有每天写日记的习惯，日记的路由是`/diary/view/2016-04-05`，path的最后一段是日记的日期。这里用到了`react-router`来管理路由，而且用`browserHistory`作路由状态的展示（让路由跟非JS渲染的站点一致），那么问题来了：如果我想把某篇路由的URI分享出去给大家访问，`domain.xxx.com/diary/view/2016-04-05`是不能访问的，因为前端的路由**并不能直接对应到某个资源，而是需要一个访问的过程**。比如上面的URI，我需要先访问`domain.xxx.com`，然后找到日历，选中`2016年4月5号`，done。如果缺少这个中间过程，你得到的就是一个404页面。

## 同构JS

也叫`Universal JS`，说简单点就是在Server端和Client端能运行同一套用于UI展示的代码（这里是react）。同构JS的原理很简单：**对于每个路由，在Server端跑出一份带数据的模板字符串，直接返回给浏览器渲染**。为了达到这个目的，Server端必须能运行JS，因此Node是目前最好的选择。

这里有一个[同构JS的demo](https://github.com/erikras/react-redux-universal-hot-example)，大家有兴趣可以研究一下

### 如何让React在Server端运行

`babel6`之前在node上运行react需要引入[node-jsx](https://www.npmjs.com/package/node-jsx)插件，现在可以直接通过`babel`+`react-preset`，在编译`es2015`的时候顺带编译`react`，有两种方式：
1. 通过`babel-register`运行时编译
2. 通过`babel` build出转换成es5和不带`jsx`的react代码，引入`babel-polyfil`

### React In Server

**Server端是没有DOM的！**所以如果你的组件需要在Server端运行， 不要在`componentDidMount`和`componentWillUnmount`中写Server端相关的逻辑，因为它只在Client端才会被执行。

`react1.14`及之后的版本中，DOM相关的代码都被抽离到[react-dom](https://www.npmjs.com/package/react-dom)里了。目前与`react`在Server端运行相关的API有：
1. `ReactDOM.renderToString` 将组件转换成html
2. `ReactDOM.renderToStaticMarkup` 输出基本与`renderToString`相同，只是渲染出的dom不带`data`属性

## 后端API数据接口设计

鉴于天猫的数据接口与Server端本来就是分离的，其实本没什么好说的，这里只略带提一下。数据接口必须保证前后端都能正常调用且结果一致。如果数据接口另起服务，那就没问题，否则最好把数据接口的路由与页面的路由区分开

**注意：Server端不能使用相对路径的request比如`/diary/view/xxx`请求数据，所以在Server端加上domain**

## Redux相关的知识

一张图看懂`redux`：

![redux](https://cloud.githubusercontent.com/assets/6086537/14625360/03218260-0615-11e6-916c-14841ade0df5.jpg)
1. **reducer** 在这里定义state如何变化，这也是唯一能改变state的地方，这是一个counter的栗子：

   ``` js
   const initialState = {
       count: 0
   };

   export default function counter(state = initialState, action) {
       switch (action.type) {
           case INCREMENT_SUCCESS:
               return {
                   count: action.payload.count
               };
               break;

           case GET_COUNT_SUCCESS:
               return {
                   count: action.payload.count
               };
               break;

           default:
               return state;

       }

   }
   ```
2. **action** 可以理解成事件，触发后在reducer里改变state。比如counter的栗子，+1，-1取当前count，所有这些动作通过`action`告诉`reducer`
3. **store** 保存state的地方，每个redux应用只有一个，可以看成树。

## Step By Step构建一个同构JS应用

### 1. 配置路由表

用`react-router`配置路由规则：

``` js
// route.js
import React from 'react';
import {IndexRoute, Route} from 'react-router';

import App from './container/App.jsx';
import Home from './container/Home.jsx';
import About from './container/About.jsx';

const route = (
    <Route path='/' component={App}>
        <IndexRoute component={Home}/>
        <Route path='about' component={About}/>
    </Route>
);

export default route;
```

我上面配置了index的路由`/`，和一个`/about`，分别使用`Home`组件和`About`组件

### 2. Client端入口文件

因为很多东西在Client端和Server端都会用到，所以最好在全局变量里挂一个或多个能区分是Client端还是Server端的标识。我的做法是**在Client端用`webpack.DefinePlugin`注入一个`__CLIENT__`变量，Server端在入口文件里把这个变量挂载到`global`上。

``` js
plugins: [
    new webpack.DefinePlugin({
        __CLIENT__: true,
        __DEVELOPMENT__: true,
        __DEVTOOLS__: true
    })
]
```

在Client端的入口文件里，我们做这几件事儿：
1. 把Server端打印到页面的数据纳入`store`。前文提到的**白屏问题**的解决方法是Server端把数据打到页面上，在client端，我们需要把这些打在页面上的数据作为**初始数据**放到store里（store里的数据只能通过action做修改，所以只能在创建store的时候导入初始数据，具体移步[createStore](http://redux.js.org/docs/api/createStore.html)）。假设页面数据通过`window.__data`挂载：

   ``` js
   const store = createStore(reducer, window.__data);
   ```
2. 用`<Provider>`连接`redux`和`react`。redux的state会通过react组件的props传递下去

   ``` js
   const component = (
       <Provider store={store} key='provider'>
           <Router history={browserHistory}
               render={(props) => <ReduxAsyncConnect {...props}/>}>
               {/* route是step 1中route.js export的变量，即路由表 */}
               {route}
           </Router>
       </Provider>
   );    
   ```

   这里用到了[react-async-connect]()包的`<ReduxAsyncConnect>`，它的作用是**阻塞当前路由的渲染**，直到该路由包含的组件里异步请求都执行完成。
3. 用`ReactDOM.render`渲染。

### 3. Server端入口文件

Server端对于路由的处理跟Client端有很大不同。我用`exprees`作Server端MVC框架，这里的路由全权交给`react-router`处理

react-router提供的[match](https://github.com/reactjs/react-router/blob/master/docs/API.md#match-routes-location-history-options--cb)函数是专为Server端渲染准备的，它负责匹配request请求中的url，返回符合路由规则的组件集合。

``` js
const router = express.Router();

router.use((req, res) => {
    const history = createHistory(req.originalUrl);

    match({
        location: req.originalUrl,
        routes: route,
        history
    }, (err, redirectLocation, renderProps) => {
        // 匹配出错
        if (err) {
            res.status(500);
            res.send('err: ' + err.message);
        }
        // 匹配成功
        else if (renderProps) {
            const store = createStore(reducer);

            // loadOnServer是redux-async-connect的方法，负责在Server端请求组件所需的数据
            loadOnServer({...renderProps, store}).then(() => {
                const component = (
                    <Provider store={store} key='provider'>
                        <div>
                            <ReduxAsyncConnect {...renderProps} />
                        </div>
                    </Provider>
                );

                // 这里把组件转成html字符串返回
                const template = ReactDOM.renderToString(<Html component={component} store={store}/>);

                res.send('<!doctype html>\n' + template);
            });
        }
        // 404
        else {
            res.status(404);
            res.send('Not found');
        }
    });
});

```
### 4. 首屏数据加载

在step 3里出现了`<Html>`组件，它是一个辅助组件，用来拼合html通用的部分（比如通用头尾），和把数据打印到页面

```javascript
// html.js
import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom/server';
import conf from '../conf';

class Html extends Component {

    static propTypes = {
        component: PropTypes.node,
        store: PropTypes.object
    }

    render() {
        const {component, store} = this.props;
        const content = component ? ReactDOM.renderToString(component) : '';
        return (
            <html>
                <head>
                    <title>React Universal App Demo</title>
                </head>
                <body>
                    <div id='content' dangerouslySetInnerHTML=\{\{__html: content\}\}></div>
                    // 这里定义的window.__data
                    <script dangerouslySetInnerHTML=\{\{__html: `window.__data=${JSON.stringify(store.getState())}`\}\}/>
                    <script src={`${conf.host}:${conf.webpackDevPort}/app.js`}></script>
                </body>
            </html>
        );
    }

}

export default Html;
```
## 附录
### Container Component和Persistential Component

这两个概念，`Presentational Component`和`Container Component`，是写`React`和`Redux`的关键。`React`是以数据流为中心的，把**可操作数据流的component**和**只关心展现的component**分开，可以极大的提高**展现component**的复用性，其实就是降低只负责展现的component与业务的耦合度。

`Presentational Component`就是只关心展现的component，不需要关心数据的变化，甚至不需要自身的state，只从`props`里取数据或者操作数据的函数。在粒度很细的组件里非常适用，这些组件一般不需要`@connect`

`Container Component`不仅需要关心数据的流转，还要把操作这些数据的函数传给`Presentational Component`，是数据处理的中心

[Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0#.w0gqdz70v)这篇文章将的很详细
### react-async-connect源码解析
#### reducer

使用这个库需要在你的reducer里绑定它提供的一个reducer，主要作用是记录异步加载所有`@asyncConnect`对应promise的状态，`loaded`，`loading`和`@asyncConnect`里定义的key

这是绑定reducer的示例：

``` js
import {combineReducers} from 'redux';
import {reducer as reduxAsyncConnect} from 'redux-async-connect';

import counter from './counter';

export default combineReducers({
    // redux-async-connect的reducer
    reduxAsyncConnect,
    counter
});
```
#### asyncConnect

这个_decorator_负责的部分是**给每个用它注解的Component赋值`reduxAsyncConnect`属性，该属性的值即是`asyncConnect`中的key的value（当然这个属性可以直接在需要async的Component里声明 [see this](https://github.com/Rezonans/redux-async-connect/blob/master/docs/API.MD#reduxasyncconnect-static-method)，之后无论是server端请求（`loadOnServer`）还是client端请求(`loadAsyncData`）都会执行`Component.reduxAsyncConnect`异步取数据。而这些在`asyncConnect`里定义的key，最终都会作为`mapStateToProps`被绑定到`react-redux`的`connect`里

``` js
export function asyncConnect(mapStateToProps) {
  return Component => {
    Component.reduxAsyncConnect = (params, store, helpers) => componentLoadCb(mapStateToProps, params, store, helpers);

    const finalMapStateToProps = state => {
        /**
         * @question: what is state.reduxAsyncConnect?
         */
      return Object.keys(mapStateToProps).reduce((result, key) => ({...result, [key]: state.reduxAsyncConnect[key]}), {});
    };

    /**
     * @note finially it use react-redux connect to bind promised result to compoent
     */
    return connect(finalMapStateToProps)(Component);
  };
}
```
#### loadOnServer

这就很简单啦，把所有带`reduxAsyncConnect`的Component都拉出来，在server端请求数据
#### ReduxAsyncConnect

这个`Component`需要放在router的顶端，即所有的数据都从它开始向下流转，这样才能保证所有异步请求都能执行完成（通过库里的reducer来判断是否异步加载完成）。

`ReduxAsyncConnect`的render使用了`react-router`的[<RouterContext>](https://github.com/reactjs/react-router/blob/master/docs/API.md#routercontext)
### React Router原理剖析

[深入理解 react-router 路由系统](https://mp.weixin.qq.com/s?__biz=MzAxODE2MjM1MA==&mid=401288639&idx=2&sn=2b52390b9559764a700a75f0118a7dd4&scene=1&srcid=0418LZVRQe4dBiQsczFn6Oth&key=b28b03434249256b06526725c814c50166beb1381010165d056c45e7d4654a8f141d76f5b199955899b28bf5eb1d12e1&ascene=0&uin=ODg0NzY5MTIw&devicetype=iMac+MacBookPro11%2C4+OSX+OSX+10.11.4+build%2815E65%29&version=11020201&pass_ticket=EvTRZI8Wx3PJOXXejhdvcYxfE5tM1N0U9hldoYqSQbOVTeN%2FPiOqU1Oi3POYMwjX)
