import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json');

interface Video {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  size: number;
  duration: number;
  uploadTime: string;
}

interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  thumbnail?: string;
  order: number;
}

interface DataStore {
  videos: Video[];
  markers: Marker[];
}

interface TimelineExport {
  version: string;
  exportedAt: string;
  clips: {
    videoPath: string;
    videoId: string;
    startTime: number;
    endTime: number;
    label: string;
    color: string;
    order: number;
    fps: number;
  }[];
}

function ensureDirAndFile() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ videos: [], markers: [] }, null, 2));
  }
}

function readData(): DataStore {
  ensureDirAndFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: DataStore) {
  ensureDirAndFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

ensureDirAndFile();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirAndFile();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.mp4', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 MP4 或 MOV 格式的视频文件'));
    }
  },
});

app.post('/api/videos', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const durationStr = req.body.duration;
    let duration = 0;
    if (durationStr !== undefined && durationStr !== null && durationStr !== '') {
      const parsed = parseFloat(durationStr);
      if (!isNaN(parsed) && parsed > 0) {
        duration = parsed;
      }
    }

    const video: Video = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      size: req.file.size,
      duration,
      uploadTime: new Date().toISOString(),
    };

    const data = readData();
    data.videos.push(video);
    writeData(data);

    res.json(video);
  } catch (err) {
    console.error('上传视频失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/videos', (_req, res) => {
  try {
    const data = readData();
    const videosWithMarkers = data.videos.map((video) => ({
      ...video,
      markers: data.markers.filter((m) => m.videoId === video.id),
    }));
    res.json(videosWithMarkers);
  } catch (err) {
    console.error('获取视频列表失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const videoIndex = data.videos.findIndex((v) => v.id === id);

    if (videoIndex === -1) {
      return res.status(404).json({ error: '视频不存在' });
    }

    const video = data.videos[videoIndex];
    const fullPath = path.join(UPLOADS_DIR, video.filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    data.videos.splice(videoIndex, 1);
    data.markers = data.markers.filter((m) => m.videoId !== id);
    writeData(data);

    res.json({ success: true });
  } catch (err) {
    console.error('删除视频失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/markers', (req, res) => {
  try {
    const { videoId, timestamp, label, color, thumbnail } = req.body;

    if (!videoId || timestamp === undefined || !label || !color) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const data = readData();
    const video = data.videos.find((v) => v.id === videoId);
    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    const existingMarkers = data.markers.filter((m) => m.videoId === videoId);
    const maxOrder = existingMarkers.length > 0
      ? Math.max(...existingMarkers.map((m) => m.order))
      : -1;

    const marker: Marker = {
      id: uuidv4(),
      videoId,
      timestamp: parseFloat(timestamp),
      label,
      color,
      thumbnail,
      order: maxOrder + 1,
    };

    data.markers.push(marker);
    writeData(data);

    res.json(marker);
  } catch (err) {
    console.error('创建标记失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/markers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, color, order } = req.body;
    const data = readData();
    const marker = data.markers.find((m) => m.id === id);

    if (!marker) {
      return res.status(404).json({ error: '标记不存在' });
    }

    if (label !== undefined) marker.label = label;
    if (color !== undefined) marker.color = color;
    if (order !== undefined) marker.order = order;

    writeData(data);
    res.json(marker);
  } catch (err) {
    console.error('更新标记失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/markers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const markerIndex = data.markers.findIndex((m) => m.id === id);

    if (markerIndex === -1) {
      return res.status(404).json({ error: '标记不存在' });
    }

    data.markers.splice(markerIndex, 1);
    writeData(data);

    res.json({ success: true });
  } catch (err) {
    console.error('删除标记失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const { markerIds } = req.query;
    if (!markerIds || typeof markerIds !== 'string') {
      return res.status(400).json({ error: '缺少 markerIds 参数' });
    }

    const ids = markerIds.split(',').map((s) => s.trim()).filter(Boolean);
    const data = readData();
    const selectedMarkers = data.markers.filter((m) => ids.includes(m.id));

    if (selectedMarkers.length === 0) {
      return res.status(404).json({ error: '未找到匹配的标记' });
    }

    const videoIds = [...new Set(selectedMarkers.map((m) => m.videoId))];
    const videosMap = new Map<string, Video>();
    for (const vid of videoIds) {
      const v = data.videos.find((x) => x.id === vid);
      if (v) videosMap.set(vid, v);
    }

    const clips: TimelineExport['clips'] = [];

    for (const videoId of videoIds) {
      const video = videosMap.get(videoId);
      if (!video) continue;

      const videoMarkers = data.markers
        .filter((m) => ids.includes(m.id) && m.videoId === videoId)
        .sort((a, b) => a.order - b.order);

      for (let i = 0; i < videoMarkers.length; i++) {
        const current = videoMarkers[i];
        const prev = i > 0 ? videoMarkers[i - 1] : null;
        const next = i < videoMarkers.length - 1 ? videoMarkers[i + 1] : null;

        const startTime = prev ? prev.timestamp : 0;
        const endTime = next ? next.timestamp : (video.duration || current.timestamp);

        clips.push({
          videoPath: video.filePath,
          videoId: video.id,
          startTime,
          endTime,
          label: current.label,
          color: current.color,
          order: current.order,
          fps: 30,
        });
      }
    }

    const exportData: TimelineExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clips,
    };

    res.json(exportData);
  } catch (err) {
    console.error('导出时间线失败:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件大小超过限制 (最大 200MB)' });
  }
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
