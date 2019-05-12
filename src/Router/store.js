import { isEqual } from './utils';

export default class Store {
  static get KEYS() { return ['name', 'params', 'query', 'url'] };
  constructor(debug) {
    // register callbacks
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.debug = debug;
    this.state = { levels: [], params: {}, query: {} };
    this.handlers = { transition: [] };
  }

  on(name, handlerFn) {
    this.handlers[name] || (this.handlers[name] = []);
    this.handlers[name].push(handlerFn);
    return this;
  }

  once(name, handlerFn) {
    this.handlers[name] || (this.handlers[name] = []);
    const selfRemoving = (p) => { handlerFn(p); this.off(name, selfRemoving); }
    this.handlers[name].push(selfRemoving);
    return this;
  }

  off(name, handlerFn) {
    var index;
    if (!(name in this.handlers)) return;
    if (!handlerFn) this.handlers[name] = [];
    else if ((index = this.handlers[name].indexOf(handlerFn)) > -1) this.handlers[name].splice(index, 1);
    return this;
  }

  emit(name, ...payload) {
    if (!(name in this.handlers)) return;
    const handlers = this.handlers[name].slice(0);
    for (let i = 0, len = handlers.length; i < len; i++) {
      handlers[i](...payload);
    }
  }

  updateState(state) {
    var changeIndex, changedKeys, handlerFn, k, level, ref1;
    changeIndex = -1;
    for (let i = 0, len = state.levels.length; i < len; i++) {
      level = state.levels[i];
      if (!(((ref1 = this.state.levels[i]) != null ? ref1.name : void 0) !== level.name)) continue;
      changeIndex = i;
      break;
    }
    changedKeys = [];
    for (let l = 0, len1 = Store.KEYS.length; l < len1; l++) {
      k = Store.KEYS[l];
      if (isEqual(state[k], this.state[k])) continue;
      changedKeys.push(k);
    }
    if (!(changeIndex > -1 || changedKeys.length)) return true;
    for (let m = 0, len2 = this.handlers['transition'].length; m < len2; m++) {
      handlerFn = this.handlers['transition'][m];
      if (!handlerFn(state)) return false;
    }
    this.state = state;
    this.emit('state', state, changedKeys);
    for (let i = 0, len = changedKeys.length; i < len; i++) {
      const k = changedKeys[i];
      this.emit(k, state[k]);
    }
    return true;
  }
};
