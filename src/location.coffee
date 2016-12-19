# regex
TRIM_SLASHES = /^\/+|\/+$/g
HASH_SECTION = /#(.*)$/

# use hashes
class Hash
  constructor: -> @type = 'hash'; @path = ''
  set: (@path) ->
    return if @path is @get()
    location.hash = @path
  replace: (@path) =>
    return if @path is @get()
    location.replace(@formatURL(@path))
  get: ->
    match = location.href.match(HASH_SECTION)
    fragment = if match then match[1] else ''
    return '/' + fragment.replace(TRIM_SLASHES, '')
  onUpdate: (callback) =>
    window.addEventListener('hashchange', (event) =>
      return if (new_path = @get()) is @path
      callback(new_path)
    , false)
  back: -> #TODO
  formatURL: (url) -> '#' + url

# use window.history and pushstate
class History
  constructor: (@root) ->
    @type = 'history'; @path = @root; @depth = history.state?.depth
  set: (@path) =>
    return if @path is @get()
    history.pushState({depth: @depth++}, null, @formatURL(@path))
  replace: (@path) =>
    return if @path is @get() and @depth?
    #initialization
    @depth or= 0
    history.replaceState({depth: @depth}, null, @formatURL(@path))
  get: =>
    fragment = decodeURI(location.pathname + location.search).replace(TRIM_SLASHES, '')
    fragment = fragment.replace(@root.replace(TRIM_SLASHES, ''), '')
    return '/' + fragment.replace(TRIM_SLASHES, '')
  onUpdate: (callback, history_callback) =>
    window.addEventListener('popstate', (event) =>
      new_path = @get()
      history_callback(new_path)
      return if new_path is @path
      @depth = event.state.depth
      callback(new_path)
    , false)
  back: (depth, callback) => history.go(-depth); callback()
  formatURL: (url) => @root + url.replace(TRIM_SLASHES, '')

# no browser based location, use for testing
class None
  constructor: -> @type = 'none'; @path='/'; @updateCallback = null; @fake_history = []; @depth = 0
  set: (@path) -> @fake_history.push(@path); @depth++
  replace: (@path) -> @fake_history[@depth - 1] = @path
  get: -> @path
  onUpdate: (callback) -> @updateCallback = callback
  back: (depth, callback) ->
    @depth -= 1 + depth
    @trigger(@fake_history[@depth], callback)

  formatURL: (url) => url

  # for testing
  trigger: (path, callback) =>
    return unless path != @path
    @updateCallback(path, callback)

# Location Factory
module.exports =
  create: (type, args...) ->
    switch type
      when 'hash' then new Hash()
      when 'history' then new History(if (root = args[0]) then '/' + root.replace(TRIM_SLASHES, '') + '/' else '/')
      when 'none' then new None()