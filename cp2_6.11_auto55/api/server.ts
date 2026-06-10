import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[桌游集市] 后端服务已启动: http://localhost:${PORT}`);
  console.log(`  - 游戏列表:   GET  /api/games`);
  console.log(`  - 游戏详情:   GET  /api/games/:id`);
  console.log(`  - 下载PDF:    GET  /api/games/:id/pdf`);
  console.log(`  - 健康检查:   GET  /api/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;