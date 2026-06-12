const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { pool, initDB } = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG and PNG allowed'));
  },
});

const inMemory = {
  capsules: [],
  replies: [],
  nextCapsuleId: 1,
  nextReplyId: 1,
  useDB: true,
};

const ensureUnlockedField = (row) => {
  const now = new Date();
  const unlock = new Date(row.unlock_time);
  return { ...row, is_unlocked: now >= unlock };
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/capsules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM capsules ORDER BY created_at DESC');
    res.json(rows.map(ensureUnlockedField));
  } catch (e) {
    inMemory.useDB = false;
    res.json(inMemory.capsules.map(ensureUnlockedField));
  }
});

app.get('/api/capsules/nearby', async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  const r = parseFloat(radius);

  const withinRadius = (cLat, cLng) => {
    const R = 6371000;
    const dLat = ((cLat - latN) * Math.PI) / 180;
    const dLng = ((cLng - lngN) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((latN * Math.PI) / 180) * Math.cos((cLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) <= r;
  };

  try {
    const [rows] = await pool.query(
      'SELECT * FROM capsules WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?',
      [latN - 0.1, latN + 0.1, lngN - 0.1, lngN + 0.1]
    );
    const filtered = rows.filter((c) => withinRadius(parseFloat(c.lat), parseFloat(c.lng)));
    res.json(filtered.map(ensureUnlockedField));
  } catch (e) {
    inMemory.useDB = false;
    const filtered = inMemory.capsules.filter((c) => withinRadius(c.lat, c.lng));
    res.json(filtered.map(ensureUnlockedField));
  }
});

app.get('/api/capsules/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [rows] = await pool.query('SELECT * FROM capsules WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(ensureUnlockedField(rows[0]));
  } catch (e) {
    inMemory.useDB = false;
    const cap = inMemory.capsules.find((c) => c.id === id);
    if (!cap) return res.status(404).json({ error: 'Not found' });
    res.json(ensureUnlockedField(cap));
  }
});

app.post('/api/capsules', upload.single('image'), async (req, res) => {
  const { lat, lng, message, unlock_time } = req.body;
  const image_url = req.file ? req.file.filename : null;

  if (!lat || !lng || !message || !unlock_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const payload = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    message: String(message).slice(0, 500),
    image_url,
    unlock_time: new Date(unlock_time),
    created_at: new Date(),
  };

  try {
    const [result] = await pool.query(
      'INSERT INTO capsules (lat, lng, message, image_url, unlock_time) VALUES (?, ?, ?, ?, ?)',
      [payload.lat, payload.lng, payload.message, payload.image_url, payload.unlock_time]
    );
    const [rows] = await pool.query('SELECT * FROM capsules WHERE id = ?', [result.insertId]);
    res.json(ensureUnlockedField(rows[0]));
  } catch (e) {
    inMemory.useDB = false;
    const id = inMemory.nextCapsuleId++;
    const cap = { id, ...payload };
    inMemory.capsules.push(cap);
    res.json(ensureUnlockedField(cap));
  }
});

app.get('/api/capsules/:id/replies', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [rows] = await pool.query('SELECT * FROM replies WHERE capsule_id = ? ORDER BY created_at DESC', [id]);
    res.json(rows);
  } catch (e) {
    inMemory.useDB = false;
    res.json(inMemory.replies.filter((r) => r.capsule_id === id).reverse());
  }
});

app.post('/api/capsules/:id/replies', async (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Content required' });
  }
  const trimmed = String(content).slice(0, 100);

  try {
    const [result] = await pool.query(
      'INSERT INTO replies (capsule_id, content) VALUES (?, ?)',
      [id, trimmed]
    );
    const [rows] = await pool.query('SELECT * FROM replies WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (e) {
    inMemory.useDB = false;
    const replyId = inMemory.nextReplyId++;
    const reply = {
      id: replyId,
      capsule_id: id,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    inMemory.replies.push(reply);
    res.json(reply);
  }
});

app.delete('/api/capsules/:id/replies/:rid', async (req, res) => {
  const rid = parseInt(req.params.rid);
  try {
    await pool.query('DELETE FROM replies WHERE id = ?', [rid]);
    res.json({ success: true });
  } catch (e) {
    inMemory.replies = inMemory.replies.filter((r) => r.id !== rid);
    res.json({ success: true });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Time Capsule server running on http://localhost:${PORT}`);
  });
});
