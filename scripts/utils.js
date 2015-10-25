/**
 * Created by SergeyA on 10/25/2015.
 */

var proto = Object.prototype;

module.exports = {
    isFunction : function(value)
    {
        return proto.toString.call(value) === '[object Function]';
    },
    isString : function(value) {
        return proto.toString.call(value) === '[object String]';
    }
};

