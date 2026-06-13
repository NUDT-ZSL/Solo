import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Datastore from 'nedb-promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Photo, Tag, PhotoWithThumbnails, CropArea } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');
const THUMB_SIZES = [200, 600, 1200];
const DATA_DIR = path.join(UPLOADS_DIR, 'data');

[UPLOADS_DIR, ORIGINALS_DIR, THUMBS_DIR, DATA_DIR, ...THUMB_SIZES.map(s => path.join(THUMBS_DIR, String(s)))].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const photosDB = Datastore.create({ filename: path.join(DATA_DIR, 'photos.db'), autoload: true });
const tagsDB = Datastore.create({ filename: path.join(DATA_DIR, 'tags.db'), autoload: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ORIGINALS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG 和 PNG 格式图片'));
    }
  },
});

function photoWithThumbnails(photo: Photo): PhotoWithThumbnails {
  return {
    ...photo,
    thumbnails: {
      w200: `/uploads/thumbs/200/${photo.filename}`,
      w600: `/uploads/thumbs/600/${photo.filename}`,
      w1200: `/uploads/thumbs/1200/${photo.filename}`,
    },
  };
}

async function updateTagCounts(tags: string[], increment: boolean): Promise<void> {
  for (const tagName of tags) {
    const existing = await tagsDB.findOne({ name: tagName });
    if (existing) {
      const newCount = increment ? existing.count + 1 : Math.max(0, existing.count - 1);
      if (newCount === 0) {
        await tagsDB.remove({ name: tagName }, {});
      } else {
        await tagsDB.update({ name: tagName }, { $set: { count: newCount } }, {});
      }
    } else if (increment) {
      await tagsDB.insert({
        name: tagName,
        count: 1,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

async function generateThumbnails(
  originalPath: string,
  filename: string,
  cropArea?: CropArea
): Promise<void> {
  const tasks = THUMB_SIZES.map(async (size) => {
    const outputPath = path.join(THUMBS_DIR, String(size), filename);
    let pipeline = sharp(originalPath);

    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      pipeline = pipeline.extract({
        left: Math.round(cropArea.x),
        top: Math.round(cropArea.y),
        width: Math.round(cropArea.width),
        height: Math.round(cropArea.height),
      });
    }

    await pipeline
      .resize(size, null, { withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);
  });

  await Promise.all(tasks);
}

const router = Router();

router.get('/photos', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const tagsParam = req.query.tags as string;
    const tagFilter = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

    const query: Record<string, unknown> = {};
    if (tagFilter.length > 0) {
      query.tags = { $all: tagFilter };
    }

    const total = await photosDB.count(query);
    const photos = await photosDB
      .find(query)
      .sort({ uploadDate: -1 })
      .skip(offset)
      .limit(limit);

    const photosWithThumbs = (photos as Photo[]).map(photoWithThumbnails);

    res.json({
      photos: photosWithThumbs,
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('获取作品列表失败:', err);
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

router.get('/photos/:id', async (req: Request, res: Response) => {
  try {
    const photo = await photosDB.findOne({ id: req.params.id });
    if (!photo) {
      return res.status(404).json({ error: '作品不存在' });
    }
    res.json(photoWithThumbnails(photo as Photo));
  } catch (err) {
    console.error('获取作品详情失败:', err);
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

router.post('/photos', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供图片文件' });
    }

    const title = (req.body.title as string) || req.file.originalname.replace(/\.[^.]+$/, '');
    const tags: string[] = JSON.parse(req.body.tags || '[]');
    const captureDate = (req.body.captureDate as string) || new Date().toISOString().slice(0, 10);
    let cropArea: CropArea | undefined;
    if (req.body.cropArea) {
      try {
        cropArea = JSON.parse(req.body.cropArea);
      } catch {
        cropArea = undefined;
      }
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;

    const metadata = await sharp(originalPath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    await generateThumbnails(originalPath, filename, cropArea);

    const id = uuidv4();
    const photo: Photo = {
      id,
      title,
      originalName: req.file.originalname,
      filename,
      width,
      height,
      aspectRatio: width && height ? parseFloat((width / height).toFixed(3)) : 1,
      tags,
      captureDate,
      uploadDate: new Date().toISOString(),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    await photosDB.insert(photo);
    await updateTagCounts(tags, true);

    res.status(201).json(photoWithThumbnails(photo));
  } catch (err) {
    console.error('上传作品失败:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof Error) {
      res.status(500).json({ error: err.message || '上传失败' });
    } else {
      res.status(500).json({ error: '上传失败' });
    }
  }
});

router.delete('/photos/:id', async (req: Request, res: Response) => {
  try {
    const photo = await photosDB.findOne({ id: req.params.id }) as Photo | null;
    if (!photo) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const originalPath = path.join(ORIGINALS_DIR, photo.filename);
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
    for (const size of THUMB_SIZES) {
      const thumbPath = path.join(THUMBS_DIR, String(size), photo.filename);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    await photosDB.remove({ id: req.params.id }, {});
    await updateTagCounts(photo.tags, false);

    res.json({ success: true });
  } catch (err) {
    console.error('删除作品失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await tagsDB.find({}).sort({ count: -1 });
    res.json(tags as Tag[]);
  } catch (err) {
    console.error('获取标签失败:', err);
    res.status(500).json({ error: '获取标签失败' });
  }
});

router.post('/tags', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '标签名不能为空' });
    }
    const trimmedName = name.trim();
    const existing = await tagsDB.findOne({ name: trimmedName });
    if (existing) {
      return res.json(existing as Tag);
    }
    const tag: Tag = {
      name: trimmedName,
      count: 0,
      createdAt: new Date().toISOString(),
    };
    const inserted = await tagsDB.insert(tag);
    res.status(201).json(inserted as Tag);
  } catch (err) {
    console.error('创建标签失败:', err);
    res.status(500).json({ error: '创建标签失败' });
  }
});

router.delete('/tags/:name', async (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name);
    await tagsDB.remove({ name }, {});
    res.json({ success: true });
  } catch (err) {
    console.error('删除标签失败:', err);
    res.status(500).json({ error: '删除标签失败' });
  }
});

export default router;
