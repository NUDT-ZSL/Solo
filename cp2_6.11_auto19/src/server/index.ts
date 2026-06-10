/**
 * Express 服务器入口
 * 提供词络图谱 API 服务
 */

import express from 'express';
import cors from 'cors';
import graphRoutes from './routes/graph';

const app = express();
const PORT = 3002;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

// 启动服务器
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
});
