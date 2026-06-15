import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    hot: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  }
});
