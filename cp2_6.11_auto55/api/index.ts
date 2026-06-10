import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app.js';
import { initBrowser, closeBrowser } from './services/pdfService.js';

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      await initBrowser();
      console.log('[桌游集市] Puppeteer浏览器实例已初始化');
    } catch (err) {
      console.warn('[桌游集市] Puppeteer初始化失败，PDF生成将不可用:', err);
    }

    const server = app.listen(PORT, () => {
      console.log(`[桌游集市] 后端服务已启动: http://localhost:${PORT}`);
      console.log(`  - 游戏列表:   GET  /api/games`);
      console.log(`  - 游戏详情:   GET  /api/games/:id`);
      console.log(`  - 下载PDF:    GET  /api/games/:id/pdf`);
      console.log(`  - 健康检查:   GET  /api/health`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received`);
      server.close(async () => {
        await closeBrowser();
        console.log('[桌游集市] Puppeteer浏览器实例已关闭');
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  };

  startServer();
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
