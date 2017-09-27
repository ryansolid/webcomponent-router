Recognizer = require 'route-recognizer'
Location = require './location'
RouterDSL = require './dsl'
Utils = require './utils'
Store = require './store'
scopeRouter = require './scope'

ROUTER_ID = 0

module.exports = class Router
  @instances: []
  @for: (element) ->
    element = element.parentNode || element.host until (router_info = element.__router) or not (element.parentNode or element.host)
    return unless router_info and router = Router.instances[router_info.id]
    return router unless router_info.level?
    scopeRouter(router, router_info.level)

  constructor: (element={}, options={}) ->
    @debug = options.debug if options.debug
    @id = "ro_#{++ROUTER_ID}"
    element.__router = {id: @id}
    Router.instances[@id] = @

    @recognizer = new Recognizer()
    if options.location is 'history' and !!(history?.pushState)
      @location = Location.create('history', options.root)
    else if options.location is 'none' then @location = Location.create('none')
    else @location = Location.create('hash')
    @store = new Store(@debug)

  start: ->
    # resolve initial url and replace current state
    {name, params, query} = @_resolveRoute({url: @location.get()})
    @location.replace(@generate(name, params, query))

    # add hooks and trigger initial transition
    @location.onUpdate @transitionTo.bind(@), (path) => @store.emit 'history', path
    @transitionTo(@location.get())

  on: -> @store.on(arguments...)
  off: -> @store.off(arguments...)
  once: -> @store.once(arguments...)

  hasRoute: (name) -> @recognizer.hasRoute(name)
  generate: (name, params, query) ->
    try
      return @recognizer.generate(name, Object.assign({}, params, {queryParams: query}))
    catch err
      return ''

  isActive: (name, params={}) ->
    return false unless (state = @store.state)?.url

    # check params
    if Utils.isObject(name)
      return false for k, v of name when state.query[k] != v
      return true

    fragment = @generate(name, @_defaultParams(name, params))
    return true if state.url.indexOf(fragment) is 0 and state.url[fragment.length] in [undefined, '?', '/']

    #check resolved route
    {name, params} = @_resolveRoute({name, params: @_defaultParams(name, params)})
    name is state.name and Utils.isEqual(params, state.params)

  childRoutes: ->
    routes = []
    routes.push(v.handlers[0].handler) for k, v of @recognizer.names when k.indexOf('.') is -1
    return routes

  toURL: (name, params={}, query={}) ->
    if Utils.isObject(name)
      query = name
      name = @store.state.name
      query = @_cleanQuery(Object.assign({}, @store.state.query, query))
    {name, params, query} = @_resolveRoute({name, params: @_defaultParams(name, params), query})
    @location.formatURL(@generate(name, params, query))

  map: (callback) ->
    dsl = RouterDSL.map(callback)
    @recognizer.map dsl.generateFn(), (recognizer, routes) ->
      proceed = true
      for route in routes[..].reverse() when proceed
        recognizer.add(routes, { as: route.handler.name })
        proceed = route.path in ['/', ''] or route.handler.name[-6..] is '.index'
      return

  goBack: (depth=1) ->
    return false unless @location.depth - depth > -1
    # consider making not asyncronous
    @location.back(depth)
    true

  transitionTo: (name, params, query) -> @_transition(name, params, query, 'set')
  replaceWith: (name, params, query) -> @_transition(name, params, query, 'replace')
  setState: (state) -> @store.updateState(state)

  _transition: (name='/', params={}, query={}, method) ->
    old_state = @store.state
    if Utils.isObject(name)
      query = name
      name = old_state.name
      query = @_cleanQuery(Object.assign({}, old_state.query, query))

    state_options = if name.charAt(0) is '/' then {url: name} else {name, params: @_defaultParams(name, params), query}
    return false unless (state_info = @_resolveRoute(state_options))?.handlers?.length
    state = Utils.pick(state_info, Store.KEYS)
    state.levels = state_info.handlers.map (level) -> level.handler
    console.log 'Resolved to:', state.url if @debug
    @location[method](state.url) if success = @store.updateState(state)
    success

  # traces through redirects to create final list of handlers
  _resolveRoute: (options) ->
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
  _resolveNameFallback: (relative_name, parent_name) ->
    name = if parent_name then "#{parent_name}.#{relative_name}" else relative_name
    name = name_array[...-1].concat([relative_name]).join('.') until @recognizer.hasRoute(name) or not (name_array = name.split('.')[...-1]).length
    return name

  # resolve not found url routes
  _notFound: (url) ->
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
  _defaultParams: (name, params) ->
    state = @state
    param_names = []
    param_names = param_names.concat(result.names) for result in @recognizer.handlersFor(name)
    params = Object.assign(Utils.pick(@store.state.params, param_names), params)
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

# only include in browser
if typeof window isnt 'undefined'
  require 'document-register-element'
  require './components/route-outlet'
  require './components/route-link'