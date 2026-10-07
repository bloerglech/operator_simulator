import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 300000,
    hookTimeout: 300000,
  },
})
