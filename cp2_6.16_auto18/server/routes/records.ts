import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { allQuery, getQuery, runQuery } from '../database';
import type { GrowthRecord } from '../../src/types';

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

router.get('/plant/:plantId', (req, res) => {
  try {
    const { plantId } = req.params;

    const records = allQuery<any>(`
      SELECT 
        id, 
        plant_id as plantId,
        date,
        image,
        note
      FROM growth_records 
      WHERE plant_id = ?
      ORDER BY date DESC
    `, [plantId]);

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get records',
    });
  }
});

router.post('/plant/:plantId', upload.single('image'), async (req, res) => {
  try {
    const { plantId } = req.params;
    const { date, note } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required',
      });
    }

    const plantExists = getQuery<any>('SELECT id FROM plants WHERE id = ?', [plantId]);
    if (!plantExists) {
      return res.status(404).json({
        success: false,
        error: 'Plant not found',
      });
    }

    const recordId = uuidv4();
    let imagePath = '';

    if (req.file) {
      const fileName = `${recordId}.webp`;
      const filePath = join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside' })
        .webp({ quality: 75, effort: 6 })
        .toFile(filePath);

      imagePath = `/uploads/${fileName}`;
    }

    await runQuery(`
      INSERT INTO growth_records (id, plant_id, date, image, note)
      VALUES (?, ?, ?, ?, ?)
    `, [recordId, plantId, date, imagePath, note || '']);

    const record = getQuery<any>(`
      SELECT 
        id, 
        plant_id as plantId,
        date,
        image,
        note
      FROM growth_records 
      WHERE id = ?
    `, [recordId]);

    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Add record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add record',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await runQuery('DELETE FROM growth_records WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete record',
    });
  }
});

export default router;
