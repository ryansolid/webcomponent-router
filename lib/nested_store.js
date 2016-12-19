var NestedRouterStore, Queue, SCOPED_METHODS, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Queue = require('queue-async');

Utils = require('./utils');


/*
 * Nested Router Store contains all the information required for each nested level
 * The attributes found on the store are:
 *   level: level of the store
 *   name: the name of the route at that level
 *   tag: the component tag for that level
 *   params: the stripped out url params relevant to that level
 *   query: the url search params
 *   content - the nested router store for the immediate child
 *
 * In addition to the above attributes can listen to events:
 *   transition - this fires on affected stores when a new transition will be executed
 *
 * isActive, transitionTo, toURL methods take exact names or leading wildcards:
 *   '.' - relative to the current level
 *         ie.. inside 'group' transitionTo('.settings') resolves to 'group.settings'
 *         additional '.' move up that number of parents
 *   '^' - relative to the next parent that contains the path
 *         useful for ^unauthorized, etc.. where you want to gracefully handle error state fallback
 *   '*' - relative to the current level or next parent that contains the path (combination of '.' and '^')
 * If these wildcards are not followed by a value it will default to index route
 */

SCOPED_METHODS = ['isActive', 'toURL', 'transitionTo', 'replaceWith'];

module.exports = NestedRouterStore = (function(superClass) {
  extend(NestedRouterStore, superClass);

  function NestedRouterStore(router, attr) {
    this._scopeName = bind(this._scopeName, this);
    this._willTransition = bind(this._willTransition, this);
    this.off = bind(this.off, this);
    this.on = bind(this.on, this);
    this.forwardStateChange = bind(this.forwardStateChange, this);
    this.destroy = bind(this.destroy, this);
    this._set = bind(this._set, this);
    var fn, i, len, method;
    NestedRouterStore.__super__.constructor.call(this);
    Object.assign(this, {
      level: null,
      name: null,
      tag: null,
      attributes: null,
      params: {},
      query: {},
      content: null,
      param_names: []
    }, attr);
    router.on('state', this.forwardStateChange);
    this.removeStateChange = (function(_this) {
      return function() {
        return router.off('state', _this.forwardStateChange);
      };
    })(this);
    this.transition_handlers = [];
    fn = (function(_this) {
      return function(method) {
        return _this[method] = function(name) {
          if (Utils.isObject(name)) {
            return router[method].apply(router, arguments);
          }
          arguments[0] = _this._scopeName(router, name);
          return router[method].apply(router, arguments);
        };
      };
    })(this);
    for (i = 0, len = SCOPED_METHODS.length; i < len; i++) {
      method = SCOPED_METHODS[i];
      fn(method);
    }
    this.childRoutes = (function(_this) {
      return function() {
        var handler, k, name, ref, routes, v;
        routes = [];
        ref = router.recognizer.names;
        for (k in ref) {
          v = ref[k];
          if (!(k.indexOf(_this.name + '.') !== -1)) {
            continue;
          }
          name = k.replace(_this.name + '.', '');
          if (name.indexOf('.') === -1) {
            handler = Object.assign({}, v.handlers[_this.level + 1].handler);
            handler.name = name;
            routes.push(handler);
          }
        }
        return routes;
      };
    })(this);
    this.goBack = router.goBack;
  }

  NestedRouterStore.prototype._set = function(obj) {
    var k, v;
    for (k in obj) {
      v = obj[k];
      if (!(k === 'name' || k === 'url' || k === 'params' || k === 'query' || k === 'content')) {
        continue;
      }
      this[k] = v;
      this.emit(k, v);
    }
    return this;
  };

  NestedRouterStore.prototype.destroy = function() {
    var content, handler, i, len, ref;
    this.removeStateChange();
    ref = this.transition_handlers;
    for (i = 0, len = ref.length; i < len; i++) {
      handler = ref[i];
      this.off('transition', handler);
    }
    if (content = this.content) {
      content.destroy();
      return delete this.content;
    }
  };

  NestedRouterStore.prototype.forwardStateChange = function(state) {
    this.state = state;
    return this.emit('state', state);
  };

  NestedRouterStore.prototype.on = function(name, handlerFn) {
    if (name !== 'transition') {
      return NestedRouterStore.__super__.on.apply(this, arguments);
    }
    return this.transition_handlers.push(handlerFn);
  };

  NestedRouterStore.prototype.off = function(name, handlerFn) {
    var index;
    if (name !== 'transition') {
      return NestedRouterStore.__super__.off.apply(this, arguments);
    }
    if ((index = this.transition_handlers.indexOf(handlerFn)) != null) {
      return this.transition_handlers.splice(index, 1);
    }
  };

  NestedRouterStore.prototype._willTransition = function(transition, callback) {
    var fn, handlerFn, i, len, queue, ref;
    queue = new Queue(1);
    ref = this.transition_handlers;
    fn = function(handlerFn) {
      return queue.defer(function(callback) {
        if (handlerFn.length === 2) {
          return handlerFn(transition, callback);
        }
        handlerFn(transition);
        return callback();
      });
    };
    for (i = 0, len = ref.length; i < len; i++) {
      handlerFn = ref[i];
      fn(handlerFn);
    }
    return queue.await(callback);
  };

  NestedRouterStore.prototype._scopeName = function(router, name) {
    var char, i, len, name_array, ref, ref1, relative_name, start_index;
    if ((ref = name.charAt(0)) !== '.' && ref !== '*' && ref !== '^') {
      return name;
    }
    start_index = 1;
    ref1 = name.slice(1);
    for (i = 0, len = ref1.length; i < len; i++) {
      char = ref1[i];
      if (char !== '.') {
        break;
      }
      start_index += 1;
    }
    if (!(relative_name = name.slice(start_index))) {
      relative_name = 'index';
    }
    if (name.charAt(0) === '.') {
      (name_array = this.name.split('.').slice(0, (start_index > 1 ? 1 - start_index : start_index))).push(relative_name);
      return name_array.join('.');
    }
    if (name.charAt(0) === '^') {
      name = router._resolveNameFallback(relative_name, this.name.split('.').slice(0, -1).join('.'));
    }
    if (name.charAt(0) === '*') {
      name = router._resolveNameFallback(relative_name, this.name);
    }
    return name;
  };

  return NestedRouterStore;

})(require('eventemitter3'));
