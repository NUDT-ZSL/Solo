import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync, readFileSync, watch } from 'fs';

const PORT_FILE = path.resolve(__dirname, '.server-port');

function getServerPort() {
  if (existsSync(PORT_FILE)) {
    try {
      const port = parseInt(readFileSync(PORT_FILE, 'utf-8').trim(), 10);
      if (!isNaN(port) && port > 0) {
        return port;
      }
    } catch (e) {
      // ignore
    }
  }
  return 3010;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dynamic-server-proxy',
      configureServer(server) {
        let currentPort = getServerPort();
        let proxyTarget = `http://localhost:${currentPort}`;

        watch(PORT_FILE, () => {
          const newPort = getServerPort();
          if (newPort !== currentPort) {
            currentPort = newPort;
            proxyTarget = `http://localhost:${currentPort}`;
            server.config.logger.info(`[dynamic-proxy] API target updated to ${proxyTarget}`);
          }
        });

        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            const httpProxy = require('http-proxy');
            const proxy = httpProxy.createProxyServer({
              target: `http://localhost:${currentPort}`,
              changeOrigin: true,
            });
            proxy.web(req, res, (err) => {
              if (err) {
                console.error('[proxy error]', err.message);
                res.statusCode = 502;
                res.end();
              }
            });
          } else {
            next();
          }
        });
      },
    },
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
        target: `http://localhost:${getServerPort()}`,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[proxy error]', err.message);
          });
          let portCache = getServerPort();
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const latestPort = getServerPort();
            if (latestPort !== portCache) {
              portCache = latestPort;
              options.target = `http://localhost:${latestPort}`;
            }
          });
        },
      },
    },
  },
});
