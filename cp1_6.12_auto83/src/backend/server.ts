import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import goalsRouter from './routes/goals.ts';
import tasksRouter from './routes/tasks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.use('/api/goals', goalsRouter);
app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
  console.log(`⚡ GoalWave server running on http://localhost:${PORT}`);
});

export default app;
