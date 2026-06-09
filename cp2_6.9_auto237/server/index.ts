import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Point, Comment } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'server', 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));

const POINTS_FILE = path.join(DATA_DIR, 'points.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

const readPoints = (): Point[] => {
  if (!fs.existsSync(POINTS_FILE)) return [];
  try {
    const data = fs.readFileSync(POINTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writePoints = (points: Point[]) => {
  fs.writeFileSync(POINTS_FILE, JSON.stringify(points, null, 2));
};

const readComments = (): Comment[] => {
  if (!fs.existsSync(COMMENTS_FILE)) return [];
  try {
    const data = fs.readFileSync(COMMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeComments = (comments: Comment[]) => {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.webm', '.mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ['audio/webm', 'audio/mpeg', 'audio/mp3'];
    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 webm 或 mp3 格式'));
    }
  }
});

app.get('/api/points', (_req, res) => {
  const points = readPoints();
  res.json(points);
});

app.post('/api/points', (req, res) => {
  const { name, type, color, x, y, uploader, audioUrl, duration, waveform } = req.body as Omit<Point, 'id' | 'createdAt' | 'likes' | 'plays'>;

  if (!name || !type || typeof x !== 'number' || typeof y !== 'number') {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }

  const points = readPoints();
  const newPoint: Point = {
    id: uuidv4(),
    name,
    type,
    color,
    x,
    y,
    uploader: uploader || '匿名用户',
    audioUrl: audioUrl || '',
    duration: duration || 0,
    likes: 0,
    plays: 0,
    createdAt: Date.now(),
    waveform
  };

  points.push(newPoint);
  writePoints(points);
  res.json(newPoint);
});

app.post('/api/points/:id/like', (req, res) => {
  const { id } = req.params;
  const points = readPoints();
  const idx = points.findIndex(p => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: '点位不存在' });
    return;
  }

  points[idx].likes += 1;
  writePoints(points);
  res.json({ likes: points[idx].likes });
});

app.post('/api/points/:id/play', (req, res) => {
  const { id } = req.params;
  const points = readPoints();
  const idx = points.findIndex(p => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: '点位不存在' });
    return;
  }

  points[idx].plays += 1;
  writePoints(points);
  res.json({ plays: points[idx].plays });
});

app.get('/api/points/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = readComments().filter(c => c.pointId === id);
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const { pointId, username, content } = req.body as Omit<Comment, 'id' | 'createdAt' | 'likes' | 'likedBy'>;

  if (!pointId || !content) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }

  const comments = readComments();
  const newComment: Comment = {
    id: uuidv4(),
    pointId,
    username: username || '匿名用户',
    content: content.slice(0, 200),
    createdAt: Date.now(),
    likes: 0,
    likedBy: []
  };

  comments.push(newComment);
  writeComments(comments);
  res.json(newComment);
});

app.post('/api/comments/:id/like', (req, res) => {
  const { id } = req.params;
  const { username } = req.body as { username: string };
  const comments = readComments();
  const idx = comments.findIndex(c => c.id === id);

  if (idx === -1) {
    res.status(404).json({ error: '评论不存在' });
    return;
  }

  const likedBy = comments[idx].likedBy || [];
  const alreadyLiked = likedBy.includes(username || 'anonymous');

  if (alreadyLiked) {
    comments[idx].likedBy = likedBy.filter(u => u !== (username || 'anonymous'));
    comments[idx].likes = Math.max(0, comments[idx].likes - 1);
  } else {
    comments[idx].likedBy = [...likedBy, username || 'anonymous'];
    comments[idx].likes += 1;
  }

  writeComments(comments);
  res.json({ likes: comments[idx].likes, liked: !alreadyLiked });
});

app.post('/api/upload', (req, res) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE' ? '文件大小超过2MB限制' : err.message
        : err?.message || '上传失败';
      res.status(400).json({ error: msg });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: '未找到文件' });
      return;
    }

    res.json({
      url: `/uploads/${file.filename}`,
      duration: 0
    });
  });
});

app.listen(PORT, () => {
  console.log(`回声地图服务器运行在 http://localhost:${PORT}`);
});
