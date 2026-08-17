import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2'],
      manifest: {
        name: 'Tu Kiosko',
        short_name: 'Tu Kiosko',
        description: 'Gestion de ventas, inventario y caja para minimarket',
        lang: 'es-VE',
        theme_color: '#F1F2F4',
        background_color: '#F1F2F4',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap usa funciones de color "legacy" internamente; los avisos
        // de deprecacion son de su propio codigo, no del nuestro.
        quietDeps: true,
      },
    },
  },
  build: {
    // El presupuesto real (250 KB gzip del bundle inicial, ver
    // .claude/steering/tech.md) lo hace cumplir scripts/verificar-presupuesto.mjs
    // despues del build. Este limite es en bytes crudos, no gzip; se sube
    // para no duplicar la advertencia con un numero que no es comparable.
    chunkSizeWarningLimit: 400,
  },
})
