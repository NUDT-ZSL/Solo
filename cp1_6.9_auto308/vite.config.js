import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3008,
    host: true,
    strictPort: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
