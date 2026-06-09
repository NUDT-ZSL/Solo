import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    hot: true,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
