import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import assetsRouter from './routes/assets.js';
import uploadRouter from './routes/upload.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.use('/api/assets', assetsRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/tags', async (_req, res) => {
  try {
    const { PRESET_TAGS } = await import('../shared/types.js');
    res.json({ tags: [...PRESET_TAGS] });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await seedDatabase();
});

export default app;
