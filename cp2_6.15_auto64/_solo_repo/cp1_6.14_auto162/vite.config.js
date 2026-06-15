import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    target: 'modules',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
