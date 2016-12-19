var RouteLink, Router, parse, sendEvent,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Router = require('../index');

parse = function(value) {
  var err, parsed;
  if (!value) {
    return;
  }
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    err = error;
    parsed = value;
  }
  if (typeof parsed !== 'string') {
    return parsed;
  }
  if (/^[0-9]*$/.test(parsed)) {
    return +parsed;
  }
  return parsed;
};

sendEvent = function(element, name, value) {
  var event;
  event = document.createEvent('CustomEvent');
  event.initCustomEvent(name, true, true, value);
  return element.dispatchEvent(event);
};


/* Component used for links
 * Attributes:
 *   name: name of the route
 *   params: json representation of params object
 *   query: json representation of query object
 */

module.exports = RouteLink = (function(superClass) {
  extend(RouteLink, superClass);

  function RouteLink() {
    return RouteLink.__super__.constructor.apply(this, arguments);
  }

  RouteLink.observedAttributes = ['name', 'params', 'query'];

  RouteLink.prototype.connectedCallback = function() {
    this.router = Router["for"](this);
    this.template = document.createDocumentFragment();
    while (this.firstChild) {
      this.template.appendChild(this.firstChild);
    }
    this.appendChild(document.createElement('a'));
    this.firstChild.appendChild(this.template.cloneNode(true));
    this.onStateChange = (function(_this) {
      return function() {
        var ref;
        if (!_this.props.name) {
          return;
        }
        _this.firstChild.href = "" + ((ref = _this.router) != null ? ref.toURL(_this.props.name, _this.props.params || {}, _this.props.query || {}) : void 0);
        _this.firstChild.onclick = function(e) {
          var ref1;
          if ((ref1 = _this.router) != null) {
            ref1.transitionTo(_this.props.name, _this.props.params || {}, _this.props.query || {});
          }
          return e.preventDefault();
        };
        if (_this.router.isActive(_this.props.name, _this.props.params || {}, _this.props.query || {})) {
          _this.classList.add('active');
          _this.firstChild.classList.add('active');
          return sendEvent(_this, 'active', true);
        } else {
          _this.classList.remove('active');
          _this.firstChild.classList.remove('active');
          if (!_this.classList.length) {
            _this.removeAttribute('class');
          }
          if (!_this.firstChild.classList.length) {
            _this.firstChild.removeAttribute('class');
          }
          return sendEvent(_this, 'active', false);
        }
      };
    })(this);
    this.props = {
      name: parse(this.getAttribute('name')),
      params: parse(this.getAttribute('params')),
      query: parse(this.getAttribute('query'))
    };
    this.router.on('state', this.onStateChange);
    if (!!this.router.state) {
      return this.onStateChange(this.router.state);
    }
  };

  RouteLink.prototype.disconnectedCallback = function() {
    return this.router.off('state', this.onStateChange);
  };

  RouteLink.prototype.attributeChangedCallback = function(name, old_val, new_val) {
    if (!this.props) {
      return;
    }
    this.props[name] = parse(new_val);
    return this.onStateChange();
  };

  return RouteLink;

})(HTMLElement);

customElements.define('route-link', RouteLink);
