import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  optimizeDeps: {
    include: ['d3-graphviz', '@hpcc-js/wasm']
  }
})
