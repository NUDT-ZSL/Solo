import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

interface Plant {
  id: string;
  name: string;
  latinName: string;
  avatar: string;
  healthStatus: 'healthy' | 'warning' | 'danger';
  light: number;
  moisture: number;
  temperature: number;
  createdAt: string;
  description?: string;
}

interface CareRecord {
  id: string;
  plantId: string;
  type: 'water' | 'fertilize' | 'repot' | 'prune' | 'other';
  description: string;
  time: string;
  note?: string;
  likes: number;
  liked: boolean;
}

interface ExchangeItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  images: string[];
  location: { lat: number; lng: number; address: string };
  type: 'give' | 'want' | 'exchange';
  createdAt: string;
}

interface Message {
  id: string;
  exchangeId: string;
  fromUserId: string;
  fromUserName: string;
  content: string;
  createdAt: string;
}

interface DataStore {
  plants: Plant[];
  records: CareRecord[];
  exchanges: ExchangeItem[];
  messages: Message[];
}

const readData = (): DataStore => {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: DataStore) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/plants', (req, res) => {
  try {
    const data = readData();
    res.json(data.plants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

app.get('/api/plants/:id', (req, res) => {
  try {
    const data = readData();
    const plant = data.plants.find((p) => p.id === req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plant' });
  }
});

app.post('/api/plants', (req, res) => {
  try {
    const data = readData();
    const newPlant: Plant = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    data.plants.push(newPlant);
    writeData(data);
    res.status(201).json(newPlant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plant' });
  }
});

app.get('/api/plants/:id/records', (req, res) => {
  try {
    const data = readData();
    const records = data.records
      .filter((r) => r.plantId === req.params.id)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.post('/api/plants/:id/records', (req, res) => {
  try {
    const data = readData();
    const newRecord: CareRecord = {
      id: uuidv4(),
      plantId: req.params.id,
      ...req.body,
      likes: 0,
      liked: false,
    };
    data.records.push(newRecord);
    writeData(data);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create record' });
  }
});

app.post('/api/records/:id/like', (req, res) => {
  try {
    const data = readData();
    const record = data.records.find((r) => r.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (record.liked) {
      record.likes -= 1;
      record.liked = false;
    } else {
      record.likes += 1;
      record.liked = true;
    }
    writeData(data);
    res.json({ likes: record.likes, liked: record.liked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to like record' });
  }
});

app.get('/api/exchanges', (req, res) => {
  try {
    const data = readData();
    const exchanges = [...data.exchanges].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(exchanges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
});

app.post('/api/exchanges', (req, res) => {
  try {
    const data = readData();
    const newExchange: ExchangeItem = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    data.exchanges.push(newExchange);
    writeData(data);
    res.status(201).json(newExchange);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exchange' });
  }
});

app.post('/api/exchanges/:id/messages', (req, res) => {
  try {
    const data = readData();
    const newMessage: Message = {
      id: uuidv4(),
      exchangeId: req.params.id,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    data.messages.push(newMessage);
    writeData(data);
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/feed', (req, res) => {
  try {
    const data = readData();
    const feed = data.records
      .map((r) => {
        const plant = data.plants.find((p) => p.id === r.plantId);
        return {
          ...r,
          plantName: plant?.name || '未知植物',
          plantAvatar: plant?.avatar || '',
        };
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20);
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
