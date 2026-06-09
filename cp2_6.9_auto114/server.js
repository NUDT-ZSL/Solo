import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const sampleDatasets = {
  population: {
    name: '全球人口趋势',
    description: '1960-2020年主要国家人口数据（单位：百万）',
    labels: ['1960', '1980', '2000', '2020'],
    columns: {
      China: [667, 981, 1262, 1411],
      India: [450, 696, 1056, 1380],
      USA: [180, 227, 282, 331],
      Japan: [93, 117, 127, 125],
      Brazil: [72, 121, 174, 212]
    }
  },
  carbon: {
    name: '碳排放量',
    description: '2000-2020年主要国家碳排放数据（单位：百万吨）',
    labels: ['2000', '2005', '2010', '2015', '2020'],
    columns: {
      China: [3350, 5940, 8260, 9830, 9930],
      USA: [5850, 5820, 5580, 5270, 4710],
      India: [910, 1210, 1720, 2220, 2600],
      Russia: [1450, 1520, 1670, 1610, 1570],
      Japan: [1180, 1230, 1140, 1210, 1040]
    }
  },
  ecommerce: {
    name: '电商销售',
    description: '2019-2023年电商平台销售数据',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    columns: {
      电子产品: [1200, 1350, 1500, 1800],
      服装: [800, 950, 1100, 1400],
      家居: [600, 700, 850, 1000],
      食品: [900, 1000, 1100, 1300],
      图书: [400, 450, 500, 600]
    }
  }
};

const stories = new Map();

function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

app.get('/api/datasets', (req, res) => {
  res.json(sampleDatasets);
});

app.get('/api/datasets/:id', (req, res) => {
  const { id } = req.params;
  if (sampleDatasets[id]) {
    res.json(sampleDatasets[id]);
  } else {
    res.status(404).json({ error: 'Dataset not found' });
  }
});

app.get('/api/stories', (req, res) => {
  res.json(Array.from(stories.values()).map(s => ({
    id: s.id,
    shortCode: s.shortCode,
    title: s.title,
    updatedAt: s.updatedAt
  })));
});

app.post('/api/stories', (req, res) => {
  const story = req.body;
  const id = story.id || uuidv4();
  const shortCode = story.shortCode || generateShortCode();
  const fullStory = {
    ...story,
    id,
    shortCode,
    createdAt: story.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  stories.set(id, fullStory);
  res.json(fullStory);
});

app.get('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  let story = null;
  for (const s of stories.values()) {
    if (s.id === id || s.shortCode === id) {
      story = s;
      break;
    }
  }
  if (story) {
    res.json(story);
  } else {
    res.status(404).json({ error: 'Story not found' });
  }
});

app.put('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  if (stories.has(id)) {
    const updated = {
      ...stories.get(id),
      ...req.body,
      id,
      updatedAt: new Date().toISOString()
    };
    stories.set(id, updated);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Story not found' });
  }
});

app.delete('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  if (stories.has(id)) {
    stories.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Story not found' });
  }
});

const storyClients = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const storyId = url.searchParams.get('storyId');
  
  if (!storyId) {
    ws.close();
    return;
  }

  if (!storyClients.has(storyId)) {
    storyClients.set(storyId, new Set());
  }
  storyClients.get(storyId).add(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const clients = storyClients.get(storyId);
      if (clients) {
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(message));
          }
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    const clients = storyClients.get(storyId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        storyClients.delete(storyId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
