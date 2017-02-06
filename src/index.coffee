Queue = require 'queue-async'
Recognizer = require 'route-recognizer'
require './shims'

Utils = require './utils'
Location = require './location'
RouterDSL = require './dsl'
Transition = require './transition'
State = require './state'

module.exports = class ApplicationRouter extends (require 'eventemitter3')
  @__queue: new Queue(1)
  @for: (element) ->
    element = element.parentNode || element.host until (router = element.__router) or not (element.parentNode or element.host)
    return router

  constructor: (element, options={}) ->
    super()
    element.__router = @
    # console logs events for testing
    @debug = options.debug if options.debug

    @recognizer = new Recognizer()
    if options.location is 'history' and !!(history?.pushState)
      @location = Location.create('history', options.root)
    else if options.location is 'none' then @location = Location.create('none')
    else @location = Location.create('hash')

    @reset()

  _set: (obj) =>
    for k, v of obj when k in ['state', 'name', 'url', 'params', 'query', 'content']
      @[k] = v
      @emit k, v
    return @

  start: =>
    # resolve initial url and replace current state
    {name, params, query} = @_resolveRoute({url: @location.get()})
    @location.replace(@generate(name, params, query))

    # add hooks and trigger initial transition
    @location.onUpdate @transitionTo, (path) => @emit 'history', path
    @transitionTo @location.get()

  reset: (callback=(->)) =>
    queue = new Queue(1)

    # cleanup existing state
    @_processEvents(queue, null, state.stores[..].reverse(), 'exit') if state = @state

    queue.await (err) =>
      @_set(state: new State())
      callback(err)

  hasRoute: (name) => @recognizer.hasRoute(name)
  generate: (name, params, query) =>
    try
      return @recognizer.generate(name, Object.assign({}, params, {queryParams: query}))
    catch err
      return ''
  isActive: (name, params={}) =>
    return false unless (state = @active_transition?.state or @state)?.url

    # check params
    if Utils.isObject(name)
      return false for k, v of name when state.query[k] != v
      return true

    fragment = @generate(name, @_defaultParams(name, params))
    return true if state.url.indexOf(fragment) is 0 and state.url[fragment.length] in [undefined, '?', '/']

    #check resolved route
    {name, params} = @_resolveRoute({name, params: @_defaultParams(name, params)})
    name is state.name and Utils.isEqual(params, state.params)

  childRoutes: =>
    routes = []
    routes.push(v.handlers[0].handler) for k, v of @recognizer.names when k.indexOf('.') is -1
    return routes

  toURL: (name, params={}, query={}) =>
    if Utils.isObject(name)
      query = name
      state = @active_transition?.state or @state
      name = state.name
      query = @_cleanQuery(Object.assign({}, state.query, query))
    {name, params, query} = @_resolveRoute({name, params: @_defaultParams(name, params), query})
    @location.formatURL(@generate(name, params, query))

  map: (callback) =>
    dsl = RouterDSL.map(callback)
    @recognizer.map dsl.generateFn(), (recognizer, routes) ->
      proceed = true
      for route in routes[..].reverse() when proceed
        recognizer.add(routes, { as: route.handler.name })
        proceed = route.path in ['/', ''] or route.handler.name[-6..] is '.index'
      return

  goBack: (depth=1, callback=(->)) =>
    if arguments.length is 1 and Utils.isFunction(depth)
      callback = depth
      depth = 1
    return callback('Insufficient Depth') unless @location.depth - depth > -1
    # consider making not asyncronous
    @location.back depth, callback

  transitionTo: (name, params, query, callback) =>
    args = arguments
    ApplicationRouter.__queue.defer (queue_callback) =>
      done = (err) -> callback(err); queue_callback()
      {state, callback} = @_createState.apply(@, args)
      return done() unless state
      @_transition state, {method: 'set'}, done

  replaceWith: (name, params, query, callback) =>
    args = arguments
    ApplicationRouter.__queue.defer (queue_callback) =>
      done = (err) -> callback(err); queue_callback()
      {state, callback} = @_createState.apply(@, args)
      return done() unless state
      @_transition state, {method: 'replace'}, done

  _createState: (name='/', params={}, query={}, callback) =>
    # map arguments
    if arguments.length is 2 and Utils.isFunction(params)
      callback = params
      params = {}

    if arguments.length is 3 and Utils.isFunction(query)
      callback = query
      query = {}

    # nop callback if not provided
    callback = (->) unless Utils.isFunction(callback)

    old_state = @state
    if Utils.isObject(name)
      query = name
      name = old_state.name
      query = @_cleanQuery(Object.assign({}, old_state.query, query))

    state_options = if name.charAt(0) is '/' then {url: name} else {name, params: @_defaultParams(name, params), query}
    new_state = old_state.toNewState(@, state_options)
    return {state: new_state, callback}

  _transition: (state, options, callback) =>
    transition = new Transition(@, state)
    console.log 'Transition resolved to:', transition.state.url if @debug
    @active_transition = transition
    transition.execute (err) =>
      return callback(err) if err

      @_updateComponents transition, (err) =>
        return callback(err) if err
        if transition.is_active
          @location[options.method](transition.state.url)
          transition.is_active = false
          delete @active_transition
        callback()

  # traces through redirects to create final list of handlers
  _resolveRoute: (options) =>
    # resolve url
    unless options.name
      return unless handlers = @recognizer.recognize(options.url) or @_notFound(options.url)
      options.params = {}
      Object.assign(options.params, handler.params) for handler in handlers
      options.name = handlers?[handlers?.length-1]?.handler.name
      options.params = @_cleanParams(options.params)
      options.query = @_cleanQuery(handlers.queryParams)

    return {} unless handlers = @recognizer.handlersFor(options.name)
    if handlers.length and not redirect = handlers[handlers.length-1].handler.redirect
      options.url or= @generate(options.name, options.params, options.query)
      return Object.assign({handlers}, options)

    return {} unless new_info = redirect(options.params, options.query)
    combined_params = {}
    Object.assign(combined_params, handler.params or Utils.pick(options.params, handler.names)) for handler in handlers
    new_options =
      name: if (parent_name = handlers[handlers.length-2]?.handler.name) then "#{parent_name}.#{new_info[0]}" else new_info[0]
      params: @_cleanParams(Object.assign(new_info[1] or {}, combined_params))
      query: @_cleanQuery(Object.assign(new_info[2] or {}, options.query or {}, handlers.queryParams))

    @_resolveRoute(new_options)

  # finds nearest relative path starting from current level through each parent
  _resolveNameFallback: (relative_name, parent_name) =>
    name = if parent_name then "#{parent_name}.#{relative_name}" else relative_name
    name = name_array[...-1].concat([relative_name]).join('.') until @recognizer.hasRoute(name) or not (name_array = name.split('.')[...-1]).length
    return name

  # resolve not found url routes
  _notFound: (url) =>
    url = url_array.join('/') until (handlers = @recognizer.recognize(url)) or not (url_array = url.split('/')[...-1]).length
    return unless handlers
    name = handlers[handlers.length-1].handler.name
    name = name[...-6] if name[-6..] is '.index'
    name = @_resolveNameFallback('not_found', name)

    # handlers found by name are different format than url, combine to preserve url information
    name_handlers = @recognizer.handlersFor(name)
    new_handlers = {queryParams: handlers.queryParams}
    for k, v of handlers
      if name_handlers[k].handler.name isnt v.handler.name
        new_handlers[k] = {handler: name_handlers[k].handler, params: {}, isDynamic: false}
        new_handlers.length = +k + 1
        break
      else new_handlers[k] = v

    return new_handlers

  # applies current state parameter data as defaults to new proposed transition
  _defaultParams: (name, params) =>
    state = @state
    param_names = []
    param_names = param_names.concat(result.names) for result in @recognizer.handlersFor(name)
    params = Object.assign(Utils.pick(state.params, param_names), params)
    @_cleanParams(params)
    return params

  # resolves integer conversions for parameters that should be ints
  _cleanParams: (params) -> params[k] = +v for k, v of params when /^[0-9]*$/.test(v); params

  _cleanQuery: (query) ->
    clean_query = {}
    for k, v of query when v and not (Array.isArray(v) and not v.length)
      if Array.isArray(v) or Utils.isObject(v)
         clean_query[k] = v[..]
      else if /^[0-9]*$/.test(v)
         clean_query[k] = +v
      else clean_query[k] = v
    return clean_query

  _updateComponents: (transition, callback) =>
    stores = transition.state.partitionStores(@state)
    transition.current_stores = stores.unchanged[..]
    return callback() unless stores.exited.length or stores.updated.length or stores.entered.length

    @_willTransition transition, stores.exited.concat(stores.reset), (err) =>
      return callback(err) if err
      return callback(new Error('transition aborted')) if transition.is_aborted
      @_processEvents(transition, stores.exited, 'exit')
      @_processEvents(transition, stores.updated, 'update')
      @_processEvents(transition, stores.entered, 'enter')
      @_set(state: transition.state, params: transition.state.params, query: transition.state.query, url: transition.state.url, name: transition.state.name)
      callback()

  _willTransition: (transition, list, callback) =>
    queue = new Queue(1)
    for store in list
      do (store) => queue.defer (callback) =>
        return callback(new Error('transition aborted')) if transition.is_aborted
        console.log 'Will Transition:', store.tag if @debug
        store._willTransition transition, callback
    queue.await callback

  _processEvents: (transition, list, type) =>
    for store in list
      switch type
        when 'enter'
          if store.tag
            top = (current = transition.current_stores)?[current?.length-1]
            current.push(store)
            console.log 'Set Content:', top?.tag or 'Application', '->', store.tag if @debug
            (top or @)._set({content: store})

        when 'update'
          level = store.level
          if store.params_changed
            console.log 'Update Params:', store.tag, store.params if @debug
            @state.stores[level]._set({params: store.params})
          if store.query_changed
            console.log 'Update Query:', store.tag, store.query if @debug
            @state.stores[level]._set({query: store.query})
          delete store.params_changed
          delete store.query_changed
          transition.current_stores.push(transition.state.stores[level] = @state.stores[level])

        # just trigger event
        else
          console.log 'Exit:', store.tag if @debug
          store.emit type, transition
    return

# only include in browser
if typeof window isnt 'undefined'
  require 'document-register-element'
  require './components/route-outlet'
  require './components/route-link'