Utils = require './utils'

# Based heavily on Ember's DSL
# To keep it simple each nested level of the router is only aware of its own nested level
# ie. naming and redirects can only be used relative to the current level and no wildcards are allowed
# It is up to the application to ask for more complicated navigation
# Each Route options object must have a path and either tag or a redirect method defined
# Helpers index and notFound default the path and names, and only take options or redirect function directly

module.exports = class RouterDSL
  constructor: (@parent) ->
    @matches = []
    @explicit_index = false

  fullName: (name) =>
    return name unless @parent
    @parent + "." + name

  # adds routes
  route: (name, options={}, callback) =>

    # no children
    return @addRoute(name, options) unless callback

    dsl = new RouterDSL(@fullName(name))
    callback.call(dsl)
    return @addRoute(name, options, dsl.generateFn())

  # adds index for nested levels
  index: (options, callback) ->
    # redirect with dynamic args, no callback possible
    if Utils.isFunction(options) then @addRoute('index', {path: '/', redirect: options})

    # index route
    else if Utils.isObject(options) then @route('index', Object.assign({}, options, {path: '/'}), callback)

  # adds handler for not found route
  notFound: (options) ->
    # redirect with dynamic args, no callback possible
    if Utils.isFunction(options) then @addRoute('not_found', {path: '/not_found', redirect: options})

    # index route
    else if Utils.isObject(options) then @route('not_found', Object.assign({}, options, {path: '/not_found'}))


  addRoute: (name, options, callback) =>
    handler_options = Object.assign({}, options)
    delete handler_options.path
    handler = Object.assign({name: @fullName(name)}, handler_options)
    @explicit_index = true if options.path in ['/', ''] or name[-5..] is 'index'
    @matches.push([options.path or "/#{name}", handler, callback])

  generateFn: =>
    # add empty index
    @index({}) unless @explicit_index
    return (match) =>
      match(dsl_match[0]).to(dsl_match[1], dsl_match[2]) for dsl_match in @matches
      return

  @map: (callback) ->
    dsl = new RouterDSL()
    callback.call(dsl)
    return dsl
