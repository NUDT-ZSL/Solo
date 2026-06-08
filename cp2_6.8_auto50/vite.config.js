import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 9876,
    strictPort: true,
    open: true,
    host: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false
  }
});
