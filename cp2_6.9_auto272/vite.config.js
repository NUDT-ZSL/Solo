import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  worker: {
    format: 'es'
  }
});
