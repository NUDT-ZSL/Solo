/**
 * Express 服务器入口
 * 提供词络图谱 API 服务
 *
 * 功能特性：
 * - 端口自动检测与回退机制（从3001开始，最多尝试10个端口）
 * - CORS跨域支持
 * - JSON Body解析（最大10MB）
 */

import express from 'express';
import cors from 'cors';
import * as net from 'net';
import graphRoutes from './routes/graph';

const app = express();

// ========== 修复问题6：端口自动检测机制 ==========
const START_PORT = 3001;
const MAX_PORT_ATTEMPTS = 10;

/**
 * 检测端口是否被占用
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 从起始端口开始，找到第一个可用端口
 */
async function findAvailablePort(startPort: number, attempts: number): Promise<number> {
  for (let i = 0; i < attempts; i++) {
    const port = startPort + i;
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
    console.log(`  ⚠ 端口 ${port} 已被占用，尝试下一个...`);
  }
  throw new Error(`无法找到可用端口（尝试了 ${attempts} 个端口）`);
}

// 中间件
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:5180',
    'http://localhost:5181',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// 路由
app.use('/api/graph', graphRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 启动服务器（自动检测可用端口）
async function startServer() {
  try {
    const PORT = await findAvailablePort(START_PORT, MAX_PORT_ATTEMPTS);

    app.listen(PORT, () => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║   词络织梦 · 后端服务已启动                   ║
  ║                                              ║
  ║   🚀 服务地址: http://localhost:${PORT}         ║
  ║   📡 API 前缀: /api/graph                    ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
      `);

      // 将实际使用的端口写入环境变量，供Vite代理配置参考
      process.env.SERVER_PORT = String(PORT);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
