import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    hmr: true,
    port: 5173
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
