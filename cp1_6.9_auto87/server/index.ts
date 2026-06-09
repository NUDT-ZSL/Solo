import express = require('express');
import type { Request, Response } from 'express';
import cors = require('cors');
import multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

interface Artwork {
  id: string;
  title: string;
  imageData: string;
  mimeType: string;
  voteCount: number;
  createdAt: number;
}

const artworksMap = new Map<string, Artwork>();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 JPG/PNG 格式的图片'));
    }
  }
});

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

app.get('/api/artworks', (_req: Request, res: Response): void => {
  const artworks = Array.from(artworksMap.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json({
    success: true,
    data: artworks.map(({ imageData, ...rest }) => ({
      ...rest,
      imageUrl: `data:${rest.mimeType};base64,${imageData}`
    }))
  });
});

app.post('/api/upload', upload.single('image'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '未找到上传的图片' });
      return;
    }

    const id = generateId();
    const artwork: Artwork = {
      id,
      title: req.body.title || req.file.originalname || '未命名作品',
      imageData: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype,
      voteCount: 0,
      createdAt: Date.now()
    };

    artworksMap.set(id, artwork);

    res.status(201).json({
      success: true,
      data: {
        id: artwork.id,
        title: artwork.title,
        imageUrl: `data:${artwork.mimeType};base64,${artwork.imageData}`,
        voteCount: artwork.voteCount,
        createdAt: artwork.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    });
  }
});

app.post('/api/artworks/:id/vote', (req: Request, res: Response): void => {
  const { id } = req.params;
  const artwork = artworksMap.get(id);

  if (!artwork) {
    res.status(404).json({ success: false, error: '作品不存在' });
    return;
  }

  artwork.voteCount += 1;

  res.json({
    success: true,
    data: {
      id: artwork.id,
      voteCount: artwork.voteCount
    }
  });
});

app.use((err: Error, _req: Request, res: Response): void => {
  if (err.message === 'File too large') {
    res.status(413).json({ success: false, error: '图片大小不能超过 5MB' });
    return;
  }
  res.status(400).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`后端服务器已启动: http://localhost:${PORT}`);
});
