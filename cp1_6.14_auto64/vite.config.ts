import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    open: true,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
