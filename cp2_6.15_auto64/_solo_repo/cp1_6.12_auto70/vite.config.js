import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    minify: 'esbuild'
  }
});
