Router = require '../index'
Utils = require '../utils'

module.exports = class RouteOutlet extends HTMLElement
  constructor: ->
    # Safari 9 fix
    return HTMLElement.apply(@, arguments)

  connectedCallback: ->
    component = null
    prev_params = []

    onParamsChange = (params) =>
      for k, v of params
        v = JSON.stringify(v) unless Utils.isString(v)
        component.setAttribute(k.replace(/_/g, '-'), v)
      keys = Utils.difference(Object.keys(prev_params), Object.keys(params))
      for k in keys
        component.setAttribute(k.replace(/_/g, '-'), null)
        component.removeAttribute(k.replace(/_/g, '-'))
      prev_params = params

    onQueryChange = (query) ->
      component.setAttribute('query', JSON.stringify(query)) if query
      component.removeAttribute('query') unless Object.keys(query).length

    @onContentChange = (content) =>
      if old_router = @firstChild?.__router
        old_router.off 'params', onParamsChange
        old_router.off 'query', onQueryChange
        old_router.destroy()
        @firstChild.__router = null
      @removeChild(@firstChild) if @firstChild
      return unless tag = content.tag
      component = document.createElement(tag)
      component.__router = content
      attributes = {}
      attributes[attr.name] = attr.value for attr in @attributes
      if Object.keys(Object.assign(attributes, content.attributes)).length
        for k, v of attributes
          v = JSON.stringify(v) unless Utils.isString(v)
          component.setAttribute(k, v)
      content.on 'params', onParamsChange
      content.on 'query', onQueryChange
      onParamsChange(content.params)
      onQueryChange(content.query)
      @appendChild(component)

    @router = Router.for(@)
    @router.on 'content', @onContentChange
    @onContentChange(@router.content) if !!@router.content

  disconnectedCallback: -> @router?.off 'content', @onContentChange

customElements.define('route-outlet', RouteOutlet)