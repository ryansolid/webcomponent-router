# Object.assign
if typeof Object.assign != 'function'
  do ->
    Object.assign = (target) ->
      'use strict'
      # We must check against these specific cases.
      if target == undefined or target == null
        throw new TypeError('Cannot convert undefined or null to object')
      output = Object(target)
      index = 1
      while index < arguments.length
        source = arguments[index]
        if source != undefined and source != null
          for nextKey of source
            if source.hasOwnProperty(nextKey)
              output[nextKey] = source[nextKey]
        index++
      output

# Array.filter
if !Array::filter
  Array::filter = (fun) ->
    'use strict'
    if this == undefined or this == null
      throw new TypeError
    t = Object(this)
    len = t.length >>> 0
    if typeof fun != 'function'
      throw new TypeError
    res = []
    thisArg = if arguments.length >= 2 then arguments[1] else undefined
    i = 0
    while i < len
      if i of t
        val = t[i]
        if fun.call(thisArg, val, i, t)
          res.push val
      i++
    res