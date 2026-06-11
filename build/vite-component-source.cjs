/**
 * Dev-only Vite plugin that runs the component-source Babel plugin
 * (`./babel-plugin-component-source.cjs`) over renderer JSX/TSX before
 * `@vitejs/plugin-react` (v6, oxc-based) performs the JSX→JS transform.
 *
 * Why a custom plugin and not `react({ babel })`: `@vitejs/plugin-react` v6
 * dropped the `babel` option (it transforms with oxc), so the Babel plugin is
 * wired in here as a `transform` hook with `enforce: 'pre'`. Babel keeps the JSX
 * syntax intact (no JSX transform plugin is run) and only injects the
 * `data-component` / `data-source` attributes; oxc then compiles the JSX.
 *
 * Returns `null` (a no-op) outside of `apply: 'serve'`-style dev usage; the
 * config only registers it when `mode === 'development'`, so production builds
 * never see it.
 *
 * Plain CommonJS so electron.vite.config.ts can `require()` it without adding a
 * type surface, and so the bundled config carries no dynamic Node built-in
 * requires.
 */

const babel = require('@babel/core');

const componentSourcePlugin = require('./babel-plugin-component-source.cjs');

const JSX_FILE = /\.[jt]sx$/;

/**
 * @returns {import('vite').Plugin}
 */
module.exports = function viteComponentSource() {
  return {
    name: 'component-source',
    enforce: 'pre',
    /**
     * @param {string} code
     * @param {string} id
     */
    transform(code, id) {
      const file = id.split('?')[0];
      if (!JSX_FILE.test(file)) return null;

      const result = babel.transformSync(code, {
        filename: file,
        root: process.cwd(),
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: { plugins: ['jsx', 'typescript'] },
        plugins: [[componentSourcePlugin, { dev: true }]],
      });

      if (!result || result.code == null) return null;
      return { code: result.code, map: result.map };
    },
  };
};
