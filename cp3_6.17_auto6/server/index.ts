import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4001;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

interface VideoData {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  createdAt: string;
}

interface MarkerData {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  createdAt: string;
}

interface DataStore {
  videos: VideoData[];
  markers: MarkerData[];
}

function readData(): DataStore {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { videos: [], markers: [] };
  }
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.mp4', '.mov', '.MP4', '.MOV'];
    const ext = path.extname(file.originalname);
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP4/MOV 格式'));
    }
  }
});

app.get('/api/videos', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.videos);
});

app.post('/api/videos', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  const data = readData();
  const video: VideoData = {
    id: uuidv4(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size,
    duration: 0,
    width: 0,
    height: 0,
    createdAt: new Date().toISOString()
  };
  data.videos.push(video);
  writeData(data);
  res.json(video);
});

app.delete('/api/videos/:id', (req: Request, res: Response) => {
  const data = readData();
  const video = data.videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: '视频不存在' });
  }
  const filePath = path.join(UPLOAD_DIR, video.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  data.videos = data.videos.filter(v => v.id !== req.params.id);
  data.markers = data.markers.filter(m => m.videoId !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/videos/:id/markers', (req: Request, res: Response) => {
  const data = readData();
  const markers = data.markers
    .filter(m => m.videoId === req.params.id)
    .sort((a, b) => a.timestamp - b.timestamp);
  res.json(markers);
});

app.post('/api/markers', (req: Request, res: Response) => {
  const { videoId, timestamp, label, color } = req.body;
  if (!videoId || timestamp === undefined || !label) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const data = readData();
  const marker: MarkerData = {
    id: uuidv4(),
    videoId,
    timestamp,
    label,
    color: color || '#ff5722',
    createdAt: new Date().toISOString()
  };
  data.markers.push(marker);
  writeData(data);
  res.json(marker);
});

app.put('/api/markers/:id', (req: Request, res: Response) => {
  const data = readData();
  const index = data.markers.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }
  data.markers[index] = { ...data.markers[index], ...req.body };
  writeData(data);
  res.json(data.markers[index]);
});

app.delete('/api/markers/:id', (req: Request, res: Response) => {
  const data = readData();
  data.markers = data.markers.filter(m => m.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/markers/reorder', (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };
  if (!ids) {
    return res.status(400).json({ error: '缺少 ids 参数' });
  }
  const data = readData();
  const idSet = new Set(ids);
  const reordered = ids.map(id => data.markers.find(m => m.id === id)).filter(Boolean) as MarkerData[];
  const remaining = data.markers.filter(m => !idSet.has(m.id));
  data.markers = [...reordered, ...remaining];
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`ClipMarker 后端服务运行在 http://localhost:${PORT}`);
});
