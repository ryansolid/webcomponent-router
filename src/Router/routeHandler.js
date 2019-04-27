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
      const tag = state.levels[level] && state.levels[level].tag,
        updateNode = !node.firstChild || tag !== node.firstChild.nodeName.toLowerCase();

      if (updateNode) {
        let onExit, onEnter, onEnterComplete;
        if (node.firstChild) {
          if (onExit = state.levels[level].onExit) {
            await onExit(node);
          }
          if (router.debug) {
            console.log('Exit:', node.firstChild.localName);
          }
          node.firstChild && node.removeChild(node.firstChild);
        }

        if (tag) {
          if (onEnter = state.levels[level].onEnter) {
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
          let attributes = state.levels[level].attributes || {};
          for (const k in attributes) {
            let v = attributes[k];
            if (!isString(v)) v = JSON.stringify(v);
            child.setAttribute(k, v);
          }
          onParamsChange(child, state.params);
          onQueryChange(child, state.query);
          node.appendChild(child);
          if (onEnterComplete = state.levels[level].onEnterComplete) {
            await onEnterComplete(node);
          }
        }
        level++
        return;
      }

      if (node.firstChild) {
        for (let i = 0, len = changedKeys.length; i < len; i++) {
          const k = changedKeys[i];
          if (k === 'params') onParamsChange(node.firstChild, state[k]);
          if (k === 'query') onQueryChange(node.firstChild, state[k]);
        }
      }
      level++;
    });
  });

  function onParamsChange(node, params) {
    if (router.debug) console.log(`Update Params:`, params);

    for (const k in params) {
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

