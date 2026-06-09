import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG 和 PNG 格式的图片'));
    }
  },
});

type Emotion = 'joy' | 'sorrow' | 'calm' | 'surprise';

interface Memory {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  emotion: Emotion;
  imageUrl?: string;
  createdAt: number;
}

let memories: Memory[] = [
  {
    id: uuidv4(),
    title: '清晨的第一缕阳光',
    date: '2026-06-01',
    location: '北京·景山公园',
    description: '清晨登上景山，看到第一缕阳光洒在故宫的金色屋顶上，那一刻的宁静与美好让人永生难忘。',
    emotion: 'calm',
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  },
  {
    id: uuidv4(),
    title: '与老友重逢',
    date: '2026-06-03',
    location: '上海·外滩咖啡馆',
    description: '十年未见的老朋友突然出现在眼前，我们聊了整整一个下午，笑声不断，仿佛回到了青春岁月。',
    emotion: 'joy',
    createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
  },
  {
    id: uuidv4(),
    title: '雨中漫步',
    date: '2026-06-05',
    location: '杭州·西湖',
    description: '一个人撑着伞在西湖边漫步，雨水滴落在湖面上泛起圈圈涟漪，心中涌起淡淡的忧伤。',
    emotion: 'sorrow',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: uuidv4(),
    title: '意外的生日礼物',
    date: '2026-06-07',
    location: '家中',
    description: '本以为生日会独自一人度过，却收到了远方朋友寄来的惊喜包裹，里面是我最想要的那本书。',
    emotion: 'surprise',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
];

app.get('/api/memories', (req, res) => {
  const sorted = [...memories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(sorted);
});

app.post('/api/memories', upload.single('image'), (req, res) => {
  const { title, date, location, description, emotion } = req.body;

  if (!title || !date || !emotion) {
    return res.status(400).json({ error: '标题、日期和情绪标签为必填项' });
  }

  const newMemory: Memory = {
    id: uuidv4(),
    title,
    date,
    location: location || '',
    description: description || '',
    emotion: emotion as Emotion,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    createdAt: Date.now(),
  };

  memories.unshift(newMemory);
  res.status(201).json(newMemory);
});

app.put('/api/memories/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, date, location, description, emotion } = req.body;
  const index = memories.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '记忆不存在' });
  }

  memories[index] = {
    ...memories[index],
    title: title || memories[index].title,
    date: date || memories[index].date,
    location: location !== undefined ? location : memories[index].location,
    description: description !== undefined ? description : memories[index].description,
    emotion: (emotion as Emotion) || memories[index].emotion,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : memories[index].imageUrl,
  };

  res.json(memories[index]);
});

app.delete('/api/memories/:id', (req, res) => {
  const { id } = req.params;
  const index = memories.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '记忆不存在' });
  }

  const deleted = memories.splice(index, 1)[0];
  if (deleted.imageUrl) {
    const filePath = path.join(__dirname, '..', deleted.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  res.json({ message: '删除成功' });
});

app.listen(PORT, () => {
  console.log(`织忆线轴后端服务运行在 http://localhost:${PORT}`);
});
