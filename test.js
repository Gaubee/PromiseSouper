//////////////测试////////////////////
var PromiseCore = require("./PromiseCore");

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


//子模块测试
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
        console.log(this.registerName+"'s parent module is "+this.namespace.registerName);
    });
} else {
    console.log("can't get c1 in " + namespace.registerName);
}
namespace.emit();
