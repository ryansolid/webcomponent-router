var ApplicationRouter, Location, Queue, Recognizer, RouterDSL, State, Transition, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Queue = require('queue-async');

Recognizer = require('route-recognizer');

require('./shims');

Utils = require('./utils');

Location = require('./location');

RouterDSL = require('./dsl');

Transition = require('./transition');

State = require('./state');

module.exports = ApplicationRouter = (function(superClass) {
  extend(ApplicationRouter, superClass);

  ApplicationRouter.__queue = new Queue(1);

  ApplicationRouter["for"] = function(element) {
    var router;
    while (!((router = element.__router) || !(element.parentNode || element.host))) {
      element = element.host || element.parentNode;
    }
    return router;
  };

  function ApplicationRouter(element, options) {
    if (options == null) {
      options = {};
    }
    this._processEvents = bind(this._processEvents, this);
    this._willTransition = bind(this._willTransition, this);
    this._updateComponents = bind(this._updateComponents, this);
    this._defaultParams = bind(this._defaultParams, this);
    this._notFound = bind(this._notFound, this);
    this._resolveNameFallback = bind(this._resolveNameFallback, this);
    this._resolveRoute = bind(this._resolveRoute, this);
    this._transition = bind(this._transition, this);
    this._createState = bind(this._createState, this);
    this.replaceWith = bind(this.replaceWith, this);
    this.transitionTo = bind(this.transitionTo, this);
    this.goBack = bind(this.goBack, this);
    this.map = bind(this.map, this);
    this.toURL = bind(this.toURL, this);
    this.childRoutes = bind(this.childRoutes, this);
    this.isActive = bind(this.isActive, this);
    this.generate = bind(this.generate, this);
    this.hasRoute = bind(this.hasRoute, this);
    this.reset = bind(this.reset, this);
    this.start = bind(this.start, this);
    this._set = bind(this._set, this);
    ApplicationRouter.__super__.constructor.call(this);
    element.__router = this;
    if (options.debug) {
      this.debug = options.debug;
    }
    this.recognizer = new Recognizer();
    if (options.location === 'history' && !!(typeof history !== "undefined" && history !== null ? history.pushState : void 0)) {
      this.location = Location.create('history', options.root);
    } else if (options.location === 'none') {
      this.location = Location.create('none');
    } else {
      this.location = Location.create('hash');
    }
    this.reset();
  }

  ApplicationRouter.prototype._set = function(obj) {
    var k, v;
    for (k in obj) {
      v = obj[k];
      if (!(k === 'state' || k === 'name' || k === 'url' || k === 'params' || k === 'query' || k === 'content')) {
        continue;
      }
      this[k] = v;
      this.emit(k, v);
    }
    return this;
  };

  ApplicationRouter.prototype.start = function() {
    var name, params, query, ref;
    ref = this._resolveRoute({
      url: this.location.get()
    }), name = ref.name, params = ref.params, query = ref.query;
    this.location.replace(this.generate(name, params, query));
    this.location.onUpdate(this.transitionTo, (function(_this) {
      return function(path) {
        return _this.emit('history', path);
      };
    })(this));
    return this.transitionTo(this.location.get());
  };

  ApplicationRouter.prototype.reset = function(callback) {
    var queue, state;
    if (callback == null) {
      callback = (function() {});
    }
    queue = new Queue(1);
    if (state = this.state) {
      this._processEvents(queue, null, state.stores.slice(0).reverse(), 'exit');
    }
    return queue.await((function(_this) {
      return function(err) {
        _this._set({
          state: new State()
        });
        return callback(err);
      };
    })(this));
  };

  ApplicationRouter.prototype.hasRoute = function(name) {
    return this.recognizer.hasRoute(name);
  };

  ApplicationRouter.prototype.generate = function(name, params, query) {
    var err;
    try {
      return this.recognizer.generate(name, Object.assign({}, params, {
        queryParams: query
      }));
    } catch (error) {
      err = error;
      return '';
    }
  };

  ApplicationRouter.prototype.isActive = function(name, params) {
    var fragment, k, ref, ref1, ref2, ref3, state, v;
    if (params == null) {
      params = {};
    }
    if (!((ref = (state = ((ref1 = this.active_transition) != null ? ref1.state : void 0) || this.state)) != null ? ref.url : void 0)) {
      return false;
    }
    if (Utils.isObject(name)) {
      for (k in name) {
        v = name[k];
        if (state.query[k] !== v) {
          return false;
        }
      }
      return true;
    }
    fragment = this.generate(name, this._defaultParams(name, params));
    if (state.url.indexOf(fragment) === 0 && ((ref2 = state.url[fragment.length]) === (void 0) || ref2 === '?' || ref2 === '/')) {
      return true;
    }
    ref3 = this._resolveRoute({
      name: name,
      params: this._defaultParams(name, params)
    }), name = ref3.name, params = ref3.params;
    return name === state.name && Utils.isEqual(params, state.params);
  };

  ApplicationRouter.prototype.childRoutes = function() {
    var k, ref, routes, v;
    routes = [];
    ref = this.recognizer.names;
    for (k in ref) {
      v = ref[k];
      if (k.indexOf('.') === -1) {
        routes.push(v.handlers[0].handler);
      }
    }
    return routes;
  };

  ApplicationRouter.prototype.toURL = function(name, params, query) {
    var ref, ref1, state;
    if (params == null) {
      params = {};
    }
    if (query == null) {
      query = {};
    }
    if (Utils.isObject(name)) {
      query = name;
      state = ((ref = this.active_transition) != null ? ref.state : void 0) || this.state;
      name = state.name;
      query = this._cleanQuery(Object.assign({}, state.query, query));
    }
    ref1 = this._resolveRoute({
      name: name,
      params: this._defaultParams(name, params),
      query: query
    }), name = ref1.name, params = ref1.params, query = ref1.query;
    return this.location.formatURL(this.generate(name, params, query));
  };

  ApplicationRouter.prototype.map = function(callback) {
    var dsl;
    dsl = RouterDSL.map(callback);
    return this.recognizer.map(dsl.generateFn(), function(recognizer, routes) {
      var i, len, proceed, ref, ref1, route;
      proceed = true;
      ref = routes.slice(0).reverse();
      for (i = 0, len = ref.length; i < len; i++) {
        route = ref[i];
        if (!(proceed)) {
          continue;
        }
        recognizer.add(routes, {
          as: route.handler.name
        });
        proceed = ((ref1 = route.path) === '/' || ref1 === '') || route.handler.name.slice(-6) === '.index';
      }
    });
  };

  ApplicationRouter.prototype.goBack = function(depth, callback) {
    if (depth == null) {
      depth = 1;
    }
    if (callback == null) {
      callback = (function() {});
    }
    if (arguments.length === 1 && Utils.isFunction(depth)) {
      callback = depth;
      depth = 1;
    }
    if (!(this.location.depth - depth > -1)) {
      return callback('Insufficient Depth');
    }
    return this.location.back(depth, callback);
  };

  ApplicationRouter.prototype.transitionTo = function(name, params, query, callback) {
    var args;
    args = arguments;
    return ApplicationRouter.__queue.defer((function(_this) {
      return function(queue_callback) {
        var done, ref, state;
        done = function(err) {
          callback(err);
          return queue_callback();
        };
        ref = _this._createState.apply(_this, args), state = ref.state, callback = ref.callback;
        if (!state) {
          return done();
        }
        return _this._transition(state, {
          method: 'set'
        }, done);
      };
    })(this));
  };

  ApplicationRouter.prototype.replaceWith = function(name, params, query, callback) {
    var args;
    args = arguments;
    return ApplicationRouter.__queue.defer((function(_this) {
      return function(queue_callback) {
        var done, ref, state;
        done = function(err) {
          callback(err);
          return queue_callback();
        };
        ref = _this._createState.apply(_this, args), state = ref.state, callback = ref.callback;
        if (!state) {
          return done();
        }
        return _this._transition(state, {
          method: 'replace'
        }, done);
      };
    })(this));
  };

  ApplicationRouter.prototype._createState = function(name, params, query, callback) {
    var new_state, old_state, state_options;
    if (name == null) {
      name = '/';
    }
    if (params == null) {
      params = {};
    }
    if (query == null) {
      query = {};
    }
    if (arguments.length === 2 && Utils.isFunction(params)) {
      callback = params;
      params = {};
    }
    if (arguments.length === 3 && Utils.isFunction(query)) {
      callback = query;
      query = {};
    }
    if (!Utils.isFunction(callback)) {
      callback = (function() {});
    }
    old_state = this.state;
    if (Utils.isObject(name)) {
      query = name;
      name = old_state.name;
      query = this._cleanQuery(Object.assign({}, old_state.query, query));
    }
    state_options = name.charAt(0) === '/' ? {
      url: name
    } : {
      name: name,
      params: this._defaultParams(name, params),
      query: query
    };
    new_state = old_state.toNewState(this, state_options);
    return {
      state: new_state,
      callback: callback
    };
  };

  ApplicationRouter.prototype._transition = function(state, options, callback) {
    var transition;
    transition = new Transition(this, state);
    if (this.debug) {
      console.log('Transition resolved to:', transition.state.url);
    }
    this.active_transition = transition;
    return transition.execute((function(_this) {
      return function(err) {
        if (err) {
          return callback(err);
        }
        return _this._updateComponents(transition, function(err) {
          if (err) {
            return callback(err);
          }
          if (transition.is_active) {
            _this.location[options.method](transition.state.url);
            transition.is_active = false;
            delete _this.active_transition;
          }
          return callback();
        });
      };
    })(this));
  };

  ApplicationRouter.prototype._resolveRoute = function(options) {
    var combined_params, handler, handlers, i, j, len, len1, new_info, new_options, parent_name, redirect, ref, ref1;
    if (!options.name) {
      if (!(handlers = this.recognizer.recognize(options.url) || this._notFound(options.url))) {
        return;
      }
      options.params = {};
      for (i = 0, len = handlers.length; i < len; i++) {
        handler = handlers[i];
        Object.assign(options.params, handler.params);
      }
      options.name = handlers != null ? (ref = handlers[(handlers != null ? handlers.length : void 0) - 1]) != null ? ref.handler.name : void 0 : void 0;
      options.params = this._cleanParams(options.params);
      options.query = this._cleanQuery(handlers.queryParams);
    }
    if (!(handlers = this.recognizer.handlersFor(options.name))) {
      return;
    }
    if (handlers.length && !(redirect = handlers[handlers.length - 1].handler.redirect)) {
      options.url || (options.url = this.generate(options.name, options.params, options.query));
      return Object.assign({
        handlers: handlers
      }, options);
    }
    new_info = redirect(options.params, options.query);
    combined_params = {};
    for (j = 0, len1 = handlers.length; j < len1; j++) {
      handler = handlers[j];
      Object.assign(combined_params, handler.params || Utils.pick(options.params, handler.names));
    }
    new_options = {
      name: (parent_name = (ref1 = handlers[handlers.length - 2]) != null ? ref1.handler.name : void 0) ? parent_name + "." + new_info[0] : new_info[0],
      params: this._cleanParams(Object.assign(new_info[1] || {}, combined_params)),
      query: this._cleanQuery(Object.assign(new_info[2] || {}, options.query || {}, handlers.queryParams))
    };
    return this._resolveRoute(new_options);
  };

  ApplicationRouter.prototype._resolveNameFallback = function(relative_name, parent_name) {
    var name, name_array;
    name = parent_name ? parent_name + "." + relative_name : relative_name;
    while (!(this.recognizer.hasRoute(name) || !(name_array = name.split('.').slice(0, -1)).length)) {
      name = name_array.slice(0, -1).concat([relative_name]).join('.');
    }
    return name;
  };

  ApplicationRouter.prototype._notFound = function(url) {
    var handlers, k, name, name_handlers, new_handlers, url_array, v;
    while (!((handlers = this.recognizer.recognize(url)) || !(url_array = url.split('/').slice(0, -1)).length)) {
      url = url_array.join('/');
    }
    if (!handlers) {
      return;
    }
    name = handlers[handlers.length - 1].handler.name;
    if (name.slice(-6) === '.index') {
      name = name.slice(0, -6);
    }
    name = this._resolveNameFallback('not_found', name);
    name_handlers = this.recognizer.handlersFor(name);
    new_handlers = {
      queryParams: handlers.queryParams
    };
    for (k in handlers) {
      v = handlers[k];
      if (name_handlers[k].handler.name !== v.handler.name) {
        new_handlers[k] = {
          handler: name_handlers[k].handler,
          params: {},
          isDynamic: false
        };
        new_handlers.length = +k + 1;
        break;
      } else {
        new_handlers[k] = v;
      }
    }
    return new_handlers;
  };

  ApplicationRouter.prototype._defaultParams = function(name, params) {
    var i, len, param_names, ref, result, state;
    state = this.state;
    param_names = [];
    ref = this.recognizer.handlersFor(name);
    for (i = 0, len = ref.length; i < len; i++) {
      result = ref[i];
      param_names = param_names.concat(result.names);
    }
    params = Object.assign(Utils.pick(state.params, param_names), params);
    this._cleanParams(params);
    return params;
  };

  ApplicationRouter.prototype._cleanParams = function(params) {
    var k, v;
    for (k in params) {
      v = params[k];
      if (/^[0-9]*$/.test(v)) {
        params[k] = +v;
      }
    }
    return params;
  };

  ApplicationRouter.prototype._cleanQuery = function(query) {
    var clean_query, k, v;
    clean_query = {};
    for (k in query) {
      v = query[k];
      if (v && !(Array.isArray(v) && !v.length)) {
        if (Array.isArray(v) || Utils.isObject(v)) {
          clean_query[k] = Object.assign({}, v);
        } else if (/^[0-9]*$/.test(v)) {
          clean_query[k] = +v;
        } else {
          clean_query[k] = v;
        }
      }
    }
    return clean_query;
  };

  ApplicationRouter.prototype._updateComponents = function(transition, callback) {
    var stores;
    stores = transition.state.partitionStores(this.state);
    transition.current_stores = stores.unchanged.slice(0);
    if (!(stores.exited.length || stores.updated.length || stores.entered.length)) {
      return callback();
    }
    return this._willTransition(transition, stores.exited.concat(stores.reset), (function(_this) {
      return function(err) {
        if (err) {
          return callback(err);
        }
        if (transition.is_aborted) {
          return callback(new Error('transition aborted'));
        }
        _this._processEvents(transition, stores.exited, 'exit');
        _this._processEvents(transition, stores.updated, 'update');
        _this._processEvents(transition, stores.entered, 'enter');
        _this._set({
          state: transition.state,
          params: transition.state.params,
          query: transition.state.query,
          url: transition.state.url,
          name: transition.state.name
        });
        return callback();
      };
    })(this));
  };

  ApplicationRouter.prototype._willTransition = function(transition, list, callback) {
    var fn, i, len, queue, store;
    queue = new Queue(1);
    fn = (function(_this) {
      return function(store) {
        return queue.defer(function(callback) {
          if (transition.is_aborted) {
            return callback(new Error('transition aborted'));
          }
          if (_this.debug) {
            console.log('Will Transition:', store.tag);
          }
          return store._willTransition(transition, callback);
        });
      };
    })(this);
    for (i = 0, len = list.length; i < len; i++) {
      store = list[i];
      fn(store);
    }
    return queue.await(callback);
  };

  ApplicationRouter.prototype._processEvents = function(transition, list, type) {
    var current, i, len, level, ref, store, top;
    for (i = 0, len = list.length; i < len; i++) {
      store = list[i];
      switch (type) {
        case 'enter':
          if (store.tag) {
            top = (ref = (current = transition.current_stores)) != null ? ref[(current != null ? current.length : void 0) - 1] : void 0;
            current.push(store);
            if (this.debug) {
              console.log('Set Content:', (top != null ? top.tag : void 0) || 'Application', '->', store.tag);
            }
            (top || this)._set({
              content: store
            });
          }
          break;
        case 'update':
          level = store.level;
          if (store.params_changed) {
            if (this.debug) {
              console.log('Update Params:', store.tag, store.params);
            }
            this.state.stores[level]._set({
              params: store.params
            });
          }
          if (store.query_changed) {
            if (this.debug) {
              console.log('Update Query:', store.tag, store.query);
            }
            this.state.stores[level]._set({
              query: store.query
            });
          }
          delete store.params_changed;
          delete store.query_changed;
          transition.current_stores.push(transition.state.stores[level] = this.state.stores[level]);
          break;
        default:
          if (this.debug) {
            console.log('Exit:', store.tag);
          }
          store.emit(type, transition);
      }
    }
  };

  return ApplicationRouter;

})(require('eventemitter3'));

if (typeof window !== 'undefined') {
  require('document-register-element');
  require('./components/route-outlet');
  require('./components/route-link');
}
