import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryRun, queryGet } from '../database.js';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoomsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const rooms = queryAll(db, 'SELECT * FROM rooms ORDER BY createdAt DESC');
    const result = rooms.map(room => {
      const members = queryAll(db, 'SELECT * FROM members WHERE roomId = ?', [room.id]);
      const stories = queryAll(db, 'SELECT * FROM stories WHERE roomId = ?', [room.id]);
      return {
        ...room,
        memberCount: members.length,
        paragraphCount: stories.length,
      };
    });
    res.json(result);
  });

  router.post('/', (req, res) => {
    const { theme, creatorName } = req.body;
    if (!theme || !creatorName) {
      return res.status(400).json({ error: 'theme and creatorName are required' });
    }
    const id = uuidv4();
    const roomCode = generateRoomCode();
    queryRun(db, 'INSERT INTO rooms (id, roomCode, theme, creatorName) VALUES (?, ?, ?, ?)', [id, roomCode, theme, creatorName]);
    queryRun(db, 'INSERT INTO members (id, roomId, userName) VALUES (?, ?, ?)', [uuidv4(), id, creatorName]);
    const room = queryGet(db, 'SELECT * FROM rooms WHERE id = ?', [id]);
    res.json({ ...room, memberCount: 1, paragraphCount: 0 });
  });

  router.get('/:roomCode', (req, res) => {
    const room = queryGet(db, 'SELECT * FROM rooms WHERE roomCode = ?', [req.params.roomCode]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const members = queryAll(db, 'SELECT * FROM members WHERE roomId = ?', [room.id]);
    const stories = queryAll(db, 'SELECT * FROM stories WHERE roomId = ?', [room.id]);
    res.json({ ...room, memberCount: members.length, paragraphCount: stories.length });
  });

  router.post('/:roomCode/join', (req, res) => {
    const { userName } = req.body;
    if (!userName) {
      return res.status(400).json({ error: 'userName is required' });
    }
    const room = queryGet(db, 'SELECT * FROM rooms WHERE roomCode = ?', [req.params.roomCode]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const existing = queryGet(db, 'SELECT * FROM members WHERE roomId = ? AND userName = ?', [room.id, userName]);
    if (!existing) {
      queryRun(db, 'INSERT INTO members (id, roomId, userName) VALUES (?, ?, ?)', [uuidv4(), room.id, userName]);
    }
    const members = queryAll(db, 'SELECT * FROM members WHERE roomId = ?', [room.id]);
    res.json({ ...room, memberCount: members.length });
  });

  router.get('/:roomCode/members', (req, res) => {
    const room = queryGet(db, 'SELECT * FROM rooms WHERE roomCode = ?', [req.params.roomCode]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const members = queryAll(db, 'SELECT * FROM members WHERE roomId = ?', [room.id]);
    res.json(members);
  });

  router.get('/:roomCode/stats', (req, res) => {
    const room = queryGet(db, 'SELECT * FROM rooms WHERE roomCode = ?', [req.params.roomCode]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const stories = queryAll(db, 'SELECT * FROM stories WHERE roomId = ? ORDER BY "order" ASC', [room.id]);
    const members = queryAll(db, 'SELECT * FROM members WHERE roomId = ?', [room.id]);
    const totalWords = stories.reduce((sum, s) => sum + s.content.length, 0);
    const contributionMap = {};
    stories.forEach(s => {
      contributionMap[s.author] = (contributionMap[s.author] || 0) + 1;
    });
    const contributions = Object.entries(contributionMap).map(([author, count]) => ({ author, count }));
    res.json({
      totalParagraphs: stories.length,
      totalWords,
      memberCount: members.length,
      contributions,
    });
  });

  return router;
}
