import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 8765,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
});
