import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5188,
    strictPort: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false
  }
});
