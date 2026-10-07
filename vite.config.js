import { defineConfig } from 'vite'

export default defineConfig({
  // Three.js va en su propio fragmento (≈ 590 kB), cargado solo en la sala 3D.
  build: { chunkSizeWarningLimit: 700 },
  test: {
    include: ['tests/**/*.test.js'],
    testTimeout: 300000,
    hookTimeout: 300000,
  },
})
