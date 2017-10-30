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
      return if (newPath = @get()) is @path
      callback(newPath)
    , false)
  back: -> #TODO
  formatURL: (url) -> '#' + url

# use window.history and pushstate
class History
  constructor: (@root) ->
    @type = 'history'; @path = @root; @depth = history.state?.depth or 0
  set: (@path) =>
    return if @path is @get()
    history.pushState({depth: ++@depth}, null, @formatURL(@path))
  replace: (@path) =>
    return if @path is @get() and @depth?
    #initialization
    @depth or= 0
    history.replaceState({depth: @depth}, null, @formatURL(@path))
  get: =>
    fragment = decodeURI(location.pathname + location.search).replace(TRIM_SLASHES, '')
    fragment = fragment.replace(@root.replace(TRIM_SLASHES, ''), '')
    return '/' + fragment.replace(TRIM_SLASHES, '')
  onUpdate: (callback, historyCallback) =>
    window.addEventListener('popstate', (event) =>
      newPath = @get()
      historyCallback(newPath)
      return if newPath is @path
      @depth = event.state?.depth or 0
      callback(newPath)
    , false)
  back: (depth) => history.go(-depth)
  formatURL: (url) => @root + url.replace(TRIM_SLASHES, '')

# no browser based location, use for testing
class None
  constructor: -> @type = 'none'; @path='/'; @updateCallback = null; @fakeHistory = []; @depth = 0
  set: (@path) -> @fakeHistory.push(@path); @depth++
  replace: (@path) -> @fakeHistory[@depth - 1] = @path
  get: -> @path
  onUpdate: (callback) -> @updateCallback = callback
  back: (depth) ->
    @depth -= 1 + depth
    @trigger(@fakeHistory[@depth])

  formatURL: (url) => url

  # for testing
  trigger: (path) =>
    return unless path != @path
    @updateCallback(path)

# Location Factory
module.exports =
  create: (type, args...) ->
    switch type
      when 'hash' then new Hash()
      when 'history' then new History(if (root = args[0]) then '/' + root.replace(TRIM_SLASHES, '') + '/' else '/')
      when 'none' then new None()