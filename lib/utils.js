var Utils,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

module.exports = Utils = (function() {
  function Utils() {}

  Utils.isObject = function(obj) {
    var ref;
    return obj !== null && ((ref = typeof obj) === 'object' || ref === 'function');
  };

  Utils.isFunction = function(val) {
    return Object.prototype.toString.call(val) === "[object Function]";
  };

  Utils.isString = function(val) {
    return Object.prototype.toString.call(val) === "[object String]";
  };

  Utils.pick = function() {
    var k, keys, new_obj, obj, v;
    obj = arguments[0], keys = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (keys.length === 1 && Array.isArray(keys[0])) {
      keys = keys[0];
    }
    new_obj = {};
    for (k in obj) {
      v = obj[k];
      if (indexOf.call(keys, k) >= 0) {
        new_obj[k] = v;
      }
    }
    return new_obj;
  };

  Utils.isEqual = function(a, b) {
    var k, v;
    for (k in a) {
      v = a[k];
      if (b[k] !== v) {
        return false;
      }
    }
    for (k in b) {
      v = b[k];
      if (a[k] !== v) {
        return false;
      }
    }
    return true;
  };

  Utils.difference = function(a, b) {
    return a.filter(function(t) {
      return !(indexOf.call(b, t) >= 0);
    });
  };

  return Utils;

})();
