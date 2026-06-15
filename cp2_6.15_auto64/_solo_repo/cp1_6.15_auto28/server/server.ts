/**
 * server/server.ts
 *
 * Express 服务器入口文件
 *
 * 调用关系：
 *   本文件 → 导入 server/mockData.ts 的 getTopics() 和 getDetailById()
 *   本文件 → 被 vite.config.js 的 proxy 配置指向（/api 代理到 localhost:3001）
 *
 * 数据流向：
 *   前端 fetch('/api/votings') → Vite proxy → 本文件 GET /api/votings → mockData.getTopics() → JSON 响应
 *   前端 fetch('/api/votings/:id') → Vite proxy → 本文件 GET /api/votings/:id → mockData.getDetailById(id) → JSON 响应
 *
 * 监听端口：3001
 */

import express from 'express';
import { getTopics, getDetailById } from './mockData.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/api/votings', (_req, res) => {
  const topics = getTopics();
  res.json({ success: true, data: topics });
});

app.get('/api/votings/:id', (req, res) => {
  const detail = getDetailById(req.params.id);
  if (!detail) {
    return res.status(404).json({ success: false, data: null, message: '主题不存在' });
  }
  res.json({ success: true, data: detail });
});

app.listen(PORT, () => {
  console.log(`[server] Express 服务器已启动，监听端口 ${PORT}`);
  console.log(`[server] GET /api/votings      → 获取投票主题列表`);
  console.log(`[server] GET /api/votings/:id   → 获取指定主题详情`);
});
