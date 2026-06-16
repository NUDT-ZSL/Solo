import express from 'express';
import cors from 'cors';
import type { Animal, ApplicationRecord, PersonalityTag, HealthStatus } from '../src/logic/AdoptionLogic';
import { generateId, calculateMatchScore, transitionStatus } from '../src/logic/AdoptionLogic';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const breedNames = [
  '中华田园犬', '金毛寻回犬', '拉布拉多', '柯基', '哈士奇',
  '柴犬', '边牧', '泰迪', '比熊', '博美',
  '橘猫', '英短', '美短', '布偶猫', '暹罗猫',
  '狸花猫', '三花猫', '奶牛猫', '黑猫', '白猫'
];

const personalityOptions: PersonalityTag[] = ['友好', '胆小', '活泼'];
const healthOptions: HealthStatus[] = ['已驱虫', '已疫苗', '已绝育'];
const animalNames = [
  '小黄', '豆豆', '花花', '球球', '毛毛', '旺财', '来福', '咪咪',
  '小白', '大黑', '阿黄', '小灰', '团团', '圆圆', '乐乐', '欢欢',
  '甜甜', '糖糖', '果果', '奶茶', '布丁', '可乐', '咖啡', '薯条'
];
const descriptions = [
  '这是一只非常可爱的小家伙，喜欢和人亲近，适合有爱心的家庭领养。',
  '它性格温顺，喜欢安静的环境，对陌生人会有一点害羞。',
  '活泼好动，精力充沛，需要经常陪伴和运动。',
  '非常聪明，学东西很快，已经学会了一些基本指令。',
  '曾经是流浪动物，现在已经恢复健康，渴望一个温暖的家。'
];

function generateAnimalPhoto(seed: string, width = 400, height = 300): string {
  const hue = Math.abs(seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 360;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 85%)"/>
      <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360}, 70%, 75%)"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width * 0.5}" cy="${height * 0.4}" r="${height * 0.22}" fill="hsl(${hue}, 60%, 60%)"/>
  <ellipse cx="${width * 0.38}" cy="${height * 0.35}" rx="${height * 0.08}" ry="${height * 0.1}" fill="hsl(${hue}, 60%, 55%)"/>
  <ellipse cx="${width * 0.62}" cy="${height * 0.35}" rx="${height * 0.08}" ry="${height * 0.1}" fill="hsl(${hue}, 60%, 55%)"/>
  <circle cx="${width * 0.42}" cy="${height * 0.38}" r="${height * 0.025}" fill="#333"/>
  <circle cx="${width * 0.58}" cy="${height * 0.38}" r="${height * 0.025}" fill="#333"/>
  <ellipse cx="${width * 0.5}" cy="${height * 0.46}" rx="${height * 0.03}" ry="${height * 0.02}" fill="#333"/>
  <text x="${width * 0.5}" y="${height * 0.85}" font-family="Arial" font-size="${height * 0.08}" fill="#666" text-anchor="middle">🐾 ${seed}</text>
</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function generateMockAnimals(count: number): Animal[] {
  const animals: Animal[] = [];
  for (let i = 0; i < count; i++) {
    const name = animalNames[i % animalNames.length];
    const breed = breedNames[i % breedNames.length];
    const personalityCount = 1 + (i % 3);
    const personalityTags: PersonalityTag[] = [];
    for (let j = 0; j < personalityCount; j++) {
      const tag = personalityOptions[(i + j) % personalityOptions.length];
      if (!personalityTags.includes(tag)) personalityTags.push(tag);
    }
    const healthCount = 1 + (i % 3);
    const healthStatus: HealthStatus[] = [];
    for (let j = 0; j < healthCount; j++) {
      const status = healthOptions[(i + j) % healthOptions.length];
      if (!healthStatus.includes(status)) healthStatus.push(status);
    }
    animals.push({
      id: generateId() + i,
      name: `${name}${Math.floor(i / animalNames.length) || ''}`,
      breed,
      age: 1 + (i % 10),
      gender: i % 2 === 0 ? '公' : '母',
      personalityTags,
      healthStatus,
      photo: generateAnimalPhoto(name + i),
      description: descriptions[i % descriptions.length],
      createdAt: Date.now() - i * 86400000
    });
  }
  return animals;
}

let animals: Animal[] = generateMockAnimals(500);
let applications: ApplicationRecord[] = [];

app.get('/api/animals', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedAnimals = animals.slice(start, end);
  res.json({
    animals: pagedAnimals,
    total: animals.length,
    page,
    pageSize
  });
});

app.get('/api/animals/:id', (req, res) => {
  const animal = animals.find(a => a.id === req.params.id);
  if (!animal) {
    res.status(404).json({ error: '动物不存在' });
    return;
  }
  res.json(animal);
});

app.post('/api/animals', (req, res) => {
  const { name, breed, age, gender, personalityTags, healthStatus, photo, description } = req.body;
  if (!name || !breed || !age || !gender || !personalityTags || !healthStatus || !photo) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const newAnimal: Animal = {
    id: generateId(),
    name,
    breed,
    age: parseInt(age, 10),
    gender,
    personalityTags,
    healthStatus,
    photo,
    description: description || '',
    createdAt: Date.now()
  };
  animals.unshift(newAnimal);
  res.json(newAnimal);
});

app.post('/api/applications', (req, res) => {
  const {
    animalId,
    applicantName,
    phone,
    age,
    housingType,
    hasExistingPets,
    petExperience
  } = req.body;

  const animal = animals.find(a => a.id === animalId);
  if (!animal) {
    res.status(404).json({ error: '动物不存在' });
    return;
  }

  const score = calculateMatchScore(animal, {
    applicantName,
    phone,
    age: String(age),
    housingType,
    hasExistingPets,
    petExperience
  });

  const newApplication: ApplicationRecord = {
    id: generateId(),
    animalId,
    animalName: animal.name,
    applicantName,
    phone,
    age: parseInt(age, 10),
    housingType,
    hasExistingPets: hasExistingPets === '是',
    petExperience,
    status: '待审核',
    matchScore: score,
    submittedAt: Date.now()
  };

  applications.unshift(newApplication);
  res.json(newApplication);
});

app.get('/api/applications', (req, res) => {
  res.json(applications);
});

app.patch('/api/applications/:id', (req, res) => {
  const { action } = req.body;
  const app = applications.find(a => a.id === req.params.id);
  if (!app) {
    res.status(404).json({ error: '申请不存在' });
    return;
  }
  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({ error: '无效的操作' });
    return;
  }
  app.status = transitionStatus(app.status, action);
  res.json(app);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, token: 'mock-admin-token', username: 'admin' });
  } else {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
