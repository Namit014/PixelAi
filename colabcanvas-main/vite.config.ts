import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [
    react(),
    svgr({
      include: "**/*.svg?react",
      svgrOptions: {
        icon: true,
        dimensions: false,
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // we register manually with iframe/preview guards in main.tsx
      manifest: false, // we ship our own /manifest.webmanifest
      devOptions: {
        enabled: false,
      },
      workbox: {
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/oauth/,
          /^\/payment/,
          /^\/admin/,
          /^\/api/,
        ],
        globPatterns: ["**/*.{js,css,html,svg,woff2,ttf,png,webp}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
