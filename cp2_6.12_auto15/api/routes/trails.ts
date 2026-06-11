import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getDb,
  getAllTrails,
  getTrailById,
  createTrail,
  updateTrail,
  deleteTrail,
  getPhotosByTrailId,
  addPhoto,
  deletePhotosByTrailId,
  getFavoriteCount,
  isFavorited,
  toggleFavorite,
} from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'photos');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, geojson, userId } = req.body;

    if (!title || !geojson || !userId) {
      res.status(400).json({ error: 'title, geojson, and userId are required' });
      return;
    }

    await getDb();

    const id = uuidv4();
    createTrail(id, title, description || '', userId, geojson);

    const trail = getTrailById(id);
    res.status(201).json({ trail });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trail' });
  }
});

router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    await getDb();

    const search = req.query.search as string | undefined;
    const sort = req.query.sort as string | undefined;
    const order = req.query.order as string | undefined;
    const userId = req.query.userId as string | undefined;

    const trails = getAllTrails(search, sort, order, userId);
    res.json({ trails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get trails' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await getDb();

    const trail = getTrailById(req.params.id);
    if (!trail) {
      res.status(404).json({ error: 'Trail not found' });
      return;
    }

    const photos = getPhotosByTrailId(req.params.id);
    const favoriteCount = getFavoriteCount(req.params.id);

    let favorited = false;
    const userId = req.query.userId as string | undefined;
    if (userId) {
      favorited = isFavorited(req.params.id, userId);
    }

    try {
      trail.geojson = JSON.parse(trail.geojson);
    } catch {
      // keep as string if parse fails
    }

    res.json({
      trail,
      photos,
      isFavorited: favorited,
      favoriteCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get trail' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await getDb();

    const trail = getTrailById(req.params.id);
    if (!trail) {
      res.status(404).json({ error: 'Trail not found' });
      return;
    }

    const { title, description } = req.body;
    updateTrail(req.params.id, title, description);

    const updated = getTrailById(req.params.id);
    res.json({ trail: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trail' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await getDb();

    const trail = getTrailById(req.params.id);
    if (!trail) {
      res.status(404).json({ error: 'Trail not found' });
      return;
    }

    const deletedPhotos = deletePhotosByTrailId(req.params.id);
    for (const photo of deletedPhotos) {
      const fullPath = path.join(__dirname, '..', '..', photo.imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    deleteTrail(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trail' });
  }
});

router.post(
  '/:id/photos',
  upload.array('photos', 5),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await getDb();

      const trail = getTrailById(req.params.id);
      if (!trail) {
        res.status(404).json({ error: 'Trail not found' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No photos uploaded' });
        return;
      }

      const photos = files.map((file) => {
        const id = uuidv4();
        const imagePath = `/uploads/photos/${file.filename}`;
        addPhoto(id, req.params.id, imagePath);
        return { id, trailId: req.params.id, imagePath };
      });

      res.status(201).json({ photos });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  },
);

router.post(
  '/:id/favorite',
  async (req: Request, res: Response): Promise<void> => {
    try {
      await getDb();

      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const trail = getTrailById(req.params.id);
      if (!trail) {
        res.status(404).json({ error: 'Trail not found' });
        return;
      }

      const id = uuidv4();
      const result = toggleFavorite(id, req.params.id, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  },
);

export default router;
