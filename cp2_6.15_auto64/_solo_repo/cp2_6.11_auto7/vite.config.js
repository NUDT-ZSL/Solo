import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5180,
    host: true,
    open: false,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist'
  }
});
