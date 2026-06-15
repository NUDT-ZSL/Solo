import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist'
  },
  optimizeDeps: {
    include: ['three']
  }
});
