import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from './canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

const DATA_DIR = path.join(__dirname, '..', 'data');
const CANVAS_FILE = path.join(DATA_DIR, 'canvas.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

interface CanvasData {
  elements: CanvasElement[];
  version: number;
  lastModified: string;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  versionNumber: number;
  elements: CanvasElement[];
}

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CANVAS_FILE)) {
  const initialData: CanvasData = {
    elements: [],
    version: 1,
    lastModified: new Date().toISOString(),
  };
  fs.writeFileSync(CANVAS_FILE, JSON.stringify(initialData, null, 2));
}

if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
}

function readCanvasData(): CanvasData {
  const data = fs.readFileSync(CANVAS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeCanvasData(data: CanvasData) {
  fs.writeFileSync(CANVAS_FILE, JSON.stringify(data, null, 2));
}

function readHistory(): HistoryEntry[] {
  const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeHistory(history: HistoryEntry[]) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

app.get('/api/canvas', (req, res) => {
  try {
    const data = readCanvasData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read canvas data' });
  }
});

app.post('/api/canvas', (req, res) => {
  try {
    const { elements } = req.body;
    if (!Array.isArray(elements)) {
      res.status(400).json({ error: 'elements must be an array' });
      return;
    }
    for (const el of elements) {
      if (!el || typeof el !== 'object' || typeof el.id !== 'string' || typeof el.type !== 'string') {
        res.status(400).json({ error: 'each element must have id (string) and type (string)' });
        return;
      }
    }
    const existingData = readCanvasData();
    const newData: CanvasData = {
      elements,
      version: existingData.version + 1,
      lastModified: new Date().toISOString(),
    };
    writeCanvasData(newData);
    res.json({ success: true, timestamp: newData.lastModified });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save canvas data' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const history = readHistory();
    const recentHistory = history
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
    res.json(recentHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read history' });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const { elements } = req.body;
    if (!Array.isArray(elements)) {
      res.status(400).json({ error: 'elements must be an array' });
      return;
    }
    const history = readHistory();
    const entry: HistoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      versionNumber: history.length + 1,
      elements,
    };
    history.push(entry);
    if (history.length > 100) {
      history.shift();
    }
    writeHistory(history);
    res.json({ success: true, id: entry.id, timestamp: entry.timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create history snapshot' });
  }
});

app.post('/api/history/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const history = readHistory();
    const entry = history.find((h) => h.id === id);
    
    if (!entry) {
      res.status(404).json({ error: 'History entry not found' });
      return;
    }

    const existingData = readCanvasData();
    const newData: CanvasData = {
      elements: entry.elements,
      version: existingData.version + 1,
      lastModified: new Date().toISOString(),
    };
    writeCanvasData(newData);

    res.json({ success: true, timestamp: newData.lastModified });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore history' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
