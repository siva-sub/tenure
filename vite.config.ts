import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves a project site from a subpath; local dev and other
  // hosts stay at the root. Set VITE_BASE when building for a subpath.
  base: process.env['VITE_BASE'] ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack')) return 'query'
            if (id.includes('react-router')) return 'router'
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
