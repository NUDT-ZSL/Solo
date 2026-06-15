import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    open: false,
    hmr: true,
    port: 5199
  }
});
