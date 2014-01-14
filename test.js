//////////////测试////////////////////
var PromiseCore = require("./PromiseCore");
PromiseCore(function() {
    console.log("begin run random!");
    var num = Math.random();
    if (num > 0.5) {
        this.emit("test1", [num]);
    } else {
        this.emit("test2", [num]);
    }
}).register("test1", function(num) {
    console.log(num, "is larger than", 0.5);
    return num;
}).register("test2", function(num) {
    console.log(num, "is small than", 0.5);
    return num;
}).register("test3", 'test1', function(test1_num) {
    console.log("test1 to test3", test1_num);
    this.emit("end");
}).register("test4", 'test2', function(test2_num) {
    console.log("test2 to test4", test2_num);
    this.emit("end");
}).register("end", function() {
    console.log("bey bey");
}).register(['test1', 'test3'], function(num) {
    console.log(this.registerName,"is relyon ",this.relyOns,num);
}).emit();
