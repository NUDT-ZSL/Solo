import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    hmr: true
  },
  build: {
    target: 'ES2020',
    sourcemap: true
  },
  esbuild: {
    target: 'ES2020'
  }
});
