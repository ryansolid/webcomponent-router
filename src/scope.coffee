Utils = require './utils'

###
# ScopedRouter allows convenient nested scoping of methods
# isActive, transitionTo, toURL methods take exact names or leading wildcards:
#   '.' - relative to the current level
#         ie.. inside 'group' transitionTo('.settings') resolves to 'group.settings'
#         additional '.' move up that number of parents
#   '^' - relative to the next parent that contains the path
#         useful for ^unauthorized, etc.. where you want to gracefully handle error state fallback
#   '*' - relative to the current level or next parent that contains the path (combination of '.' and '^')
# If these wildcards are not followed by a value it will default to index route
###

SCOPED_METHODS = ['isActive', 'toURL', 'transitionTo', 'replaceWith']
FORWARDED_METHODS = ['goBack', 'on', 'off', 'once']

scopeName = (router, name, level) ->
  return name unless name.charAt(0) in ['.', '*', '^']

  # calculate depth of dot wildcard
  start_index = 1
  for char in name[1...]
    break unless char is '.'
    start_index += 1

  relative_name = 'index' unless relative_name = name[start_index...]
  if name.charAt(0) is '.'
    (name_array = router.store.state.levels[level].name.split('.')[...(if start_index > 1 then 1-start_index else start_index)]).push(relative_name)
    return name_array.join('.')
  name = router._resolveNameFallback(relative_name, router.store.state.levels[level].name.split('.')[...-1].join('.')) if name.charAt(0) is '^'
  name = router._resolveNameFallback(relative_name, router.store.state.levels[level].name) if name.charAt(0) is '*'
  return name

module.exports = (router, level) ->
  scoped_router = {id: router.id, level, store: router.store}
  for method in SCOPED_METHODS
    do (method) => scoped_router[method] = (name) =>
      return router[method].apply(router, arguments) if Utils.isObject(name)
      # relative naming
      arguments[0] = scopeName(router, name, level)
      router[method].apply(router, arguments)

  scoped_router.childRoutes = ->
    routes = []
    for k, v of router.recognizer.names when k.indexOf(scoped_router.name+'.') isnt -1
      name = k.replace(scoped_router.name + '.', '')
      if name.indexOf('.') is -1
        handler = Object.assign({}, v.handlers[level+1].handler)
        handler.name = name
        routes.push(handler)
    return routes

  for method in FORWARDED_METHODS
    do (method) -> scoped_router[method] = -> router[method](arguments...)

  scoped_router

