import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
  },
  server: {
    open: true,
    port: 3000,
  },
});
