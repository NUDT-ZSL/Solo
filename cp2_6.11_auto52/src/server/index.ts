import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Photo {
  id: string;
  url: string;
  note: string;
  emoji: string;
  order: number;
}

interface FilmRoll {
  id: string;
  title: string;
  shareLink: string;
  photos: Photo[];
  createdAt: string;
}

interface DataStore {
  filmrolls: FilmRoll[];
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'filmrolls.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dataStore: DataStore = loadData();

function loadData(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { filmrolls: [] };
}

function persistData(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting data:', err);
  }
}

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get('/api/filmrolls', (req: Request, res: Response) => {
  const sorted = [...dataStore.filmrolls].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.status(200).json(sorted);
});

app.get('/api/filmrolls/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const filmroll = dataStore.filmrolls.find((fr) => fr.id === id);
  if (!filmroll) {
    res.status(404).json({ success: false, error: 'FilmRoll not found' });
    return;
  }
  res.status(200).json(filmroll);
});

app.get('/api/filmrolls/share/:link', (req: Request, res: Response) => {
  const { link } = req.params;
  const filmroll = dataStore.filmrolls.find((fr) => fr.shareLink === link);
  if (!filmroll) {
    res.status(404).json({ success: false, error: 'FilmRoll not found' });
    return;
  }
  res.status(200).json(filmroll);
});

app.post('/api/filmrolls', (req: Request, res: Response) => {
  const { title } = req.body;
  const newFilmRoll: FilmRoll = {
    id: uuidv4(),
    title: title || '未命名胶卷',
    shareLink: uuidv4(),
    photos: [],
    createdAt: new Date().toISOString(),
  };
  dataStore.filmrolls.push(newFilmRoll);
  persistData();
  res.status(201).json(newFilmRoll);
});

app.post(
  '/api/filmrolls/:id/photos',
  upload.array('photos'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const filmroll = dataStore.filmrolls.find((fr) => fr.id === id);
    if (!filmroll) {
      res.status(404).json({ success: false, error: 'FilmRoll not found' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }

    const newPhotos: Photo[] = [];

    for (const file of files) {
      const photoId = uuidv4();
      const fileName = `${photoId}.jpg`;
      const outputPath = path.join(UPLOADS_DIR, fileName);

      await sharp(file.buffer)
        .resize({ width: 640, height: 960, fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg', { quality: 80 })
        .toFile(outputPath);

      const photo: Photo = {
        id: photoId,
        url: `/uploads/${fileName}`,
        note: '',
        emoji: '❤️',
        order: filmroll.photos.length,
      };
      newPhotos.push(photo);
    }

    filmroll.photos.push(...newPhotos);
    persistData();
    res.status(201).json(newPhotos);
  }
);

app.put('/api/filmrolls/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, photos } = req.body;
  const filmroll = dataStore.filmrolls.find((fr) => fr.id === id);
  if (!filmroll) {
    res.status(404).json({ success: false, error: 'FilmRoll not found' });
    return;
  }

  if (title !== undefined) {
    filmroll.title = title;
  }
  if (photos !== undefined && Array.isArray(photos)) {
    filmroll.photos = photos;
  }

  persistData();
  res.status(200).json(filmroll);
});

app.delete(
  '/api/filmrolls/:id/photos/:photoId',
  (req: Request, res: Response) => {
    const { id, photoId } = req.params;
    const filmroll = dataStore.filmrolls.find((fr) => fr.id === id);
    if (!filmroll) {
      res.status(404).json({ success: false, error: 'FilmRoll not found' });
      return;
    }

    const photoIndex = filmroll.photos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) {
      res.status(404).json({ success: false, error: 'Photo not found' });
      return;
    }

    const photo = filmroll.photos[photoIndex];
    const fileName = path.basename(photo.url);
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting photo file:', err);
      }
    }

    filmroll.photos.splice(photoIndex, 1);
    persistData();
    res.status(200).json({ success: true, message: 'Photo deleted' });
  }
);

app.get(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    });
  }
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  });
});

const PORT = process.env.PORT || 3002;

if (process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
  });
}

export default app;
