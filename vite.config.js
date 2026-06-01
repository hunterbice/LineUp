import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1800,
  },
  server: {
    port: 4179,
    strictPort: false,
  },
  preview: {
    port: 4179,
    strictPort: false,
  },
});
