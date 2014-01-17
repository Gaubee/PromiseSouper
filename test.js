//////////////测试////////////////////
var PromiseCore = require("./PromiseCore");
/*
 * 基础测试
 */
//多层依赖测试，传参测试，传递依赖测试
var main = PromiseCore(function() {
    console.log("Begin run random!");
    var num = Math.random();
    if (num > 0.5) {
        this.emit("module_1", [num]);
    } else {
        this.emit("module_2", [num]);
    }
}).register("module_1", function(num) {
    console.log("   ", num, "is larger than", 0.5);
    return num;
}).register("module_2", function(num) {
    console.log("   ", num, "is small than", 0.5);
    return num;
}).register("module_3", 'module_1', function(module_1_num) {
    this.emit("toHash");
    return module_1_num.toString(36).substr(2);
}).register("module_4", 'module_2', function(module_2_num) {
    this.emit("toHash");
    return module_2_num.toString(36).substr(2);
}).register("toHash", function() {
    console.log("       Begin format Hash.");
}).register(['module_1', 'module_3'], function(num, hash) {
    console.log("           ", num, " -> ", hash);
}).register(['module_2', 'module_4'], function(num, hash) {
    console.log("           ", num, " -> ", hash);
}).emit();


/*
 * 测试子模块
 */
console.log("------------------测试子模块------------------");
var namespace = PromiseCore("namespace", function() {
    return this.registerName;
}).registerChild("c1", "namespace", function() {
    if (this.getModule("c2")) {
        console.log(this.registerName + " can get c2");
    } else {
        console.log(this.registerName + " can't get c2");
    }
});

//在全局中尝试获取namespace.c1
if (PromiseCore.getModule("c1")) {
    console.log("can get c1 in global");
} else {
    console.log("can't get c1 in global");
}
//在namespace中尝试获取namespace.c1
if (namespace.getModule("c1")) {
    console.log("can get c1 in " + namespace.registerName);
    var c1 = namespace.getModule("c1");
    c1.registerChild("c1_c", function() {});
    namespace.registerChild("c2", "namespace", function() {
        if (this.getModule("c1_c")) {
            console.log(this.registerName + " can get c1_c");
        } else {
            console.log(this.registerName + " can't get c1_c");
        }
    });

    //使用register注册同级模块
    c1.register("c3", "c1", function() {
        console.log(this.registerName + "'s parent module is " + this.namespace.registerName);
    });
} else {
    console.log("can't get c1 in " + namespace.registerName);
}
namespace.emit();

/*
 * 测试中断
 */
console.log("------------------测试中断------------------");
PromiseCore("submit form", function() {
    return Math.random() > 0.5 ? "mypassword" : "";
}).registerChild("password", ["submit form"], function(password) {
    console.log("my submit data is-> password:", password);
})
.getModule( /*获取刚刚注册的模块*/ )
.register( /*注册同级模块*/ "empty password", "submit form", function(password) {
    if (password.trim() === "") {
        console.log("stop password");
        this.stop("password");
    }
}).addDependent("password",["empty password"]).emit("submit form");

/*
 * 测试重置
 */
console.log("------------------测试重置------------------");
//第一次运行
PromiseCore("login", ["username", "password"], function(username, password) {
    console.log("   username is:",username);
    console.log("   password is:",password);
    return {
        username:username,
        password:password
    }
}).registerChild("username",function (username) {
    return username;
}).registerChild("password",function (password) {
    return password;
}).registerChild("test",function () {
    this.emit("username",["Gaubee"]);
    this.emit("password",["123456"]);
}).registerChild("submit",["login"],function (form_data) {
    console.log("       submit form:",form_data);
}).getModule("test").emit();
//不重置的情况，每一次子模块触发都会引发login的触发
PromiseCore.getModule("login").emit("username",["Bangeel"]).emit("password",["654321"]);
//重置的情况，子模块全部触发一次才能正常触发login模块
PromiseCore.getModule("login").reset("login").emit("username",["Cindy"]).emit("password",["heehhehheh"]);