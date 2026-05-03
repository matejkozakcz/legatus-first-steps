import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        // Disabled in dev — Lovable preview iframe would cache stale builds
        devOptions: { enabled: false },
        manifest: false, // Using static public/manifest.json
        workbox: {
          navigateFallback: "/dashboard",
          navigateFallbackDenylist: [/^\/api/, /^\/~/, /^\/auth/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html",
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: /\.(?:woff2?|ttf|otf)$/,
              handler: "CacheFirst",
              options: { cacheName: "fonts" },
            },
          ],
        },
      }),
    ],
  },
});
