import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5180,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild'
  },
  esbuild: {
    target: 'es2020'
  }
});
