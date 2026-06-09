import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['three', 'dat.gui']
  }
});
