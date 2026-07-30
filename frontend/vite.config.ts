import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'offline.html'],
      manifest: false, // we use our own public/manifest.json
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB — large bundle due to recharts + react-pdf
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-pdf/')) return 'vendor-react-pdf'
            if (id.includes('recharts')) return 'vendor-recharts'
            if (id.includes('/d3-')) return 'vendor-d3'
            if (id.includes('chess.js')) return 'vendor-chess'
            if (id.includes('@tanstack/react-query')) return 'vendor-react-query'
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase'
            if (id.includes('react-router-dom')) return 'vendor-router'
            if (id.includes('react-dom')) return 'vendor-react-dom'
            if (id.includes('/react/')) return 'vendor-react'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@radix-ui')) return 'vendor-radix'
            return 'vendor-core'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
