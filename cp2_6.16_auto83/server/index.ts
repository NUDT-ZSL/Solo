import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '../data/paintings.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface Painting {
  id: string;
  title: string;
  series: string;
  description: string;
  imageData: string;
  createdAt: string;
}

interface PaintingsData {
  paintings: Painting[];
}

const readData = (): PaintingsData => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: PaintingsData): void => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/paintings', (_req: Request, res: Response<Painting[]>) => {
  try {
    const data = readData();
    res.json(data.paintings);
  } catch (error) {
    res.status(500).json([] as unknown as Painting[]);
  }
});

app.get('/api/paintings/:id', (req: Request<{ id: string }>, res: Response<Painting | { error: string }>) => {
  try {
    const data = readData();
    const painting = data.paintings.find(p => p.id === req.params.id);
    if (!painting) {
      res.status(404).json({ error: '作品不存在' });
      return;
    }
    res.json(painting);
  } catch (error) {
    res.status(500).json({ error: '读取失败' });
  }
});

app.post('/api/paintings', (req: Request<{}, {}, Omit<Painting, 'id' | 'createdAt'>>, res: Response<Painting | { error: string }>) => {
  try {
    const { title, series, description, imageData } = req.body;

    if (!title || !series || !description || !imageData) {
      res.status(400).json({ error: '请填写完整信息' });
      return;
    }

    const newPainting: Painting = {
      id: uuidv4(),
      title,
      series,
      description,
      imageData,
      createdAt: new Date().toISOString()
    };

    const data = readData();
    data.paintings.unshift(newPainting);
    writeData(data);

    res.status(201).json(newPainting);
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.delete('/api/paintings/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean; error?: string }>) => {
  try {
    const data = readData();
    const index = data.paintings.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }

    data.paintings.splice(index, 1);
    writeData(data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
