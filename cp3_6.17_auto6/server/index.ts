import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

const SERVER_DIR = __dirname;
const PROJECT_ROOT = path.join(SERVER_DIR, '..');
const DATA_FILE = path.join(SERVER_DIR, 'data.json');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const MAX_FILE_SIZE = 200 * 1024 * 1024;

interface VideoMeta {
  id: string;
  fileName: string;
  filePath: string;
  duration: number;
  size: number;
  format: string;
  thumbnail?: string;
  createdAt: string;
}

interface Marker {
  id: string;
  videoId: string;
  time: number;
  timeFrame: number;
  label: string;
  color: string;
  order: number;
  thumbnail?: string;
}

interface DataStore {
  videos: VideoMeta[];
  markers: Marker[];
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function loadData(): DataStore {
  ensureUploadsDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: DataStore = { videos: [], markers: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return {
      videos: parsed.videos || [],
      markers: parsed.markers || [],
    };
  } catch {
    return { videos: [], markers: [] };
  }
}

function saveData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json({ limit: '256mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ext === 'mp4' || ext === 'mov') {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP4/MOV 格式'));
    }
  },
});

app.post('/api/videos/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? '文件大小超过 200MB 限制'
          : err.message;
      return res.status(400).json({ error: msg });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '未提供文件' });
    }
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const duration = parseFloat(req.body?.duration) || 0;
    const data = loadData();
    const video: VideoMeta = {
      id: uuidv4(),
      fileName: file.originalname,
      filePath: `/uploads/${file.filename}`,
      duration,
      size: file.size,
      format: ext,
      createdAt: new Date().toISOString(),
    };
    data.videos.push(video);
    saveData(data);
    res.json({ video });
  });
});

app.get('/api/videos', (_req, res) => {
  const data = loadData();
  res.json({ videos: data.videos });
});

app.get('/api/videos/:id', (req, res) => {
  const data = loadData();
  const video = data.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  res.json({ video });
});

app.delete('/api/videos/:id', (req, res) => {
  const data = loadData();
  const video = data.videos.find((v) => v.id === req.params.id);
  if (video) {
    const absPath = path.join(PROJECT_ROOT, video.filePath);
    if (fs.existsSync(absPath)) {
      try {
        fs.unlinkSync(absPath);
      } catch {
        /* ignore */
      }
    }
  }
  data.videos = data.videos.filter((v) => v.id !== req.params.id);
  data.markers = data.markers.filter((m) => m.videoId !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.get('/api/markers', (req, res) => {
  const data = loadData();
  let markers = data.markers;
  if (req.query.videoId) {
    markers = markers.filter((m) => m.videoId === req.query.videoId);
  }
  markers = [...markers].sort((a, b) => a.order - b.order || a.time - b.time);
  res.json({ markers });
});

app.post('/api/markers', (req, res) => {
  const data = loadData();
  const { videoId, time, timeFrame, label, color, thumbnail } = req.body || {};
  if (!videoId || label === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const maxOrder = data.markers
    .filter((m) => m.videoId === videoId)
    .reduce((max, m) => Math.max(max, m.order), 0);
  const marker: Marker = {
    id: uuidv4(),
    videoId,
    time: Number(time) || 0,
    timeFrame: Number(timeFrame) || 0,
    label,
    color: color || '#e53935',
    order: maxOrder + 1,
    thumbnail,
  };
  data.markers.push(marker);
  saveData(data);
  res.json({ marker });
});

app.patch('/api/markers/:id', (req, res) => {
  const data = loadData();
  const marker = data.markers.find((m) => m.id === req.params.id);
  if (!marker) return res.status(404).json({ error: '标记不存在' });
  const { order, time, timeFrame, label, color } = req.body || {};
  if (order !== undefined) marker.order = Number(order);
  if (time !== undefined) marker.time = Number(time);
  if (timeFrame !== undefined) marker.timeFrame = Number(timeFrame);
  if (label !== undefined) marker.label = label;
  if (color !== undefined) marker.color = color;
  saveData(data);
  res.json({ marker });
});

app.patch('/api/markers/reorder', (req, res) => {
  const data = loadData();
  const { orderedIds } = req.body || {};
  if (Array.isArray(orderedIds)) {
    orderedIds.forEach((id: string, index: number) => {
      const m = data.markers.find((mm) => mm.id === id);
      if (m) m.order = index + 1;
    });
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/markers/:id', (req, res) => {
  const data = loadData();
  data.markers = data.markers.filter((m) => m.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`ClipMarker server running at http://localhost:${PORT}`);
});
