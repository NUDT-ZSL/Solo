import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    open: true
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    minify: 'esbuild'
  }
});
