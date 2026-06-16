const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = 3001;

const plantsFilePath = path.join(__dirname, 'data', 'plants.json');
const diariesFilePath = path.join(__dirname, 'data', 'diaries.json');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function readPlants() {
  try {
    const data = fs.readFileSync(plantsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writePlants(plants) {
  fs.writeFileSync(plantsFilePath, JSON.stringify(plants, null, 2));
}

function readDiaries() {
  try {
    const data = fs.readFileSync(diariesFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeDiaries(diaries) {
  fs.writeFileSync(diariesFilePath, JSON.stringify(diaries, null, 2));
}

const plantNames = ['香樟树', '桂花树', '梧桐树', '银杏树', '樱花树', '桃树', '柳树', '松树', '梅花树', '玉兰花'];

function initializePlants() {
  const plants = readPlants();
  if (plants.length === 0) {
    const initialPlants = [];
    for (let i = 0; i < 10; i++) {
      initialPlants.push({
        id: uuidv4(),
        name: plantNames[i],
        x: 50 + Math.random() * 500,
        y: 50 + Math.random() * 300,
        adopted: false,
        adoptedBy: null,
        adoptedAt: null,
        growthScore: Math.floor(Math.random() * 20),
        description: `一棵美丽的${plantNames[i]}，期待您的认养与陪伴。`
      });
    }
    writePlants(initialPlants);
    console.log('Initialized 10 plants');
  }
}

initializePlants();

app.get('/api/plants', (req, res) => {
  const plants = readPlants();
  res.json(plants);
});

app.post('/api/plants', (req, res) => {
  const plants = readPlants();
  const { name, x, y, userId, userName } = req.body;

  const newPlant = {
    id: uuidv4(),
    name: name || '新植物',
    x: x || Math.random() * 500 + 50,
    y: y || Math.random() * 300 + 50,
    adopted: true,
    adoptedBy: userId || 'anonymous',
    adoptedByName: userName || '匿名用户',
    adoptedAt: new Date().toISOString(),
    growthScore: 0,
    description: '一棵新认养的植物'
  };

  plants.push(newPlant);
  writePlants(plants);
  res.status(201).json(newPlant);
});

app.post('/api/plants/:id/adopt', (req, res) => {
  const plants = readPlants();
  const { id } = req.params;
  const { userId, userName } = req.body;

  const plantIndex = plants.findIndex(p => p.id === id);
  if (plantIndex === -1) {
    return res.status(404).json({ error: '植物不存在' });
  }

  if (plants[plantIndex].adopted) {
    return res.status(400).json({ error: '该植物已被认养' });
  }

  plants[plantIndex].adopted = true;
  plants[plantIndex].adoptedBy = userId || 'anonymous';
  plants[plantIndex].adoptedByName = userName || '匿名用户';
  plants[plantIndex].adoptedAt = new Date().toISOString();

  writePlants(plants);
  res.json(plants[plantIndex]);
});

app.get('/api/plants/:id/diaries', (req, res) => {
  const diaries = readDiaries();
  const { id } = req.params;
  const plantDiaries = diaries
    .filter(d => d.plantId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(plantDiaries);
});

app.post('/api/plants/:id/diaries', upload.single('image'), (req, res) => {
  const plants = readPlants();
  const diaries = readDiaries();
  const { id } = req.params;
  const { content, userId, userName } = req.body;

  const plantIndex = plants.findIndex(p => p.id === id);
  if (plantIndex === -1) {
    return res.status(404).json({ error: '植物不存在' });
  }

  const growthIncrease = Math.floor(Math.random() * 3) + 3;
  plants[plantIndex].growthScore = Math.min(
    100,
    plants[plantIndex].growthScore + growthIncrease
  );

  const newDiary = {
    id: uuidv4(),
    plantId: id,
    userId: userId || 'anonymous',
    userName: userName || '匿名用户',
    content: content || '',
    image: req.file ? `/uploads/${req.file.filename}` : null,
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
    growthIncrease
  };

  diaries.push(newDiary);
  writePlants(plants);
  writeDiaries(diaries);

  res.status(201).json({ diary: newDiary, plant: plants[plantIndex] });
});

app.post('/api/diaries/:id/like', (req, res) => {
  const diaries = readDiaries();
  const { id } = req.params;
  const { userId } = req.body;

  const diaryIndex = diaries.findIndex(d => d.id === id);
  if (diaryIndex === -1) {
    return res.status(404).json({ error: '日记不存在' });
  }

  const uid = userId || 'anonymous';
  const likedIndex = diaries[diaryIndex].likedBy.indexOf(uid);

  if (likedIndex === -1) {
    diaries[diaryIndex].likes += 1;
    diaries[diaryIndex].likedBy.push(uid);
  } else {
    diaries[diaryIndex].likes -= 1;
    diaries[diaryIndex].likedBy.splice(likedIndex, 1);
  }

  writeDiaries(diaries);
  res.json(diaries[diaryIndex]);
});

app.post('/api/diaries/:id/comments', (req, res) => {
  const diaries = readDiaries();
  const { id } = req.params;
  const { content, userId, userName } = req.body;

  const diaryIndex = diaries.findIndex(d => d.id === id);
  if (diaryIndex === -1) {
    return res.status(404).json({ error: '日记不存在' });
  }

  const newComment = {
    id: uuidv4(),
    userId: userId || 'anonymous',
    userName: userName || '匿名用户',
    content: content || '',
    createdAt: new Date().toISOString()
  };

  diaries[diaryIndex].comments.push(newComment);
  writeDiaries(diaries);

  res.status(201).json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
