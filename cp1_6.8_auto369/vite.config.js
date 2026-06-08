import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: true,
    host: true,
  },
  build: {
    target: 'es2020',
  },
});
