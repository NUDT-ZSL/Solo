import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

type StyleType = 'sketch' | 'watercolor' | 'pixel' | 'collage' | 'oil';

interface GalleryItem {
  id: string;
  title: string;
  style: StyleType;
  thumbnail: string;
  dataUrl: string;
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(GALLERY_FILE)) {
  fs.writeFileSync(GALLERY_FILE, JSON.stringify([]));
}

const readGallery = (): GalleryItem[] => {
  try {
    const data = fs.readFileSync(GALLERY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeGallery = (items: GalleryItem[]) => {
  fs.writeFileSync(GALLERY_FILE, JSON.stringify(items, null, 2));
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/gallery', (_req, res) => {
  const gallery = readGallery();
  res.json(gallery.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/gallery', (req, res) => {
  const item = req.body as GalleryItem;
  if (!item || !item.id || !item.dataUrl) {
    return res.status(400).json({ success: false, error: 'Invalid data' });
  }
  const gallery = readGallery();
  gallery.unshift(item);
  if (gallery.length > 100) {
    gallery.length = 100;
  }
  writeGallery(gallery);
  res.json({ success: true, id: item.id });
});

app.delete('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const gallery = readGallery();
  const filtered = gallery.filter((item) => item.id !== id);
  if (filtered.length === gallery.length) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  writeGallery(filtered);
  res.json({ success: true });
});

app.get('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const gallery = readGallery();
  const item = gallery.find((g) => g.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  res.json(item);
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  印记工坊 后端服务已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`========================================\n`);
});

export default app;
