/**
 * Created by josh on 7/27/16.
 */


exports.log = function () {
    console.log.apply(console, Array.prototype.slice.call(arguments));
};

exports.renderClass = function(cls) {
    var str = "";
    for(let name in cls) {
        if(cls[name] === true) str += (name + " ");
    }
    return str;
};

