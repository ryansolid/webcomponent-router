Router = require '../index'
Utils = require '../utils'

toAttributeName = (param) ->
  param.replace(/\.?([A-Z]+)/g, (x,y) ->  "-" + y.toLowerCase()).replace(/_/g, '-').replace(/^-/, "")

module.exports = class RouteOutlet extends HTMLElement
  constructor: ->
    # Safari 9 fix
    return HTMLElement.apply(@, arguments)

  connectedCallback: ->
    element = null
    prevParams = []

    @onParamsChange = (params) =>
      return unless element
      for k, v of params
        v = JSON.stringify(v) unless Utils.isString(v)
        element.setAttribute(toAttributeName(k), v)
      keys = Utils.difference(Object.keys(prevParams), Object.keys(params))
      for k in keys
        attr = toAttributeName(k)
        element.setAttribute(attr, null)
        element.removeAttribute(attr)
      prevParams = params

    @onQueryChange = (query) =>
      return unless element
      element.setAttribute('query', JSON.stringify(query)) if query
      element.removeAttribute('query') unless Object.keys(query).length

    @onEnter = (changes) =>
      return unless tag = changes[targetLevel]?.tag
      return if element?.nodeName.toLowerCase() is tag
      element = document.createElement(tag)
      element.__router = {id: @router.id, level: targetLevel}
      attributes = changes[targetLevel].attributes or {}
      if Object.keys(attributes).length
        for k, v of attributes
          v = JSON.stringify(v) unless Utils.isString(v)
          element.setAttribute(k, v)
      @onParamsChange(@router.store.state.params)
      @onQueryChange(@router.store.state.query)
      @appendChild(element)

    @onExit = (changes) =>
      return unless targetLevel of changes
      @removeChild(@firstChild) if @firstChild
      element = null

    @refresh = =>
      change = {"#{targetLevel}": @router.store.state.levels[targetLevel]}
      @onExit(change)
      @onEnter(change)

    @router = Router.for(@)
    targetLevel = if (level = @router.level)? then level + 1 else 0
    @router.on 'exit', @onExit
    @router.on 'enter', @onEnter
    @router.on 'params', @onParamsChange
    @router.on 'query', @onQueryChange
    @onEnter({"#{targetLevel}": @router.store.state.levels[targetLevel]})

  disconnectedCallback: ->
    @removeChild(@firstChild) if @firstChild
    @router.off 'exit', @onExit
    @router.off 'enter', @onEnter
    @router.off 'params', @onParamsChange
    @router.off 'query', @onQueryChange

customElements.define('route-outlet', RouteOutlet)