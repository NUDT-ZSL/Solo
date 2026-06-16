import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 }
});

const mockInstruments = [
  {
    id: '1',
    name: '马丁D-28原声吉他',
    brand: 'Martin',
    model: 'D-28',
    price: 12800,
    condition: 'like-new',
    conditionScore: 92,
    images: [
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556449895-a33c9dba33dd?w=800&h=600&fit=crop'
    ],
    description: '2020年购于香港通利琴行，保养极佳，仅在家使用。配置为阿迪朗达克云杉面板，印度玫瑰木背侧板，音色温暖通透。',
    sellerId: 'u1',
    sellerName: '音乐爱好者小王',
    createdAt: '2026-06-01T10:00:00.000Z',
    reportId: 'r1'
  },
  {
    id: '2',
    name: 'Gibson Les Paul Standard',
    brand: 'Gibson',
    model: 'Les Paul Standard',
    price: 15500,
    condition: 'used',
    conditionScore: 72,
    images: [
      'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&h=600&fit=crop'
    ],
    description: '2018年美产，有轻微使用痕迹，琴颈背面有一处小划痕。拾音器更换为Seymour Duncan，音色非常棒。',
    sellerId: 'u2',
    sellerName: '吉他手老张',
    createdAt: '2026-06-05T14:30:00.000Z',
    reportId: 'r2'
  },
  {
    id: '3',
    name: 'Fender Stratocaster 美专II',
    brand: 'Fender',
    model: 'Stratocaster',
    price: 9800,
    condition: 'like-new',
    conditionScore: 88,
    images: [
      'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1572314525491-1c4970b07726?w=800&h=600&fit=crop'
    ],
    description: '2022年美产专业系列，3色渐变漆面，几乎全新，只弹过几次。原厂配件齐全。',
    sellerId: 'u3',
    sellerName: '新手玩家小李',
    createdAt: '2026-06-08T09:15:00.000Z',
    reportId: 'r3'
  },
  {
    id: '4',
    name: 'Yamaha FG800 民谣吉他',
    brand: 'Yamaha',
    model: 'FG800',
    price: 1200,
    condition: 'used',
    conditionScore: 65,
    images: [
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&h=600&fit=crop'
    ],
    description: '2019年购入，入门神器。有使用痕迹，品丝有轻微磨损，不影响使用。适合初学者。',
    sellerId: 'u4',
    sellerName: '毕业清仓',
    createdAt: '2026-06-10T16:45:00.000Z',
    reportId: 'r4'
  },
  {
    id: '5',
    name: 'Taylor 814ce 电箱吉他',
    brand: 'Taylor',
    model: '814ce',
    price: 16800,
    condition: 'new',
    conditionScore: 96,
    images: [
      'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop'
    ],
    description: '2023年全新购入，几乎未使用。西加云杉面板，玫瑰木背侧板，ES2拾音器，手感极佳。',
    sellerId: 'u5',
    sellerName: '收藏达人',
    createdAt: '2026-06-12T11:00:00.000Z',
    reportId: 'r5'
  },
  {
    id: '6',
    name: 'Ibanez RG550 电吉他',
    brand: 'Ibanez',
    model: 'RG550',
    price: 4800,
    condition: 'damaged',
    conditionScore: 45,
    images: [
      'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=800&h=600&fit=crop'
    ],
    description: '日产经典型号，琴身有磕碰，品丝磨损较严重，需要更换。但所有电路和拾音器都正常工作。适合动手能力强的玩家。',
    sellerId: 'u6',
    sellerName: '维修师傅阿强',
    createdAt: '2026-06-13T20:30:00.000Z',
    reportId: 'r6'
  },
  {
    id: '7',
    name: 'PRS SE Standard 24',
    brand: 'PRS',
    model: 'SE Standard',
    price: 4200,
    condition: 'like-new',
    conditionScore: 85,
    images: [
      'https://images.unsplash.com/photo-1550985616-10810253b84d?w=800&h=600&fit=crop'
    ],
    description: '2021年印尼产，虎纹贴面非常漂亮。使用爱惜，无磕碰划痕。配件齐全。',
    sellerId: 'u7',
    sellerName: '设备玩家',
    createdAt: '2026-06-14T13:20:00.000Z',
    reportId: 'r7'
  },
  {
    id: '8',
    name: 'Epiphone Casino 爵士吉他',
    brand: 'Epiphone',
    model: 'Casino',
    price: 2500,
    condition: 'used',
    conditionScore: 70,
    images: [
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=600&fit=crop'
    ],
    description: '2017年款，复古风格。琴颈有几处小划痕，不影响弹奏。P90拾音器音色很有味道。',
    sellerId: 'u8',
    sellerName: '布鲁斯爱好者',
    createdAt: '2026-06-15T08:45:00.000Z',
    reportId: 'r8'
  }
];

const mockUsers = [
  { id: 'u1', username: '音乐爱好者小王', email: 'wang@test.com', password: '123456' },
  { id: 'u2', username: '吉他手老张', email: 'zhang@test.com', password: '123456' },
  { id: 'u3', username: '新手玩家小李', email: 'li@test.com', password: '123456' }
];

const mockFavorites = [
  { id: 'f1', userId: 'u1', instrumentId: '3', createdAt: '2026-06-10T00:00:00.000Z' },
  { id: 'f2', userId: 'u1', instrumentId: '5', createdAt: '2026-06-12T00:00:00.000Z' }
];

const mockTransactions = [
  {
    id: 't1',
    instrumentId: '100',
    instrumentName: 'Yamaha C40古典吉他',
    buyerId: 'u1',
    buyerName: '音乐爱好者小王',
    sellerId: 'u9',
    sellerName: '老吉他手',
    price: 600,
    createdAt: '2026-05-20T14:30:00.000Z'
  },
  {
    id: 't2',
    instrumentId: '101',
    instrumentName: 'Fender Telecaster',
    buyerId: 'u2',
    buyerName: '吉他手老张',
    sellerId: 'u1',
    sellerName: '音乐爱好者小王',
    price: 8500,
    createdAt: '2026-06-01T10:15:00.000Z'
  }
];

const reportCache = new Map();

function analyzeImageMock(fileBuffer, imageIndex) {
  const seed = fileBuffer.length + imageIndex * 1000;
  const seededRandom = (s) => {
    let x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  
  const random = seededRandom(seed);
  const brightness = 0.3 + random() * 0.5;
  const noise = 0.05 + random() * 0.15;
  const edges = Math.floor(random() * 5000) + 1000;
  
  return { brightness, noise, edges };
}

function generateFlawsMock(score, imageCount) {
  const flaws = [];
  const flawDescriptions = [
    '琴颈轻微划痕', '指板磨损痕迹', '琴身漆面小磕碰',
    '金属部件氧化', '面板轻微划痕', '背板磨损',
    '琴桥位置痕迹', '品丝磨损', '护板划痕',
    '旋钮松动', '琴弦锈迹', '音孔周围磨损'
  ];
  
  const flawCount = Math.floor((100 - score) / 12) + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < Math.min(flawCount, 6); i++) {
    flaws.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      w: 0.05 + Math.random() * 0.12,
      h: 0.05 + Math.random() * 0.12,
      description: flawDescriptions[Math.floor(Math.random() * flawDescriptions.length)],
      imageIndex: Math.floor(Math.random() * Math.max(1, imageCount))
    });
  }
  
  return flaws;
}

function estimatePriceMock(brand, model, score) {
  const historyData = {
    'Martin': { 'D-28': 15000, 'D-18': 12000, 'default': 8000 },
    'Gibson': { 'Les Paul Standard': 18000, 'SG Standard': 9500, 'default': 10000 },
    'Fender': { 'Stratocaster': 8500, 'Telecaster': 7800, 'default': 6000 },
    'Yamaha': { 'FG800': 1800, 'LL16': 4500, 'default': 2000 },
    'Taylor': { '814ce': 18000, '314ce': 9500, 'default': 5000 },
    'Ibanez': { 'RG550': 5500, 'default': 3500 },
    'PRS': { 'Custom 24': 22000, 'SE Standard': 4500, 'default': 6000 },
    'Epiphone': { 'Les Paul Standard': 3200, 'Casino': 2800, 'default': 2500 }
  };
  
  let avgPrice = 5000;
  const brandData = historyData[brand];
  if (brandData) {
    avgPrice = brandData[model] || brandData['default'] || 5000;
  }
  
  const multiplier = 0.3 + (score / 100) * 0.9;
  const basePrice = avgPrice * multiplier;
  const variance = basePrice * 0.1;
  
  return {
    min: Math.max(100, Math.round((basePrice - variance) / 100) * 100),
    max: Math.max(100, Math.round((basePrice + variance) / 100) * 100),
    unit: 'CNY'
  };
}

function getConditionFromScore(score) {
  if (score >= 90) return { grade: 'new', label: '全新', color: '#2ECC71' };
  if (score >= 75) return { grade: 'like-new', label: '几乎全新', color: '#3498DB' };
  if (score >= 50) return { grade: 'used', label: '有明显使用痕迹', color: '#E67E22' };
  return { grade: 'damaged', label: '有瑕疵', color: '#E74C3C' };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/instruments', (req, res) => {
  const { condition, sort } = req.query;
  let instruments = [...mockInstruments];
  
  if (condition) {
    instruments = instruments.filter(i => i.condition === condition);
  }
  
  if (sort === 'price-asc') {
    instruments.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    instruments.sort((a, b) => b.price - a.price);
  } else if (sort === 'newest') {
    instruments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  setTimeout(() => res.json(instruments), 100);
});

app.get('/api/instruments/:id', (req, res) => {
  const instrument = mockInstruments.find(i => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ error: 'Instrument not found' });
  }
  setTimeout(() => res.json(instrument), 100);
});

app.post('/api/instruments', upload.array('images', 6), (req, res) => {
  const { name, brand, model, price, description, sellerId, sellerName, conditionScore } = req.body;
  const condition = getConditionFromScore(parseInt(conditionScore) || 70);
  
  const newInstrument = {
    id: uuidv4(),
    name,
    brand,
    model,
    price: parseFloat(price),
    condition: condition.grade,
    conditionScore: parseInt(conditionScore) || 70,
    images: req.files ? req.files.map(() => 
      `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000000)}?w=800&h=600&fit=crop`
    ) : [],
    description,
    sellerId,
    sellerName,
    createdAt: new Date().toISOString()
  };
  
  mockInstruments.unshift(newInstrument);
  res.status(201).json(newInstrument);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    user: userWithoutPassword,
    token: `mock-token-${uuidv4()}`
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (mockUsers.find(u => u.email === email)) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }
  
  const newUser = {
    id: `u${mockUsers.length + 1}`,
    username,
    email,
    password
  };
  
  mockUsers.push(newUser);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({
    user: userWithoutPassword,
    token: `mock-token-${uuidv4()}`
  });
});

app.post('/api/reports', upload.array('images', 6), async (req, res) => {
  const { brand = 'Martin', model = 'D-28' } = req.body;
  const files = req.files || [];
  
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  let totalBrightness = 0;
  let totalNoise = 0;
  let totalEdges = 0;
  
  files.forEach((file, index) => {
    const analysis = analyzeImageMock(file.buffer, index);
    totalBrightness += analysis.brightness;
    totalNoise += analysis.noise;
    totalEdges += analysis.edges;
  });
  
  const avgBrightness = files.length > 0 ? totalBrightness / files.length : 0.5;
  const brightnessFactor = Math.abs(avgBrightness - 0.5) * 100;
  const noiseFactor = files.length > 0 ? (totalNoise / files.length) * 100 : 5;
  
  const baseScore = 65 + Math.random() * 30;
  const score = Math.max(30, Math.min(98, Math.round(baseScore - brightnessFactor * 0.1 - noiseFactor * 0.3)));
  
  const flaws = generateFlawsMock(score, Math.max(1, files.length));
  const priceRange = estimatePriceMock(brand, model, score);
  const condition = getConditionFromScore(score);
  
  const report = {
    id: `report-${uuidv4()}`,
    score,
    condition: condition.grade,
    conditionLabel: condition.label,
    flaws,
    priceRange,
    description: `${condition.label}，检测到${flaws.length}处瑕疵`,
    overallAssessment: `这把乐器成色评分为${score}分，${flaws.length > 0 ? '存在一些瑕疵' : '状态极佳'}，推荐售价区间为¥${priceRange.min.toLocaleString()} - ¥${priceRange.max.toLocaleString()}`,
    createdAt: new Date().toISOString()
  };
  
  reportCache.set(report.id, report);
  res.json(report);
});

app.get('/api/reports/:id', (req, res) => {
  const report = reportCache.get(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

app.get('/api/favorites', (req, res) => {
  const userId = req.headers.authorization?.split(' ')[1] ? 'u1' : null;
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const userFavorites = mockFavorites.filter(f => f.userId === userId);
  const withInstruments = userFavorites.map(f => ({
    ...f,
    instrument: mockInstruments.find(i => i.id === f.instrumentId)
  })).filter(f => f.instrument);
  
  res.json(withInstruments);
});

app.post('/api/favorites', (req, res) => {
  const { instrumentId } = req.body;
  const userId = 'u1';
  
  const existing = mockFavorites.find(f => f.userId === userId && f.instrumentId === instrumentId);
  if (existing) {
    return res.status(400).json({ error: '已收藏' });
  }
  
  const favorite = {
    id: uuidv4(),
    userId,
    instrumentId,
    createdAt: new Date().toISOString()
  };
  
  mockFavorites.push(favorite);
  res.status(201).json({
    ...favorite,
    instrument: mockInstruments.find(i => i.id === instrumentId)
  });
});

app.delete('/api/favorites/:id', (req, res) => {
  const index = mockFavorites.findIndex(f => f.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '收藏不存在' });
  }
  
  mockFavorites.splice(index, 1);
  res.json({ success: true });
});

app.get('/api/transactions', (req, res) => {
  const userId = 'u1';
  const userTransactions = mockTransactions.filter(
    t => t.buyerId === userId || t.sellerId === userId
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(userTransactions);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
