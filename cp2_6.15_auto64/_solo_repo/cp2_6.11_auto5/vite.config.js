import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    hmr: true,
    open: false
  },
  build: {
    target: 'es2020',
    minify: 'esbuild'
  }
});
