import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@audio': '/src/audio',
      '@core': '/src/core',
      '@entities': '/src/entities',
      '@ui': '/src/ui',
    },
  },
});
