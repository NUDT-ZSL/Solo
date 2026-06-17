import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { authRouter } from './auth.js';
import { worksRouter } from './works.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/works', worksRouter);

const uploadsDir = path.join(__dirname, '..', 'uploads');
const watermarkedDir = path.join(__dirname, '..', 'watermarked');

app.use('/api/images/original', express.static(uploadsDir));
app.use('/api/images/watermarked', express.static(watermarkedDir));

app.use('/api/images', (req, res) => {
  res.status(404).json({ error: '图片不存在' });
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
