const express = require('express');
const cors = require('cors');
const http = require('http');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

const db = new Database(path.join(__dirname, 'resume.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    current_content TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    saved_by TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    UNIQUE(room_id, version_number)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    author TEXT NOT NULL,
    author_color TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );
`);

app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  const now = Date.now();
  
  const stmt = db.prepare('INSERT INTO rooms (id, created_at, last_activity, current_content) VALUES (?, ?, ?, ?)');
  stmt.run(roomId, now, now, '');
  
  res.json({ roomId });
});

app.get('/api/rooms/:id/versions', (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare('SELECT version_number, saved_by, saved_at FROM versions WHERE room_id = ? ORDER BY version_number DESC');
  const versions = stmt.all(id);
  
  res.json({ versions });
});

app.post('/api/rooms/:id/versions', (req, res) => {
  const { id } = req.params;
  const { content, savedBy } = req.body;
  
  if (!content || !savedBy) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const roomStmt = db.prepare('SELECT id FROM rooms WHERE id = ?');
  const room = roomStmt.get(id);
  
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  const maxVersionStmt = db.prepare('SELECT COALESCE(MAX(version_number), 0) as max_version FROM versions WHERE room_id = ?');
  const { max_version } = maxVersionStmt.get(id);
  const newVersion = max_version + 1;
  
  const now = Date.now();
  
  const insertStmt = db.prepare('INSERT INTO versions (room_id, version_number, content, saved_by, saved_at) VALUES (?, ?, ?, ?, ?)');
  insertStmt.run(id, newVersion, content, savedBy, now);
  
  const updateRoomStmt = db.prepare('UPDATE rooms SET last_activity = ?, current_content = ? WHERE id = ?');
  updateRoomStmt.run(now, content, id);
  
  res.json({
    versionNumber: newVersion,
    savedAt: now,
    savedBy
  });
});

app.get('/api/rooms/:id/versions/:v', (req, res) => {
  const { id, v } = req.params;
  
  const stmt = db.prepare('SELECT content, version_number, saved_by, saved_at FROM versions WHERE room_id = ? AND version_number = ?');
  const version = stmt.get(id, parseInt(v));
  
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  
  res.json(version);
});

app.post('/api/rooms/:id/versions/:v/comments', (req, res) => {
  const { id, v } = req.params;
  const { author, authorColor, content } = req.body;
  
  if (!author || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const versionStmt = db.prepare('SELECT id FROM versions WHERE room_id = ? AND version_number = ?');
  const version = versionStmt.get(id, parseInt(v));
  
  if (!version) {
    return res.status(404).json({ error: '版本不存在' });
  }
  
  const now = Date.now();
  const color = authorColor || '#667eea';
  
  const stmt = db.prepare('INSERT INTO comments (room_id, version_number, author, author_color, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(id, parseInt(v), author, color, content, now);
  
  res.json({
    id: result.lastInsertRowid,
    author,
    authorColor: color,
    content,
    createdAt: now
  });
});

app.get('/api/rooms/:id/versions/:v/comments', (req, res) => {
  const { id, v } = req.params;
  
  const stmt = db.prepare('SELECT id, author, author_color, content, created_at FROM comments WHERE room_id = ? AND version_number = ? ORDER BY created_at DESC LIMIT 50');
  const comments = stmt.all(id, parseInt(v));
  
  res.json({ comments: comments.map(c => ({
    id: c.id,
    author: c.author,
    authorColor: c.author_color,
    content: c.content,
    createdAt: c.created_at
  })) });
});

app.get('/api/rooms/:id/content', (req, res) => {
  const { id } = req.params;
  
  const stmt = db.prepare('SELECT current_content FROM rooms WHERE id = ?');
  const room = stmt.get(id);
  
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  res.json({ content: room.current_content });
});

setupSocket(server, db);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
