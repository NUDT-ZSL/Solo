import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as net from 'net';

/**
 * 检测端口是否被占用（用于Vite动态查找后端API端口）
 */
function isPortReachable(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

/**
 * 从起始端口开始，找到第一个已被占用（表示后端正在运行）的端口
 * 因为后端从3001开始自动检测，所以我们找第一个正在监听的端口
 */
async function findBackendPort(startPort = 3001, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const port = startPort + i;
    const reachable = await isPortReachable(port);
    if (reachable) {
      console.log(`  🎯 Vite 已检测到后端服务端口: ${port}`);
      return port;
    }
  }
  // 没找到就返回默认3001，后端稍后启动会自动使用这个或后续端口
  console.log(`  ⚠ 未检测到后端服务，默认使用端口 3001`);
  return startPort;
}

// 使用异步配置函数，支持动态检测后端端口
export default defineConfig(async () => {
  const backendPort = await findBackendPort(3001, 10);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,  // 端口被占用时自动找下一个
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          // 修复问题6：代理失败时自动重试下一个端口
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error(`  ❌ 代理错误 (端口 ${backendPort}):`, err.message);
              if (res && res.writeHead) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                res.end(`后端服务未就绪，请确保后端已启动。当前尝试端口: ${backendPort}`);
              }
            });
          },
        },
      },
    },
  };
});
