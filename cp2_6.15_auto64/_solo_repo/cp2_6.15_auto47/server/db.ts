import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Project, Frame, DialogBubble, Comment } from '../src/types';

const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'comic.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT,
    gridCols INTEGER DEFAULT 4,
    gridRows INTEGER DEFAULT 4,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS frames (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    imageUrl TEXT,
    gridX INTEGER NOT NULL,
    gridY INTEGER NOT NULL,
    width INTEGER DEFAULT 160,
    height INTEGER DEFAULT 200,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dialogs (
    id TEXT PRIMARY KEY,
    frameId TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'dialog',
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 100,
    height INTEGER NOT NULL DEFAULT 60,
    text TEXT NOT NULL DEFAULT '',
    tailDirection TEXT DEFAULT 'bottom',
    FOREIGN KEY (frameId) REFERENCES frames(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    frameId TEXT NOT NULL,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    avatar TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (frameId) REFERENCES frames(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_frames_projectId ON frames(projectId);
  CREATE INDEX IF NOT EXISTS idx_dialogs_frameId ON dialogs(frameId);
  CREATE INDEX IF NOT EXISTS idx_comments_frameId ON comments(frameId);
`);

const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;

if (projectCount === 0) {
  const now = Date.now();

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, thumbnail, gridCols, gridRows, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFrame = db.prepare(`
    INSERT INTO frames (id, projectId, "order", imageUrl, gridX, gridY, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDialog = db.prepare(`
    INSERT INTO dialogs (id, frameId, type, x, y, width, height, text, tailDirection)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (id, frameId, userId, userName, avatar, rating, content, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projectNames = ['星际冒险', '日常物语'];
  const projectIds: string[] = [];

  for (let p = 0; p < 2; p++) {
    const projectId = uuidv4();
    projectIds.push(projectId);

    insertProject.run(
      projectId,
      projectNames[p],
      '',
      4,
      4,
      now - p * 86400000,
      now - p * 3600000
    );

    for (let f = 0; f < 16; f++) {
      const frameId = uuidv4();
      const gridX = f % 4;
      const gridY = Math.floor(f / 4);

      insertFrame.run(
        frameId,
        projectId,
        f,
        '',
        gridX,
        gridY,
        160,
        200
      );

      if (f % 3 === 0) {
        const dialogId = uuidv4();
        insertDialog.run(
          dialogId,
          frameId,
          f % 2 === 0 ? 'dialog' : 'sound',
          20,
          20,
          100,
          60,
          p === 0 ? `这是第 ${f + 1} 格的对话` : `音效 ${f + 1}`,
          (['left', 'right', 'top', 'bottom'] as const)[f % 4]
        );
      }

      if (f % 4 === 0) {
        const commentCount = (f % 2) + 1;
        for (let c = 0; c < commentCount; c++) {
          const commentId = uuidv4();
          insertComment.run(
            commentId,
            frameId,
            `user-${(c % 3) + 1}`,
            ['小明', '小红', '小刚'][c % 3],
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${c + f}`,
            3 + (c % 3),
            p === 0 ? `这个画格构图很棒！` : `期待下一话的发展！`,
            now - (f + c) * 60000
          );
        }
      }
    }
  }
}

export default db;
