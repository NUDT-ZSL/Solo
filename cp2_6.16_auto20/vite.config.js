import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'es2020'
  },
  server: {
    port: 5173,
    open: true
  }
});
