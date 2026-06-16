import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/plates', (_req, res) => {
  try {
    const platesPath = path.join(__dirname, 'plates.json');
    const platesData = JSON.parse(fs.readFileSync(platesPath, 'utf-8'));
    res.json(platesData);
  } catch (error) {
    console.error('Error reading plates.json:', error);
    res.status(500).json({ error: 'Failed to read plates data' });
  }
});

app.get('/api/events', (_req, res) => {
  try {
    const eventsPath = path.join(__dirname, 'events.json');
    const eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
    res.json(eventsData);
  } catch (error) {
    console.error('Error reading events.json:', error);
    res.status(500).json({ error: 'Failed to read events data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET /api/plates - Plate configuration data`);
  console.log(`  GET /api/events - Preset geological events`);
});
