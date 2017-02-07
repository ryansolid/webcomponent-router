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
    return true if a in [undefined, null] and b in [undefined, null]
    return a is b if !(Utils.isObject(a) and not Utils.isFunction(a)) or !(Utils.isObject(b) and not Utils.isFunction(b))
    return false for k, v of a when !Utils.isEqual(b[k],v)
    return false for k, v of b when not a[k]?
    true

  @difference: (a, b) -> a.filter (t) -> not (t in b)