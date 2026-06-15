import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5178,
    open: false,
    host: true,
    strictPort: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  }
});
