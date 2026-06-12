import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  analyzePhoto,
  addPhoto,
  getAllPhotos,
  getPhotoById,
  getTopPhotos,
  addCommentToPhoto,
  getPhotosPaginated,
} from '../services/photoService';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持JPG和PNG格式'));
    }
  },
});

router.post(
  '/upload',
  upload.array('photos', 20),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: '没有上传文件' });
        return;
      }

      const results = [];
      for (const file of files) {
        const metadata = await import('sharp').then((m) =>
          m.default(file.path).metadata()
        );

        const analysis = await analyzePhoto(
          file.path,
          metadata.width || 800,
          metadata.height || 600
        );

        const photo = {
          id: uuidv4(),
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
          score: analysis.score,
          faceBox:
            analysis.faceBox.width > 0 ? analysis.faceBox : undefined,
          width: metadata.width || 800,
          height: metadata.height || 600,
          comments: [],
          uploadedAt: Date.now(),
        };

        addPhoto(photo);
        results.push(photo);
      }

      res.json(results);
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: '上传处理失败' });
    }
  }
);

router.get('/photos', (_req: Request, res: Response) => {
  try {
    const limit = _req.query.limit ? parseInt(_req.query.limit as string) : undefined;
    const offset = _req.query.offset ? parseInt(_req.query.offset as string) : undefined;
    const sort = _req.query.sort as string;

    if (sort === 'score') {
      const topLimit = limit || 10;
      const top = getTopPhotos(topLimit);
      res.json(top);
      return;
    }

    if (limit !== undefined && offset !== undefined) {
      const paginated = getPhotosPaginated(limit, offset);
      res.json(paginated);
      return;
    }

    const all = getAllPhotos();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: '获取照片列表失败' });
  }
});

router.get('/photo/:id', (req: Request, res: Response) => {
  try {
    const photo = getPhotoById(req.params.id);
    if (!photo) {
      res.status(404).json({ error: '照片不存在' });
      return;
    }
    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: '获取照片详情失败' });
  }
});

router.post('/photo/:id/comment', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: '评论内容不能为空' });
      return;
    }
    if (content.length > 200) {
      res.status(400).json({ error: '评论最多200字' });
      return;
    }

    const comment = addCommentToPhoto(req.params.id, content.trim());
    if (!comment) {
      res.status(404).json({ error: '照片不存在' });
      return;
    }
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: '添加评论失败' });
  }
});

export default router;
