import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false,
    hmr: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
  },
  esbuild: {
    target: 'es2020',
  },
});
