Introduction
============

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

Install
=======
```sh
> npm install webcomponent-router
```

Test
====

Run the unit tests:

```sh
> npm test
```

Definitions
===========

  1. Rendering Hierarchy - the hierarchy of components from a rendering perspective

  2. Route Hierarchy - the hierarchy of components as suggested from the url

  3. Navigation Paradigm - the mechanism for navigation between elements at the same level (generation) of the hierarchy

  4. Transition - the process of updating the state from the current state to a proposed new state


Principles
==========

  1. Routes are defined in one place

  2. Routes should be manageable by multiple components each responsible to apply the route store state to their internal state

  3. Generally, rendering hierarchy == route hierarchy. Looking at the router directly tells you what components are responsible at a given level for a route.

  4. Component should not be tightly coupled to rendering hierarchy. However, they are expected to provide an outlet for child content.

  5. Components should not be tightly coupled to the route hierarchy. When navigating within itself or descendants, its own(including parent) location/route state should not be explicitly referenced. Where path must be known it is to be abstracted into simple named hierarchy and never directly as a url.

  6. Router state(stores) structure should not be tightly coupled the navigation paradigm of the components that use it. Allow for independent testability.

  7. A proposed transition should be able to aborted by those affected. Since the triggers for navigation state change are not all under application control (url bar, back button ..etc) or specific components control (parent navigation), it is essential to be able to catch proposed navigation before state is applied.

  8. Navigation should be as transparent as possible. Since it lives in a browser, the url and hrefs are core to it’s behavior and should be applied in a way that the user could never tell the difference between a single page application and a classic multi-page app save the noticeable performance improvements that come from not having to wait on the server to redraw the entire page.

