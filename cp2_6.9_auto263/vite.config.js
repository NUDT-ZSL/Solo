import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 5173,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
