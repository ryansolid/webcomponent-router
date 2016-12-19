Queue = require 'queue-async'
Utils = require './utils'
NestedRouter = require './nested_store'

# Responsible for keeping track of the current stack of handlers
module.exports = class State
  constructor: (options={})->
    @stores = []
    @[k] = v for k, v of Utils.pick(options, 'query', 'params', 'url', 'name')

  # applies transition to current state to create new state
  toNewState: (router, options={}) =>
    return null unless (state_info = router._resolveRoute(options))?.handlers?.length

    new_state = new State(state_info)
    states_differ = false
    for result, i in state_info.handlers
      old_store = @stores[i]
      new_store = new NestedRouter(router, {
        level: i, name: result.handler.name, param_names: result.names
        params: state_info.params, query: state_info.query, tag: result.handler.tag,
        attributes: result.handler.attributes
      })

      if @_shouldSupercede(states_differ, new_store, old_store)
        states_differ = true
        new_state.stores[i] = new_store
      else new_state.stores[i] = old_store

    return if states_differ then new_state else null

  # compares handlers to previous state to categorize
  partitionStores: (old_state) =>
    results =
      updated: []
      exited: []
      entered: []
      reset: []
      unchanged: []

    context_changed = false

    for store, i in @stores
      old_store = old_state?.stores[i]

      # store changed
      if old_store?.name isnt store.name
        results.entered.push(store)
        results.exited.unshift(old_store) if old_store

      # context changed
      else if context_changed or store.params_changed or store.query_changed
        context_changed = true
        results.updated.push(store)
        results.reset.push(old_store) if store.will_transition
        delete store.will_transition

      # unchanged
      else results.unchanged.push(old_store)

    # remove further depth
    results.exited.unshift(old_store) for old_store in old_state?.stores?[@stores.length...]

    results.reset = results.reset.reverse()

    return results

  _shouldSupercede: (states_differ, new_store, old_store) ->
    return true if !old_store or (old_store.tag isnt new_store.tag) or old_store.name isnt new_store.name
    new_store.params_changed = true if params_changed = !Utils.isEqual(old_store.params, new_store.params)
    new_store.query_changed = true if query_changed = !Utils.isEqual(old_store.query, new_store.query)
    new_store.will_transition = true if query_changed or !Utils.isEqual(Utils.pick(old_store.params, new_store.param_names), Utils.pick(new_store.params, new_store.param_names))
    return states_differ or params_changed or query_changed
