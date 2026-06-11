import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
