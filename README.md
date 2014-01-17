PromiseSouper
=============

## What's PromiseSouper?

可以说，这个框架看不出和Promises有半点关系，但是因为是在使用Promises时遇到的种种问题与局限性，总结后，做出的替代Promises的一个工具。

## What can PromiseSouper do?

将模块开发的实现作为框架的核心，衍生出更为简单的API，实现更为灵活自由、更加简单、更底层的一个回调处理工具，而且不仅仅是回调处理。
你可以用它来描述繁杂的表单验证，实际上它就是针对这点来做的，因为它的模块声明特性，你可以用它来实现验证模块的分离、通过依赖注入来实现验证组合，告别不能直视的缩进与可读性的问题。
你可以用它来轻松指定Ajax的回调，解决异步嵌套的问题。毕竟，它由Promises说暴露的问题而衍生，自然能实现Promises的各种需求。你甚至可以用它轻松地封装成一个Promises库。不然我也不会用`PromiseCore`来作为这个库的全局命名。

## Why PromiseSouper?

前段时间Promises被一度推崇，我尝试学习它的实现，用它来解决一些问题。但它总是让我不得不改变思维方式去使用它。这让我一度怀疑这规范是不是一定要自己往约束里跳？很多问题的解决方式越来越绕。
你可以在网上随随便便看到这样的代码：
```js
promise.then(function(result) {
  console.log(result); // "Stuff worked!"
}, function(err) {
  console.log(err); // Error: "It broke"
});
```
我当初第一看看到这段代码的时候是愣住了，如果说第一个参数表示成功，第二个参数表示错误，那么如果我还有表示其它的状态机了？…………嗯，一定是我的思维不够国际化，再看：
```js
asyncThing1().then(function() {
  return asyncThing2();
}).then(function() {
  return asyncThing3();
}).catch(function(err) {
  return asyncRecovery1();
}).then(function() {
  return asyncThing4();
}, function(err) {
  return asyncRecovery2();
}).catch(function(err) {
  console.log("Don't worry about it");
}).then(function() {
  console.log("All done!");
});
```
我又愣住了，你是在用一个链式的结构来表示一个具有分支的流程结构么？

这说明了什么问题：就是你能对then、catch衍生节点，不过我只能说你的文字描述和代码结构已经脱离了直观耦合，可读性降低了。

在PromiseSouper中，并不直接在API层面提供错误捕捉，我们原则上力求把异常清晰描述，你以为你的Boss会运行你用try-catch来捕获表单格式错误么？
但上面的流程我们在PromiseSouper中可以这么表示：
```js
PromiseCore("main", function() {
    this.emit("asyncThing1");
}).register("asyncThing1", function() {

    try {} catch (e) {
        this.stop("asyncThing2");
        this.emit("asyncRecovery1")
    }

}).register("asyncThing2", ["asyncThing1"], function() {

    try {} catch (e) {
        this.stop("asyncThing3");
        this.emit("asyncRecovery1")
    }

}).register("asyncThing3", ["asyncThing2"], function() {

    try {} catch (e) {
        this.stop("asyncThing4");
        this.emit("asyncRecovery1")
    }

}).register("asyncThing4", ["asyncThing3"], function() {

    try {} catch (e) {
        this.stop("done");
        this.emit("Don't worry")
    }

}).register("done", ["asyncThing4"], function() {
    console.log("All done!");
})

//Error
.register("asyncRecovery1", function() {
    try {
        this.emit("asyncThing4");
    } catch (e) {
        this.emit("asyncRecovery2")
    }
}).register("asyncRecovery2", function() {
    try {
        this.emit("done")
    } catch (e) {
        this.emit("Don't worry");
    }
}).register("Don't worry", function() {
    console.log("Don't worry about it");
})

//Run
.emit("main");

```
呵呵，看到这么多代码是不是吓惨了？PromiseSouper现在不会在API层面提供错误捕捉，以后也不会，我不会为了一点小便捷而放弃灵活性，如果真要这种API，拿PromiseSouper去封装吧。为什么？因为现在**我要添置一个功能，假设你在不懂Promises和PromiseSouper的情况下叫你用以上两种方法去实现，你会选择哪一种？**如果你选择了后者，感谢，我们拥有同样的编程思想。
现在，您可以来体验一下PromiseSouper中的核心概念（依赖声明、依赖注入等）所能带来的强悍功能了。

## 关键特性

### 链式调用
一般的写法，就是声明一个`PromiseCore实例对象`后不断地`register`各种全局模块与子模块来定义一系列的逻辑分支，最后使用`emit`方法来指定触发一个或多个起点。值得注意的是`register`函数返回的并不是刚刚注册的`PromiseCore实例对象`，而是`register`函数的调用者，也就是当前实例，`registerGlobal`、`registerChild`、`emit`函数也一样。如果要获取到刚刚注册的对象，可以使用`getModule`方法来得到，这时回调链才意味着被改变。

### 依赖声明
依赖的声明的概念来自模块化的实现，这里代替了繁杂的`if-else`混合异步回调的情景。比方说：
```
验证一个用户的注册：
密码与重复密码这两个输入框中，
1、 要判断密码的强度
2、 密码与重复密码要相同
3、 二者皆不可为空
```
我们可以这么拆分这些模块（注意：`callback`所的return的值将缓存起来并作为模块的值进行传递）：
```js
PromiseCore("submit", ["username", "password", "second password", "vcode"], function() {
    var datas = Array.prototype.slice.call(arguments);
    var relyOns = this.relyOns;
    var form_data = {};
    //合并数据后提交
    for (var i = 0, len = relyOns.length, relyOns_item; i < len; i += 1) {
        relyOns_item = relyOns[i];
        form_data[relyOns_item] = datas[i];
    };
    $.ajax({
        data: form_data
    });
})

.register("password", ["input password"], function(data) {
	//验证格式
	if(data.length===0){/*空值提醒*/}
    return data;
})
.register("input password",function (data) {/*基本的数据格式化*/return data;})
.register("second password", ["input second password"], function(data) {
	//验证格式
	if(data.length===0){/*空值提醒*/}
    return data;
})
.register("input second password",function (data) {/*基本的数据格式化*/return data;})

.register("same second password?", ["password", "second password"], function(password,second_password){
	if(second_password!==password){/*二个密码不同*/}
})


//绑定表单事件
$("name=['password']").on("input", function() {
    PromiseCore.getModule("submit").emit("input password", [this.value]);
})
//绑定其余表单
...

```

与此同时，我们还可以进一步强化错误信息，比如：
```
1、 密码与重复密码这两个输入框同时为空时，我们只显示“密码为空的错误提示”
2、 密码为空时，密码与重复密码不同的错误提示不显示，只显示“密码为空的错误提示”
```
总之，就是密码框值空时，重复密码框就不去校验。
所以，我们只要进一步追加相应的模块进行描述，并反向注册依赖来实现中断注入：
```js
//追加代码
.register("empty password and stop",["input password"],function(password,second_password){
	if(password.value===""){
		//中断
		//不去检查二次密码
		this.stop("second password");
		//由于依赖关系，关于二次密码的其它所有的验证都会中断，比如验证两个密码是否相同
		/* ... */
	}
})
//依赖注入
.addDependent("second password",["empty password and stop"])

```
可以看到，我么通过模块的依赖来进一步实现了更深层更有意义的信息提醒，这是Promise/A+ 规范所不能做到的，也是模块化的魅力。

### 子模块作用域
我们通常使用字符串来描述一个模块，但是有时候为了避免模块名冲突而使用一堆过长字符串是得不偿失的。因此可以使用`registerChild`来实现子模块的注册，用`register`来注册同级模块。这样可以在不同的作用域中用简单字符串来描述模块（作为模块的名字）而不引发模块覆盖。
注意，模块A是无法获取到子模块B的子模块C，但是C可以获取到模块A，应为模块存储链式继承的。

## API

### PromiseCore

**参数**

1. 模块名：`modulesName` _String_ 可空，空值时系统默认生成一个随机的名字作为匿名模块的标识
2. 依赖的模块名：`relyOnsModulesName` _StringArray_ 可空，空值时代表这个模块没有任何依赖，就不会因为依赖的触发而触发回调函数
3. 模块代码：`callback` _Function_ 不可空
4. 父模块或者全局模块名称：`parent` _PromiseCoreInstance_ , _String_ 可空，空值时讲模块存储在全局模块缓存区中

**介绍**

生成一个PromiseCore实例对象，这里无需new关键字

### .addDependent(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 指定的模块名
2. 依赖的模块名：`relyOnsModulesName` _StringArray_ 所要加入的模块名数组

**介绍**

为指定模块添加依赖

### .emit(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，空值时默认指定为为当前模块
2. 给所触发的回调的参数数组：`callbackArguments` _likeArray_ , _Array_ 可空

**介绍**

触发指定模块的回调

### .getModule(PromiseCore)
**参数**

1. 模块名：`modulesName` _String_ 可空，若为空，则指向最近一次声明的PromiseCore实例对象

**介绍**

### .getModule(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，若为空，则指向最近一次声明的PromiseCore实例对象

**介绍**

根据模块名称获取子模块或者全局模块

根据模块名称获取全局模块

### .register(PromiseCore.prototype)
**参数**

参数与`PromiseCore`构造函数一样

**介绍**

1. 注册一个同级模块，返回父PromiseCore实例对象。
比如说如果当前模块是全局模块，则同样注册一个全局模块。
如果当前模块是某个模块A的子模块，则注册的模块同样在A的子模块中。

2. 可以强制指定父模块

### .registerChild(PromiseCore.prototype)
**参数**

参数前三个与`PromiseCore`构造函数一样，第四个参数为空时存储在当前PromiseCore实例对象的模块缓存区中

**介绍**

注册一个子模块，返回父PromiseCore实例对象

### .registerGlobal(PromiseCore.prototype)
**参数**

参数与`PromiseCore`构造函数一样

**介绍**

注册一个全局模块，返回父PromiseCore实例对象。

### .reset(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，空值时默认指定为为当前模块

**介绍**

清空指定模块的运行结果的缓存

### .stop(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，空值时默认指定为为当前模块

**介绍**

中断指定模块的运行
