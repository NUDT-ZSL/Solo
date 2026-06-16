import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    esbuild: {
      target: 'es2020',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true
    },
    sourcemap: false
  }
});
