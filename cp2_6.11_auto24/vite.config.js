import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: false,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022'
  }
});
