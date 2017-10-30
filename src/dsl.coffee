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
    @explicitIndex = false

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
    if Utils.isFunction(options) then @addRoute('not_found', {path: '/not-found', redirect: options})

    # index route
    else if Utils.isObject(options) then @route('not_found', Object.assign({}, options, {path: '/not-found'}))


  addRoute: (name, options, callback) =>
    handlerOptions = Object.assign({}, options)
    delete handlerOptions.path
    handler = Object.assign({name: @fullName(name)}, handlerOptions)
    @explicitIndex = true if options.path in ['/', ''] or name[-5..] is 'index'
    @matches.push([options.path or "/#{name.replace(/_/g, '-')}", handler, callback])

  generateFn: =>
    # add empty index
    @index({}) unless @explicitIndex
    return (match) =>
      match(dslMatch[0]).to(dslMatch[1], dslMatch[2]) for dslMatch in @matches
      return

  @map: (callback) ->
    dsl = new RouterDSL()
    callback.call(dsl)
    return dsl
