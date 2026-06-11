import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: false,
    hmr: true
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      input: './index.html'
    }
  },
  optimizeDeps: {
    include: ['three']
  }
});
