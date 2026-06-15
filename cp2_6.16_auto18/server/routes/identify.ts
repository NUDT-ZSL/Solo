import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { identifyByDescription, identifyByImage } from '../plantIdentify';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const router = Router();

const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WebP image files are allowed!'));
    }
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const description = req.body.description as string;
    let results;

    if (req.file) {
      const fileId = uuidv4();
      const fileName = `${fileId}.webp`;
      const filePath = join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toFile(filePath);

      results = await identifyByImage(req.file.buffer, req.file.originalname || fileName, description);

      results = results.map(r => ({
        ...r,
        uploadedImage: `/uploads/${fileName}`,
      }));
    } else if (description && description.trim()) {
      results = identifyByDescription(description);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either an image or a description',
      });
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Identification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to identify plant',
    });
  }
});

export default router;
