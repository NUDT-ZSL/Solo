import { Request, Response, Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';
import { verifyToken, AuthRequest } from './auth.js';
import { applyVisibleWatermark, applyInvisibleWatermark, WatermarkOptions } from './watermark.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const WATERMARKED_DIR = path.join(__dirname, '..', 'watermarked');

[UPLOAD_DIR, WATERMARKED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 JPG/PNG/WebP 格式'));
  },
});

const router = Router();

router.post(
  '/upload',
  verifyToken,
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请选择图片文件' });
        return;
      }

      const { title, description, style, price, watermarkText, watermarkFontSize, watermarkColor, watermarkOpacity, watermarkAngle } = req.body;
      if (!title || !price) {
        res.status(400).json({ error: '标题和价格不能为空' });
        return;
      }

      const id = uuidv4();
      const ext = path.extname(req.file.originalname) || '.png';
      const originalFilename = `${id}_original${ext}`;
      const watermarkedFilename = `${id}_watermarked${ext}`;
      const originalPath = path.join(UPLOAD_DIR, originalFilename);
      const watermarkedPath = path.join(WATERMARKED_DIR, watermarkedFilename);

      fs.writeFileSync(originalPath, req.file.buffer);

      const watermarkOpts: Partial<WatermarkOptions> = {
        text: watermarkText || '版权归作者所有',
        fontSize: parseInt(watermarkFontSize) || 18,
        color: watermarkColor || '#999999',
        opacity: parseFloat(watermarkOpacity) || 0.33,
        angle: parseInt(watermarkAngle) || 30,
      };

      const watermarkedBuffer = await applyVisibleWatermark(req.file.buffer, watermarkOpts);
      const invisibleWatermarkedBuffer = await applyInvisibleWatermark(watermarkedBuffer, id);
      fs.writeFileSync(watermarkedPath, invisibleWatermarkedBuffer);

      const db = getDb();
      db.run(
        'INSERT INTO works (id, title, description, style, price, author_id, image_path, watermarked_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, description || '', style || '', parseFloat(price), req.userId, originalFilename, watermarkedFilename],
        (err) => {
          if (err) {
            res.status(500).json({ error: '上传失败' });
            return;
          }
          res.json({ id, message: '上传成功' });
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: '上传处理失败' });
    }
  }
);

router.get('/list', (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const style = req.query.style as string;
  const sort = req.query.sort as string || 'newest';
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params: any[] = [];

  if (style && style !== 'all') {
    whereClause = 'WHERE style = ?';
    params.push(style);
  }

  let orderClause = 'ORDER BY w.created_at DESC';
  if (sort === 'price_asc') orderClause = 'ORDER BY w.price ASC';
  else if (sort === 'price_desc') orderClause = 'ORDER BY w.price DESC';

  const db = getDb();
  const countQuery = `SELECT COUNT(*) as total FROM works w ${whereClause}`;
  const dataQuery = `SELECT w.*, u.username as author_name FROM works w LEFT JOIN users u ON w.author_id = u.id ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;

  db.get(countQuery, params, (err, countRow: any) => {
    if (err) {
      res.status(500).json({ error: '查询失败' });
      return;
    }

    db.all(dataQuery, [...params, limit, offset], (err2, rows: any[]) => {
      if (err2) {
        res.status(500).json({ error: '查询失败' });
        return;
      }

      const works = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        style: row.style,
        price: row.price,
        authorId: row.author_id,
        authorName: row.author_name,
        watermarkedPath: `/api/images/watermarked/${path.basename(row.watermarked_path)}`,
        createdAt: row.created_at,
      }));

      res.json({
        works,
        total: countRow.total,
        page,
        limit,
        hasMore: offset + limit < countRow.total,
      });
    });
  });
});

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const db = getDb();

  db.get(
    'SELECT w.*, u.username as author_name FROM works w LEFT JOIN users u ON w.author_id = u.id WHERE w.id = ?',
    [id],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: '查询失败' });
        return;
      }
      if (!row) {
        res.status(404).json({ error: '作品不存在' });
        return;
      }

      res.json({
        id: row.id,
        title: row.title,
        description: row.description,
        style: row.style,
        price: row.price,
        authorId: row.author_id,
        authorName: row.author_name,
        watermarkedPath: `/api/images/watermarked/${path.basename(row.watermarked_path)}`,
        createdAt: row.created_at,
      });
    }
  );
});

router.post('/:id/buy', verifyToken, (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const db = getDb();

  db.get('SELECT * FROM works WHERE id = ?', [id], (err, work: any) => {
    if (err) {
      res.status(500).json({ error: '查询失败' });
      return;
    }
    if (!work) {
      res.status(404).json({ error: '作品不存在' });
      return;
    }
    if (work.author_id === req.userId) {
      res.status(400).json({ error: '不能购买自己的作品' });
      return;
    }

    db.get(
      'SELECT id FROM transactions WHERE user_id = ? AND work_id = ?',
      [req.userId, id],
      (err2, existing: any) => {
        if (err2) {
          res.status(500).json({ error: '查询失败' });
          return;
        }
        if (existing) {
          res.status(400).json({ error: '您已购买过此作品' });
          return;
        }

        const txId = uuidv4();
        db.run(
          'INSERT INTO transactions (id, user_id, work_id, amount) VALUES (?, ?, ?, ?)',
          [txId, req.userId, id, work.price],
          function (err3) {
            if (err3) {
              res.status(500).json({ error: '购买失败，数据库写入错误' });
              return;
            }
            if (this.changes === 0) {
              res.status(500).json({ error: '购买失败' });
              return;
            }
            const safeFilename = path.basename(work.image_path);
            res.json({
              transactionId: txId,
              originalPath: `/api/images/original/${safeFilename}`,
              message: '购买成功',
            });
          }
        );
      }
    );
  });
});

router.get('/user/purchases', verifyToken, (req: AuthRequest, res: Response): void => {
  const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
  const db = getDb();

  db.all(
    `SELECT t.id as tx_id, t.amount, t.created_at as purchased_at, w.id as work_id, w.title, w.image_path, w.style
     FROM transactions t
     JOIN works w ON t.work_id = w.id
     WHERE t.user_id = ?
     ORDER BY t.created_at ${sortOrder}`,
    [req.userId],
    (err, rows: any[]) => {
      if (err) {
        res.status(500).json({ error: '查询失败' });
        return;
      }

      const purchases = rows.map((row) => ({
        transactionId: row.tx_id,
        workId: row.work_id,
        title: row.title,
        thumbnailPath: `/api/images/original/${path.basename(row.image_path)}`,
        style: row.style,
        amount: row.amount,
        purchasedAt: row.purchased_at,
      }));

      res.json({ purchases });
    }
  );
});

export const worksRouter = router;
