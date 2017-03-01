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

### Component used for links
# Attributes:
#   name: name of the route
#   params: json representation of params object
#   query: json representation of query object
###
module.exports = class RouteLink extends HTMLAnchorElement
  @observedAttributes: ['name', 'params', 'query', 'clickbubble']
  clickbubble: true
  connectedCallback: ->
    # protect against temporary connecting during templating (knockout)
    setTimeout =>
      # attached is from polyfill required for IE/Edge
      return unless @isConnected or @attached
      @router = Router.for(@)

      @onStateChange = =>
        return unless @name or @query
        route_args = [@name, @params or {}, @query or {}]
        route_args = [@query or {}] unless @name

        @href = @router?.toURL.apply(@router, route_args)
        @onclick = (e) =>
          @router?.transitionTo.apply(@router, route_args)
          e.preventDefault()
          e.stopPropagation() unless @clickbubble

        if @router.isActive.apply(@router, route_args)
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
      @onStateChange(@router.state) if !!@router.state
    , 0

  disconnectedCallback: -> @router?.off 'state', @onStateChange

  attributeChangedCallback: (name, old_val, new_val) ->
    @[name] = parse(new_val)
    @onStateChange?()

customElements.define('route-link', RouteLink, {extends: 'a'})