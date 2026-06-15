import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'beers.json');

app.use(cors());
app.use(express.json());

function readBeers() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeBeers(beers) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(beers, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

app.get('/api/beers', (req, res) => {
  const beers = readBeers();
  res.json(beers);
});

app.post('/api/beers', (req, res) => {
  const beers = readBeers();
  const { name, brewery, style, abv, rating, notes, flavorTags } = req.body;
  
  const newBeer = {
    id: generateId(),
    name,
    brewery,
    style,
    abv: parseFloat(abv),
    rating: parseInt(rating),
    notes,
    flavorTags: flavorTags || [],
    tastingRecords: [
      {
        id: generateId(),
        rating: parseInt(rating),
        notes,
        date: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString()
  };
  
  beers.unshift(newBeer);
  writeBeers(beers);
  res.status(201).json(newBeer);
});

app.get('/api/beers/:id', (req, res) => {
  const beers = readBeers();
  const beer = beers.find(b => b.id === req.params.id);
  
  if (!beer) {
    return res.status(404).json({ error: 'Beer not found' });
  }
  
  res.json(beer);
});

app.put('/api/beers/:id', (req, res) => {
  const beers = readBeers();
  const index = beers.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Beer not found' });
  }
  
  const { name, brewery, style, abv, rating, notes, flavorTags } = req.body;
  
  beers[index] = {
    ...beers[index],
    name,
    brewery,
    style,
    abv: parseFloat(abv),
    rating: parseInt(rating),
    notes,
    flavorTags: flavorTags || [],
    tastingRecords: [
      ...beers[index].tastingRecords,
      {
        id: generateId(),
        rating: parseInt(rating),
        notes,
        date: new Date().toISOString()
      }
    ]
  };
  
  writeBeers(beers);
  res.json(beers[index]);
});

app.delete('/api/beers/:id', (req, res) => {
  const beers = readBeers();
  const index = beers.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Beer not found' });
  }
  
  beers.splice(index, 1);
  writeBeers(beers);
  res.json({ success: true });
});

app.get('/api/beers/:id/recommendations', (req, res) => {
  const beers = readBeers();
  const currentBeer = beers.find(b => b.id === req.params.id);
  
  if (!currentBeer) {
    return res.status(404).json({ error: 'Beer not found' });
  }
  
  const currentTags = new Set(currentBeer.flavorTags);
  
  const scored = beers
    .filter(b => b.id !== req.params.id)
    .map(beer => {
      const beerTags = new Set(beer.flavorTags);
      const intersection = [...currentTags].filter(tag => beerTags.has(tag)).length;
      const union = new Set([...currentTags, ...beerTags]).size;
      const similarity = union === 0 ? 0 : intersection / union;
      return { beer, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6)
    .map(item => item.beer);
  
  res.json(scored);
});

app.get('/api/stats', (req, res) => {
  const beers = readBeers();
  
  if (beers.length === 0) {
    return res.json({
      totalBeers: 0,
      avgRating: 0,
      favoriteStyle: '-',
      favoriteTag: '-',
      radarData: [
        { dimension: '果香', value: 0 },
        { dimension: '花香', value: 0 },
        { dimension: '麦芽', value: 0 },
        { dimension: '烘烤', value: 0 },
        { dimension: '香料', value: 0 },
        { dimension: '清爽', value: 0 }
      ]
    });
  }
  
  const totalBeers = beers.length;
  const avgRating = (beers.reduce((sum, b) => sum + b.rating, 0) / totalBeers).toFixed(1);
  
  const styleCount = {};
  beers.forEach(b => {
    styleCount[b.style] = (styleCount[b.style] || 0) + 1;
  });
  const favoriteStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  const tagCount = {};
  beers.forEach(b => {
    b.flavorTags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  const favoriteTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  const flavorGroups = {
    '果香': ['柑橘', '热带水果', '莓果', '苹果', '蜂蜜', '甜润'],
    '花香': ['花香', '草本'],
    '麦芽': ['麦芽', '面包', '焦糖', '坚果'],
    '烘烤': ['烘烤', '巧克力', '咖啡', '烟熏', '橡木'],
    '香料': ['香料', '胡椒', '松木', '树脂'],
    '清爽': ['清爽', '干爽', '奶油', '苦涩']
  };
  
  const radarData = Object.entries(flavorGroups).map(([dimension, tags]) => {
    let count = 0;
    beers.forEach(b => {
      if (b.flavorTags.some(t => tags.includes(t))) {
        count++;
      }
    });
    return { dimension, value: Math.round((count / totalBeers) * 100) };
  });
  
  res.json({
    totalBeers,
    avgRating: parseFloat(avgRating),
    favoriteStyle,
    favoriteTag,
    radarData
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
