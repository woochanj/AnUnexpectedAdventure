import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    open: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['phaser']
  },
  base: process.env.NODE_ENV === 'production' ? '/AnUnexpectedAdventure/' : '/'
})
