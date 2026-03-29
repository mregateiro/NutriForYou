import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['src/__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**', 'src/validators/**', 'src/lib/**'],
      exclude: ['src/__tests__/**'],
    },
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 10000,
  },
})
