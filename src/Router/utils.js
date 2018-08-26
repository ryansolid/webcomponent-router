export function isObject(obj) {
  var ref;
  return obj !== null && ((ref = typeof obj) === 'object' || ref === 'function');
}

export function isFunction(val) {
  return Object.prototype.toString.call(val) === "[object Function]";
}

export function pick(obj, ...keys) {
  if (keys.length === 1 && Array.isArray(keys[0])) keys = keys[0];
  const new_obj = {};
  for (const k in obj) {
    if (keys.indexOf(k) >= 0) new_obj[k] = obj[k];
  }
  return new_obj;
}

export function isEqual(a, b) {
  var k;
  if ((a === (void 0) || a === null) && (b === (void 0) || b === null)) {
    return true;
  }
  if (!(isObject(a) && !isFunction(a)) || !(isObject(b) && !isFunction(b))) {
    return a === b;
  }
  for (k in a) {
    if (!isEqual(a[k], b[k])) return false;
  }
  for (k in b) {
    if (a[k] == null) return false;
  }
  return true;
}
