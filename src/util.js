/**
 * Created by josh on 7/27/16.
 */


exports.log = function () {
    console.log.apply(console, Array.prototype.slice.call(arguments));
};

