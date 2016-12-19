module.exports = class Transition
  constructor: (@router, @state) ->
    @is_aborted = false
    @is_active = false
    @current_stores = []

  abort: =>
    return if @is_aborted
    @is_aborted = true
    @is_active = false
    @router.location.set(@router.get('state').url)
    @router.set(active_transition: null)

  execute: (callback) =>
    @is_active = true
    callback()
