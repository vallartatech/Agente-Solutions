import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' requiere mostrar un aviso de "Hay una actualización" en la app.
      // Si la app NO tiene ese aviso, cambiar a 'autoUpdate'.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png'],

      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // /push/      -> service worker de OneSignal (vive en su propio scope)
        // /.well-known/ -> assetlinks.json para la app de Android (TWA)
        navigateFallbackDenylist: [/^\/push\//, /^\/\.well-known\//]
      },

      manifest: {
        id: "/",
        short_name: "Agente Solutions",
        name: "Agente Solutions",
        description: "Gestión de servicios técnicos de Agente Solutions",
        lang: "es-MX",
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