var HASH_SECTION, Hash, History, None, TRIM_SLASHES,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

TRIM_SLASHES = /^\/+|\/+$/g;

HASH_SECTION = /#(.*)$/;

Hash = (function() {
  function Hash() {
    this.onUpdate = bind(this.onUpdate, this);
    this.replace = bind(this.replace, this);
    this.type = 'hash';
    this.path = '';
  }

  Hash.prototype.set = function(path1) {
    this.path = path1;
    if (this.path === this.get()) {
      return;
    }
    return location.hash = this.path;
  };

  Hash.prototype.replace = function(path1) {
    this.path = path1;
    if (this.path === this.get()) {
      return;
    }
    return location.replace(this.formatURL(this.path));
  };

  Hash.prototype.get = function() {
    var fragment, match;
    match = location.href.match(HASH_SECTION);
    fragment = match ? match[1] : '';
    return '/' + fragment.replace(TRIM_SLASHES, '');
  };

  Hash.prototype.onUpdate = function(callback) {
    return window.addEventListener('hashchange', (function(_this) {
      return function(event) {
        var new_path;
        if ((new_path = _this.get()) === _this.path) {
          return;
        }
        return callback(new_path);
      };
    })(this), false);
  };

  Hash.prototype.back = function() {};

  Hash.prototype.formatURL = function(url) {
    return '#' + url;
  };

  return Hash;

})();

History = (function() {
  function History(root1) {
    var ref;
    this.root = root1;
    this.formatURL = bind(this.formatURL, this);
    this.back = bind(this.back, this);
    this.onUpdate = bind(this.onUpdate, this);
    this.get = bind(this.get, this);
    this.replace = bind(this.replace, this);
    this.set = bind(this.set, this);
    this.type = 'history';
    this.path = this.root;
    this.depth = (ref = history.state) != null ? ref.depth : void 0;
  }

  History.prototype.set = function(path1) {
    this.path = path1;
    if (this.path === this.get()) {
      return;
    }
    return history.pushState({
      depth: this.depth++
    }, null, this.formatURL(this.path));
  };

  History.prototype.replace = function(path1) {
    this.path = path1;
    if (this.path === this.get() && (this.depth != null)) {
      return;
    }
    this.depth || (this.depth = 0);
    return history.replaceState({
      depth: this.depth
    }, null, this.formatURL(this.path));
  };

  History.prototype.get = function() {
    var fragment;
    fragment = decodeURI(location.pathname + location.search).replace(TRIM_SLASHES, '');
    fragment = fragment.replace(this.root.replace(TRIM_SLASHES, ''), '');
    return '/' + fragment.replace(TRIM_SLASHES, '');
  };

  History.prototype.onUpdate = function(callback, history_callback) {
    return window.addEventListener('popstate', (function(_this) {
      return function(event) {
        var new_path;
        new_path = _this.get();
        history_callback(new_path);
        if (new_path === _this.path) {
          return;
        }
        _this.depth = event.state.depth;
        return callback(new_path);
      };
    })(this), false);
  };

  History.prototype.back = function(depth, callback) {
    history.go(-depth);
    return callback();
  };

  History.prototype.formatURL = function(url) {
    return this.root + url.replace(TRIM_SLASHES, '');
  };

  return History;

})();

None = (function() {
  function None() {
    this.trigger = bind(this.trigger, this);
    this.formatURL = bind(this.formatURL, this);
    this.type = 'none';
    this.path = '/';
    this.updateCallback = null;
    this.fake_history = [];
    this.depth = 0;
  }

  None.prototype.set = function(path1) {
    this.path = path1;
    this.fake_history.push(this.path);
    return this.depth++;
  };

  None.prototype.replace = function(path1) {
    this.path = path1;
    return this.fake_history[this.depth - 1] = this.path;
  };

  None.prototype.get = function() {
    return this.path;
  };

  None.prototype.onUpdate = function(callback) {
    return this.updateCallback = callback;
  };

  None.prototype.back = function(depth, callback) {
    this.depth -= 1 + depth;
    return this.trigger(this.fake_history[this.depth], callback);
  };

  None.prototype.formatURL = function(url) {
    return url;
  };

  None.prototype.trigger = function(path, callback) {
    if (path === this.path) {
      return;
    }
    return this.updateCallback(path, callback);
  };

  return None;

})();

module.exports = {
  create: function() {
    var args, root, type;
    type = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
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
