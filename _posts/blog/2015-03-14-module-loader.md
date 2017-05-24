---
bg: "tools.jpg"
layout: post
title:  "Module Loader学习笔记"
crawlertitle: "Module Loader学习笔记"
summary: "Module Loader学习笔记"
date:   2015-03-14 20:09:47 +0700
categories: blog
type: blog
tags: ['front-end']
author: YDSS
---
今天遇到一个组件之间传递数据的问题，由此展开了对`模块加载器`新一轮的学习。在该文档里记录下这段学习经历，以便后查。

RequireJs 与 SeaJs 的区别
-------------------------------

> BTW: 如果你还是习惯在部署上线前把所有js文件合并打包成一个文件，那么seajs和requirejs其实对你来说并无区别。

与其说是这两个加载器之间的区别，倒不如说是`AMD`与`CMD`规范之间的区别。这两种规范我都没仔细看过，先留下链接以待日后细究：

- CMD标准 [https://github.com/cmdjs/specification/...](https://github.com/cmdjs/specification/blob/master/draft/module.md)
- AMD标准 [https://github.com/amdjs/amdjs-api/...](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)

--------------------------------------------------

1. 大家公认的最大区别在**模块的执行顺序**上。这里照搬一个帖子里的对比：
	```javascript
	define(function(require, exports, module) {
	    console.log('require module: main');

	    var mod1 = require('./mod1');
	    mod1.hello();
	    var mod2 = require('./mod2');
	    mod2.hello();

	    return {
	        hello: function() {
	            console.log('hello main');
	        }
	    };
	});
	```
	> 运行结果应该是顺序的(sea.js下的结果)：
	>	require module: main
		require module: mod1
		hello mod1
		require module: mod2
		hello mod2
		helo main

	> 而不应该是异步的require.js下：
	>	reqire module: mod2
		require module: mod1
		require module: main
		hello mod1
		hello mod2
		helo main

	从上面的结果很容易看出:

	> 对于依赖的模块，AMD 是__提前执行__，CMD 是__延迟执行__。不过 RequireJS 从 2.0 开始，也改成可以延迟执行（根据写法不同，处理方式不同）。CMD 推崇 as lazy as possible.

	**PS: 这里说的执行是指`factory`，也就是`define`中我们写的`function`的执行时机**

2. `Requirejs`和`Seajs`的`API`也有很多不同之处

	> AMD 的 API 默认是一个当多个用，CMD 的 API 严格区分，推崇职责单一。比如 AMD 里，require 分全局 require 和局部 require，都叫 require。CMD 里，没有全局 require，而是根据模块系统的完备性，提供 seajs.use 来实现模块系统的加载启动。CMD 里，每个 API 都简单纯粹。

3. 在试用`RequireJS`时发现，`RequireJs`推崇`require`的依赖声明提前，而非用时再声明依赖。
	```js
		// 方式一：依赖声明前置
		define(
			['mod1', 'mod2', 'mod3'],
			function(require) {
				.....
			}
		);

		// 方式二：依赖用时声明
		define(
			function(require) {
				var mod1 = require('mod1');
				...
				var mod2 = require('mod2');
				...
				var mod3 = require('mod3');
				...
			}
		);
	```
这是因为使用`方式二`的话，`RequireJS`需要额外的**扫描**该`factory`提取出依赖的模块声明，再进行加载，这比`方式一`来说显然多走一步，性能会有下降。但是就编程逻辑而言，显然`方式二`更贴切，因而`RequireJS`提供优化工具`r.js`在编译时可将`方式二`的依赖提前。之前看过`seajs`的源码，对于这种情况，`seajs`也需要用**正则**扫描代码，不知道`spm`是不是也有类似`r.js`的处理。

**PS**: 在 `FIS2`中，js 框架使用`mod.js`作为模块加载器使用。实际上`mod.js`不能算`AMD`或者`CMD`的任何一种。因为它并没有完全实现这两种规范的任何一种（**比如依赖关系都是由`fis`生成并管理的。`fis`在编译会生成一个 `map.json`文件，里面存放了所有 js 的`依赖关系`和`资源ID`等**），很多活儿都交给了`fis`。但**单就`模块加载`来说，`mod.js`遵循`AMD`规范，也就是**提前执行**所有的模块。**

**PS：**`amd`和`cmd`方式各有优劣，但我们使用 `fisp`必然会用到`mod.js`，所以顺带学习了`mod.js`的源码。

RequireJs学习
----------------------

### 配置
- baseUrl
	定义`requirejs`查找所有模块的`跟路径`，如果没有设置，则使用当前页面的路径。

	**注意：**该配置与`data-main`属性有冲突。如果使用`data-main`来加载第一个模块，`requirejs`会认为`data-main`的值除去模块名的部分为`baseUrl`，需小心使用。
- paths
	基于`baseUrl`设置模块相对路径的简写。example：

	```js
		require.config({
			paths: {
               jquery: 'lib/jQuery/2.1.3/jquery-2.1.3'
           }
        });

		// 然后可以直接使用 jquery 来require
		var $ = require('jquery');
	```
- bundles
	将几个模块绑定到一起，如果有一个触发加载，其他的一起加载
	```js
	requirejs.config({
	    bundles: {
	        'primary': ['main', 'util', 'text', 'text!template.html'],
	        'secondary': ['text!secondary.html']
	    }
	});

	require(['util', 'text'], function(util, text) {
	    //The script for module ID 'primary' was loaded,
	    //and that script included the define()'d
	    //modules for 'util' and 'text'
	});
	```
- shim
	用来声明一些未支持`amd`或者不需要支持`amd`的类库，比如`jquery`的插件，本来就不需要包装。[shim与Polyfill的区别](http://www.cnblogs.com/ziyunfei/archive/2012/09/17/2688829.html)
	- 适用于未支持`amd`的库，对于已经支持的库（比如已经被`define`包裹），`requirejs`可能不能正常工作
	- 只是声明依赖，并不会触发`load`
	- example
	```js
		require.config({
            //baseUrl: 'src',
            paths: {
                jquery: 'lib/jQuery/2.1.3/jquery-2.1.3'
            },
            shim: {
                'unveil': {
                    dep: ['jquery'],
                    exports: 'jQuery.fn.unveil'
                }
            }
        });
	```

	> The shim config only sets up code relationships. To load modules that are part of or use shim config, a normal require/define call is needed. Setting shim by itself does not trigger code to load.

- map
	`path`可以将路径映射为`别名`，不过有时候我们想对不同的模块使用相同的`别名`，这时就可以使用`map`配置。举个栗子：
	```js
		requirejs.config({
		    map: {
		        'some/newmodule': {
		            'foo': 'foo1.2'
		        },
		        'some/oldmodule': {
		            'foo': 'foo1.0'
		        }
		    }
		});
	```			
	文件目录结构如下：
	- foo1.0.js
	- foo1.2.js
	- some/
		- newmodule.js
		- oldmodule.js

	如果在`some/newmodule.js`中使用`var foo = require('foo');`，这时调用的是`foo1.2.js`。同理，如果`some/oldmodule.js`中使用上述代码，调用的是`foo1.0.js`。

	另外`map`中可以使用全局通配符`*`
	```js
		requirejs.config({
		    map: {
		        '*': {
		            'foo': 'foo1.2'
		        },
		        'some/oldmodule': {
		            'foo': 'foo1.0'
		        }
		    }
		});
	```
	上面的配置可以这么理解，**除了在`some/oldmodule.js`中引用`foo`会调用`foo1.0.js`，其他的引用都指向`foo1.2.js`。
	**注意：** `map`中不能使用`相对路径`，只用于`amd`模块。
- config
	该属性用作给模块传递参数（例如后端模板打印在页面的参数）。
	```js
		require.config({
		    config: {
			    // 模块名
		        'bar': {
			        // 需传递的参数
		            size: 'large'
		        }
		    }
		});

		//bar.js,
		define(function (require, exports, module) {
		    //Will be the value 'large'
		    // 使用 module的 config 方法获取参数
		    var size = module.config().size;
		});
	```
	如果是传给`package`的参数则有所区别
	```js
		requirejs.config({
		    // 将一个 API key传给 pixie 这个package，需传给package的 main.js而非直接传递给 package
		    config: {
		        'pixie/index': {
		            apiKey: 'XJKDLNS'
		        }
		    },
			// package声明
		    packages: [
		        {
		            name: 'pixie',
		            main: 'index'
		        }
		    ]
		});
	```
- 其他配置
	还有一些其他的配置项，例如`packages`,`waitSeconds`等等比较简单的配置，这里就不赘述了。

- 插件
	`requirejs`的社区提供了一些比较好用的[插件](https://github.com/jrburke/requirejs/wiki/Plugins)，比如加载`html`资源的`text插件`。直接使用`paths`配置来加载就好。

#### r.js
`requirejs`的编译打包工具。试用了一会，配置比较复杂、繁琐，不深究（因为有 fis）。[r.js文档](http://requirejs.org/docs/optimization.html#setup)

#### 在 fis 中使用AMD
何大师写的`fis`+`amd`的 [demo](https://github.com/fex-team/fis-amd-demo)。

需要用到的`fis插件`：

- `npm install fis-postprocessor-amd -g`
- `npm install fis-postpackager-autoload -g`
- `npm install fis-packager-depscombine -g`

mod.js源码阅读
-------------------

1. 依赖处理（`fis`参与）

	前面说过，`mod.js`除去没有对依赖的处理之外，更接近`AMD`规范。首先我们需要了解下`fis`如何为`mod.js`提供模块间的依赖信息。
	```js
	require.resourceMap({
		  "res": {
		    "common:widget/log/log.js": {
		      "url": "/static/common/widget/log/log.js"
		    },
		    "home:widget/page_module/index/index.js": {
		      "url": "/static/home/widget/page_module/index/index.js",
		      "deps": [
		        "home:widget/share/share.js",
		        "common:widget/log/log.js",
		        "common:widget/lib/tangram/tangram.js",
		        "common:widget/lib/jquery/jquery.js",
		        "common:widget/lib/jquery/jquery.qrcode.js"
		      ]
		    },
		    "home:widget/ContentPlayer/ContentPlayer.js": {
		      "url": "/static/home/widget/ContentPlayer/ContentPlayer.js"
		    },
		    "home:widget/UserMonitor/UserMonitor.js": {
		      "url": "/static/home/widget/UserMonitor/UserMonitor.js"
		    },
		    "common:widget/clickMonitor/clickMonitor.js": {
		      "url": "/static/common/widget/clickMonitor/clickMonitor.js"
		    }
		  }
		})
	```

	这段代码就是`fis`生成的各模块的依赖信息，最后打在页面上，供`mod.js`使用。`require.resourceMap`是在`mod.js`中的函数，用于将依赖信息存在`resMap`这个对象中，供其他函数使用。

2. define
		`define`的定义如下，挂载到全局。很显然，`define`只有一个作用：**将`id`和它对应的`factory`放到`factoryMap`中**。至于`loadingMap`，该对象里存储的是`loadScript`函数执行的毁掉函数--`updateNeed`，该函数用于检测**未加载的依赖模块数**，若模块数为0，则执行当前模块的`factory`。
	```js
	define = function(id, factory) {
        factoryMap[id] = factory;

        var queue = loadingMap[id];
        if (queue) {
            for(var i = 0, n = queue.length; i < n; i++) {
                queue[i]();
            }
            delete loadingMap[id];
        }
    };
	```

3. require
	`require`函数分为两个`require`函数和`require.async`函数。`require`函数是同步`require`，也是`局部require`。`require.async`函数是异步`require`，也是`全局 require`。这里的概念取自`RequireJS`，我们一个一个来看。
	- `require`函数
		```js
			require = function(id) {
				// alias直接返回id,我也不知道是什么鬼
		        id = require.alias(id);

		        var mod = modulesMap[id];
			    // 如果模块的 factory 已经被执行且将执行结果（module.exports）放到modulesMap中，直接反回
		        if (mod) {
		            return mod.exports;
		        }

		        //
		        // init module
		        //
		        var factory = factoryMap[id];
		        // 在 define定义时已经将factory放到 factoryMap里了，如果找不到，说明模块未被定义
		        if (!factory) {
		            throw '[ModJS] Cannot find module `' + id + '`';
		        }
				// 将 exports挂载到 module下
		        mod = modulesMap[id] = {
		            exports: {}
		        };

		        //
		        // factory: function OR value
		        //
		        // 如果 factory 是函数，执行之，否则当成 value 直接返回
		        var ret = (typeof factory == 'function')
		                ? factory.apply(mod, [require, mod.exports, mod])
		                : factory;

		        if (ret) {
		            mod.exports = ret;
		        }
		        return mod.exports;
		    };
		```
		从代码中可以看出，`modulesMap`用于存放模块的执行结果。

		> 同步 require 用于返回一个现有的模块，如果模块不存在，不允许去请求模块，必须抛出一个错误。

		至于`局部 require`，我觉得`mod.js`可能不存在这个概念，因为`require`函数应该可以直接在页面使用，`待测试`

	- `require.async`函数
		```js
		require.async = function(names, onload, onerror) {
		        if (typeof names == 'string') {
		            names = [names];
		        }

		        for(var i = 0, n = names.length; i < n; i++) {
		            names[i] = require.alias(names[i]);
		        }

				// 还未加载的模块
		        var needMap = {};
		        // 还未加载的模块的数量
		        var needNum = 0;

				// 迭代加载依赖模块
		        function findNeed(depArr) {
		            for(var i = 0, n = depArr.length; i < n; i++) {
		                //
		                // skip loading or loaded
		                //
		                var dep = depArr[i];

		                if (dep in factoryMap){
		                    // check whether loaded resource's deps is loaded or not
		                    var child = resMap[dep];
		                    // deps 是 fis 提供的依赖信息中该模块依赖的模块的 id 或 url
		                    if (child && 'deps' in child) {
		                        findNeed(child.deps);
		                    }
		                    continue;
		                }

		                if (dep in needMap) {
		                    continue;
		                }

		                needMap[dep] = true;
		                needNum++;
		                loadScript(dep, updateNeed, onerror);

		                var child = resMap[dep];
		                if (child && 'deps' in child) {
		                    findNeed(child.deps);
		                }
		            }
		        }

				// 检测未加载的依赖模块的数量，并在所有依赖模块加载完成后执行当前模块
		        function updateNeed() {
		            if (0 == needNum--) {
		                var args = [];
		                for(var i = 0, n = names.length; i < n; i++) {
		                    args[i] = require(names[i]);
		                }

		                onload && onload.apply(global, args);
		            }
		        }

		        findNeed(names);
		        updateNeed();
		    };
		```
	`require.async`复杂一些，它迭代加载了依赖模块，并在所有依赖模块执行完成后，执行当前模块。

	显然，`require.async`可以在页面上执行，可以作为引入其他模块的`main`函数，所以它是`全局 require`。

4. 资源加载
	`mod.js`还提供资源加载，但只能加载`js`和`css`。`RequireJs`还可以加载图片、文本、页面模板(一种特殊的文本)、多媒体内容等。
	```js
	require.loadJs = function(url) {
        createScript(url);
    };

    require.loadCss = function(cfg) {
        if (cfg.content) {
            var sty = document.createElement('style');
            sty.type = 'text/css';

            if (sty.styleSheet) {       // IE
                sty.styleSheet.cssText = cfg.content;
            } else {
                sty.innerHTML = cfg.content;
            }
            head.appendChild(sty);
        }
        else if (cfg.url) {
            var link = document.createElement('link');
            link.href = cfg.url;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            head.appendChild(link);
        }
    };
	```
5. others
	- 使用`require.async`引入的模块，追加在`<head>`最后，而封装在`widget`里的`js`模块，会在`DOM 树`的最后由`fis`的插件`FISResource.class.php`打在页面上。

Reference
------------

- [玩转 AMD](http://efe.baidu.com/blog/dissecting-amd-how/)
- [让我们再聊聊浏览器资源加载优化](http://qingbob.com/let-us-talk-about-resource-load/)
- [AMD 和 CMD 的区别有哪些？](http://www.zhihu.com/question/20351507/answer/14859415)

Appendix
-----------

`mod.js`源码

```js
/**
 * file: mod.js
 * ver: 1.0.8
 * update: 2014/11/7
 *
 * https://github.com/zjcqoo/mod
 */
var require, define;

(function(global) {
    var head = document.getElementsByTagName('head')[0],
        loadingMap = {},
        factoryMap = {},
        modulesMap = {},
        scriptsMap = {},
        resMap = {},
        pkgMap = {};



    function createScript(url, onerror) {
        if (url in scriptsMap) return;
        scriptsMap[url] = true;

        var script = document.createElement('script');
        if (onerror) {
            var tid = setTimeout(onerror, require.timeout);

            script.onerror = function() {
                clearTimeout(tid);
                onerror();
            };

            function onload() {
                clearTimeout(tid);
            }

            if ('onload' in script) {
                script.onload = onload;
            }
            else {
                script.onreadystatechange = function() {
                    if (this.readyState == 'loaded' || this.readyState == 'complete') {
                        onload();
                    }
                }
            }
        }
        script.type = 'text/javascript';
        script.src = url;
        head.appendChild(script);
        return script;
    }

    function loadScript(id, callback, onerror) {
        var queue = loadingMap[id] || (loadingMap[id] = []);
        queue.push(callback);

        //
        // resource map query
        //
        var res = resMap[id] || {};
        var pkg = res.pkg;
        var url;

        if (pkg) {
            url = pkgMap[pkg].url;
        } else {
            url = res.url || id;
        }

        createScript(url, onerror && function() {
            onerror(id);
        });
    }

    define = function(id, factory) {
        factoryMap[id] = factory;

        var queue = loadingMap[id];
        if (queue) {
            for(var i = 0, n = queue.length; i < n; i++) {
                queue[i]();
            }
            delete loadingMap[id];
        }
    };

    require = function(id) {
        id = require.alias(id);

        var mod = modulesMap[id];
        if (mod) {
            return mod.exports;
        }

        //
        // init module
        //
        var factory = factoryMap[id];
        if (!factory) {
            throw '[ModJS] Cannot find module `' + id + '`';
        }

        mod = modulesMap[id] = {
            exports: {}
        };

        //
        // factory: function OR value
        //
        var ret = (typeof factory == 'function')
                ? factory.apply(mod, [require, mod.exports, mod])
                : factory;

        if (ret) {
            mod.exports = ret;
        }
        return mod.exports;
    };

    require.async = function(names, onload, onerror) {
        if (typeof names == 'string') {
            names = [names];
        }

        for(var i = 0, n = names.length; i < n; i++) {
            names[i] = require.alias(names[i]);
        }

        var needMap = {};
        var needNum = 0;

        function findNeed(depArr) {
            for(var i = 0, n = depArr.length; i < n; i++) {
                //
                // skip loading or loaded
                //
                var dep = depArr[i];

                if (dep in factoryMap){
                    // check whether loaded resource's deps is loaded or not
                    var child = resMap[dep];
                    if (child && 'deps' in child) {
                        findNeed(child.deps);
                    }
                    continue;
                }

                if (dep in needMap) {
                    continue;
                }

                needMap[dep] = true;
                needNum++;
                loadScript(dep, updateNeed, onerror);

                var child = resMap[dep];
                if (child && 'deps' in child) {
                    findNeed(child.deps);
                }
            }
        }

        function updateNeed() {
            if (0 == needNum--) {
                var args = [];
                for(var i = 0, n = names.length; i < n; i++) {
                    args[i] = require(names[i]);
                }

                onload && onload.apply(global, args);
            }
        }

        findNeed(names);
        updateNeed();
    };

    require.resourceMap = function(obj) {
        var k, col;

        // merge `res` & `pkg` fields
        col = obj.res;
        for(k in col) {
            if (col.hasOwnProperty(k)) {
                resMap[k] = col[k];
            }
        }

        col = obj.pkg;
        for(k in col) {
            if (col.hasOwnProperty(k)) {
                pkgMap[k] = col[k];
            }
        }
    };

    require.loadJs = function(url) {
        createScript(url);
    };

    require.loadCss = function(cfg) {
        if (cfg.content) {
            var sty = document.createElement('style');
            sty.type = 'text/css';

            if (sty.styleSheet) {       // IE
                sty.styleSheet.cssText = cfg.content;
            } else {
                sty.innerHTML = cfg.content;
            }
            head.appendChild(sty);
        }
        else if (cfg.url) {
            var link = document.createElement('link');
            link.href = cfg.url;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            head.appendChild(link);
        }
    };


    require.alias = function(id) {return id};

    require.timeout = 5000;

})(this);
```

> Written with [StackEdit](https://stackedit.io/).
