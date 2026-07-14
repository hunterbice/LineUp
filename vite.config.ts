import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/",
  plugins: [tanstackRouter({ target: "react" }), react(), tailwindcss(), tsconfigPaths()],
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
