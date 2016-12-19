Queue = require 'queue-async'
Utils = require './utils'

###
# Nested Router Store contains all the information required for each nested level
# The attributes found on the store are:
#   level: level of the store
#   name: the name of the route at that level
#   tag: the component tag for that level
#   params: the stripped out url params relevant to that level
#   query: the url search params
#   content - the nested router store for the immediate child
#
# In addition to the above attributes can listen to events:
#   transition - this fires on affected stores when a new transition will be executed
#
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

module.exports = class NestedRouterStore extends (require 'eventemitter3')
  constructor: (router, attr) ->
    super()
    Object.assign(@, {level: null, name: null, tag: null, attributes: null, params: {}, query: {}, content: null, param_names: []}, attr)
    router.on 'state', @forwardStateChange
    @removeStateChange = => router.off 'state', @forwardStateChange
    @transition_handlers = []

    for method in SCOPED_METHODS
      do (method) => @[method] = (name) =>
        return router[method].apply(router, arguments) if Utils.isObject(name)
        # relative naming
        arguments[0] = @_scopeName(router, name)
        router[method].apply(router, arguments)

    @childRoutes = =>
      routes = []
      for k, v of router.recognizer.names when k.indexOf(@name+'.') isnt -1
        name = k.replace(@name + '.', '')
        if name.indexOf('.') is -1
          handler = Object.assign({}, v.handlers[@level+1].handler)
          handler.name = name
          routes.push(handler)
      return routes

    @goBack = router.goBack

  _set: (obj) =>
    for k, v of obj when k in ['name', 'url', 'params', 'query', 'content']
      @[k] = v
      @emit k, v
    return @

  destroy: =>
    @removeStateChange()
    @off('transition', handler) for handler in @transition_handlers
    if content = @content
      content.destroy()
      delete @content

  forwardStateChange: (state) =>
    @state = state
    @emit 'state', state

  # register callbacks
  on: (name, handlerFn) =>
    return super unless name is 'transition'

    # function can either expect one parameter for syncronous version, or 2 for asyncronous version
    @transition_handlers.push(handlerFn)

  off: (name, handlerFn) =>
    return super unless name is 'transition'
    @transition_handlers.splice(index, 1) if (index = @transition_handlers.indexOf(handlerFn))?

  _willTransition: (transition, callback) =>
    queue = new Queue(1)
    for handlerFn in @transition_handlers
      do (handlerFn) -> queue.defer (callback) ->
        # async version
        return handlerFn(transition, callback) if handlerFn.length is 2
        # syncronous version
        handlerFn(transition); callback()

    queue.await callback

  _scopeName: (router, name) =>
    return name unless name.charAt(0) in ['.', '*', '^']

    # calculate depth of dot wildcard
    start_index = 1
    for char in name[1...]
      break unless char is '.'
      start_index += 1

    relative_name = 'index' unless relative_name = name[start_index...]
    if name.charAt(0) is '.'
      (name_array = @name.split('.')[...(if start_index > 1 then 1-start_index else start_index)]).push(relative_name)
      return name_array.join('.')
    name = router._resolveNameFallback(relative_name, @name.split('.')[...-1].join('.')) if name.charAt(0) is '^'
    name = router._resolveNameFallback(relative_name, @name) if name.charAt(0) is '*'
    return name

