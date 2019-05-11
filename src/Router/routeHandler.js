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
  let prevParams = {}, prevQuery = {}, prevAttributes = {};
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
          prevParams = updateProps(child, state.params, prevParams);
          prevQuery = updateProps(child, state.query, prevQuery);
          if (currentLevel.attributes) prevAttributes = updateProps(child, currentLevel.attributes, prevAttributes);
          node.appendChild(child);
          if (onEnterComplete = currentLevel.onEnterComplete) {
            await onEnterComplete(node);
          }
        }
        level++
        return;
      }

      if (node.firstChild) {
        for (let i = 0, len = changedKeys.length; i < len; i++) {
          const k = changedKeys[i];
          if (k === 'params') prevParams = updateProps(node.firstChild, state[k], prevParams);
          if (k === 'query') prevQuery = updateProps(node.firstChild, state[k], prevQuery);
        }
        if (currentLevel.attributes) prevAttributes = updateProps(node.firstChild, currentLevel.attributes, prevAttributes);
      }
      level++;
    });
  });

  function updateProps(node, props, prevProps) {
    if (router.debug) console.log(`Update Props:`, props);

    for (const k in props) {
      let v = props[k], name = toAttributeName(k);
      if (!isString(v)) v = JSON.stringify(v);
      node.setAttribute(name, v);
    }
    const keys = difference(Object.keys(prevProps), Object.keys(props));
    for (let i = 0, len = keys.length; i < len; i++) {
      const attr = toAttributeName(keys[i]);
      node.setAttribute(attr, null);
      node.removeAttribute(attr);
    }
    return props;
  }
}

