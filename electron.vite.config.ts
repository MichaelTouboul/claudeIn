import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "module";
import { resolve } from "path";

// Dev-only Vite plugin: runs the component-source Babel pass that annotates JSX
// with data-component / data-source so the renderer's elementToComponent
// resolver can map a clicked DOM node back to its React component + source file.
// Registered ONLY in development → stripped entirely from production builds.
//
// Loaded via createRequire (not a static require/import) so electron-vite's
// esbuild config-bundler keeps it — and its @babel/core dependency, which uses
// dynamic node: requires — as a RUNTIME require instead of inlining it (inlining
// breaks with "Dynamic require of node:path is not supported").
const require = createRequire(import.meta.url);
const componentSource = require("./build/vite-component-source.cjs");

export default defineConfig(({ mode }) => ({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, "electron/main.ts"),
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, "electron/preload.ts"),
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/index.html"),
      },
    },
    plugins: [
      ...(mode === "development" ? [componentSource()] : []),
      react(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  },
}));
