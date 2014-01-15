PromiseSouper
=============

将模块开发的实现的实现融合Promises的链式书写，衍生出更为简单的API，实现更为灵活自由、更加简单、更底层的一个回调处理工具，而且不仅仅是回调处理。

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
我们可以这么拆分这些模块：
```js
PromiseCore(function(){
	//为空的情况
	if(secondPassword.value===""){
		this.emit("empty second password");
	}
	if(password.value===""){
		this.emit("empty password");
	}
	//不为空的情况
	else{
		if(password.value.length<6){
			this.emit("password to sort",[password.value.length]);
		}else if(password.value.length>18){
			this.emit("password to long",[password.value.length]);
		}
		if(password.value!==secondPassword.value){
			this.emit("password and secondPassword diffrent");
		}
	}
})
.register("empty password",function(){/* ... */})
.register("empty second password",function(){/* ... */})
.register("password to sort",function(){/* ... */})
.register("password to long",function(){/* ... */})
.register("password and secondPassword diffrent",function(){/* ... */})

```

与此同时，我们还可以进一步强化错误信息，比如：
```
1、 密码与重复密码这两个输入框同时为空时，我们只显示“密码为空的错误提示”
2、 密码为空时，密码与重复密码不同的错误提示不显示，只显示“密码为空的错误提示”
```
所以，我们只要进一步追加相应的模块，注意，模块之间无法互相阻止，这点应各种不同的业务都有不同的解决方案，顾不进行插手。
但在现在这个问题中我们可以通过清空错误信息提示内容来实现，伪代码如下：
```js
//追加代码
.register("empty password and secondPassword",["empty password", "empty second password"],function(){
	/* 清空"empty second password"的所显示的错误信息 */
})
.register("empty password but not secondPassword",["empty password", "password and secondPassword diffrent"],function(){
	/* 清空"password and secondPassword diffrent"的所显示的错误信息 */
})
```
可以看到，我么通过模块的依赖来进一步实现了更深层更有意义的信息提醒，这是Promise/A+ 规范所不能做到的，也是模块化的魅力。

另外`callback`所的return的值将缓存起来并作为模块的值进行传递，如：
```js
PromiseCore("m1",function(v){
	return 1+v;
}).register("m2",function(v){
	return 2+v;
}).register(["m1","m2"],function(m1,m2){
	console.log([m1,"+",m2,"=",m1+m2].join(" "))
}).emit("m1",[10]).emit("m2",[20]);
```
可以看到输出的结果是
```
11 + 22 = 33
```

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

### .getModule(PromiseCore)
**参数**

1. 模块名：`modulesName` _String_ 可空，若为空，则指向最近一次声明的PromiseCore实例对象

**介绍**

根据模块名称获取全局模块

### .registerGlobal(PromiseCore.prototype)
**参数**

参数与`PromiseCore`构造函数一样

**介绍**

注册一个全局模块，返回父PromiseCore实例对象。


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

### .getModule(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，若为空，则指向最近一次声明的PromiseCore实例对象

**介绍**

根据模块名称获取子模块或者全局模块

### .emit(PromiseCore.prototype)
**参数**

1. 模块名：`modulesName` _String_ 可空，空值时默认指定为为当前模块
2. 给所触发的回调的参数数组：`callbackArguments` _likeArray_ , _Array_ 可空

**介绍**

触发指定模块的回调
