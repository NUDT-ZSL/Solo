import express, { Request, Response } from 'express';
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

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  movable?: boolean;
}

interface Spike {
  x: number;
  y: number;
}

interface SwitchConfig {
  x: number;
  y: number;
  targetPlatformIndex: number;
}

interface LevelData {
  id: number;
  name: string;
  difficulty: number;
  platforms: Platform[];
  spikes: Spike[];
  switches: SwitchConfig[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
}

interface ProgressData {
  unlockedLevels: number[];
  completedLevels: number[];
}

const LEVELS_FILE = path.join(__dirname, 'levels.json');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

const defaultProgress: ProgressData = {
  unlockedLevels: [1],
  completedLevels: []
};

function readLevels(): LevelData[] {
  const data = fs.readFileSync(LEVELS_FILE, 'utf-8');
  return JSON.parse(data);
}

function readProgress(): ProgressData {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Progress file not found, using default');
  }
  return { ...defaultProgress };
}

function writeProgress(progress: ProgressData): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

app.get('/api/levels', (_req: Request, res: Response) => {
  try {
    const levels = readLevels();
    const levelList = levels.map(l => ({
      id: l.id,
      name: l.name,
      difficulty: l.difficulty
    }));
    res.json(levelList);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load levels' });
  }
});

app.get('/api/level/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const levels = readLevels();
    const level = levels.find(l => l.id === id);
    
    if (!level) {
      res.status(404).json({ error: 'Level not found' });
      return;
    }
    
    res.json(level);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load level' });
  }
});

app.get('/api/progress', (_req: Request, res: Response) => {
  try {
    const progress = readProgress();
    res.json(progress);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/progress', (req: Request, res: Response) => {
  try {
    const { completedLevel } = req.body as { completedLevel: number };
    
    if (!completedLevel || typeof completedLevel !== 'number') {
      res.status(400).json({ error: 'Invalid completedLevel' });
      return;
    }
    
    const levels = readLevels();
    const levelExists = levels.some(l => l.id === completedLevel);
    
    if (!levelExists) {
      res.status(404).json({ error: 'Level not found' });
      return;
    }
    
    const progress = readProgress();
    
    if (!progress.completedLevels.includes(completedLevel)) {
      progress.completedLevels.push(completedLevel);
    }
    
    const nextLevel = completedLevel + 1;
    if (levels.some(l => l.id === nextLevel) && !progress.unlockedLevels.includes(nextLevel)) {
      progress.unlockedLevels.push(nextLevel);
    }
    
    writeProgress(progress);
    
    res.json({ success: true, progress });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
