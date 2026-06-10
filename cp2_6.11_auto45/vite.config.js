import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: false,
    hmr: true
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'esbuild'
  }
});
