import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/records.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ArchConfig {
  id: string;
  name: string;
  type: 'semicircular' | 'pointed' | 'horseshoe';
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
}

interface TestRecord {
  id: string;
  timestamp: number;
  archType: string;
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
  maxLoad: number;
  failureMode: string;
  duration: number;
  crackedBlocks: number[];
}

interface QuizQuestion {
  id: number;
  question: string;
  answer: boolean;
  explanation: string;
}

interface Achievement {
  id: string;
  name: string;
  timestamp: number;
  description: string;
}

interface DataStore {
  archConfigs: ArchConfig[];
  testRecords: TestRecord[];
  achievements: Achievement[];
  quizQuestions: QuizQuestion[];
}

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/configs', (_req, res) => {
  try {
    const data = readData();
    res.json(data.archConfigs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load configs' });
  }
});

app.get('/api/records', (_req, res) => {
  try {
    const data = readData();
    const sorted = data.testRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load records' });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const record: Omit<TestRecord, 'id' | 'timestamp'> = req.body;
    const data = readData();
    const newRecord: TestRecord = {
      ...record,
      id: uuidv4(),
      timestamp: Date.now()
    };
    data.testRecords.push(newRecord);
    writeData(data);
    res.json(newRecord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save record' });
  }
});

app.get('/api/quiz', (_req, res) => {
  try {
    const data = readData();
    res.json(data.quizQuestions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

app.get('/api/achievements', (_req, res) => {
  try {
    const data = readData();
    res.json(data.achievements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load achievements' });
  }
});

app.post('/api/achievements', (req, res) => {
  try {
    const achievement: Omit<Achievement, 'id' | 'timestamp'> = req.body;
    const data = readData();
    const exists = data.achievements.find(a => a.name === achievement.name);
    if (exists) {
      return res.json(exists);
    }
    const newAchievement: Achievement = {
      ...achievement,
      id: uuidv4(),
      timestamp: Date.now()
    };
    data.achievements.push(newAchievement);
    writeData(data);
    res.json(newAchievement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save achievement' });
  }
});

app.listen(PORT, () => {
  console.log(`Arch Simulator API server running on port ${PORT}`);
});
