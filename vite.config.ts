import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  main: {
    build: {
      outDir: "dist-electron",
      lib: {
        entry: "electron/main.ts",
      },
    },
  },
  preload: {
    build: {
      outDir: "dist-electron",
      lib: {
        entry: "electron/preload.ts",
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      outDir: path.resolve(__dirname, "dist"),
      rollupOptions: {
        input: path.resolve(__dirname, "src/index.html"),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
});
