import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';

interface Log {
  id: number;
  routeId: number | null;
  pointId: number | null;
  content: string | null;
  weather: string | null;
  imagePath: string | null;
  createdAt: string;
}

const uploadDir = path.join(__dirname, '..', 'upload');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `log-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

function createLogRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const { routeId } = req.query;

      let logs: Log[];

      if (routeId) {
        logs = db.prepare(`
          SELECT id, routeId, pointId, content, weather, imagePath, createdAt
          FROM logs
          WHERE routeId = ?
          ORDER BY createdAt DESC
        `).all(routeId) as Log[];
      } else {
        logs = db.prepare(`
          SELECT id, routeId, pointId, content, weather, imagePath, createdAt
          FROM logs
          ORDER BY createdAt DESC
        `).all() as Log[];
      }

      res.json(logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const log = db.prepare(`
        SELECT id, routeId, pointId, content, weather, imagePath, createdAt
        FROM logs
        WHERE id = ?
      `).get(id) as Log | undefined;

      if (!log) {
        res.status(404).json({ error: 'Log not found' });
        return;
      }

      res.json(log);
    } catch (error) {
      console.error('Failed to fetch log:', error);
      res.status(500).json({ error: 'Failed to fetch log' });
    }
  });

  router.post('/', upload.single('image'), (req: Request, res: Response) => {
    try {
      const { routeId, pointId, content, weather } = req.body;

      const createdAt = new Date().toISOString();
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const result = db.prepare(`
        INSERT INTO logs (routeId, pointId, content, weather, imagePath, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        routeId ? Number(routeId) : null,
        pointId ? Number(pointId) : null,
        content || null,
        weather || null,
        imagePath,
        createdAt
      );

      const newLog = db.prepare(`
        SELECT id, routeId, pointId, content, weather, imagePath, createdAt
        FROM logs
        WHERE id = ?
      `).get(result.lastInsertRowid) as Log;

      res.status(201).json(newLog);
    } catch (error) {
      console.error('Failed to create log:', error);
      res.status(500).json({ error: 'Failed to create log' });
    }
  });

  router.put('/:id', upload.single('image'), (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { routeId, pointId, content, weather } = req.body;

      const existingLog = db.prepare(`
        SELECT id, imagePath FROM logs WHERE id = ?
      `).get(id) as Log | undefined;

      if (!existingLog) {
        res.status(404).json({ error: 'Log not found' });
        return;
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : existingLog.imagePath;

      db.prepare(`
        UPDATE logs
        SET routeId = ?, pointId = ?, content = ?, weather = ?, imagePath = ?
        WHERE id = ?
      `).run(
        routeId ? Number(routeId) : null,
        pointId ? Number(pointId) : null,
        content || null,
        weather || null,
        imagePath,
        id
      );

      const updatedLog = db.prepare(`
        SELECT id, routeId, pointId, content, weather, imagePath, createdAt
        FROM logs
        WHERE id = ?
      `).get(id) as Log;

      res.json(updatedLog);
    } catch (error) {
      console.error('Failed to update log:', error);
      res.status(500).json({ error: 'Failed to update log' });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingLog = db.prepare(`
        SELECT id FROM logs WHERE id = ?
      `).get(id);

      if (!existingLog) {
        res.status(404).json({ error: 'Log not found' });
        return;
      }

      db.prepare(`
        DELETE FROM logs WHERE id = ?
      `).run(id);

      res.json({ message: 'Log deleted successfully' });
    } catch (error) {
      console.error('Failed to delete log:', error);
      res.status(500).json({ error: 'Failed to delete log' });
    }
  });

  return router;
}

export default createLogRouter;
