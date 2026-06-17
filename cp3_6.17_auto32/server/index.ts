import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dataFilePath = path.join(__dirname, 'data.json');

interface VideoData {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  duration: number;
  durationFormatted: string;
  path: string;
  uploadTime: string;
}

interface MarkerData {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  createdAt: string;
  order: number;
  thumbnail: string;
}

interface AppData {
  videos: VideoData[];
  markers: MarkerData[];
}

function readData(): AppData {
  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(rawData);
  } catch {
    return { videos: [], markers: [] };
  }
}

function writeData(data: AppData): void {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持 MP4 和 MOV 格式'));
    }
  },
});

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

app.post('/api/videos', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '没有上传文件' });
      return;
    }
    const videoId = uuidv4();
    const newVideo: VideoData = {
      id: videoId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      duration: 0,
      durationFormatted: '00:00',
      path: `/uploads/${req.file.filename}`,
      uploadTime: new Date().toISOString(),
    };
    const data = readData();
    data.videos.push(newVideo);
    writeData(data);
    res.json(newVideo);
  } catch (error) {
    res.status(500).json({ error: '上传失败' });
  }
});

app.post('/api/videos/:id/duration', (req: Request, res: Response) => {
  const { id } = req.params;
  const { duration } = req.body;
  const data = readData();
  const videoIndex = data.videos.findIndex((v) => v.id === id);
  if (videoIndex === -1) {
    res.status(404).json({ error: '视频不存在' });
    return;
  }
  data.videos[videoIndex].duration = duration;
  data.videos[videoIndex].durationFormatted = formatDuration(duration);
  writeData(data);
  res.json(data.videos[videoIndex]);
});

app.get('/api/videos', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.videos);
});

app.delete('/api/videos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const videoIndex = data.videos.findIndex((v) => v.id === id);
  if (videoIndex === -1) {
    res.status(404).json({ error: '视频不存在' });
    return;
  }
  const video = data.videos[videoIndex];
  const filePath = path.join(__dirname, video.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  data.videos.splice(videoIndex, 1);
  data.markers = data.markers.filter((m) => m.videoId !== id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/markers', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.markers);
});

app.post('/api/markers', (req: Request, res: Response) => {
  const { videoId, timestamp, label, color, thumbnail } = req.body;
  if (!videoId || timestamp === undefined || !label || !color) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }
  const data = readData();
  const videoExists = data.videos.some((v) => v.id === videoId);
  if (!videoExists) {
    res.status(404).json({ error: '视频不存在' });
    return;
  }
  const markersForVideo = data.markers.filter((m) => m.videoId === videoId);
  const newMarker: MarkerData = {
    id: uuidv4(),
    videoId,
    timestamp,
    label,
    color,
    createdAt: new Date().toISOString(),
    order: markersForVideo.length,
    thumbnail: thumbnail || '',
  };
  data.markers.push(newMarker);
  writeData(data);
  res.json(newMarker);
});

app.delete('/api/markers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const markerIndex = data.markers.findIndex((m) => m.id === id);
  if (markerIndex === -1) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }
  const deletedMarker = data.markers[markerIndex];
  data.markers.splice(markerIndex, 1);
  const remainingForVideo = data.markers.filter((m) => m.videoId === deletedMarker.videoId);
  remainingForVideo.forEach((m, idx) => {
    m.order = idx;
  });
  writeData(data);
  res.json({ success: true });
});

app.put('/api/markers/reorder', (req: Request, res: Response) => {
  const { markers } = req.body;
  if (!Array.isArray(markers)) {
    res.status(400).json({ error: '参数格式错误' });
    return;
  }
  const data = readData();
  markers.forEach((item: { id: string; order: number }) => {
    const marker = data.markers.find((m) => m.id === item.id);
    if (marker) {
      marker.order = item.order;
    }
  });
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
