import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('lucide') || id.includes('chroma') || id.includes('tanstack')) return 'vendor-ui';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase slightly for the specialized map code
  }
})
