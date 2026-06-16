import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Score, Favorite } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

const readJSON = <T>(filePath: string): T => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
};

const writeJSON = <T>(filePath: string, data: T) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG 和 PNG 格式'));
    }
  },
});

const mockTitles = [
  { title: '小步舞曲', composer: '克里斯蒂安·佩措尔德', year: 1725, pages: 3 },
  { title: '幻想即兴曲', composer: '弗雷德里克·肖邦', year: 1834, pages: 8 },
  { title: '匈牙利舞曲第五号', composer: '约翰内斯·勃拉姆斯', year: 1869, pages: 6 },
  { title: '动物狂欢节-天鹅', composer: '卡米尔·圣-桑', year: 1886, pages: 4 },
  { title: '爱之梦', composer: '弗朗茨·李斯特', year: 1850, pages: 7 },
  { title: '亚麻色头发的少女', composer: '克洛德·德彪西', year: 1910, pages: 5 },
  { title: 'G弦上的咏叹调', composer: '约翰·塞巴斯蒂安·巴赫', year: 1727, pages: 3 },
  { title: '罗密欧与朱丽叶', composer: '谢尔盖·普罗科菲耶夫', year: 1935, pages: 9 },
];

app.get('/api/scores', (req, res) => {
  try {
    const scores = readJSON<Score[]>(SCORES_FILE);
    const sorted = [...scores].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: '读取乐谱数据失败' });
  }
});

app.get('/api/scores/:id', (req, res) => {
  try {
    const scores = readJSON<Score[]>(SCORES_FILE);
    const score = scores.find((s) => s.id === req.params.id);
    if (!score) {
      res.status(404).json({ error: '乐谱不存在' });
    } else {
      res.json(score);
    }
  } catch (err) {
    res.status(500).json({ error: '读取乐谱数据失败' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未上传文件' });
      return;
    }

    const mockMeta = mockTitles[Math.floor(Math.random() * mockTitles.length)];
    const price = Math.floor(Math.random() * 40) + 20;

    const filename = req.file.filename;
    const imageUrl = `/uploads/${filename}`;
    const thumbnailUrl = `/uploads/${filename}`;

    const newScore: Score = {
      id: uuidv4(),
      title: mockMeta.title,
      composer: mockMeta.composer,
      year: mockMeta.year,
      pages: mockMeta.pages,
      price,
      imageUrl,
      thumbnailUrl,
      createdAt: new Date().toISOString(),
    };

    const scores = readJSON<Score[]>(SCORES_FILE);
    scores.unshift(newScore);
    writeJSON(SCORES_FILE, scores);

    res.json(newScore);
  } catch (err) {
    res.status(500).json({ error: '上传失败' });
  }
});

app.get('/api/favorites', (req, res) => {
  try {
    const favorites = readJSON<Favorite[]>(FAVORITES_FILE);
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: '读取收藏数据失败' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { scoreId } = req.body;
    if (!scoreId) {
      res.status(400).json({ error: '缺少 scoreId' });
      return;
    }

    const favorites = readJSON<Favorite[]>(FAVORITES_FILE);

    const existing = favorites.find((f) => f.scoreId === scoreId);
    if (existing) {
      res.json(existing);
      return;
    }

    const newFav: Favorite = {
      id: uuidv4(),
      scoreId,
      createdAt: new Date().toISOString(),
    };

    favorites.push(newFav);
    writeJSON(FAVORITES_FILE, favorites);
    res.json(newFav);
  } catch (err) {
    res.status(500).json({ error: '添加收藏失败' });
  }
});

app.delete('/api/favorites/:id', (req, res) => {
  try {
    const favorites = readJSON<Favorite[]>(FAVORITES_FILE);
    const filtered = favorites.filter((f) => f.id !== req.params.id);

    if (filtered.length === favorites.length) {
      res.status(404).json({ error: '收藏不存在' });
      return;
    }

    writeJSON(FAVORITES_FILE, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除收藏失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
