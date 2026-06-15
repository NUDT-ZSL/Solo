import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    hmr: true,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
