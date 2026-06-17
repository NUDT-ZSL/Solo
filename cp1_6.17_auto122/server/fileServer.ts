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
const PORT = Number(process.env.PORT) || 3011;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

interface UploadedFile extends Express.Multer.File {
  id?: string;
}

app.post('/api/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No audio file provided' });
      return;
    }
    const file = req.file as UploadedFile;
    const filename = file.filename;
    const id = path.parse(filename).name;
    file.id = id;

    res.json({
      success: true,
      id,
      filename,
      size: file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

app.get('/api/audio/:id', (req, res) => {
  try {
    const { id } = req.params;
    const files = fs.readdirSync(UPLOAD_DIR);
    const matchedFile = files.find((f) => path.parse(f).name === id);

    if (!matchedFile) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, matchedFile);
    const ext = path.extname(matchedFile).toLowerCase();

    const contentTypeMap: Record<string, string> = {
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
    };

    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(filePath).size);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'File read failed' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.delete('/api/audio/:id', (req, res) => {
  try {
    const { id } = req.params;
    const files = fs.readdirSync(UPLOAD_DIR);
    const matchedFile = files.find((f) => path.parse(f).name === id);

    if (!matchedFile) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, matchedFile);
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[File Server] Audio storage server running on http://localhost:${PORT}`);
  console.log(`[File Server] Upload directory: ${UPLOAD_DIR}`);
});
