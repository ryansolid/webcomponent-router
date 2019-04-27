import Recognizer from 'route-recognizer';
import Location from './location';
import RouterDSL from './dsl';
import Store from './store';
import scopeRouter from './scope'
import createRouteHandler from './routeHandler';
import { isObject, isEqual, pick } from './utils';

let ROUTER_ID = 0;

export default class Router {
  static for(element) {
    var router, routerInfo;
    while (!((routerInfo = element.__router) || !(element.parentNode || element.host))) {
      element = element.parentNode || element.host;
    }
    if (!(routerInfo && (router = Router.instances[routerInfo.id]))) {
      return;
    }
    if (routerInfo.level == null) return router;
    return scopeRouter(router, routerInfo.level);
  }

  constructor(element = {}, options = {}) {
    if (options.debug) {
      this.debug = options.debug;
    }
    this.id = `ro_${++ROUTER_ID}`;
    element.__router = { id: this.id };
    Router.instances[this.id] = this;
    this.recognizer = new Recognizer();
    if ((!options.location || options.location === 'history') && !!(typeof history !== "undefined" && history !== null ? history.pushState : void 0)) {
      this.location = Location.create('history', options.root);
    } else if (options.location === 'none') {
      this.location = Location.create('none');
    } else {
      this.location = Location.create('hash');
    }
    this.store = new Store(this.debug);
    createRouteHandler(this, element);
  }

  start() {
    // resolve initial url and replace current state
    const { name, params, query } = this._resolveRoute({ url: this.location.get() });
    this.location.replace(this.generate(name, params, query));
    // add hooks and trigger initial transition
    this.location.onUpdate(this.transitionTo.bind(this), (path) => this.store.emit('history', path));
    this.transitionTo(this.location.get());
  }

  on() { return this.store.on(...arguments); }

  off() { return this.store.off(...arguments); }

  once() { return this.store.once(...arguments); }

  hasRoute(name) { return this.recognizer.hasRoute(name); }

  generate(name, params, query) {
    try {
      return this.recognizer.generate(name, Object.assign({}, params, { queryParams: query }));
    } catch (error) {
      return '';
    }
  }

  isActive(name, params = {}) {
    var ref, ref1, state;
    if (!((ref = (state = this.store.state)) != null ? ref.url : void 0)) {
      return false;
    }
    // check params
    if (isObject(name)) {
      for (const k in name) {
        if (state.query[k] !== name[k]) return false;
      }
      return true;
    }
    const fragment = this.generate(name, this._defaultParams(name, params));
    if (state.url.indexOf(fragment) === 0 && ((ref1 = state.url[fragment.length]) === (void 0) || ref1 === '?' || ref1 === '/')) {
      return true;
    }
    //check resolved route
    ({ name, params } = this._resolveRoute({ name, params: this._defaultParams(name, params) }));
    return name === state.name && isEqual(params, state.params);
  }

  childRoutes() {
    const routes = [],
      names = this.recognizer.names;
    for (const k in names) {
      if (k.indexOf('.') === -1)
        routes.push(names[k].handlers[0].handler);
    }
    return routes;
  }

  toURL(name, params = {}, query = {}) {
    if (isObject(name)) {
      query = name;
      name = this.store.state.name;
      query = this._cleanQuery(Object.assign({}, this.store.state.query, query));
    }
    ({name, params, query} = this._resolveRoute({ name, params: this._defaultParams(name, params), query }));
    return this.location.formatURL(this.generate(name, params, query));
  }

  map(callback) {
    var dsl;
    dsl = RouterDSL.map(callback);
    return this.recognizer.map(dsl.generateFn(), function(recognizer, routes) {
      let proceed = true;
      const reversed = routes.slice(0).reverse();
      for (let i = 0, len = reversed.length; i < len; i++) {
        const route = reversed[i];
        if (!(proceed)) continue;
        recognizer.add(routes, { as: route.handler.name });
        proceed = (route.path === '/' || route.path === '') || route.handler.name.slice(-6) === '.index';
      }
    });
  }

  goBack(depth = 1) {
    if (!(this.location.depth - depth > -1)) return false;
    this.location.back(depth);
    return true;
  }

  transitionTo(name, params, query) {
    return this._transition(name, params, query, 'set');
  }

  replaceWith(name, params, query) {
    return this._transition(name, params, query, 'replace');
  }

  setState(state) { return this.store.updateState(state); }

  _transition(name = '/', params = {}, query = {}, method) {
    var ref, state_info, success;
    const old_state = this.store.state;
    if (isObject(name)) {
      query = name;
      name = old_state.name;
      query = this._cleanQuery(Object.assign({}, old_state.query, query));
    }
    const state_options = name.charAt(0) === '/' ? { url: name } : { name, params: this._defaultParams(name, params), query };
    if (!((state_info = this._resolveRoute(state_options)) != null ? (ref = state_info.handlers) != null ? ref.length : void 0 : void 0)) {
      return false;
    }
    const state = pick(state_info, Store.KEYS);
    state.levels = state_info.handlers.map((level) => level.handler);
    if (this.debug) console.log('Resolved to:', state.url);
    if (success = this.store.updateState(state)) this.location[method](state.url);
    return success;
  }

  // traces through redirects to create final list of handlers
  _resolveRoute(options) {
    var combinedParams, handler, handlers, newInfo, newOptions, parentName, redirect, ref, ref1;
    // resolve url
    if (!options.name) {
      if (!(handlers = this.recognizer.recognize(options.url) || this._notFound(options.url))) return;

      options.params = {};
      for (let i = 0, len = handlers.length; i < len; i++) {
        Object.assign(options.params, handlers[i].params);
      }
      options.name = handlers != null ? (ref = handlers[(handlers != null ? handlers.length : void 0) - 1]) != null ? ref.handler.name : void 0 : void 0;
      options.params = this._cleanParams(options.params);
      options.query = this._cleanQuery(handlers.queryParams);
    }
    if (!(handlers = this.recognizer.handlersFor(options.name))) return {};
    if (handlers.length && !(redirect = handlers[handlers.length - 1].handler.redirect)) {
      options.url || (options.url = this.generate(options.name, options.params, options.query));
      return Object.assign({handlers}, options);
    }
    if (!(newInfo = redirect(options.params, options.query))) return {};
    combinedParams = {};
    for (let j = 0, len1 = handlers.length; j < len1; j++) {
      handler = handlers[j];
      Object.assign(combinedParams, handler.params || pick(options.params, handler.names));
    }
    newOptions = {
      name: (parentName = (ref1 = handlers[handlers.length - 2]) != null ? ref1.handler.name : void 0) ? `${parentName}.${newInfo[0]}` : newInfo[0],
      params: this._cleanParams(Object.assign(newInfo[1] || {}, combinedParams)),
      query: this._cleanQuery(Object.assign(newInfo[2] || {}, options.query || {}, handlers.queryParams))
    };
    return this._resolveRoute(newOptions);
  }

  // finds nearest relative path starting from current level through each parent
  _resolveNameFallback(relativeName, parentName) {
    var name, name_array;
    name = parentName ? `${parentName}.${relativeName}` : relativeName;
    while (!(this.recognizer.hasRoute(name) || !(name_array = name.split('.').slice(0, -1)).length)) {
      name = name_array.slice(0, -1).concat([relativeName]).join('.');
    }
    return name;
  }

  // resolve not found url routes
  _notFound(url) {
    var handlers, name, nameHandlers, newHandlers, url_array;
    while (!((handlers = this.recognizer.recognize(url)) || !(url_array = url.split('/').slice(0, -1)).length)) {
      url = url_array.join('/');
    }
    if (!handlers) return;

    name = handlers[handlers.length - 1].handler.name;
    if (name.slice(-6) === '.index') name = name.slice(0, -6);
    name = this._resolveNameFallback('not_found', name);
    // handlers found by name are different format than url, combine to preserve url information
    nameHandlers = this.recognizer.handlersFor(name);
    newHandlers = { queryParams: handlers.queryParams };
    for (const k in handlers) {
      const v = handlers[k];
      if (nameHandlers[k].handler.name !== v.handler.name) {
        newHandlers[k] = { handler: nameHandlers[k].handler, params: {}, isDynamic: false };
        newHandlers.length = +k + 1;
        break;
      } else {
        newHandlers[k] = v;
      }
    }
    return newHandlers;
  }

  // applies current state parameter data as defaults to new proposed transition
  _defaultParams(name, params) {
    const handlers = this.recognizer.handlersFor(name);
    let paramNames = [];
    for (let i = 0, len = handlers.length; i < len; i++) {
      paramNames = paramNames.concat(handlers[i].names);
    }
    params = Object.assign(pick(this.store.state.params, paramNames), params);
    this._cleanParams(params);
    return params;
  }

  // resolves integer conversions for parameters that should be ints
  _cleanParams(params) {
    for (const k in params) {
      const v = params[k];
      if (/^[0-9]*$/.test(v)) {
        params[k] = +v;
      }
    }
    return params;
  }

  _cleanQuery(query) {
    const clean_query = {};
    for (const k in query) {
      const v = query[k];
      if (v && !(Array.isArray(v) && !v.length)) {
        if (Array.isArray(v) || isObject(v)) {
          clean_query[k] = v.slice(0);
        } else if (/^[0-9]*$/.test(v)) {
          clean_query[k] = +v;
        } else {
          clean_query[k] = v;
        }
      }
    }
    return clean_query;
  }

};
Router.instances = [];
