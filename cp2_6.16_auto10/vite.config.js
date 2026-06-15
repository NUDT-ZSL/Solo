import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '127.0.0.1',
    hmr: {
      host: '127.0.0.1',
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
