import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    hot: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
