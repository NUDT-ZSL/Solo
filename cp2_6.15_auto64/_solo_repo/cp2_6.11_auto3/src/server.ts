import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface ParticleData {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

interface FlowerData {
  id: string;
  x: number;
  y: number;
  word: string;
  baseHue: number;
  maxRadius: number;
  particles: ParticleData[];
  birthTime: number;
}

interface Work {
  id: string;
  createdAt: number;
  flowers: FlowerData[];
  settings: {
    particleDensity: number;
    fadeDuration: number;
    backgroundColor: string;
  };
}

const works: Work[] = [];

app.get('/api/works', (_req, res) => {
  res.json({ works });
});

app.post('/api/works', (req, res) => {
  try {
    const { flowers, settings } = req.body;
    if (!flowers || !settings) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }
    const work: Work = {
      id: uuidv4(),
      createdAt: Date.now(),
      flowers,
      settings,
    };
    works.push(work);
    res.json({ id: work.id, success: true });
  } catch (err) {
    console.error('保存作品失败:', err);
    res.status(500).json({ error: '保存失败', success: false });
  }
});

app.get('/api/works/:id', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  res.json({ work });
});

app.listen(PORT, () => {
  console.log(`词光速写后端服务运行在 http://localhost:${PORT}`);
  console.log(`API: GET /api/works  |  POST /api/works`);
});

export default app;
