import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
});
