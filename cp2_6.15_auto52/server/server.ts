import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getLayout, updateLayout, getArtworks, addArtwork, addInvitation } from './database';
import type { LayoutElement, Artwork, Invitation } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const thumbnailDir = path.join(__dirname, '..', 'public', 'thumbnails');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });

app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
app.use('/thumbnails', express.static(path.join(__dirname, '..', 'public', 'thumbnails')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(jpe?g|png|gif|webp|glb|gltf|obj|fbx|usdz|stl|dae|3ds|max|ma|mb|blend)$/i;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());

    const imageMimeTypes = /^image\//;
    const modelMimeTypes = /^model\//;
    const applicationMimeTypes = /^application\/(octet-stream|x-(glb|gltf|x-model|x-3d|octet|zip|json)$)/;

    const mimetype = imageMimeTypes.test(file.mimetype) || 
      modelMimeTypes.test(file.mimetype) ||
      applicationMimeTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    if (extname && file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }

    cb(new Error('Only image files (.jpg, .png, .gif, .webp) and 3D model files (.glb, .gltf, .obj, .fbx) are allowed'));
  },
});

const getAverageColorFromBuffer = async (buffer: Buffer): Promise<string> => {
  try {
    const { data } = await sharp(buffer)
      .resize(50, 50)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 128) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }

    if (count === 0) return '#6c63ff';

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#6c63ff';
  }
};

app.get('/api/layout', (req, res) => {
  try {
    const layout = getLayout();
    res.json(layout);
  } catch (error) {
    console.error('Get layout error:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

app.put('/api/layout/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { elements } = req.body as { elements: LayoutElement[] };
    
    if (!Array.isArray(elements)) {
      return res.status(400).json({ error: 'Invalid elements data' });
    }

    const layout = updateLayout(id, elements);
    res.json(layout);
  } catch (error) {
    console.error('Update layout error:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  }
});

app.get('/api/artwork', (req, res) => {
  try {
    const artworks = getArtworks();
    res.json(artworks);
  } catch (error) {
    console.error('Get artworks error:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

app.post('/api/artwork/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description, tags } = req.body;
    const parsedTags = tags ? JSON.parse(tags) : [];

    const filename = path.basename(req.file.filename, path.extname(req.file.filename));
    const ext = path.extname(req.file.filename);
    const thumbnailFilename = `${filename}_thumb.jpg`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    let averageColor = '#6c63ff';

    if (/\.(jpe?g|png|gif|webp)$/i.test(req.file.originalname)) {
      await sharp(req.file.path)
        .resize(120, 120, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      const imageBuffer = await sharp(req.file.path).toBuffer();
      averageColor = await getAverageColorFromBuffer(imageBuffer);
    } else {
      const placeholderPath = path.join(thumbnailDir, thumbnailFilename);
      await sharp({
        create: {
          width: 120,
          height: 120,
          channels: 4,
          background: { r: 108, g: 99, b: 255, alpha: 1 },
        },
      })
        .jpeg({ quality: 80 })
        .toFile(placeholderPath);
    }

    const artwork: Omit<Artwork, 'uploadedAt'> = {
      id: uuidv4(),
      name: name || req.file.originalname,
      description: description || '',
      tags: parsedTags,
      originalUrl: `/uploads/${req.file.filename}`,
      thumbnailUrl: `/thumbnails/${thumbnailFilename}`,
      averageColor,
    };

    const savedArtwork = addArtwork(artwork);
    res.json(savedArtwork);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload artwork' });
  }
});

app.post('/api/invite', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const invitation: Omit<Invitation, 'createdAt'> & { layoutId?: string } = {
      id: uuidv4(),
      layoutId: 'default',
      email,
      status: 'pending',
    };

    const savedInvitation = addInvitation(invitation);
    res.json({ success: true, invitation: savedInvitation });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
