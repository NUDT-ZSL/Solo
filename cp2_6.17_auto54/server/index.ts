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
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP4 和 MOV 格式'));
    }
  }
});

interface Video {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  createdAt: string;
}

interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  thumbnail?: string;
  order: number;
  createdAt: string;
}

interface PresetLabel {
  name: string;
  color: string;
}

interface Data {
  videos: Video[];
  markers: Marker[];
  presetLabels: PresetLabel[];
}

const readData = (): Data => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: Data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

app.get('/api/videos', (req, res) => {
  const data = readData();
  res.json(data.videos);
});

app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const video: Video = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      duration: 0,
      width: 0,
      height: 0,
      createdAt: new Date().toISOString()
    };

    const data = readData();
    data.videos.push(video);
    writeData(data);

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/videos/:id', (req, res) => {
  const data = readData();
  const videoIndex = data.videos.findIndex(v => v.id === req.params.id);
  
  if (videoIndex === -1) {
    return res.status(404).json({ error: '视频不存在' });
  }

  const video = data.videos[videoIndex];
  const filePath = path.join(UPLOAD_DIR, video.filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  data.videos.splice(videoIndex, 1);
  data.markers = data.markers.filter(m => m.videoId !== req.params.id);
  writeData(data);

  res.json({ message: '删除成功' });
});

app.get('/api/markers', (req, res) => {
  const data = readData();
  res.json(data.markers);
});

app.get('/api/markers/video/:videoId', (req, res) => {
  const data = readData();
  const markers = data.markers
    .filter(m => m.videoId === req.params.videoId)
    .sort((a, b) => a.timestamp - b.timestamp);
  res.json(markers);
});

app.post('/api/markers', (req, res) => {
  const { videoId, timestamp, label, color, thumbnail } = req.body;
  
  if (!videoId || timestamp === undefined || !label || !color) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const data = readData();
  const videoExists = data.videos.some(v => v.id === videoId);
  
  if (!videoExists) {
    return res.status(404).json({ error: '视频不存在' });
  }

  const maxOrder = Math.max(0, ...data.markers.filter(m => m.videoId === videoId).map(m => m.order));

  const marker: Marker = {
    id: uuidv4(),
    videoId,
    timestamp,
    label,
    color,
    thumbnail,
    order: maxOrder + 1,
    createdAt: new Date().toISOString()
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

  data.markers[markerIndex] = { ...data.markers[markerIndex], ...req.body };
  writeData(data);

  res.json(data.markers[markerIndex]);
});

app.put('/api/markers/:id/reorder', (req, res) => {
  const { newOrder } = req.body;
  const data = readData();
  const marker = data.markers.find(m => m.id === req.params.id);
  
  if (!marker) {
    return res.status(404).json({ error: '标记不存在' });
  }

  const oldOrder = marker.order;
  const videoMarkers = data.markers
    .filter(m => m.videoId === marker.videoId)
    .sort((a, b) => a.order - b.order);

  if (newOrder > oldOrder) {
    videoMarkers.forEach(m => {
      if (m.order > oldOrder && m.order <= newOrder) {
        m.order--;
      }
    });
  } else if (newOrder < oldOrder) {
    videoMarkers.forEach(m => {
      if (m.order >= newOrder && m.order < oldOrder) {
        m.order++;
      }
    });
  }

  marker.order = newOrder;
  writeData(data);

  res.json(data.markers.filter(m => m.videoId === marker.videoId).sort((a, b) => a.order - b.order));
});

app.delete('/api/markers/:id', (req, res) => {
  const data = readData();
  const markerIndex = data.markers.findIndex(m => m.id === req.params.id);
  
  if (markerIndex === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }

  const deleted = data.markers.splice(markerIndex, 1)[0];
  
  data.markers
    .filter(m => m.videoId === deleted.videoId && m.order > deleted.order)
    .forEach(m => m.order--);
  
  writeData(data);

  res.json({ message: '删除成功' });
});

app.get('/api/preset-labels', (req, res) => {
  const data = readData();
  res.json(data.presetLabels);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
