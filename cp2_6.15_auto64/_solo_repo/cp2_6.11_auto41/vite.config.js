import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    host: true,
    port: 5188,
    strictPort: true,
  },
  build: {
    target: 'es2020',
  },
});
