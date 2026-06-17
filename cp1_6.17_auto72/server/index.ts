import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

const app: Application = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: '巡演管家 API',
    version: '1.0.0',
    endpoints: {
      members: '/api/members',
      events: '/api/events',
      devices: '/api/devices',
      borrowRequests: '/api/borrow-requests',
      notifications: '/api/notifications/:userId',
      dashboard: '/api/dashboard/:userId',
    },
  });
});

app.use('/api', routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  巡演管家后端服务已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  API 地址: http://localhost:${PORT}/api`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
