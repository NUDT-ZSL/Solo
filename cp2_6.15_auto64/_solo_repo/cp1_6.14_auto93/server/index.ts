import express from 'express';
import corsMiddleware from './middleware/cors.js';
import projectRoutes from './routes/projects.js';
import chapterRoutes from './routes/chapters.js';

const app = express();
const PORT = 3001;

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const projectStore: any[] = [];
app.locals._projectStore = projectStore;

app.use('/api/projects', projectRoutes);
app.use('/api/chapters', chapterRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`服务端运行在 http://localhost:${PORT}`);
});
