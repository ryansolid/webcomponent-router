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
module.exports = class RouteLink extends HTMLElement
  @observedAttributes: ['name', 'params', 'query']
  connectedCallback: ->
    # protect against temporary connecting during templating (knockout)
    setTimeout =>
      # attached is from polyfill required for IE/Edge
      return unless @isConnected or @attached
      @router = Router.for(@)
      link = document.createElement('a')
      link.appendChild(@firstChild) while @firstChild
      @appendChild(link)

      @onStateChange = =>
        return unless @props.name
        @firstChild.href = "#{@router?.toURL(@props.name, @props.params or {}, @props.query or {})}"
        @firstChild.onclick = (e) =>
          @router?.transitionTo(@props.name, @props.params or {}, @props.query or {})
          e.preventDefault()

        if @router.isActive(@props.name, @props.params or {}, @props.query or {})
          @classList.add('active')
          @firstChild.classList.add('active')
          sendEvent(@, 'active', true)
        else
          @classList.remove('active')
          @firstChild.classList.remove('active')
          @removeAttribute('class') unless @classList.length
          @firstChild.removeAttribute('class') unless @firstChild.classList.length
          sendEvent(@, 'active', false)

      @props =
        name: parse(@getAttribute('name'))
        params: parse(@getAttribute('params'))
        query: parse(@getAttribute('query'))
      @router.on 'state', @onStateChange
      @onStateChange(@router.state) if !!@router.state
    , 0

  disconnectedCallback: -> @router?.off 'state', @onStateChange

  attributeChangedCallback: (name, old_val, new_val) ->
    return unless @props
    @props[name] = parse(new_val)
    @onStateChange()

customElements.define('route-link', RouteLink)