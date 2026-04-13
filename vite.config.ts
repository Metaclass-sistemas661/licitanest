import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";

// Plugin que substitui placeholders no firebase-messaging-sw.js com env vars reais
function firebaseSwEnvPlugin() {
  return {
    name: "firebase-sw-env",
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir || "dist";
      const swPath = path.resolve(outDir, "firebase-messaging-sw.js");
      if (!fs.existsSync(swPath)) return;

      let content = fs.readFileSync(swPath, "utf-8");
      const envMap: Record<string, string> = {
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "",
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "",
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "",
      };
      for (const [key, val] of Object.entries(envMap)) {
        content = content.replace(`"${key}"`, JSON.stringify(val));
      }
      fs.writeFileSync(swPath, content);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    firebaseSwEnvPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg", "icons/*.svg"],
      manifest: false,           // usamos /public/manifest.json manual
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/home.html", "**/contato.html", "**/politica-de-privacidade.html", "**/termos-de-uso.html", "**/preferencias-de-cookies.html", "**/canal-lgpd.html", "**/clear-cache.html"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Cache de API REST (network-first, fallback 24h)
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache de fontes Google
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache de imagens
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: "/app.html",
        navigateFallbackDenylist: [/^\/api/, /^\/portal\/cotacao/, /^\/$/, /^\/home\.html/, /^\/contato/, /^\/politica/, /^\/termos/, /^\/preferencias/, /^\/canal-lgpd/, /^\/clear-cache/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
