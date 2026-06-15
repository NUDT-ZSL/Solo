import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 5180
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
