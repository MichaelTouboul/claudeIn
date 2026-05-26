import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist-electron",
      lib: {
        entry: resolve(__dirname, "electron/main.ts"),
      },
    },
  },
  preload: {
    build: {
      outDir: "dist-electron",
      lib: {
        entry: resolve(__dirname, "electron/preload.ts"),
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      outDir: resolve(__dirname, "dist"),
      rollupOptions: {
        input: resolve(__dirname, "src/index.html"),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  },
});
