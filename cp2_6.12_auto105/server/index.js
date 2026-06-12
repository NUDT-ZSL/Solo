import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only mp3 and wav files are allowed'));
    }
  },
});

interface AudioMeta {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

const metaStore: AudioMeta[] = [];

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const meta: AudioMeta = {
    id: uuidv4(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedAt: new Date().toISOString(),
  };
  metaStore.push(meta);
  res.json({ success: true, data: meta });
});

app.get('/api/audio', (_req, res) => {
  res.json({ data: metaStore });
});

app.get('/api/audio/:id', (req, res) => {
  const meta = metaStore.find((m) => m.id === req.params.id);
  if (!meta) {
    return res.status(404).json({ error: 'Not found' });
  }
  const filePath = path.join(uploadsDir, meta.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.setHeader('Content-Type', meta.mimetype);
  res.sendFile(filePath);
});

app.delete('/api/audio/:id', (req, res) => {
  const idx = metaStore.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not found' });
  }
  const meta = metaStore[idx];
  const filePath = path.join(uploadsDir, meta.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  metaStore.splice(idx, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
