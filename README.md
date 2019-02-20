# WebComponent Router
[![Build Status](https://img.shields.io/travis/com/ryansolid/webcomponent-router.svg?style=flat)](https://travis-ci.com/ryansolid/webcomponent-router)
[![Coverage Status](https://img.shields.io/coveralls/github/ryansolid/webcomponent-router.svg?style=flat)](https://coveralls.io/github/ryansolid/webcomponent-router?branch=master)
[![NPM Version](https://img.shields.io/npm/v/webcomponent-router.svg?style=flat)](https://www.npmjs.com/package/webcomponent-router)
![](https://img.shields.io/bundlephobia/minzip/webcomponent-router.svg?style=flat)
![](https://img.shields.io/david/ryansolid/webcomponent-router.svg?style=flat)
![](https://img.shields.io/npm/dt/webcomponent-router.svg?style=flat)

A library for nested client side routing to be used with a web component architecture. This router is centered around using named tags to hierarchically construct pages. At its core it uses route-recognizer used by Ember's router that heavily influenced this router's DSL. Instead of being bound to a specific framework this router uses simple string attributes to configure it's components and a convention of writing nested versions of itself to each element injected via it's outlets. In so it should be compatible with any framework yet doesn't use one itself.

```js
import Router from 'webcomponent-router'

// register webcomponents for links and outlets
import 'webcomponent-router/components'

const router = new Router(document.getElementById('main'), {location: 'history'});

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
```

```html
<a is='route-link' name='user.set' params='{setId: 23}'>View Set</a>

<route-outlet>
<!-- Nested Content will be placed here -->
</route-outlet>
```

# Install
```sh
> npm install webcomponent-router
```

# Test
Run the unit tests:

```sh
> npm test
```
