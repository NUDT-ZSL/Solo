const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const PREFERENCES_FILE = path.join(DATA_DIR, 'preferences.json');
const CONFIGS_FILE = path.join(DATA_DIR, 'window_configs.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return null;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const defaultConfigs = {
  id: uuidv4(),
  windows: {
    circle: { radius: 1, position: 'wall' },
    arch: { width: 1.5, height: 2, position: 'wall' },
    fullLength: { width: 2, height: 2.8, position: 'floor' },
    skylight: { width: 1.2, height: 1.2, position: 'ceiling' },
  },
};

if (!fs.existsSync(CONFIGS_FILE)) {
  writeJson(CONFIGS_FILE, defaultConfigs);
}

app.get('/api/preferences', (req, res) => {
  const prefs = readJson(PREFERENCES_FILE);
  res.json({ preferences: prefs || { windowType: 'circle', orientation: 180, time: 12, season: 'summer' } });
});

app.put('/api/preferences', (req, res) => {
  const { preferences } = req.body;
  if (preferences) {
    writeJson(PREFERENCES_FILE, preferences);
    res.json({ success: true, preferences });
  } else {
    res.status(400).json({ error: 'Missing preferences' });
  }
});

app.get('/api/window-configs', (req, res) => {
  const configs = readJson(CONFIGS_FILE);
  res.json(configs || defaultConfigs);
});

app.put('/api/window-configs', (req, res) => {
  const configs = req.body;
  configs.id = uuidv4();
  writeJson(CONFIGS_FILE, configs);
  res.json({ success: true, configs });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
