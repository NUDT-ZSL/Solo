import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import storyRoutes from './stories';
import { usersRouter } from './users';
import { setupSocketHandler } from './socketHandler';
import { getDb, initDatabase } from './db';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/stories', storyRoutes);
app.use('/api/users', usersRouter);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setupSocketHandler(io);

const db = getDb();
initDatabase(db);

db.prepare(`
  INSERT OR IGNORE INTO stories (id, title, inviteCode, createdAt)
  VALUES ('demo1', '森林中的秘密', 'ABC123', '2025-06-01T10:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO users (id, nickname, color, storyId, createdAt)
  VALUES ('user1', '小鹿', '#6c5ce7', 'demo1', '2025-06-01T09:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
  VALUES ('node1', 'demo1', NULL, '在一片古老的森林深处，有一棵会说话的老橡树……', NULL, 'user1', 0, 400, 500, '2025-06-01T10:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
  VALUES ('node2', 'demo1', 'node1', '老橡树低声说："跟随着萤火虫的光，你会找到回家的路。"', NULL, 'user1', 1, 520, 380, '2025-06-02T14:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
  VALUES ('node3', 'demo1', 'node1', '但那光芒引向的，并非归途，而是一扇从未开启的门。', NULL, 'user1', 1, 280, 380, '2025-06-03T09:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO stories (id, title, inviteCode, createdAt)
  VALUES ('demo2', '星际漂流记', 'XYZ789', '2025-06-05T08:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO users (id, nickname, color, storyId, createdAt)
  VALUES ('user2', '星航员', '#0984e3', 'demo2', '2025-06-05T07:00:00.000Z')
`).run();

db.prepare(`
  INSERT OR IGNORE INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
  VALUES ('node4', 'demo2', NULL, '飞船警报响起时，莉亚正凝视着窗外那颗不该存在的蓝色恒星。', NULL, 'user2', 0, 400, 500, '2025-06-05T08:00:00.000Z')
`).run();

httpServer.listen(3001, () => {
  console.log('TribeTales server running on http://localhost:3001');
});
