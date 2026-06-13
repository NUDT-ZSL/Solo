import { defineConfig } from 'vite';
import typescript from '@vitejs/plugin-typescript';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true,
    hmr: true
  },
  plugins: [typescript()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
