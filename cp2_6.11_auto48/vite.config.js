import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 4321,
    strictPort: true,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  }
});
