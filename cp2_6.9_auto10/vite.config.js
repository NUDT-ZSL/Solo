import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  assetsInlineLimit: 0,
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  build: {
    assetsInlineLimit: 0,
    sourcemap: true
  }
});
