import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
