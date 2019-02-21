import Router from 'webcomponent-router';

function parse(value) {
  var parsed;
  if (!value) return;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    parsed = value;
  }
  if (typeof parsed !== 'string') return parsed;
  if (/^[0-9]*$/.test(parsed)) return +parsed;
  return parsed;
};

function sendEvent(element, name, value) {
  const event = document.createEvent('CustomEvent');
  event.initCustomEvent(name, true, true, value);
  return element.dispatchEvent(event);
};

function connectedToDOM(node) {
  if ('isConnected' in node) return node.isConnected;
  if (document.body.contains(node)) return true;
  while ((node = node.parentNode || node.host) && node !== document.documentElement) 0;
  return node === document.documentElement;
};

/* Component used for links
 * Attributes:
 *   name: name of the route
 *   params: json representation of params object
 *   query: json representation of query object
 */
class RouteLink extends HTMLAnchorElement {
  static get observedAttributes() { return ['name', 'params', 'query', 'clickbubble']; }
  constructor() {
    super(...arguments);
    this.onStateChange = this.onStateChange.bind(this);
  }

  connectedCallback() {
    // polyfill sometimes calls twice
    if (!connectedToDOM(this)) return;
    this.props || (this.props = {});
    RouteLink.observedAttributes.forEach((key) => {
      this.props[key] = this[key];
      Object.defineProperty(this, key, {
        get() { return this.props[key]; },
        set(val) {
          if (val === this.props[key]) return;
          this.props[key] = val;
          this.onStateChange();
        },
        configurable: true
      });
    });
    this.router = Router.for(this);
    this.name || (this.name = parse(this.getAttribute('name')));
    this.params || (this.params = parse(this.getAttribute('params')));
    this.query || (this.query = parse(this.getAttribute('query')));
    this.router.on('state', this.onStateChange);
    if (!!this.router.store.state) this.onStateChange();
  }

  onStateChange() {
    // polyfill protection
    if (!connectedToDOM(this)) return;
    if (!(this.name || this.query) || !this.router) return;
    let routeArgs = [this.name, this.params || {}, this.query || {}];
    if (!this.name) routeArgs = [this.query || {}];

    this.href = this.router.toURL(...routeArgs);
    this.onclick = e => {
      e.preventDefault();
      if (!this.clickbubble) e.stopPropagation();
      if (this.router != null) this.router.transitionTo(...routeArgs);
    };
    if (this.router.isActive(...routeArgs)) {
      this.classList.add('active');
      sendEvent(this, 'active', true);
    } else {
      this.classList.remove('active');
      if (!this.classList.length) this.removeAttribute('class');
      sendEvent(this, 'active', false);
    }
  };

  disconnectedCallback() {
    this.router && this.router.off('state', this.onStateChange);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this[name] = parse(newVal);
    this.onStateChange();
  }

};
RouteLink.prototype.clickbubble = true;

customElements.define('route-link', RouteLink, { extends: 'a' });
