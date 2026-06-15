import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    hot: true,
    open: true
  },
  build: {
    target: 'esnext'
  }
});
