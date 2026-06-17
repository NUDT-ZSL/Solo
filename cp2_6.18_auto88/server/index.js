import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PLANTS_FILE = path.join(DATA_DIR, 'plants.json');
const GARDEN_FILE = path.join(DATA_DIR, 'garden.json');

app.use(cors());
app.use(express.json());

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing file:', err);
    return false;
  }
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/api/plants', (req, res) => {
  const plants = readJsonFile(PLANTS_FILE);
  if (!plants) {
    return res.status(500).json({ error: 'Failed to read plants data' });
  }
  res.json(plants);
});

app.get('/api/garden', (req, res) => {
  const garden = readJsonFile(GARDEN_FILE);
  if (!garden) {
    return res.status(500).json({ error: 'Failed to read garden data' });
  }
  res.json(garden.plants || []);
});

app.post('/api/garden', (req, res) => {
  const { plantId, position, potColor } = req.body;

  if (!plantId || !position || !potColor) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const plants = readJsonFile(PLANTS_FILE);
  const plantData = plants.find(p => p.id === plantId);
  if (!plantData) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  const garden = readJsonFile(GARDEN_FILE);
  if (!garden.plants) {
    garden.plants = [];
  }

  const newPlant = {
    id: uuidv4(),
    plantId,
    position,
    potColor,
    addedDate: getCurrentDate(),
    currentHeight: plantData.defaultHeight,
    wateringRecords: []
  };

  garden.plants.push(newPlant);

  if (!writeJsonFile(GARDEN_FILE, garden)) {
    return res.status(500).json({ error: 'Failed to save garden data' });
  }

  res.status(201).json(newPlant);
});

app.delete('/api/garden/:id', (req, res) => {
  const { id } = req.params;
  const garden = readJsonFile(GARDEN_FILE);

  if (!garden.plants) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  const index = garden.plants.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  garden.plants.splice(index, 1);

  if (!writeJsonFile(GARDEN_FILE, garden)) {
    return res.status(500).json({ error: 'Failed to save garden data' });
  }

  res.json({ success: true });
});

app.post('/api/watering', (req, res) => {
  const { plantId, amount, note } = req.body;

  if (!plantId || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (amount < 50 || amount > 500) {
    return res.status(400).json({ error: 'Amount must be between 50 and 500' });
  }

  const garden = readJsonFile(GARDEN_FILE);
  if (!garden.plants) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  const plant = garden.plants.find(p => p.id === plantId);
  if (!plant) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  const record = {
    id: uuidv4(),
    date: getCurrentDate(),
    amount,
    note: note || ''
  };

  if (!plant.wateringRecords) {
    plant.wateringRecords = [];
  }
  plant.wateringRecords.unshift(record);

  plant.currentHeight = Number((plant.currentHeight + 0.5).toFixed(1));

  if (!writeJsonFile(GARDEN_FILE, garden)) {
    return res.status(500).json({ error: 'Failed to save garden data' });
  }

  res.status(201).json(record);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
