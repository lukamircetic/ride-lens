import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite-plus";

const plugins = [
  tailwindcss(),
  tanstackRouter({
    target: "react",
    autoCodeSplitting: true,
  }),
  react(),
] as unknown as Array<PluginOption>;

export default defineConfig({
  server: {
    port: 3010,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3002",
      "/health": "http://127.0.0.1:3002",
      "/openapi.json": "http://127.0.0.1:3002",
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins,
});
