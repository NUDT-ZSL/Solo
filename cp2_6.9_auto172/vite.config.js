import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    hmr: true,
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020'
  }
})
