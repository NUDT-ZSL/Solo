import type { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './db';
import type { Project, Frame, DialogBubble, Comment } from '../src/types';

type BroadcastFn = (frameId: string, comment: Comment, count: number) => void;

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    thumbnail: row.thumbnail || undefined,
    gridCols: row.gridCols,
    gridRows: row.gridRows,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToFrame(row: any): Frame {
  return {
    id: row.id,
    projectId: row.projectId,
    order: row.order,
    imageUrl: row.imageUrl || undefined,
    gridX: row.gridX,
    gridY: row.gridY,
    width: row.width,
    height: row.height,
  };
}

function rowToDialog(row: any): DialogBubble {
  return {
    id: row.id,
    frameId: row.frameId,
    type: row.type as 'dialog' | 'sound',
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    text: row.text,
    tailDirection: row.tailDirection as 'left' | 'right' | 'top' | 'bottom',
  };
}

function rowToComment(row: any): Comment {
  return {
    id: row.id,
    frameId: row.frameId,
    userId: row.userId,
    userName: row.userName,
    avatar: row.avatar,
    rating: row.rating,
    content: row.content,
    createdAt: row.createdAt,
  };
}

export function registerRoutes(app: Express, broadcastFn: BroadcastFn) {
  app.get('/api/projects', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC').all();
    const projects = rows.map(rowToProject);
    res.json(projects);
  });

  app.post('/api/projects', (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }
    const now = Date.now();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, name, thumbnail, gridCols, gridRows, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, '', 4, 4, now, now);

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(rowToProject(row));
  });

  app.get('/api/projects/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const projectRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!projectRow) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    const frameRows = db.prepare('SELECT * FROM frames WHERE projectId = ? ORDER BY "order" ASC').all(id);
    const project = rowToProject(projectRow);
    const frames = frameRows.map(rowToFrame);
    res.json({ ...project, frames });
  });

  app.put('/api/projects/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, thumbnail, gridCols, gridRows } = req.body;
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    const now = Date.now();
    db.prepare(`
      UPDATE projects
      SET name = ?, thumbnail = ?, gridCols = ?, gridRows = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      thumbnail ?? existing.thumbnail,
      gridCols ?? existing.gridCols,
      gridRows ?? existing.gridRows,
      now,
      id
    );
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(rowToProject(row));
  });

  app.post('/api/frames', (req: Request, res: Response) => {
    const { projectId, order, imageUrl, gridX, gridY, width, height } = req.body;
    if (!projectId) {
      res.status(400).json({ error: '项目ID不能为空' });
      return;
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO frames (id, projectId, "order", imageUrl, gridX, gridY, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectId,
      order ?? 0,
      imageUrl ?? '',
      gridX ?? 0,
      gridY ?? 0,
      width ?? 160,
      height ?? 200
    );
    const row = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    res.status(201).json(rowToFrame(row));
  });

  app.put('/api/frames/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { order, imageUrl, gridX, gridY, width, height } = req.body;
    const existing = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '画格不存在' });
      return;
    }
    db.prepare(`
      UPDATE frames
      SET "order" = ?, imageUrl = ?, gridX = ?, gridY = ?, width = ?, height = ?
      WHERE id = ?
    `).run(
      order ?? existing.order,
      imageUrl ?? existing.imageUrl,
      gridX ?? existing.gridX,
      gridY ?? existing.gridY,
      width ?? existing.width,
      height ?? existing.height,
      id
    );
    const row = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    res.json(rowToFrame(row));
  });

  app.delete('/api/frames/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM frames WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: '画格不存在' });
      return;
    }
    res.json({ success: true });
  });

  app.get('/api/dialogs', (req: Request, res: Response) => {
    const { frameId } = req.query;
    if (!frameId || typeof frameId !== 'string') {
      res.status(400).json({ error: '画格ID不能为空' });
      return;
    }
    const rows = db.prepare('SELECT * FROM dialogs WHERE frameId = ?').all(frameId);
    const dialogs = rows.map(rowToDialog);
    res.json(dialogs);
  });

  app.post('/api/dialogs', (req: Request, res: Response) => {
    const { frameId, type, x, y, width, height, text, tailDirection } = req.body;
    if (!frameId) {
      res.status(400).json({ error: '画格ID不能为空' });
      return;
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO dialogs (id, frameId, type, x, y, width, height, text, tailDirection)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      frameId,
      type ?? 'dialog',
      x ?? 0,
      y ?? 0,
      width ?? 100,
      height ?? 60,
      text ?? '',
      tailDirection ?? 'bottom'
    );
    const row = db.prepare('SELECT * FROM dialogs WHERE id = ?').get(id);
    res.status(201).json(rowToDialog(row));
  });

  app.put('/api/dialogs/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, x, y, width, height, text, tailDirection } = req.body;
    const existing = db.prepare('SELECT * FROM dialogs WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '对话框不存在' });
      return;
    }
    db.prepare(`
      UPDATE dialogs
      SET type = ?, x = ?, y = ?, width = ?, height = ?, text = ?, tailDirection = ?
      WHERE id = ?
    `).run(
      type ?? existing.type,
      x ?? existing.x,
      y ?? existing.y,
      width ?? existing.width,
      height ?? existing.height,
      text ?? existing.text,
      tailDirection ?? existing.tailDirection,
      id
    );
    const row = db.prepare('SELECT * FROM dialogs WHERE id = ?').get(id);
    res.json(rowToDialog(row));
  });

  app.delete('/api/dialogs/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM dialogs WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: '对话框不存在' });
      return;
    }
    res.json({ success: true });
  });

  app.get('/api/comments', (req: Request, res: Response) => {
    const { frameId, page = '1', pageSize = '20' } = req.query;
    if (!frameId || typeof frameId !== 'string') {
      res.status(400).json({ error: '画格ID不能为空' });
      return;
    }
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize as string) || 20));
    const offset = (pageNum - 1) * pageSizeNum;

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM comments WHERE frameId = ?').get(frameId) as { count: number };
    const rows = db.prepare('SELECT * FROM comments WHERE frameId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(frameId, pageSizeNum, offset);
    const list = rows.map(rowToComment);
    res.json({ list, total: totalRow.count });
  });

  app.post('/api/comments', (req: Request, res: Response) => {
    const { frameId, userId, userName, avatar, rating, content } = req.body;
    if (!frameId || !userId || !userName || !content) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }
    const id = uuidv4();
    const now = Date.now();
    db.prepare(`
      INSERT INTO comments (id, frameId, userId, userName, avatar, rating, content, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      frameId,
      userId,
      userName,
      avatar ?? '',
      rating ?? 0,
      content,
      now
    );
    const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    const comment = rowToComment(row);

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM comments WHERE frameId = ?').get(frameId) as { count: number };

    broadcastFn(frameId, comment, totalRow.count);

    res.status(201).json(comment);
  });

  app.post('/api/export/:projectId', async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    const canvasWidth = project.gridCols * 180;
    const canvasHeight = project.gridRows * 220;

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${canvasWidth / 2}" y="30" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#333">${project.name}</text>
  <text x="${canvasWidth / 2}" y="${canvasHeight / 2}" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#666">导出预览</text>
</svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    res.json({ url: dataUrl, filename: `${project.name}.svg` });
  });
}
