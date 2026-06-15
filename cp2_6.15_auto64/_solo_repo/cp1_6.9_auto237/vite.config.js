import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true,
    host: true
  },
  optimizeDeps: {
    include: ['phaser']
  }
});
