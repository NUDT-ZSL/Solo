import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    open: false,
    hmr: true
  },
  build: {
    target: 'es2020'
  }
});
