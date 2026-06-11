import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    sourcemap: false,
    outDir: 'dist',
  },
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
