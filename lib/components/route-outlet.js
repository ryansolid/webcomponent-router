var RouteOutlet, Router, Utils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Router = require('../index');

Utils = require('../utils');

module.exports = RouteOutlet = (function(superClass) {
  extend(RouteOutlet, superClass);

  function RouteOutlet() {
    return RouteOutlet.__super__.constructor.apply(this, arguments);
  }

  RouteOutlet.prototype.connectedCallback = function() {
    var component, onParamsChange, onQueryChange, prev_params;
    component = null;
    prev_params = [];
    onParamsChange = (function(_this) {
      return function(params) {
        var i, k, keys, len, v;
        for (k in params) {
          v = params[k];
          if (!Utils.isString(v)) {
            v = JSON.stringify(v);
          }
          component.setAttribute(k.replace(/_/g, '-'), v);
        }
        keys = Utils.difference(Object.keys(prev_params), Object.keys(params));
        for (i = 0, len = keys.length; i < len; i++) {
          k = keys[i];
          component.setAttribute(k.replace(/_/g, '-'), null);
          component.removeAttribute(k.replace(/_/g, '-'));
        }
        return prev_params = params;
      };
    })(this);
    onQueryChange = function(query) {
      if (query) {
        component.setAttribute('query', JSON.stringify(query));
      }
      if (!Object.keys(query).length) {
        return component.removeAttribute('query');
      }
    };
    this.onContentChange = (function(_this) {
      return function(content) {
        var attr, attributes, child, i, k, len, old_router, ref, ref1, tag, v;
        if (old_router = (ref = _this.firstChild) != null ? ref.__router : void 0) {
          old_router.off('params', onParamsChange);
          old_router.off('query', onQueryChange);
          old_router.destroy();
          _this.firstChild.__router = null;
        }
        while (child = _this.firstChild) {
          _this.removeChild(child);
        }
        if (!(tag = content.tag)) {
          return;
        }
        component = document.createElement(tag);
        component.__router = content;
        attributes = {};
        ref1 = _this.attributes;
        for (i = 0, len = ref1.length; i < len; i++) {
          attr = ref1[i];
          attributes[attr.name] = attr.value;
        }
        if (Object.keys(Object.assign(attributes, content.attributes)).length) {
          for (k in attributes) {
            v = attributes[k];
            if (!Utils.isString(v)) {
              v = JSON.stringify(v);
            }
            component.setAttribute(k, v);
          }
        }
        content.on('params', onParamsChange);
        content.on('query', onQueryChange);
        onParamsChange(content.params);
        onQueryChange(content.query);
        return _this.appendChild(component);
      };
    })(this);
    this.router = Router["for"](this);
    this.router.on('content', this.onContentChange);
    if (!!this.router.content) {
      return this.onContentChange(this.router.content);
    }
  };

  RouteOutlet.prototype.disconnectedCallback = function() {
    return this.router.off('content', this.onContentChange);
  };

  return RouteOutlet;

})(HTMLElement);

customElements.define('route-outlet', RouteOutlet);
