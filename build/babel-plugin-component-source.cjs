// @ts-nocheck
/**
 * Babel plugin (DEV ONLY) — annotate JSX with component-source metadata.
 *
 * For every JSX opening element (except Fragments) it injects, when missing:
 *   - data-source="<relativePathFromRepoRoot>:<line>"   (from the node's loc)
 *   - data-component="<EnclosingPascalCaseComponentName>" (nearest enclosing
 *     function/arrow component whose name is PascalCase; skipped if none)
 *
 * The renderer resolver (src/lib/elementToComponent.ts) reads these back to map
 * a clicked DOM element to its React component + source file.
 *
 * It is a strict no-op in production: the plugin only runs when development
 * mode is active. Mode is read from the `dev` option (passed by the Vite config)
 * and falls back to `process.env.NODE_ENV === 'development'`.
 *
 * Plain CommonJS so it can be required directly from electron.vite.config.ts.
 * No `require()` of Node built-ins: electron-vite bundles the config and inlines
 * this module, where a dynamic `require('node:path')` is unsupported in ESM —
 * so paths are normalised with plain string ops instead.
 */

const SOURCE_ATTR = 'data-source';
const COMPONENT_ATTR = 'data-component';

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

/**
 * Path of `filename` relative to `root`, using forward slashes. Pure string
 * normalisation so the plugin needs no `node:path` dependency.
 * @param {string} root
 * @param {string} filename
 * @returns {string}
 */
function relativeFromRoot(root, filename) {
  const normRoot = root.replace(/\\/g, '/').replace(/\/+$/, '');
  const normFile = filename.replace(/\\/g, '/');
  const prefix = `${normRoot}/`;
  if (normFile.startsWith(prefix)) {
    return normFile.slice(prefix.length);
  }
  return normFile;
}

/**
 * @param {string | undefined} name
 * @returns {boolean}
 */
function isPascalCase(name) {
  return typeof name === 'string' && PASCAL_CASE.test(name);
}

/**
 * Resolve the component name for a function-like node, preferring its own id,
 * then a parent variable declarator (covers `const Foo = () => …`).
 * @param {import('@babel/core').NodePath} fnPath
 * @returns {string | null}
 */
function functionComponentName(fnPath) {
  const node = fnPath.node;
  if (node.id && isPascalCase(node.id.name)) return node.id.name;

  const parent = fnPath.parentPath;
  if (parent && parent.isVariableDeclarator() && parent.node.id.type === 'Identifier') {
    const name = parent.node.id.name;
    if (isPascalCase(name)) return name;
  }
  return null;
}

/**
 * Walk up from a JSX path to the nearest enclosing PascalCase component name.
 * @param {import('@babel/core').NodePath} jsxPath
 * @returns {string | null}
 */
function enclosingComponentName(jsxPath) {
  let current = jsxPath.getFunctionParent();
  while (current) {
    const name = functionComponentName(current);
    if (name) return name;
    current = current.getFunctionParent();
  }
  return null;
}

/**
 * @param {import('@babel/types')} t
 * @param {import('@babel/core').types.JSXOpeningElement} opening
 * @param {string} attrName
 * @returns {boolean}
 */
function hasAttribute(opening, attrName) {
  return opening.attributes.some(
    (attr) => attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && attr.name.name === attrName,
  );
}

/**
 * Fragments (<Fragment> / <>) must not be annotated.
 * @param {import('@babel/core').types.JSXOpeningElement} opening
 * @returns {boolean}
 */
function isFragment(opening) {
  const name = opening.name;
  if (name.type === 'JSXIdentifier') return name.name === 'Fragment';
  if (name.type === 'JSXMemberExpression') return name.property.name === 'Fragment';
  return false;
}

/**
 * @param {{ types: import('@babel/types') }} api
 * @param {{ dev?: boolean }} [options]
 */
module.exports = function componentSourcePlugin({ types: t }, options = {}) {
  const enabled = options.dev ?? process.env.NODE_ENV === 'development';

  if (!enabled) {
    return { name: 'component-source', visitor: {} };
  }

  /**
   * @param {string} attrName
   * @param {string} value
   */
  function attr(attrName, value) {
    return t.jsxAttribute(t.jsxIdentifier(attrName), t.stringLiteral(value));
  }

  return {
    name: 'component-source',
    visitor: {
      JSXOpeningElement(jsxPath, state) {
        const opening = jsxPath.node;
        if (isFragment(opening)) return;

        const filename = state.file.opts.filename;
        const root = state.file.opts.root || process.cwd();
        const loc = opening.loc;

        if (filename && loc && !hasAttribute(opening, SOURCE_ATTR)) {
          const relative = relativeFromRoot(root, filename);
          opening.attributes.push(attr(SOURCE_ATTR, `${relative}:${loc.start.line}`));
        }

        if (!hasAttribute(opening, COMPONENT_ATTR)) {
          const component = enclosingComponentName(jsxPath);
          if (component) {
            opening.attributes.push(attr(COMPONENT_ATTR, component));
          }
        }
      },
    },
  };
};
