import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers']
  }
});
