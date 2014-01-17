(function(global, undefined) {
    // if (typeof console === "undefined") {
    //  function noop() {};
    //  global.console = {};
    // }

    var uid = "__" + Math.random().toString(36).substr(2);
    var uuid = function() {
        uuid._uid = (~~uuid._uid) + 1;
        return (uid + uuid._uid);
    };

    var lastRegisterName;

    function registerPromiseCore(registerName, relyOns, callback, parent) {
        //parent总在callback之后，可空，只要把参数换位赋予即可
        //重载判定
        if (!relyOns) { //arguments.length === 1
            //参数情况1：
            //callback[, parent]
            //作为无依赖的自定义函数，触发由自身运作
            parent = relyOns;
            callback = registerName;
            registerName = uuid();
            relyOns = [];
        } else if (!callback) { //arguments.length === 2

            //参数情况2：
            //registerName, callback[, parent]
            //作为无依赖的起始函数
            if (typeof registerName === "string") {
                parent = callback;
                callback = relyOns;
                relyOns = [];
            }

            //参数情况3：
            //relyOns, callback[, parent]
            //作为匿名的末端函数
            else {
                parent = callback;
                callback = relyOns;
                relyOns = registerName;
                registerName = uuid();
            }
        }
        //参数情况4：
        //registerName, relyOns, callback[, parent]
        //常规情况
        if (typeof relyOns === "string") {
            relyOns = [relyOns];
        }
        return new PromiseCore(registerName, relyOns, callback, parent);
    }

    //核心函数

    function PromiseCore(registerName, relyOns, callback, parent) {
        //保存事件
        var self = this;
        //保存已经触发的依赖，当依赖全部触发，则触发回调
        self.emitted = {};
        //保存依赖的模块名
        self.relyOns = relyOns;
        self.registerName = registerName;
        self.callback = callback;
        //保存运行结果，默认滞空，可惰性声明
        // self.result = undefined;
        //阻止的次数，为0时可运行，类似PV原语
        self.prevent = 0;

        //注册触发节点
        //如果有传入父模块存储点的话则存储在父级的模块管理器中，否则存储在全局模块管理器中
        var modulesStore = PromiseCore.modules;
        var relyOnsStore = PromiseCore._relyOns;
        if (parent !== undefined) {
            //可以只PromiseCore对象也可以是PromiseCore的registerName，前提是这是一个全局模块才能获取到
            if (parent.modules || (parent = PromiseCore.modules[parent])) {
                //获取成功，则保存在指定的父模块中
                modulesStore = parent.modules;
                relyOnsStore = parent._relyOns;
                //保存父模块，如果无父模块则代表着此模块指向全局
                self.namespace = parent;
            }
        }
        modulesStore[registerName] = self;
        lastRegisterName = registerName;

        _Create.prototype = modulesStore;
        //保存模块链
        self.modules = new _Create;

        _Create.prototype = relyOnsStore;
        //保存依赖关系
        self._relyOns = new _Create;

        for (var i = 0, len = relyOns.length, relyOn_item; i < len; i += 1) {
            //注册触发依赖，逆向保存依赖，形成可触发模式
            relyOn_item = relyOns[i];
            (relyOnsStore[relyOn_item] || (relyOnsStore[relyOn_item] = [])).push(registerName);
        }
    };

    //用于创建原型链

    function _Create() {};

    //构造函数用于生成模块原型链，实现“子模块注册”，动态绑定
    PromiseCore.modules = {};
    //保存依赖
    PromiseCore._relyOns = {};

    PromiseCore.prototype = {
        stop: function(moduleName) { /*prevent*/
            var self = this,
                preventModule = self;
            if (moduleName !== undefined) {
                preventModule = self.modules[moduleName];
            }
            if (preventModule) {
                preventModule.prevent -= 1;
            }
            return self;
        },
        _getPrevent: function() {
            //返回目前的prevent值时候能够被emit
            var result = !! this.prevent;
            //不为0时（小于0）就+1，每次阻止有能阻止一次
            result && (this.prevent += 1);
            return result;
        },
        emit: function(registerName, applyArguments) {
            var self = this;
            var promiseCoreModules = self.modules;
            if (!arguments.length || typeof registerName !== "string" /*registerName instanceof Array，弱化判定规则*/ ) {
                //不提供registerName的情况，默认使用当前节点初始化运行
                applyArguments = registerName;
                registerName = self.registerName;
            }
            var emittedModule = promiseCoreModules[registerName];
            if (emittedModule) {
                emittedModule.result = emittedModule.callback.apply(emittedModule, applyArguments);
            }
            var relyOns = self._relyOns[registerName];

            //为空不报错，也无需警告
            if (relyOns) {
                var promiseCoreModules_item;
                for (var i = 0, len = relyOns.length, relyOns_item; i < len; i += 1) {
                    //循环获取所有的依赖，依次尝试触发
                    relyOns_item = relyOns[i];
                    promiseCoreModules_item = promiseCoreModules[relyOns_item];
                    if (promiseCoreModules_item) {
                        //触发记录
                        var emitted = promiseCoreModules_item.emitted;
                        //依赖的模块名称集合
                        var moduleRelyOns = promiseCoreModules_item.relyOns;

                        //用于收集依赖对象的参数
                        applyArguments = [];
                        emitted[registerName] = true;

                        //判断是否被阻止了
                        if (promiseCoreModules_item._getPrevent()) {
                            break;
                        }
                        for (var j = 0, len2 = moduleRelyOns.length, moduleRelyOns_name; j < len2; j += 1) {
                            moduleRelyOns_name = moduleRelyOns[j];
                            //若发现有未触发项，则直接停止触发
                            if (!emitted[moduleRelyOns_name]) {
                                break;
                            } else {
                                applyArguments.push(promiseCoreModules[moduleRelyOns_name].result);
                            }
                        }
                        //遍历完成依赖项已经完全触发完毕，可触发自身
                        if (j === len2) {
                            promiseCoreModules_item.emit(applyArguments);
                        }
                    }
                }
            }
            return self;
        },
        registerGlobal: function(registerName, relyOns, callback) {
            registerPromiseCore(registerName, relyOns, callback)
            return this;
        },
        register: function(registerName, relyOns, callback, parent) {
            registerPromiseCore(registerName, relyOns, callback, parent || this.namespace)
            return this;
        },
        registerChild: function(registerName, relyOns, callback, parent) {
            var globalModules = PromiseCore.modules;
            PromiseCore.modules = this.modules;
            registerPromiseCore(registerName, relyOns, callback, this);
            PromiseCore.modules = globalModules;
            return this;
        },
        getModule: function(moduleName) {
            return this.modules[moduleName === undefined ? lastRegisterName : moduleName];
        },
        reset: function(moduleName) {
            var self = this,
                resetModule = self;
            if (moduleName !== undefined) {
                resetModule = self.modules[moduleName];
            }
            if (resetModule) {
                var tempModules = [resetModule];

                var modulesStore = resetModule.modules;
                var modules_item;
                var relyOns_item;

                //作用域内的所有子模块，递归清空缓存
                for (moduleName in modulesStore) {
                    if (modulesStore.hasOwnProperty(moduleName)) {
                        tempModules.push(modulesStore[moduleName]);
                    }
                }

                //所有依赖于指定模块的模块，不论间接还是直接依赖，全部清空缓存。
                // var currentRelyOns = resetModule._relyOns[resetModule.registerName] || [];
                // for (var i = 0, len = currentRelyOns.length; i < len; i += 1) {
                //     tempModules.push(modulesStore[currentRelyOns[i]]);
                // }

                //指定模块所依赖的所有模块
                var relyOns = resetModule.relyOns;
                for (var i = 0, len = relyOns; i < len; i += 1) {
                    tempModules.push(modulesStore[relyOns[i]]);
                }

                for (var i = 0, len = tempModules.length; i < len; i += 1) {
                    modules_item = tempModules[i];
                    if (modules_item.hasOwnProperty("result")) {
                        modules_item.emitted = {}
                        delete modules_item.result;
                        //递归清空
                        modules_item.reset();
                    }
                }
            }
            return self;
        },
        addDependent: function(moduleName, relyOns) {
            var self = this,
                addDependentModule = self
            if (relyOns !== undefined) {
                addDependentModule = self.modules[moduleName];
            }
            if (addDependentModule) {
                //要判断依赖重复避免传参错误
                // Array.prototype.push.apply(addDependentModule.relyOns,relyOns)
                var oldRelyOns = addDependentModule.relyOns;

                //依赖的方向关系是保存在上一层中
                var relyOnsStore = addDependentModule.parnet ? addDependentModule.parnet._relyOns : PromiseCore._relyOns;

                var tempHash = {};
                var relyOns_item;
                //将已经存在的模块名缓存成一张hash表方便匹配
                for (var i = 0, len = oldRelyOns.length; i < len; i += 1) {
                    //不使用其它值，避免误判
                    tempHash[oldRelyOns[i]] = uid
                }
                //插入依赖
                for (var i = 0, len = relyOns.length; i < len; i += 1) {
                    relyOns_item = relyOns[i];
                    if (tempHash[relyOns_item] !== uid) {
                        tempHash[relyOns_item] = uid;
                        oldRelyOns.push(relyOns_item);
                        (relyOnsStore[relyOns_item] || (relyOnsStore[relyOns_item] = [])).push(addDependentModule.registerName);
                    }
                }
            }
            return self;
        }
    }

    //特殊处理
    //覆盖处理，降原有触发状态重置，再进行注册
    registerPromiseCore.cover = function(registerName, relyOns, callback, parent) {

        var relyOns = PromiseCore._relyOns[registerName];

        //为空不报错，也无需警告
        if (relyOns) {
            var promiseCoreModules_item;
            for (var i = 0, len = relyOns.length, relyOns_item; i < len; i += 1) {
                //循环获取所有的依赖，依次重置触发状态
                relyOns_item = relyOns[i];
                promiseCoreModules_item = promiseCoreModules[relyOns_item];
                if (promiseCoreModules_item) {
                    promiseCoreModules_item.emitted[registerName] = false;
                }
            }
        }
        return registerPromiseCore(registerName, relyOns, callback, parent);
    }

    //获取全局变量
    registerPromiseCore.getModule = function(moduleName) {
        return PromiseCore.modules[moduleName === undefined ? lastRegisterName : moduleName];
    }

    /*
     * as AMD & CMD
     */
    // fork form jQuery
    if (typeof module === "object" && module && typeof module.exports === "object") {
        module.exports = registerPromiseCore;
    } else {
        global.PromiseCore = registerPromiseCore
        if (typeof define === "function" && define.amd) {
            define("PromiseCore", [], function() {
                return registerPromiseCore
            })
        }
    }

}(Function("return this")()));
