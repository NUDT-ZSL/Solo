import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false
  }
});
