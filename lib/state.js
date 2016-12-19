var NestedRouter, Queue, State, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Queue = require('queue-async');

Utils = require('./utils');

NestedRouter = require('./nested_store');

module.exports = State = (function() {
  function State(options) {
    var k, ref, v;
    if (options == null) {
      options = {};
    }
    this.partitionStores = bind(this.partitionStores, this);
    this.toNewState = bind(this.toNewState, this);
    this.stores = [];
    ref = Utils.pick(options, 'query', 'params', 'url', 'name');
    for (k in ref) {
      v = ref[k];
      this[k] = v;
    }
  }

  State.prototype.toNewState = function(router, options) {
    var i, j, len, new_state, new_store, old_store, ref, ref1, ref2, result, state_info, states_differ;
    if (options == null) {
      options = {};
    }
    if (!((ref = (state_info = router._resolveRoute(options))) != null ? (ref1 = ref.handlers) != null ? ref1.length : void 0 : void 0)) {
      return null;
    }
    new_state = new State(state_info);
    states_differ = false;
    ref2 = state_info.handlers;
    for (i = j = 0, len = ref2.length; j < len; i = ++j) {
      result = ref2[i];
      old_store = this.stores[i];
      new_store = new NestedRouter(router, {
        level: i,
        name: result.handler.name,
        param_names: result.names,
        params: state_info.params,
        query: state_info.query,
        tag: result.handler.tag,
        attributes: result.handler.attributes
      });
      if (this._shouldSupercede(states_differ, new_store, old_store)) {
        states_differ = true;
        new_state.stores[i] = new_store;
      } else {
        new_state.stores[i] = old_store;
      }
    }
    if (states_differ) {
      return new_state;
    } else {
      return null;
    }
  };

  State.prototype.partitionStores = function(old_state) {
    var context_changed, i, j, l, len, len1, old_store, ref, ref1, ref2, results, store;
    results = {
      updated: [],
      exited: [],
      entered: [],
      reset: [],
      unchanged: []
    };
    context_changed = false;
    ref = this.stores;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      store = ref[i];
      old_store = old_state != null ? old_state.stores[i] : void 0;
      if ((old_store != null ? old_store.name : void 0) !== store.name) {
        results.entered.push(store);
        if (old_store) {
          results.exited.unshift(old_store);
        }
      } else if (context_changed || store.params_changed || store.query_changed) {
        context_changed = true;
        results.updated.push(store);
        if (store.will_transition) {
          results.reset.push(old_store);
        }
        delete store.will_transition;
      } else {
        results.unchanged.push(old_store);
      }
    }
    ref2 = old_state != null ? (ref1 = old_state.stores) != null ? ref1.slice(this.stores.length) : void 0 : void 0;
    for (l = 0, len1 = ref2.length; l < len1; l++) {
      old_store = ref2[l];
      results.exited.unshift(old_store);
    }
    results.reset = results.reset.reverse();
    return results;
  };

  State.prototype._shouldSupercede = function(states_differ, new_store, old_store) {
    var params_changed, query_changed;
    if (!old_store || (old_store.tag !== new_store.tag) || old_store.name !== new_store.name) {
      return true;
    }
    if (params_changed = !Utils.isEqual(old_store.params, new_store.params)) {
      new_store.params_changed = true;
    }
    if (query_changed = !Utils.isEqual(old_store.query, new_store.query)) {
      new_store.query_changed = true;
    }
    if (query_changed || !Utils.isEqual(Utils.pick(old_store.params, new_store.param_names), Utils.pick(new_store.params, new_store.param_names))) {
      new_store.will_transition = true;
    }
    return states_differ || params_changed || query_changed;
  };

  return State;

})();
