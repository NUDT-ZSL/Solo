import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync, readFileSync, watch } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_FILE = path.resolve(__dirname, '.server-port');

function getServerPort() {
  if (existsSync(PORT_FILE)) {
    try {
      const port = parseInt(readFileSync(PORT_FILE, 'utf-8').trim(), 10);
      if (!isNaN(port) && port > 0) {
        return port;
      }
    } catch (e) {
      console.log('[vite] Could not read server port file:', e.message);
    }
  }
  return 3010;
}

let currentPort = getServerPort();

function createDynamicProxyPlugin() {
  return {
    name: 'dynamic-server-proxy',
    configureServer(server) {
      let watcher = null;

      const setupWatcher = () => {
        if (existsSync(PORT_FILE)) {
          watcher = watch(PORT_FILE, (event) => {
            if (event === 'change') {
              const newPort = getServerPort();
              if (newPort !== currentPort) {
                currentPort = newPort;
                server.config.logger.info(`[dynamic-proxy] API target updated to http://localhost:${currentPort}`);
              }
            }
          });
        }
      };

      setupWatcher();

      const fileCheckInterval = setInterval(() => {
        if (!watcher && existsSync(PORT_FILE)) {
          setupWatcher();
        }
      }, 1000);

      server.httpServer.on('close', () => {
        clearInterval(fileCheckInterval);
        if (watcher) watcher.close();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    createDynamicProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: `http://localhost:${currentPort}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const latestPort = getServerPort();
            if (latestPort !== currentPort) {
              currentPort = latestPort;
            }
            proxyReq.port = currentPort;
          });
          proxy.on('error', (err) => {
            console.log('[proxy error]', err.message);
          });
        },
      },
    },
  },
});
