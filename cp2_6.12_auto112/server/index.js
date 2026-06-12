const express = require('express');
const cors = require('cors');
const http = require('http');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(__dirname, 'resume.db');
let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      last_activity INTEGER NOT NULL,
      current_content TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      saved_by TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      UNIQUE(room_id, version_number)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      author TEXT NOT NULL,
      author_color TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function runExec(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

function getLastInsertRowid() {
  const result = runQuery('SELECT last_insert_rowid() as id');
  return result[0]?.id || 0;
}

app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  const now = Date.now();

  runExec(
    'INSERT INTO rooms (id, created_at, last_activity, current_content) VALUES (?, ?, ?, ?)',
    [roomId, now, now, '']
  );

  res.json({ roomId });
});

app.get('/api/rooms/:id/versions', (req, res) => {
  const { id } = req.params;

  const versions = runQuery(
    'SELECT version_number, saved_by, saved_at FROM versions WHERE room_id = ? ORDER BY version_number DESC',
    [id]
  );

  res.json({ versions });
});

app.post('/api/rooms/:id/versions', (req, res) => {
  const { id } = req.params;
  const { content, savedBy } = req.body;

  if (!content || !savedBy) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const room = runQuery('SELECT id FROM rooms WHERE id = ?', [id]);

  if (room.length === 0) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const maxVersionResult = runQuery(
    'SELECT COALESCE(MAX(version_number), 0) as max_version FROM versions WHERE room_id = ?',
    [id]
  );
  const maxVersion = maxVersionResult[0].max_version || 0;
  const newVersion = maxVersion + 1;

  const now = Date.now();

  runExec(
    'INSERT INTO versions (room_id, version_number, content, saved_by, saved_at) VALUES (?, ?, ?, ?, ?)',
    [id, newVersion, content, savedBy, now]
  );

  runExec(
    'UPDATE rooms SET last_activity = ?, current_content = ? WHERE id = ?',
    [now, content, id]
  );

  res.json({
    versionNumber: newVersion,
    savedAt: now,
    savedBy
  });
});

app.get('/api/rooms/:id/versions/:v', (req, res) => {
  const { id, v } = req.params;

  const version = runQuery(
    'SELECT content, version_number, saved_by, saved_at FROM versions WHERE room_id = ? AND version_number = ?',
    [id, parseInt(v)]
  );

  if (version.length === 0) {
    return res.status(404).json({ error: '版本不存在' });
  }

  res.json(version[0]);
});

app.post('/api/rooms/:id/versions/:v/comments', (req, res) => {
  const { id, v } = req.params;
  const { author, authorColor, content } = req.body;

  if (!author || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const version = runQuery(
    'SELECT id FROM versions WHERE room_id = ? AND version_number = ?',
    [id, parseInt(v)]
  );

  if (version.length === 0) {
    return res.status(404).json({ error: '版本不存在' });
  }

  const now = Date.now();
  const color = authorColor || '#667eea';

  runExec(
    'INSERT INTO comments (room_id, version_number, author, author_color, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, parseInt(v), author, color, content, now]
  );

  const commentId = getLastInsertRowid();

  res.json({
    id: commentId,
    author,
    authorColor: color,
    content,
    createdAt: now
  });
});

app.get('/api/rooms/:id/versions/:v/comments', (req, res) => {
  const { id, v } = req.params;

  const comments = runQuery(
    'SELECT id, author, author_color, content, created_at FROM comments WHERE room_id = ? AND version_number = ? ORDER BY created_at DESC LIMIT 50',
    [id, parseInt(v)]
  );

  res.json({
    comments: comments.map(c => ({
      id: c.id,
      author: c.author,
      authorColor: c.author_color,
      content: c.content,
      createdAt: c.created_at
    }))
  });
});

app.get('/api/rooms/:id/content', (req, res) => {
  const { id } = req.params;

  const room = runQuery('SELECT current_content FROM rooms WHERE id = ?', [id]);

  if (room.length === 0) {
    return res.status(404).json({ error: '房间不存在' });
  }

  res.json({ content: room[0].current_content });
});

const updateRoomContent = (roomId, content) => {
  if (db) {
    runExec(
      'UPDATE rooms SET current_content = ?, last_activity = ? WHERE id = ?',
      [content, Date.now(), roomId]
    );
  }
};

const getRoomContent = (roomId) => {
  if (!db) return '';
  const result = runQuery('SELECT current_content FROM rooms WHERE id = ?', [roomId]);
  return result[0]?.current_content || '';
};

initDatabase().then(() => {
  setupSocket(server, { updateRoomContent, getRoomContent });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});
