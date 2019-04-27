# WebComponent Router
[![Build Status](https://img.shields.io/travis/com/ryansolid/webcomponent-router.svg?style=flat)](https://travis-ci.com/ryansolid/webcomponent-router)
[![Coverage Status](https://img.shields.io/coveralls/github/ryansolid/webcomponent-router.svg?style=flat)](https://coveralls.io/github/ryansolid/webcomponent-router?branch=master)
[![NPM Version](https://img.shields.io/npm/v/webcomponent-router.svg?style=flat)](https://www.npmjs.com/package/webcomponent-router)
![](https://img.shields.io/bundlephobia/minzip/webcomponent-router.svg?style=flat)
![](https://img.shields.io/david/ryansolid/webcomponent-router.svg?style=flat)
![](https://img.shields.io/npm/dt/webcomponent-router.svg?style=flat)

A library for nested client side routing to be used with a web component architecture. This router is centered around using named tags to hierarchically construct pages. At its core it uses route-recognizer used by Ember's router that heavily influenced this router's DSL. Instead of being bound to a specific framework this router uses simple string attributes to configure it's components and a convention of writing scoped versions of itself to each element injected via their Shadow DOM Slot.

This approach has 2 benefits. Firstly by leveraging the existing slotting mechanism it not only keeps things simple it keeps all elements in the entry elements Light DOM making it easy to traverse nested levels without digging through endless markup. The nested versions provide scoped relative routes. At each level helpers will work relatively using `.` notation on the path allowing moving components around in the router definition without necessarily having to go and update all your routes. The route definition orchestrates the composition of your whole application.

Routers can be nested as well by provide a root path to indicate which portion of the URL it is responsible for.

```js
import Router from 'webcomponent-router'

// register webcomponents for links and outlets
import 'webcomponent-router/components'

const router = new Router(document.getElementById('main'));

router.map(r => {
  r.index(() => ['user', { userId: 123 }]);
  r.notFound(() => ['index']);
  r.route('user', { path: '/users/:userId', tag: 'pane-user' }, r => {
    r.index(() => ['sets']);
    r.route('sets', {
      path: '/sets', tag: 'pane-sets',
      // dynamic import for code splitting
      onEnter: () => import("../components/pane-sets")
    });
    r.route('set', { path: '/sets/:setId', tag: 'pane-set' });
  });
});

router.start();

router.transitionTo('user.set', {setId: 49});

// Lookup router in some nested context
const router = Router.for(element);
```

```html
<a is='route-link' name='user.set' params='{setId: 23}'>View Set</a>

<slot>
<!-- Nested Content will be placed here -->
</slot>
```

Route Link Components listen to both attribute and property setting for 'name', 'params', 'query'. The params and query attributes JSON Parse the object passed. However you can also just set the property.

# Install
```sh
> npm install webcomponent-router
```

# Test
Run the unit tests:

```sh
> npm test
```
