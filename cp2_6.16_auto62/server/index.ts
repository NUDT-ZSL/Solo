import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '../src/data/plants.json');

app.use(cors());
app.use(express.json());

type LightPreference = 'direct' | 'scattered' | 'shady';
type LocationPreference = 'balcony' | 'living_room' | 'bedroom';
type CareType = 'water' | 'fertilize';

interface CareRecord {
  id: string;
  type: CareType;
  time: string;
  operator: string;
}

interface Plant {
  id: string;
  name: string;
  variety: string;
  lightPreference: LightPreference;
  locationPreference: LocationPreference;
  waterInterval: number;
  fertilizeInterval: number;
  lastWaterTime: string;
  lastFertilizeTime: string;
  careRecords: CareRecord[];
  isSucculent: boolean;
}

interface NeedCareItem {
  plantId: string;
  plantName: string;
  type: CareType;
  daysOverdue: number;
}

let cachedNeedCare: NeedCareItem[] = [];

function readPlants(): Plant[] {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as Plant[];
}

function writePlants(plants: Plant[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(plants, null, 2), 'utf-8');
}

function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay);
}

function checkNeedCare(): NeedCareItem[] {
  const plants = readPlants();
  const now = new Date();
  const result: NeedCareItem[] = [];

  for (const plant of plants) {
    const lastWater = new Date(plant.lastWaterTime);
    const nextWater = new Date(lastWater.getTime() + plant.waterInterval * 24 * 60 * 60 * 1000);
    const daysToWater = daysBetween(now, nextWater);

    if (daysToWater >= 0) {
      result.push({
        plantId: plant.id,
        plantName: plant.name,
        type: 'water',
        daysOverdue: daysToWater,
      });
    }

    const lastFertilize = new Date(plant.lastFertilizeTime);
    const nextFertilize = new Date(lastFertilize.getTime() + plant.fertilizeInterval * 24 * 60 * 60 * 1000);
    const daysToFertilize = daysBetween(now, nextFertilize);

    if (daysToFertilize >= 0) {
      result.push({
        plantId: plant.id,
        plantName: plant.name,
        type: 'fertilize',
        daysOverdue: daysToFertilize,
      });
    }
  }

  return result;
}

function runDailyCheck() {
  console.log(`[${new Date().toLocaleString()}] 执行每日养护检查...`);
  cachedNeedCare = checkNeedCare();
  console.log(`发现 ${cachedNeedCare.length} 项待养护任务`);
}

app.get('/api/plants', (_req: Request, res: Response<Plant[]>) => {
  try {
    const plants = readPlants();
    res.json(plants);
  } catch (err) {
    res.status(500).json([] as unknown as Plant[]);
  }
});

app.get('/api/plants/:id', (req: Request, res: Response<Plant | { error: string }>) => {
  try {
    const plants = readPlants();
    const plant = plants.find(p => p.id === req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/plants', (req: Request<{}, {}, Partial<Plant>>, res: Response<Plant | { error: string }>) => {
  try {
    const plants = readPlants();
    const isSucculent = req.body.isSucculent ?? false;
    const newPlant: Plant = {
      id: uuidv4(),
      name: req.body.name || '新植物',
      variety: req.body.variety || '未知品种',
      lightPreference: req.body.lightPreference || 'scattered',
      locationPreference: req.body.locationPreference || 'living_room',
      waterInterval: isSucculent ? 14 : 7,
      fertilizeInterval: isSucculent ? 30 : 21,
      lastWaterTime: req.body.lastWaterTime || new Date().toISOString(),
      lastFertilizeTime: req.body.lastFertilizeTime || new Date().toISOString(),
      careRecords: [],
      isSucculent,
    };
    plants.push(newPlant);
    writePlants(plants);
    res.status(201).json(newPlant);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/plants/:id', (req: Request<{ id: string }, {}, Partial<Plant>>, res: Response<Plant | { error: string }>) => {
  try {
    const plants = readPlants();
    const idx = plants.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    const updated = { ...plants[idx], ...req.body } as Plant;
    plants[idx] = updated;
    writePlants(plants);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/plants/:id', (req: Request, res: Response<{ success: boolean } | { error: string }>) => {
  try {
    const plants = readPlants();
    const filtered = plants.filter(p => p.id !== req.params.id);
    if (filtered.length === plants.length) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    writePlants(filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/plants/:id/care', (req: Request<{ id: string }, {}, { type: CareType; operator: string }>, res: Response<Plant | { error: string }>) => {
  try {
    const plants = readPlants();
    const idx = plants.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    const now = new Date();
    const record: CareRecord = {
      id: uuidv4(),
      type: req.body.type,
      time: now.toISOString(),
      operator: req.body.operator || '主人',
    };
    plants[idx].careRecords.unshift(record);
    if (req.body.type === 'water') {
      plants[idx].lastWaterTime = now.toISOString();
    } else if (req.body.type === 'fertilize') {
      plants[idx].lastFertilizeTime = now.toISOString();
    }
    writePlants(plants);
    res.json(plants[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/plants/need-care', (_req: Request, res: Response<NeedCareItem[]>) => {
  res.json(cachedNeedCare);
});

app.listen(PORT, () => {
  console.log(`🌱 植物养护后端服务运行在 http://localhost:${PORT}`);
  runDailyCheck();
  setInterval(runDailyCheck, 24 * 60 * 60 * 1000);
});
