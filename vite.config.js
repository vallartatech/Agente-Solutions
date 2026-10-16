import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',

      workbox: {
        maximumFileSizeToCacheInBytes: 4000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },

      manifest: {
        short_name: "Agente",
        name: "Agente Solutions",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#FF6600",
        icons: [
          {
            src: "/Logo_192.png",
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: "/Logo_512.png",
            type: "image/png",
            sizes: "512x512"
          }
        ]
      }
    })
  ],
})