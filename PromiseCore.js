(function(global) {
    // if (typeof console === "undefined") {
    //  function noop() {};
    //  global.console = {};
    // }

    var uid = "__" + Math.random().toString(36).substr(2);
    var uuid = function() {
        uuid._uid = (~~uuid._uid) + 1;
        return (uid + uuid._uid);
    };

    function registerPromiseCore(registerName, relyOns, callback) {
        //重载判定
        if (!relyOns) { //arguments.length === 1
            //参数情况1：
            //callback
            //作为无依赖的自定义函数，触发由自身运作
            callback = registerName;
            registerName = uuid();
            relyOns = [];
        } else if (!callback) { //arguments.length === 2

            //参数情况2：
            //registerName, callback
            //作为无依赖的起始函数
            if (typeof registerName === "string") {
                callback = relyOns;
                relyOns = [];
            }

            //参数情况3：
            //relyOns, callback
            //作为匿名的末端函数
            else {
                callback = relyOns;
                relyOns = registerName;
                registerName = uuid();
            }
        }
        //参数情况4：
        //registerName, relyOns, callback
        //常规情况
        if (typeof relyOns === "string") {
            relyOns = [relyOns];
        }
        return new PromiseCore(registerName, relyOns, callback);
    }

    //核心函数

    function PromiseCore(registerName, relyOns, callback) {
        //保存事件
        var self = this;
        //保存已经触发的依赖，当依赖全部触发，则触发回调
        self.emitted = {};
        self.relyOns = relyOns;
        self.registerName = registerName;
        self.callback = callback;
        //保存运行结果，默认滞空，可惰性声明
        // self.result = undefined;

        //注册触发节点
        PromiseCore.modules[registerName] = self;

        var promiseCoreRelyOns = PromiseCore.relyOns;
        for (var i = 0, len = relyOns.length, relyOn_item; i < len; i += 1) {
            //注册触发依赖，逆向保存依赖，形成可触发模式
            relyOn_item = relyOns[i];
            (promiseCoreRelyOns[relyOn_item] || (promiseCoreRelyOns[relyOn_item] = [])).push(registerName);
        }
    };

    //保存模块
    PromiseCore.modules = {};
    //保存依赖
    PromiseCore.relyOns = {};

    PromiseCore.prototype = {
        emit: function(registerName, applyArguments) {
            var self = this;
            var promiseCoreModules = PromiseCore.modules;
            if (!arguments.length || typeof registerName !== "string" /*registerName instanceof Array，弱化判定规则*/ ) {
                //不提供registerName的情况，默认使用当前节点初始化运行
                applyArguments = registerName;
                registerName = self.registerName;
            }
            var emittedModule = promiseCoreModules[registerName];
            if (emittedModule) {
                emittedModule.result = emittedModule.callback.apply(emittedModule, applyArguments);
            }
            var relyOns = PromiseCore.relyOns[registerName];

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
        register: function(registerName, relyOns, callback) {
            registerPromiseCore(registerName, relyOns, callback)
            return this;
        }
    }

    //特殊处理
    //覆盖处理，降原有触发状态重置，再进行注册
    PromiseCore.cover = function(registerName, relyOns, callback) {

        var relyOns = PromiseCore.relyOns[registerName];

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
        return registerPromiseCore(registerName, relyOns, callback);
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
