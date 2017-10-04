EventEmitter = require 'eventemitter3'
Utils = require './utils'

module.exports = class Store extends EventEmitter
  @KEYS: ['name', 'params', 'query', 'url']
  constructor: (@debug) ->
    super()
    @state = {levels: [], params: {}, query: {}}
    @transition_handlers = []

   # register callbacks
  on: (name, handlerFn) =>
    return super(name, handlerFn) unless name is 'transition'
    @transition_handlers.push(handlerFn)

  off: (name, handlerFn) =>
    return super(name, handlerFn) unless name is 'transition'
    @transition_handlers.splice(index, 1) if (index = @transition_handlers.indexOf(handlerFn))?

  updateState: (state) ->
    change_index = -1
    for level, i in state.levels when (@state.levels[i]?.name isnt level.name)
      change_index = i
      break

    changed_keys = []
    for k in Store.KEYS
      continue if (Utils.isEqual(state[k], @state[k]))
      changed_keys.push(k)

    return true unless (change_index > -1 or changed_keys.length)
    return false for handlerFn in @transition_handlers when not handlerFn(state)

    if change_index > -1
      if @state.levels.length
        exit_payload = Object.assign({}, ({"#{i}": @state.levels[i]} for i in [change_index...@state.levels.length])...)
        console.log 'Exit:', exit_payload if @debug
        @emit('exit', exit_payload)

    @state = state
    @emit 'state', state

    if change_index > -1
      enter_payload = Object.assign({}, ({"#{i}": state.levels[i]} for i in [change_index...state.levels.length])...)
      console.log 'Enter:', enter_payload if @debug
      @emit('enter', enter_payload)

    for k in changed_keys
      console.log "Update #{k}:", @state[k] if @debug and k in ['params', 'query']
      @emit(k, @state[k])
    true