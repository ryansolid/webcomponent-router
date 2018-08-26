// regex
const TRIM_SLASHES = /^\/+|\/+$/g;
const HASH_SECTION = /#(.*)$/;

// use hashes
class Hash {
  constructor() {
    this.replace = this.replace.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.type = 'hash';
    this.path = '';
  }

  set(path) {
    this.path = path;
    if (this.path === this.get()) return;
    location.hash = this.path;
  }

  replace(path) {
    this.path = path;
    if (this.path === this.get()) return;
    location.replace(this.formatURL(this.path));
  }

  get() {
    const match = location.href.match(HASH_SECTION),
      fragment = match ? match[1] : '';
    return '/' + fragment.replace(TRIM_SLASHES, '');
  }

  onUpdate(callback) {
    window.addEventListener('hashchange', () => {
      var newPath;
      if ((newPath = this.get()) === this.path) return;
      callback(newPath);
    }, false);
  }

  back() {} //TODO

  formatURL(url) { return '#' + url; }

};

// use window.history and pushstate
class History {
  constructor(root) {
    var ref;
    this.set = this.set.bind(this);
    this.replace = this.replace.bind(this);
    this.get = this.get.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.back = this.back.bind(this);
    this.formatURL = this.formatURL.bind(this);
    this.root = root;
    this.type = 'history';
    this.path = this.root;
    this.depth = ((ref = history.state) != null ? ref.depth : void 0) || 0;
  }

  set(path) {
    this.path = path;
    if (this.path === this.get()) return;
    history.pushState({
      depth: ++this.depth
    }, null, this.formatURL(this.path));
  }

  replace(path) {
    this.path = path;
    if (this.path === this.get() && (this.depth != null)) return;
    //initialization
    this.depth || (this.depth = 0);
    history.replaceState({
      depth: this.depth
    }, null, this.formatURL(this.path));
  }

  get() {
    let fragment = decodeURI(location.pathname + location.search).replace(TRIM_SLASHES, '');
    fragment = fragment.replace(this.root.replace(TRIM_SLASHES, ''), '');
    return '/' + fragment.replace(TRIM_SLASHES, '');
  }

  onUpdate(callback, historyCallback) {
    window.addEventListener('popstate', (event) => {
      var newPath, ref;
      newPath = this.get();
      historyCallback(newPath);
      if (newPath === this.path) return;
      this.depth = ((ref = event.state) != null ? ref.depth : void 0) || 0;
      return callback(newPath);
    }, false);
  }

  back(depth) { return history.go(-depth); }

  formatURL(url) { return this.root + url.replace(TRIM_SLASHES, ''); }

};

// no browser based location, use for testing
class None {
  constructor() {
    this.formatURL = this.formatURL.bind(this);
    // for testing
    this.trigger = this.trigger.bind(this);
    this.type = 'none';
    this.path = '/';
    this.updateCallback = null;
    this.fakeHistory = [];
    this.depth = 0;
  }

  set(path) {
    this.path = path;
    this.fakeHistory.push(this.path);
    return this.depth++;
  }

  replace(path) {
    this.path = path;
    return this.fakeHistory[this.depth - 1] = this.path;
  }

  get() { return this.path; }

  onUpdate(callback) { return this.updateCallback = callback; }

  back(depth) {
    this.depth -= 1 + depth;
    this.trigger(this.fakeHistory[this.depth]);
  }

  formatURL(url) { return url; }

  trigger(path) {
    if (path === this.path) return;
    this.updateCallback(path);
  }

};

// Location Factory
export default {
  create: function(type, ...args) {
    var root;
    switch (type) {
      case 'hash':
        return new Hash();
      case 'history':
        return new History((root = args[0]) ? '/' + root.replace(TRIM_SLASHES, '') + '/' : '/');
      case 'none':
        return new None();
    }
  }
};
