import { defineConfig } from 'vite';
import typescript from '@vitejs/plugin-typescript';

export default defineConfig({
  plugins: [typescript()],
  server: {
    port: 5173,
    open: false
  }
});
