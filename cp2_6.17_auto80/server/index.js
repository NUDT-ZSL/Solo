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

app.use(cors());
app.use(express.json());

const plantsDataPath = path.join(__dirname, 'data', 'plants.json');
const gardenDataPath = path.join(__dirname, 'data', 'garden.json');

const readJSON = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJSON = (filePath, data) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/plants', (req, res) => {
  try {
    const plants = readJSON(plantsDataPath);
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

app.get('/api/garden', (req, res) => {
  try {
    const garden = readJSON(gardenDataPath);
    res.json(garden);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch garden' });
  }
});

app.post('/api/garden', (req, res) => {
  try {
    const { plantId, position, potColor } = req.body;
    const plants = readJSON(plantsDataPath);
    const plantTemplate = plants.find(p => p.id === plantId);
    
    if (!plantTemplate) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const garden = readJSON(gardenDataPath);
    const newPlant = {
      id: uuidv4(),
      plantId: plantTemplate.id,
      name: plantTemplate.name,
      lightPreference: plantTemplate.lightPreference,
      defaultHeight: plantTemplate.defaultHeight,
      currentHeight: plantTemplate.defaultHeight,
      color: plantTemplate.color,
      potColor: potColor || '#8B4513',
      position: position || { x: 0, z: 0 },
      addedDate: new Date().toISOString().split('T')[0],
      wateringRecords: []
    };

    garden.push(newPlant);
    writeJSON(gardenDataPath, garden);
    res.json(newPlant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add plant' });
  }
});

app.delete('/api/garden/:id', (req, res) => {
  try {
    const { id } = req.params;
    let garden = readJSON(gardenDataPath);
    const initialLength = garden.length;
    garden = garden.filter(p => p.id !== id);
    
    if (garden.length === initialLength) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    writeJSON(gardenDataPath, garden);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

app.post('/api/watering', (req, res) => {
  try {
    const { plantId, amount, note } = req.body;
    let garden = readJSON(gardenDataPath);
    const plantIndex = garden.findIndex(p => p.id === plantId);
    
    if (plantIndex === -1) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const wateringRecord = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      amount,
      note: note || ''
    };

    garden[plantIndex].wateringRecords.unshift(wateringRecord);
    writeJSON(gardenDataPath, garden);
    res.json(wateringRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record watering' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
