import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readPresets(): any[] {
  ensureDataDir();
  if (!fs.existsSync(PRESETS_FILE)) {
    fs.writeFileSync(PRESETS_FILE, '[]', 'utf-8');
    return [];
  }
  const raw = fs.readFileSync(PRESETS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writePresets(presets: any[]) {
  ensureDataDir();
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
}

function appendLog(logEntry: any) {
  ensureDataDir();
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, '', 'utf-8');
  }
  fs.appendFileSync(LOGS_FILE, JSON.stringify(logEntry) + '\n', 'utf-8');
}

app.post('/api/save-preset', (req, res) => {
  try {
    const { name, heights, brushRadius, smoothIterations } = req.body;
    if (!name || !heights) {
      res.status(400).json({ success: false, data: null, message: 'Missing required fields' });
      return;
    }
    const presets = readPresets();
    const newPreset = {
      id: uuidv4(),
      name,
      heights,
      brushRadius: brushRadius || 40,
      smoothIterations: smoothIterations || 2,
      createdAt: new Date().toISOString(),
    };
    presets.push(newPreset);
    writePresets(presets);
    res.json({ success: true, data: newPreset, message: 'Preset saved' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.get('/api/load-presets', (_req, res) => {
  try {
    const presets = readPresets();
    res.json({ success: true, data: presets, message: 'Presets loaded' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.get('/api/load-preset/:id', (req, res) => {
  try {
    const presets = readPresets();
    const preset = presets.find((p: any) => p.id === req.params.id);
    if (!preset) {
      res.status(404).json({ success: false, data: null, message: 'Preset not found' });
      return;
    }
    res.json({ success: true, data: preset, message: 'Preset loaded' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.post('/api/log-action', (req, res) => {
  try {
    const { action, brushRadius, smoothIterations } = req.body;
    if (!action) {
      res.status(400).json({ success: false, data: null, message: 'Missing action field' });
      return;
    }
    const logEntry = {
      action,
      timestamp: new Date().toISOString(),
      brushRadius: brushRadius || null,
      smoothIterations: smoothIterations || null,
    };
    appendLog(logEntry);
    res.json({ success: true, data: logEntry, message: 'Action logged' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
