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
    const selfRemoving = (p) => { handlerFn(p); this.off(selfRemoving); }
    this.handlers[name].push(selfRemoving);
    return this;
  }

  off(name, handlerFn) {
    var index;
    if (!(name in this.handlers)) return;
    if ((index = this.handlers[name].indexOf(handlerFn)) > -1) this.handlers[name].splice(index, 1);
    return this;
  }

  async emit(name, payload) {
    if (!(name in this.handlers)) return;
    for (let i = 0, len = this.handlers[name].length; i < len; i++) {
      await this.handlers[name][i](payload);
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
    const oldState = this.state
    this.state = state;
    this.notify(oldState, changeIndex, changedKeys)
    return true;
  }

  async notify(oldState, changeIndex, changedKeys) {
    var enterPayload, exitPayload;
    if (changeIndex > -1) {
      if (oldState.levels.length) {
        exitPayload = Object.assign({}, ...((function() {
          var i, n, ref4, ref5, results;
          results = [];
          for (i = n = ref4 = changeIndex, ref5 = oldState.levels.length; (ref4 <= ref5 ? n < ref5 : n > ref5); i = ref4 <= ref5 ? ++n : --n) {
            results.push({
              [`${i}`]: oldState.levels[i]
            });
          }
          return results;
        }).call(this)));
        if (this.debug) {
          console.log('Exit:', exitPayload);
        }
        await this.emit('exit', exitPayload);
      }
    }
    this.emit('state', this.state);
    if (changeIndex > -1) {
      enterPayload = Object.assign({}, ...((() => {
        var i, n, ref4, ref5, results;
        results = [];
        for (i = n = ref4 = changeIndex, ref5 = this.state.levels.length; (ref4 <= ref5 ? n < ref5 : n > ref5); i = ref4 <= ref5 ? ++n : --n) {
          results.push({
            [`${i}`]: this.state.levels[i]
          });
        }
        return results;
      })()));
      if (this.debug) {
        console.log('Enter:', enterPayload);
      }
      await this.emit('enter', enterPayload);
    }
    for (let i = 0, len = changedKeys.length; i < len; i++) {
      const k = changedKeys[i];
      if (this.debug && (k === 'params' || k === 'query')) {
        console.log(`Update ${k}:`, this.state[k]);
      }
      this.emit(k, this.state[k]);
    }
  }

};
