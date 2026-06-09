import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
