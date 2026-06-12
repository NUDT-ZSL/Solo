import express from 'express';
import cors from 'cors';
import worksRouter from './routes/works';
import coursesRouter from './routes/courses';
import { initializeDatabase } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', worksRouter);
app.use('/api', coursesRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '匠心皮具工坊 API 服务运行正常' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
