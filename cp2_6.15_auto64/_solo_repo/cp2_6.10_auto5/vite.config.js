import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    hot: true,
    open: false
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser'
  }
});
