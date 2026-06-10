import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    hmr: true,
    host: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild'
  }
});
