import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3003',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
