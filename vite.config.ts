import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The site is served from https://<user>.github.io/kids-game/ on GitHub Pages,
// so every URL in the built app must start with /kids-game/.
const base = "/kids-game/";

export default defineConfig({
  base,
  build: {
    // Babylon.js is big; this just silences the size warning.
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    VitePWA({
      // Update the installed app automatically when a new version is deployed.
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Kids Town",
        short_name: "Kids Town",
        description: "A 3D learning town for kids.",
        start_url: base,
        scope: base,
        display: "fullscreen",
        orientation: "landscape",
        background_color: "#87ceeb",
        theme_color: "#87ceeb",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cache everything the game needs so it works offline after the first visit.
        globPatterns: ["**/*.{js,css,html,svg,png,glb,json,bin}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
});
