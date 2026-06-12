import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/post-save': 'http://localhost:3001',
      '/get-snippet': 'http://localhost:3001',
    },
  },
});
