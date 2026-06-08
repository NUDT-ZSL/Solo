import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: '0.0.0.0',
    port: 8765,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext'
  }
});
