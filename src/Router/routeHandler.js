function toAttributeName(param) {
  return param.replace(
    /\.?([A-Z]+)/g,
    (x, y) => "-" + y.toLowerCase()
  ).replace(/_/g, '-').replace(/^-/, "");
};

function isString(val) {
  return Object.prototype.toString.call(val) === "[object String]";
}

function difference(a, b) { return a.filter((t) => b.indexOf(t) < 0); }

async function walkAsync(node, callback) {
  await callback(node);
  node.firstChild && await walkAsync(node.firstChild, callback);
}

export default function createRouteHandler(router, element) {
  let prevParams = {};
  router.on('state', async (state, changedKeys) => {
    let level = 0;
    await walkAsync(element, async (node) => {
      const currentLevel = state.levels[level],
        tag = currentLevel && currentLevel.tag,
        updateNode = !node.firstChild || tag !== node.firstChild.nodeName.toLowerCase();

      if (updateNode) {
        let onExit, onEnter, onEnterComplete;
        if (node.firstChild) {
          if (onExit = currentLevel.onExit) {
            await onExit(node);
          }
          if (router.debug) {
            console.log('Exit:', node.firstChild.localName);
          }
          node.firstChild && node.removeChild(node.firstChild);
        }

        if (tag) {
          if (onEnter = currentLevel.onEnter) {
            await onEnter(node);
          }
          if (router.debug) {
            console.log('Enter:', tag);
          }
          const child = document.createElement(tag);
          child.__router = {
            id: router.id,
            level
          };
          onParamsChange(child, Object.assign({}, state.params, currentLevel.attributes));
          onQueryChange(child, state.query);
          node.appendChild(child);
          if (onEnterComplete = currentLevel.onEnterComplete) {
            await onEnterComplete(node);
          }
        }
        level++
        return;
      }

      if (node.firstChild) {
        if (changedKeys.indexOf('params') === -1 && currentLevel.attributes) onParamsChange(node.firstChild, Object.assign({}, prevParams, currentLevel.attributes), currentLevel.attributes);
        for (let i = 0, len = changedKeys.length; i < len; i++) {
          const k = changedKeys[i];
          if (k === 'params') onParamsChange(node.firstChild, Object.assign({}, state[k], currentLevel.attributes));
          if (k === 'query') onQueryChange(node.firstChild, state[k]);
        }
      }
      level++;
    });
  });

  function onParamsChange(node, params, changeKeys) {
    if (router.debug) console.log(`Update Params:`, params);

    for (const k in params) {
      if (changeKeys && !changeKeys[k]) continue;
      let v = params[k], name = toAttributeName(k);
      if (!isString(v)) v = JSON.stringify(v);
      node.setAttribute(name, v);
    }
    const keys = difference(Object.keys(prevParams), Object.keys(params));
    for (let i = 0, len = keys.length; i < len; i++) {
      const attr = toAttributeName(keys[i]);
      node.setAttribute(attr, null);
      node.removeAttribute(attr);
    }
    prevParams = params;
  }

  function onQueryChange(node, query) {
    if (router.debug) console.log(`Update Query:`, query);

    if (query) node.setAttribute('query', JSON.stringify(query));
    if (!Object.keys(query).length) node.removeAttribute('query');
  }
}

