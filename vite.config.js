import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png'],

      workbox: {
        maximumFileSizeToCacheInBytes: 4000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // El service worker de OneSignal vive en su propio scope; la PWA no debe interceptarlo
        navigateFallbackDenylist: [/^\/push\//]
      },

      manifest: {
        id: "/",
        short_name: "Agente",
        name: "Agente Solutions",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#FF6600",
        icons: [
          {
            src: "/Logo_192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any"
          },
          {
            src: "/Logo_512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any"
          },
          {
            src: "/Logo_maskable_512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
})
