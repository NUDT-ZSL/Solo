import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

interface Video {
  id: string;
  name: string;
  path: string;
  size: number;
  duration: number;
  createdAt: string;
}

interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  order: number;
}

interface DataStore {
  videos: Video[];
  markers: Marker[];
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
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.mp4' || ext === '.mov') {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP4 和 MOV 格式'));
    }
  }
});

app.get('/api/videos', (_req, res) => {
  const data = readData();
  res.json(data.videos);
});

app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未找到文件' });
  }

  const data = readData();
  const video: Video = {
    id: uuidv4(),
    name: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size,
    duration: 0,
    createdAt: new Date().toISOString()
  };

  data.videos.push(video);
  writeData(data);
  res.status(201).json(video);
});

app.put('/api/videos/:id', (req, res) => {
  const data = readData();
  const videoIndex = data.videos.findIndex(v => v.id === req.params.id);

  if (videoIndex === -1) {
    return res.status(404).json({ error: '视频不存在' });
  }

  const { duration, name } = req.body;

  if (typeof duration === 'number') {
    data.videos[videoIndex].duration = duration;
  }
  if (typeof name === 'string') {
    data.videos[videoIndex].name = name;
  }

  writeData(data);
  res.json(data.videos[videoIndex]);
});

app.delete('/api/videos/:id', (req, res) => {
  const data = readData();
  const videoIndex = data.videos.findIndex(v => v.id === req.params.id);

  if (videoIndex === -1) {
    return res.status(404).json({ error: '视频不存在' });
  }

  const video = data.videos[videoIndex];
  const filePath = path.join(__dirname, video.path);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  data.videos.splice(videoIndex, 1);
  data.markers = data.markers.filter(m => m.videoId !== req.params.id);
  writeData(data);

  res.json({ message: '删除成功' });
});

app.get('/api/videos/:videoId/markers', (req, res) => {
  const data = readData();
  const markers = data.markers
    .filter(m => m.videoId === req.params.videoId)
    .sort((a, b) => a.timestamp - b.timestamp);
  res.json(markers);
});

app.post('/api/videos/:videoId/markers', (req, res) => {
  const data = readData();
  const timestamp = req.body.timestamp;
  const label = req.body.label;
  const color = req.body.color;

  if (typeof timestamp !== 'number' || !label || !color) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const marker: Marker = {
    id: uuidv4(),
    videoId: req.params.videoId,
    timestamp,
    label,
    color,
    order: data.markers.filter(m => m.videoId === req.params.videoId).length
  };

  data.markers.push(marker);
  writeData(data);
  res.status(201).json(marker);
});

app.put('/api/markers/:id', (req, res) => {
  const data = readData();
  const markerIndex = data.markers.findIndex(m => m.id === req.params.id);

  if (markerIndex === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }

  data.markers[markerIndex] = {
    ...data.markers[markerIndex],
    ...req.body,
    id: data.markers[markerIndex].id
  };

  writeData(data);
  res.json(data.markers[markerIndex]);
});

app.delete('/api/markers/:id', (req, res) => {
  const data = readData();
  const markerIndex = data.markers.findIndex(m => m.id === req.params.id);

  if (markerIndex === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }

  const deleted = data.markers.splice(markerIndex, 1)[0];
  writeData(data);
  res.json(deleted);
});

app.put('/api/markers/reorder', (req, res) => {
  const data = readData();
  const { markerIds }: { markerIds: string[] } = req.body;

  if (!Array.isArray(markerIds)) {
    return res.status(400).json({ error: '参数错误' });
  }

  markerIds.forEach((id, index) => {
    const marker = data.markers.find(m => m.id === id);
    if (marker) {
      marker.order = index;
    }
  });

  writeData(data);
  res.json({ message: '排序已更新' });
});

app.get('/api/markers', (_req, res) => {
  const data = readData();
  res.json(data.markers);
});

app.listen(PORT, () => {
  console.log(`ClipMarker server running on port ${PORT}`);
});
