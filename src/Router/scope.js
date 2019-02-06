/*
 * ScopedRouter allows convenient nested scoping of methods
 * isActive, transitionTo, toURL methods take exact names or leading wildcards:
 *   '.' - relative to the current level
 *         ie.. inside 'group' transitionTo('.settings') resolves to 'group.settings'
 *         additional '.' move up that number of parents
 *   '^' - relative to the next parent that contains the path
 *         useful for ^unauthorized, etc.. where you want to gracefully handle error state fallback
 *   '*' - relative to the current level or next parent that contains the path (combination of '.' and '^')
 * If these wildcards are not followed by a value it will default to index route
 */
import { isObject } from './utils';

const SCOPED_METHODS = ['isActive', 'toURL', 'transitionTo', 'replaceWith'];
const FORWARDED_METHODS = ['goBack', 'on', 'off', 'once'];

function scopeName(router, name, level) {
  var char, i, len, name_array, ref, ref1, relativeName;
  if ((ref = name.charAt(0)) !== '.' && ref !== '*' && ref !== '^') {
    return name;
  }
  // calculate depth of dot wildcard
  let startIndex = 1;
  ref1 = name.slice(1);
  for (i = 0, len = ref1.length; i < len; i++) {
    char = ref1[i];
    if (char !== '.') {
      break;
    }
    startIndex += 1;
  }
  if (!(relativeName = name.slice(startIndex))) {
    relativeName = 'index';
  }
  if (name.charAt(0) === '.') {
    (name_array = router.store.state.levels[level].name.split('.').slice(0, ((startIndex > 1 ? 1 - startIndex : startIndex)))).push(relativeName);
    return name_array.join('.');
  }
  if (name.charAt(0) === '^') {
    name = router._resolveNameFallback(relativeName, router.store.state.levels[level].name.split('.').slice(0, -1).join('.'));
  }
  if (name.charAt(0) === '*') {
    name = router._resolveNameFallback(relativeName, router.store.state.levels[level].name);
  }
  return name;
};

export default function getScopedRouter(router, level) {
  const scopedRouter = {
    id: router.id,
    level,
    store: router.store
  };
  SCOPED_METHODS.forEach(method => {
    return scopedRouter[method] = function(name) {
      if (isObject(name)) {
        return router[method].apply(router, arguments);
      }
      // relative naming
      arguments[0] = scopeName(router, name, level);
      return router[method].apply(router, arguments);
    };
  });
  scopedRouter.childRoutes = function() {
    var handler, k, name, ref, v;
    const routes = [];
    ref = router.recognizer.names;
    for (k in ref) {
      v = ref[k];
      if (!(k.indexOf(scopedRouter.name + '.') !== -1)) {
        continue;
      }
      name = k.replace(scopedRouter.name + '.', '');
      if (name.indexOf('.') === -1) {
        handler = Object.assign({}, v.handlers[level + 1].handler);
        handler.name = name;
        routes.push(handler);
      }
    }
    return routes;
  };
  FORWARDED_METHODS.forEach(method =>
    scopedRouter[method] = function() { return router[method](...arguments); }
  );
  return scopedRouter;
};
