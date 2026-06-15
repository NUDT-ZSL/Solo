import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

interface Garden {
  id: number;
  name: string;
  userId: string;
  isPublic: number;
  likes: number;
  createdAt: string;
  plants?: Plant[];
}

interface Plant {
  id: number;
  gardenId: number;
  plantType: string;
  gridIndex: number;
  growthProgress: number;
  health: number;
  stage: number;
  plantedAt: string;
  lastWateredAt: string;
  lastFertilizedAt: string;
}

interface Message {
  id: number;
  gardenId: number;
  userName: string;
  content: string;
  createdAt: string;
}

let gardenIdCounter = 1;
let plantIdCounter = 1;
let messageIdCounter = 1;

const gardens: Garden[] = [];
const plants: Plant[] = [];
const messages: Message[] = [];

const plantTypes = ['sunflower', 'moonflower', 'startree', 'rose', 'cactus', 'tulip', 'orchid', 'bamboo', 'lavender', 'cherry'];

const sampleGardens = [
  { name: '阳光花园', userId: 'user_001' },
  { name: '月光秘境', userId: 'user_002' },
  { name: '星辰之园', userId: 'user_003' },
  { name: '彩虹苗圃', userId: 'user_004' },
  { name: '绿野仙踪', userId: 'user_005' },
];

sampleGardens.forEach((g, idx) => {
  const gardenId = gardenIdCounter++;
  gardens.push({
    id: gardenId,
    name: g.name,
    userId: g.userId,
    isPublic: 1,
    likes: Math.floor(Math.random() * 100),
    createdAt: new Date().toISOString(),
  });

  const plantCount = 5 + Math.floor(Math.random() * 15);
  const usedIndices = new Set<number>();

  for (let i = 0; i < plantCount; i++) {
    let gridIndex;
    do {
      gridIndex = Math.floor(Math.random() * 81);
    } while (usedIndices.has(gridIndex));
    usedIndices.add(gridIndex);

    const plantType = plantTypes[Math.floor(Math.random() * plantTypes.length)];
    const growthProgress = Math.floor(Math.random() * 100);
    const stage = growthProgress < 33 ? 0 : growthProgress < 66 ? 1 : 2;

    plants.push({
      id: plantIdCounter++,
      gardenId,
      plantType,
      gridIndex,
      growthProgress,
      health: 50 + Math.floor(Math.random() * 50),
      stage,
      plantedAt: new Date().toISOString(),
      lastWateredAt: new Date().toISOString(),
      lastFertilizedAt: new Date().toISOString(),
    });
  }

  const sampleMessagesData = [
    { userName: '园艺爱好者', content: '这个花园真漂亮！' },
    { userName: '植物达人', content: '稀有品种好多啊~' },
    { userName: '小花匠', content: '学习了，我的花园也要这样弄！' },
  ];
  sampleMessagesData.forEach((msg) => {
    messages.push({
      id: messageIdCounter++,
      gardenId,
      userName: msg.userName,
      content: msg.content,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    });
  });
});

app.get('/gardens', (req, res) => {
  const publicGardens = gardens
    .filter((g) => g.isPublic === 1)
    .map((g) => ({ ...g, plants: plants.filter((p) => p.gardenId === g.id) }))
    .sort((a, b) => b.likes - a.likes);
  res.json(publicGardens);
});

app.get('/gardens/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const garden = gardens.find((g) => g.id === id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const gardenPlants = plants.filter((p) => p.gardenId === id);
  res.json({ ...garden, plants: gardenPlants });
});

app.post('/gardens', (req, res) => {
  const { name, userId } = req.body;
  const newGarden: Garden = {
    id: gardenIdCounter++,
    name: name || '我的植物园',
    userId: userId || 'user_local',
    isPublic: 1,
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  gardens.push(newGarden);
  res.json({ ...newGarden, plants: [] });
});

app.get('/gardens/:id/plants', (req, res) => {
  const id = parseInt(req.params.id);
  const gardenPlants = plants.filter((p) => p.gardenId === id);
  res.json(gardenPlants);
});

app.post('/gardens/:id/plants', (req, res) => {
  const gardenId = parseInt(req.params.id);
  const { plantType, gridIndex } = req.body;
  const newPlant: Plant = {
    id: plantIdCounter++,
    gardenId,
    plantType,
    gridIndex,
    growthProgress: 0,
    health: 100,
    stage: 0,
    plantedAt: new Date().toISOString(),
    lastWateredAt: new Date().toISOString(),
    lastFertilizedAt: new Date().toISOString(),
  };
  plants.push(newPlant);
  res.json(newPlant);
});

app.put('/plants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { growthProgress, health, stage } = req.body;
  const plant = plants.find((p) => p.id === id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  if (growthProgress !== undefined) plant.growthProgress = growthProgress;
  if (health !== undefined) plant.health = health;
  if (stage !== undefined) plant.stage = stage;
  res.json(plant);
});

app.post('/plants/:id/water', (req, res) => {
  const id = parseInt(req.params.id);
  const plant = plants.find((p) => p.id === id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  plant.health = Math.min(100, plant.health + 20);
  plant.lastWateredAt = new Date().toISOString();
  res.json(plant);
});

app.post('/plants/:id/fertilize', (req, res) => {
  const id = parseInt(req.params.id);
  const plant = plants.find((p) => p.id === id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  plant.growthProgress = Math.min(100, plant.growthProgress + 10);
  plant.stage = plant.growthProgress < 33 ? 0 : plant.growthProgress < 66 ? 1 : 2;
  plant.lastFertilizedAt = new Date().toISOString();
  res.json(plant);
});

app.delete('/plants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = plants.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Plant not found' });
  plants.splice(idx, 1);
  res.json({ success: true, id });
});

app.post('/gardens/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  const garden = gardens.find((g) => g.id === id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  garden.likes = garden.likes + 1;
  res.json({ likes: garden.likes });
});

app.get('/gardens/:id/messages', (req, res) => {
  const id = parseInt(req.params.id);
  const gardenMessages = messages
    .filter((m) => m.gardenId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json(gardenMessages);
});

app.post('/gardens/:id/messages', (req, res) => {
  const gardenId = parseInt(req.params.id);
  const { userName, content } = req.body;
  const newMessage: Message = {
    id: messageIdCounter++,
    gardenId,
    userName: userName || '访客',
    content,
    createdAt: new Date().toISOString(),
  };
  messages.push(newMessage);
  res.json(newMessage);
});

app.listen(PORT, () => {
  console.log(`Garden server running on http://localhost:${PORT}`);
});
