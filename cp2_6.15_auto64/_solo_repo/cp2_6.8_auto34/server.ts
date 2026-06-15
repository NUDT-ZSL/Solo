import express from 'express';
import multiparty from 'multiparty';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { cannyEdgeDetect, findRectangularRegions } from './src/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.post('/api/upload', (req, res) => {
  const form = new multiparty.Form({
    maxFilesSize: 10 * 1024 * 1024,
    uploadDir: UPLOAD_DIR,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const file = files.image?.[0];
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const ext = path.extname(file.originalFilename || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: 'Only JPG/PNG files are supported' });
    }

    const filename = path.basename(file.path) + ext;
    const newPath = path.join(UPLOAD_DIR, filename);
    fs.renameSync(file.path, newPath);

    try {
      const img = await loadImage(newPath);
      res.json({
        success: true,
        filename,
        url: `/uploads/${filename}`,
        width: img.width,
        height: img.height,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to process image' });
    }
  });
});

app.post('/api/detect-edges', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }

    const imagePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const img = await loadImage(imagePath);
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const edges = cannyEdgeDetect(imageData, 25, 70);
    const detected = findRectangularRegions(edges, w, h);

    const regions = detected.map(r => ({
      points: r.points.map(p => ({
        x: p.x / scale,
        y: p.y / scale,
      })),
      confidence: r.confidence,
    }));

    res.json({ success: true, regions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Edge detection failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
