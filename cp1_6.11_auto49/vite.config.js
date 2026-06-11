import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    hot: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
