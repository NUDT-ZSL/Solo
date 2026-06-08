import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8765,
    host: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
