import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbPath = path.join(__dirname, '..', 'emojis.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS emoji_history (
    id TEXT PRIMARY KEY,
    image_data TEXT NOT NULL,
    emotion TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    params_json TEXT NOT NULL
  )
`);

app.get('/api/history', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, image_data, emotion, created_at, params_json
      FROM emoji_history
      ORDER BY created_at DESC
    `).all();
    
    const history = rows.map(row => ({
      id: row.id,
      imageData: row.image_data,
      emotion: row.emotion,
      createdAt: row.created_at,
      params: JSON.parse(row.params_json)
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const { id, imageData, emotion, params } = req.body;
    
    if (!imageData || !emotion || !params) {
      return res.status(400).json({ error: 'imageData, emotion, and params are required' });
    }
    
    const recordId = id || uuidv4();
    const paramsJson = JSON.stringify(params);
    
    const stmt = db.prepare(`
      INSERT INTO emoji_history (id, image_data, emotion, params_json)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(recordId, imageData, emotion, paramsJson);
    
    const savedRecord = db.prepare(`
      SELECT id, image_data, emotion, created_at, params_json
      FROM emoji_history
      WHERE id = ?
    `).get(recordId);
    
    res.json({
      id: savedRecord.id,
      imageData: savedRecord.image_data,
      emotion: savedRecord.emotion,
      createdAt: savedRecord.created_at,
      params: JSON.parse(savedRecord.params_json)
    });
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM emoji_history WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
