import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 5180,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
