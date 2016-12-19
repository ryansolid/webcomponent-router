module.exports = class Utils
  @isObject: (obj) -> obj isnt null and typeof obj in ['object', 'function']

  @isFunction: (val) -> Object::toString.call(val) is "[object Function]"

  @isString: (val) -> Object::toString.call(val) is "[object String]"

  @pick: (obj, keys...) ->
    keys = keys[0] if keys.length is 1 and Array.isArray(keys[0])
    new_obj = {}
    new_obj[k] = v for k, v of obj when k in keys
    new_obj

  @isEqual: (a, b) ->
    return false for k, v of a when b[k] isnt v
    return false for k, v of b when a[k] isnt v
    true

  @difference: (a, b) -> a.filter (t) -> not (t in b)