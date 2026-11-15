import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Vitest runs its own copy of Vite (v3 ships a Vite 6 line), so the test config
 * is kept separate from the app build rather than sharing one type surface.
 * These are pure domain tests: no React plugin, no jsdom needed.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
  },
})
