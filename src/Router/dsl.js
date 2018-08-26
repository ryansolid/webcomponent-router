import { isFunction, isObject } from './utils';

// Based heavily on Ember's DSL
// To keep it simple each nested level of the router is only aware of its own nested level
// ie. naming and redirects can only be used relative to the current level and no wildcards are allowed
// It is up to the application to ask for more complicated navigation
// Each Route options object must have a path and either tag or a redirect method defined
// Helpers index and notFound default the path and names, and only take options or redirect function directly
export default class RouterDSL {
  constructor(parent) {
    this.fullName = this.fullName.bind(this);
    // adds routes
    this.route = this.route.bind(this);
    this.addRoute = this.addRoute.bind(this);
    this.generateFn = this.generateFn.bind(this);
    this.parent = parent;
    this.matches = [];
    this.explicitIndex = false;
  }

  fullName(name) {
    if (!this.parent) return name;
    return this.parent + "." + name;
  }

  route(name, options = {}, callback) {
    var dsl;
    if (!callback) {
      // no children
      return this.addRoute(name, options);
    }
    dsl = new RouterDSL(this.fullName(name));
    callback.call(dsl, dsl);
    return this.addRoute(name, options, dsl.generateFn());
  }

  // adds index for nested levels
  index(options, callback) {
    // redirect with dynamic args, no callback possible
    if (isFunction(options)) {
      return this.addRoute('index', { path: '/', redirect: options });
    }
    // index route
    if (isObject(options)) {
      return this.route('index', Object.assign({}, options, { path: '/' }), callback);
    }
  }

  // adds handler for not found route
  notFound(options) {
    // redirect with dynamic args, no callback possible
    if (isFunction(options)) {
      return this.addRoute('not_found', { path: '/not-found', redirect: options });
    }
    // index route
    if (isObject(options)) {
      return this.route('not_found', Object.assign({}, options, { path: '/not-found' }));
    }
  }

  addRoute(name, options, callback) {
    var handler, handlerOptions, ref;
    handlerOptions = Object.assign({}, options);
    delete handlerOptions.path;
    handler = Object.assign({ name: this.fullName(name) }, handlerOptions);
    if (((ref = options.path) === '/' || ref === '') || name.slice(-5) === 'index') {
      this.explicitIndex = true;
    }
    return this.matches.push([options.path || `/${name.replace(/_/g, '-')}`, handler, callback]);
  }

  generateFn() {
    if (!this.explicitIndex) {
      // add empty index
      this.index({});
    }
    return (match) => {
      var dslMatch;
      for (let i = 0, len = this.matches.length; i < len; i++) {
        dslMatch = this.matches[i];
        match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
      }
    };
  }

  static map(callback) {
    var dsl;
    dsl = new RouterDSL();
    callback.call(dsl, dsl);
    return dsl;
  }

};
