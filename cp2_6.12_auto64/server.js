import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'leaderboard.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(LENGTH(name) <= 8),
    score INTEGER NOT NULL CHECK(score >= 0),
    created_at INTEGER NOT NULL
  );
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);`);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/leaderboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, score, created_at
      FROM scores
      ORDER BY score DESC, created_at ASC
      LIMIT 20
    `).all();

    res.json({
      data: rows,
      count: rows.length
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/score', (req, res) => {
  try {
    const { name, score } = req.body;

    if (!name || typeof name !== 'string' || name.length === 0 || name.length > 8) {
      return res.status(400).json({
        success: false,
        message: '昵称必须是1-8个字符'
      });
    }

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
      return res.status(400).json({
        success: false,
        message: '分数必须是非负整数'
      });
    }

    const id = uuidv4();
    const created_at = Date.now();

    db.prepare(`
      INSERT INTO scores (id, name, score, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), score, created_at);

    const entry = db.prepare(`
      SELECT id, name, score, created_at
      FROM scores
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: '分数提交成功',
      entry
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({
      success: false,
      message: '提交失败，请稍后重试'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
