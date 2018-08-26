import Router from 'webcomponent-router';

function toAttributeName(param) {
  return param.replace(
    /\.?([A-Z]+)/g,
    (x, y) => "-" + y.toLowerCase()
  ).replace(/_/g, '-').replace(/^-/, "");
};

function isString(val) {
  return Object.prototype.toString.call(val) === "[object String]";
}

function difference(a, b) { return a.filter((t) => b.indexOf(t) < 0); }

class RouteOutlet extends HTMLElement {
  connectedCallback() {
    var element, level, prevParams, targetLevel;
    element = null;
    prevParams = [];

    this.onParamsChange = (params) => {
      for (const k in params) {
        let v = params[k];
        if (!isString(v)) v = JSON.stringify(v);
        element.setAttribute(toAttributeName(k), v);
      }
      const keys = difference(Object.keys(prevParams), Object.keys(params));
      for (let i = 0, len = keys.length; i < len; i++) {
        const attr = toAttributeName(keys[i]);
        element.setAttribute(attr, null);
        element.removeAttribute(attr);
      }
      return prevParams = params;
    };

    this.onQueryChange = (query) => {
      if (query) {
        element.setAttribute('query', JSON.stringify(query));
      }
      if (!Object.keys(query).length) element.removeAttribute('query');
    };

    this.onEnter = async(changes) => {
      var onEnter, onEnterComplete, ref, tag;
      if (!(tag = (ref = changes[targetLevel]) != null ? ref.tag : void 0)) {
        return;
      }
      if ((element != null ? element.nodeName.toLowerCase() : void 0) === tag) {
        return;
      }
      if (onEnter = changes[targetLevel].onEnter) {
        await onEnter(this);
      }
      element = document.createElement(tag);
      element.__router = {
        id: this.router.id,
        level: targetLevel
      };
      let attributes = {};
      for (let i = 0, len = this.attributes.length; i < len; i++) {
        const attr = this.attributes[i];
        attributes[attr.name] = attr.value;
      }
      if (Object.keys(Object.assign(attributes, changes[targetLevel].attributes)).length) {
        for (const k in attributes) {
          let v = attributes[k];
          if (!isString(v)) v = JSON.stringify(v);
          element.setAttribute(k, v);
        }
      }
      this.onParamsChange(this.router.store.state.params);
      this.onQueryChange(this.router.store.state.query);
      this.appendChild(element);
      if (onEnterComplete = changes[targetLevel].onEnterComplete) {
        await onEnterComplete(this);
      }
    };

    this.onExit = async(changes) => {
      var onExit;
      if (!(targetLevel in changes)) return;
      if (onExit = changes[targetLevel].onExit) {
        await onExit(this);
      }
      if (this.firstChild) this.removeChild(this.firstChild);
      element = null;
    };

    this.refresh = async () => {
      const change = {
        [`${targetLevel}`]: this.router.store.state.levels[targetLevel]
      };
      await this.onExit(change);
      await this.onEnter(change);
    };

    if (!(this.router = Router.for(this))) return;
    targetLevel = (level = this.router.level) != null ? level + 1 : 0;
    this.router.on('exit', this.onExit);
    this.router.on('enter', this.onEnter);
    this.router.on('params', this.onParamsChange);
    this.router.on('query', this.onQueryChange);
    this.onEnter({
      [`${targetLevel}`]: this.router.store.state.levels[targetLevel]
    });
  }

  disconnectedCallback() {
    if (!this.router) return;
    this.router.off('exit', this.onExit);
    this.router.off('enter', this.onEnter);
    this.router.off('params', this.onParamsChange);
    this.router.off('query', this.onQueryChange);
  }

};

customElements.define('route-outlet', RouteOutlet);
