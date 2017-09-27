Router = require '../index'
Utils = require '../utils'

module.exports = class RouteOutlet extends HTMLElement
  constructor: ->
    # Safari 9 fix
    return HTMLElement.apply(@, arguments)

  connectedCallback: ->
    element = null
    prev_params = []

    @onParamsChange = (params) =>
      for k, v of params
        v = JSON.stringify(v) unless Utils.isString(v)
        element.setAttribute(k.replace(/_/g, '-'), v)
      keys = Utils.difference(Object.keys(prev_params), Object.keys(params))
      for k in keys
        element.setAttribute(k.replace(/_/g, '-'), null)
        element.removeAttribute(k.replace(/_/g, '-'))
      prev_params = params

    @onQueryChange = (query) =>
      element.setAttribute('query', JSON.stringify(query)) if query
      element.removeAttribute('query') unless Object.keys(query).length

    @onEnter = (changes) =>
      return unless tag = changes[target_level]?.tag
      element = document.createElement(tag)
      element.__router = {id: @router.id, level: target_level}
      attributes = {}
      attributes[attr.name] = attr.value for attr in @attributes
      if Object.keys(Object.assign(attributes, changes[target_level].attributes)).length
        for k, v of attributes
          v = JSON.stringify(v) unless Utils.isString(v)
          element.setAttribute(k, v)
      @appendChild(element)

    @onExit = (changes) =>
      return unless target_level of changes
      @removeChild(@firstChild) if @firstChild

    @router = Router.for(@)
    target_level = if (level = @router.level)? then level else 0
    @router.on 'exit', @onExit
    @router.on 'enter', @onEnter
    @router.on 'params', @onParamsChange
    @router.on 'query', @onQueryChange
    @onEnter({"#{target_level}": @router.store.state.levels[target_level]})

  disconnectedCallback: ->
    @router.off 'exit', @onExit
    @router.off 'enter', @onEnter
    @router.off 'params', @onParamsChange
    @router.off 'query', @onQueryChange

customElements.define('route-outlet', RouteOutlet)