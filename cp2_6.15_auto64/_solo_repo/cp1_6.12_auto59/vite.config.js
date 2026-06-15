import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@voxel': path.resolve(__dirname, './src/voxel'),
      '@render': path.resolve(__dirname, './src/render'),
      '@interaction': path.resolve(__dirname, './src/interaction'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@loader': path.resolve(__dirname, './src/loader'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
