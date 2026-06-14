import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5180,
    open: false,
    host: true,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
});
