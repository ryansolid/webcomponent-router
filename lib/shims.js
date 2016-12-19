if (typeof Object.assign !== 'function') {
  (function() {
    return Object.assign = function(target) {
      'use strict';
      var index, nextKey, output, source;
      if (target === void 0 || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      output = Object(target);
      index = 1;
      while (index < arguments.length) {
        source = arguments[index];
        if (source !== void 0 && source !== null) {
          for (nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
        index++;
      }
      return output;
    };
  })();
}

if (!Array.prototype.filter) {
  Array.prototype.filter = function(fun) {
    'use strict';
    var i, len, res, t, thisArg, val;
    if (this === void 0 || this === null) {
      throw new TypeError;
    }
    t = Object(this);
    len = t.length >>> 0;
    if (typeof fun !== 'function') {
      throw new TypeError;
    }
    res = [];
    thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    i = 0;
    while (i < len) {
      if (i in t) {
        val = t[i];
        if (fun.call(thisArg, val, i, t)) {
          res.push(val);
        }
      }
      i++;
    }
    return res;
  };
}
