import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precaches only the built app shell (JS/CSS/fonts/images) — never
      // /api/* responses. This is a live donation/member-management
      // system; caching API calls risks a manager acting on stale
      // financial data while offline, which is worse than the request
      // just failing. No runtimeCaching rules means API calls always hit
      // the network exactly as they do today.
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,jpeg,jpg,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Al Ansar Foundation',
        short_name: 'Al Ansar',
        description: 'Member & Donation Management System',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf9f6',
        theme_color: '#241f19',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
