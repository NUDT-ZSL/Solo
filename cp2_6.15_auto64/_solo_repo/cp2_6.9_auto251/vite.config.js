import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    hmr: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  esbuild: {
    target: 'es2022'
  }
});
