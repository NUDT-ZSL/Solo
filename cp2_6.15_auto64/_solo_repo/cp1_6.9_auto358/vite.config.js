import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    hmr: true,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@tweenjs/tween.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', '@tweenjs/tween.js']
  }
});
