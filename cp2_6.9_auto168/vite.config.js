import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5180,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
