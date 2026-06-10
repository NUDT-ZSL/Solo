import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5180,
    open: false,
    hmr: true,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'esbuild'
  },
  esbuild: {
    target: 'es2020'
  }
});
