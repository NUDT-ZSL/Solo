import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'express-server',
      configureServer() {
        const serverPath = path.resolve('server', 'server.ts');
        const child = spawn('npx', ['ts-node', '--esm', serverPath], {
          stdio: 'inherit',
          shell: true,
        });
        child.on('error', (err) => {
          console.error('Failed to start Express server:', err);
        });
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
