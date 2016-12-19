var RouterDSL, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Utils = require('./utils');

module.exports = RouterDSL = (function() {
  function RouterDSL(parent) {
    this.parent = parent;
    this.generateFn = bind(this.generateFn, this);
    this.addRoute = bind(this.addRoute, this);
    this.route = bind(this.route, this);
    this.fullName = bind(this.fullName, this);
    this.matches = [];
    this.explicit_index = false;
  }

  RouterDSL.prototype.fullName = function(name) {
    if (!this.parent) {
      return name;
    }
    return this.parent + "." + name;
  };

  RouterDSL.prototype.route = function(name, options, callback) {
    var dsl;
    if (options == null) {
      options = {};
    }
    if (!callback) {
      return this.addRoute(name, options);
    }
    dsl = new RouterDSL(this.fullName(name));
    callback.call(dsl);
    return this.addRoute(name, options, dsl.generateFn());
  };

  RouterDSL.prototype.index = function(options, callback) {
    if (Utils.isFunction(options)) {
      return this.addRoute('index', {
        path: '/',
        redirect: options
      });
    } else if (Utils.isObject(options)) {
      return this.route('index', Object.assign({}, options, {
        path: '/'
      }), callback);
    }
  };

  RouterDSL.prototype.notFound = function(options) {
    if (Utils.isFunction(options)) {
      return this.addRoute('not_found', {
        path: '/not_found',
        redirect: options
      });
    } else if (Utils.isObject(options)) {
      return this.route('not_found', Object.assign({}, options, {
        path: '/not_found'
      }));
    }
  };

  RouterDSL.prototype.addRoute = function(name, options, callback) {
    var handler, handler_options, ref;
    handler_options = Object.assign({}, options);
    delete handler_options.path;
    handler = Object.assign({
      name: this.fullName(name)
    }, handler_options);
    if (((ref = options.path) === '/' || ref === '') || name.slice(-5) === 'index') {
      this.explicit_index = true;
    }
    return this.matches.push([options.path || ("/" + name), handler, callback]);
  };

  RouterDSL.prototype.generateFn = function() {
    if (!this.explicit_index) {
      this.index({});
    }
    return (function(_this) {
      return function(match) {
        var dsl_match, i, len, ref;
        ref = _this.matches;
        for (i = 0, len = ref.length; i < len; i++) {
          dsl_match = ref[i];
          match(dsl_match[0]).to(dsl_match[1], dsl_match[2]);
        }
      };
    })(this);
  };

  RouterDSL.map = function(callback) {
    var dsl;
    dsl = new RouterDSL();
    callback.call(dsl);
    return dsl;
  };

  return RouterDSL;

})();
