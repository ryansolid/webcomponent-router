Router = require '../index'

parse = (value) ->
  return unless value
  try
    parsed = JSON.parse(value)
  catch err
    parsed = value
  return parsed unless typeof parsed is 'string'
  return +parsed if /^[0-9]*$/.test(parsed)
  parsed

sendEvent = (element, name, value) ->
  event = document.createEvent('CustomEvent')
  event.initCustomEvent(name, true, true, value)
  element.dispatchEvent(event)

connectedToDOM = (node) ->
  return node.isConnected if 'isConnected' of node
  return true if document.body.contains(node)
  null while (node = node.parentNode or node.host) and node isnt document.documentElement
  node is document.documentElement

### Component used for links
# Attributes:
#   name: name of the route
#   params: json representation of params object
#   query: json representation of query object
###
module.exports = class RouteLink extends HTMLAnchorElement
  @observedAttributes: ['name', 'params', 'query', 'clickbubble']
  clickbubble: true
  constructor: ->
    # Safari 9 fix
    return HTMLAnchorElement.apply(@, arguments)

  connectedCallback: ->
    # polyfill sometimes calls twice
    return unless connectedToDOM(@)
    @props or= {}
    for key in RouteLink.observedAttributes then do (key) =>
      @props[key] = @[key]
      Object.defineProperty @, key, {
          get: ->  @props[key]
          set: (val) ->
            return if val is @props[key]
            @props[key] = val
            @onStateChange()
          configurable: true
        }

    @router = Router.for(@)

    @onStateChange = =>
      return unless @name or @query
      routeArgs = [@name, @params or {}, @query or {}]
      routeArgs = [@query or {}] unless @name

      @href = @router?.toURL.apply(@router, routeArgs)
      @onclick = (e) =>
        @router?.transitionTo.apply(@router, routeArgs)
        e.preventDefault()
        e.stopPropagation() unless @clickbubble

      if @router.isActive.apply(@router, routeArgs)
        @classList.add('active')
        sendEvent(@, 'active', true)
      else
        @classList.remove('active')
        @removeAttribute('class') unless @classList.length
        sendEvent(@, 'active', false)

    @name or= parse(@getAttribute('name'))
    @params or= parse(@getAttribute('params'))
    @query or= parse(@getAttribute('query'))
    @router.on 'state', @onStateChange
    @onStateChange() if !!@router.store.state

  disconnectedCallback: -> @router?.off 'state', @onStateChange

  attributeChangedCallback: (name, oldVal, newVal) ->
    return if oldVal is newVal
    @[name] = parse(newVal)
    @onStateChange?()

customElements.define('route-link', RouteLink, {extends: 'a'})