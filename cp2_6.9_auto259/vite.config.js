import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174,
    hot: true
  },
  build: {
    target: 'es2020'
  }
})
