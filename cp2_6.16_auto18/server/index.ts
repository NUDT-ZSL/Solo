import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';

import identifyRouter from './routes/identify';
import plantsRouter from './routes/plants';
import eventsRouter from './routes/events';
import recordsRouter from './routes/records';
import remindersRouter from './routes/reminders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/identify', identifyRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/reminders', remindersRouter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gardening Assistant API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件大小超过限制，最大支持10MB',
      });
    }
    return res.status(400).json({
      success: false,
      error: `文件上传错误: ${err.message}`,
    });
  }
  
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      error: '只支持上传图片文件（JPG、PNG、WebP、GIF等）',
    });
  }
  
  if (err.status === 400) {
    return res.status(400).json({
      success: false,
      error: err.message || '请求参数错误',
    });
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message || '服务器内部错误',
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `接口不存在: ${req.method} ${req.path}`,
  });
});

initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API health check: http://localhost:${PORT}/api/health`);
});

export default app;
