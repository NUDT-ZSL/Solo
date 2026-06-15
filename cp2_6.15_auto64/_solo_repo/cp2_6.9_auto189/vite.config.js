import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
