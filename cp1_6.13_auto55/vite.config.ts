import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: 'hidden',
  },
  esbuild: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})
