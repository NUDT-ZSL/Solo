import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

let instruments = [
  {
    id: '1',
    name: 'Martin D-28 民谣吉他',
    brand: 'Martin',
    model: 'D-28',
    price: 15800,
    condition: '几乎全新',
    conditionScore: 92,
    description: '2022年购入，保养良好，音色饱满，附原装琴盒。',
    images: [
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558098329-a11cff621064?w=800&h=600&fit=crop'
    ],
    sellerId: 'user1',
    sellerName: '音乐爱好者小王',
    createdAt: '2024-01-15',
    flaws: [
      { x: 0.15, y: 0.3, w: 0.1, h: 0.05, description: '琴头轻微划痕' }
    ]
  },
  {
    id: '2',
    name: 'Yamaha FG830 民谣吉他',
    brand: 'Yamaha',
    model: 'FG830',
    price: 3200,
    condition: '有明显使用痕迹',
    conditionScore: 75,
    description: '使用三年，正常使用痕迹，音色稳定，适合入门。',
    images: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800&h=600&fit=crop'
    ],
    sellerId: 'user2',
    sellerName: '吉他老师老李',
    createdAt: '2024-02-20',
    flaws: [
      { x: 0.3, y: 0.5, w: 0.15, h: 0.08, description: '面板轻微划痕' },
      { x: 0.6, y: 0.7, w: 0.08, h: 0.04, description: '琴桥旁磨损' }
    ]
  },
  {
    id: '3',
    name: 'Gibson Les Paul Studio',
    brand: 'Gibson',
    model: 'Les Paul Studio',
    price: 12500,
    condition: '全新',
    conditionScore: 99,
    description: '全新未拆封，美产正品，附所有配件和证书。',
    images: [
      'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop'
    ],
    sellerId: 'user3',
    sellerName: '乐器经销商',
    createdAt: '2024-03-10',
    flaws: []
  },
  {
    id: '4',
    name: 'Fender Player Stratocaster',
    brand: 'Fender',
    model: 'Player Stratocaster',
    price: 6800,
    condition: '几乎全新',
    conditionScore: 88,
    description: '墨产玩家系列，购买一年，极少使用，状态极佳。',
    images: [
      'https://images.unsplash.com/photo-1566419808810-658178329585?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&h=600&fit=crop'
    ],
    sellerId: 'user1',
    sellerName: '音乐爱好者小王',
    createdAt: '2024-03-25',
    flaws: [
      { x: 0.8, y: 0.2, w: 0.06, h: 0.06, description: '琴身背面小磕碰' }
    ]
  },
  {
    id: '5',
    name: '雅马哈 C40 古典吉他',
    brand: 'Yamaha',
    model: 'C40',
    price: 650,
    condition: '有瑕疵',
    conditionScore: 55,
    description: '入门级古典吉他，有一处明显磕碰，但不影响演奏。',
    images: [
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&h=600&fit=crop'
    ],
    sellerId: 'user4',
    sellerName: '学生小张',
    createdAt: '2024-04-01',
    flaws: [
      { x: 0.25, y: 0.4, w: 0.12, h: 0.1, description: '面板明显磕碰' },
      { x: 0.5, y: 0.6, w: 0.08, h: 0.03, description: '品丝磨损' }
    ]
  },
  {
    id: '6',
    name: 'Taylor 814ce 电箱吉他',
    brand: 'Taylor',
    model: '814ce',
    price: 22000,
    condition: '几乎全新',
    conditionScore: 94,
    description: '泰勒高端系列，ES2拾音器，购买半年，保养完美。',
    images: [
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=600&fit=crop'
    ],
    sellerId: 'user5',
    sellerName: '专业演奏家',
    createdAt: '2024-04-15',
    flaws: []
  },
  {
    id: '7',
    name: 'Ibanez RG550 电吉他',
    brand: 'Ibanez',
    model: 'RG550',
    price: 4500,
    condition: '有明显使用痕迹',
    conditionScore: 70,
    description: '日产依班娜，经典双摇系统，金属利器，有使用痕迹。',
    images: [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1566419808810-658178329585?w=800&h=600&fit=crop'
    ],
    sellerId: 'user2',
    sellerName: '吉他老师老李',
    createdAt: '2024-05-01',
    flaws: [
      { x: 0.1, y: 0.8, w: 0.2, h: 0.05, description: '琴身边缘掉漆' },
      { x: 0.7, y: 0.3, w: 0.05, h: 0.05, description: '旋钮划痕' }
    ]
  },
  {
    id: '8',
    name: 'Lakewood M-32 指弹吉他',
    brand: 'Lakewood',
    model: 'M-32',
    price: 18500,
    condition: '全新',
    conditionScore: 98,
    description: '德国手工琴，指弹神器，全新定制款。',
    images: [
      'https://images.unsplash.com/photo-1558098329-a11cff621064?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop'
    ],
    sellerId: 'user6',
    sellerName: '吉他收藏者',
    createdAt: '2024-05-10',
    flaws: []
  }
];

let users = [
  {
    id: 'user1',
    username: 'musiclover',
    password: '123456',
    email: 'test@example.com',
    avatar: 'https://i.pravatar.cc/150?img=1'
  }
];

let favorites = {
  'user1': ['1', '3']
};

let transactions = [
  {
    id: 'trans1',
    instrumentId: '9',
    instrumentName: '某品牌已售吉他',
    buyerId: 'user1',
    buyerName: 'musiclover',
    sellerId: 'user2',
    sellerName: '吉他老师老李',
    price: 2800,
    date: '2024-03-01',
    type: 'purchase'
  },
  {
    id: 'trans2',
    instrumentId: '10',
    instrumentName: '效果器套装',
    buyerId: 'user3',
    buyerName: '买家A',
    sellerId: 'user1',
    sellerName: 'musiclover',
    price: 1500,
    date: '2024-02-15',
    type: 'sale'
  }
];

let reportsCache = {};

app.get('/api/instruments', (req, res) => {
  res.json(instruments);
});

app.get('/api/instruments/:id', (req, res) => {
  const instrument = instruments.find(i => i.id === req.params.id);
  if (!instrument) {
    return res.status(404).json({ error: 'Instrument not found' });
  }
  res.json(instrument);
});

app.get('/api/instruments/similar/:id', (req, res) => {
  const current = instruments.find(i => i.id === req.params.id);
  if (!current) {
    return res.status(404).json({ error: 'Instrument not found' });
  }

  const similar = instruments
    .filter(i => i.id !== current.id && (i.brand === current.brand || i.model === current.model))
    .slice(0, 3)
    .map(i => {
      const soldPrice = Math.round(i.price * (0.85 + Math.random() * 0.15));
      const month = Math.floor(Math.random() * 5) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      return {
        id: i.id,
        name: i.name,
        brand: i.brand,
        condition: i.condition,
        price: soldPrice,
        soldDate: `2024-0${month}-${day < 10 ? '0' + day : day}`,
        image: i.images[0] || ''
      };
    });

  if (similar.length < 3) {
    const others = instruments
      .filter(i => i.id !== current.id && !similar.find(s => s.id === i.id))
      .slice(0, 3 - similar.length)
      .map(i => {
        const soldPrice = Math.round(i.price * (0.8 + Math.random() * 0.2));
        const month = Math.floor(Math.random() * 5) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        return {
          id: i.id,
          name: i.name,
          brand: i.brand,
          condition: i.condition,
          price: soldPrice,
          soldDate: `2024-0${month}-${day < 10 ? '0' + day : day}`,
          image: i.images[0] || ''
        };
      });
    similar.push(...others);
  }

  res.json(similar.slice(0, 3));
});

app.post('/api/instruments', upload.array('images', 6), (req, res) => {
  const newInstrument = {
    id: uuidv4(),
    ...req.body,
    price: parseFloat(req.body.price),
    images: req.files ? req.files.map(f => `/uploads/${f.filename}`) : [],
    sellerId: req.body.sellerId || 'user1',
    sellerName: req.body.sellerName || 'musiclover',
    createdAt: new Date().toISOString().split('T')[0],
    flaws: []
  };
  instruments.unshift(newInstrument);
  res.status(201).json(newInstrument);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ 
    success: true, 
    user: { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      avatar: user.avatar 
    } 
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const newUser = {
    id: uuidv4(),
    username,
    password,
    email,
    avatar: `https://i.pravatar.cc/150?u=${username}`
  };
  users.push(newUser);
  favorites[newUser.id] = [];
  res.status(201).json({ 
    success: true, 
    user: { 
      id: newUser.id, 
      username: newUser.username, 
      email: newUser.email, 
      avatar: newUser.avatar 
    } 
  });
});

app.get('/api/favorites/:userId', (req, res) => {
  const userFavorites = favorites[req.params.userId] || [];
  const favoriteInstruments = instruments.filter(i => userFavorites.includes(i.id));
  res.json(favoriteInstruments);
});

app.post('/api/favorites/:userId/:instrumentId', (req, res) => {
  const { userId, instrumentId } = req.params;
  if (!favorites[userId]) {
    favorites[userId] = [];
  }
  if (!favorites[userId].includes(instrumentId)) {
    favorites[userId].push(instrumentId);
  }
  res.json({ success: true, favorites: favorites[userId] });
});

app.delete('/api/favorites/:userId/:instrumentId', (req, res) => {
  const { userId, instrumentId } = req.params;
  if (favorites[userId]) {
    favorites[userId] = favorites[userId].filter(id => id !== instrumentId);
  }
  res.json({ success: true, favorites: favorites[userId] || [] });
});

app.get('/api/transactions/:userId', (req, res) => {
  const userTransactions = transactions.filter(
    t => t.buyerId === req.params.userId || t.sellerId === req.params.userId
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(userTransactions);
});

app.post('/api/reports', upload.array('images', 6), (req, res) => {
  const reportId = uuidv4();
  
  setTimeout(() => {
    const baseScore = 60 + Math.floor(Math.random() * 38);
    const flawCount = Math.floor(Math.random() * 4);
    const flaws = [];
    const flawDescriptions = [
      '琴颈轻微划痕',
      '面板小磕碰',
      '品丝轻微磨损',
      '琴身边缘掉漆',
      '指板污渍',
      '琴桥轻微磨损'
    ];
    
    for (let i = 0; i < flawCount; i++) {
      flaws.push({
        x: Math.random() * 0.7 + 0.1,
        y: Math.random() * 0.7 + 0.1,
        w: Math.random() * 0.15 + 0.05,
        h: Math.random() * 0.1 + 0.03,
        description: flawDescriptions[Math.floor(Math.random() * flawDescriptions.length)]
      });
    }

    const brand = req.body.brand || 'Unknown';
    const basePrice = {
      'Martin': 15000,
      'Gibson': 12000,
      'Taylor': 20000,
      'Fender': 8000,
      'Yamaha': 3000,
      'Ibanez': 5000,
      'Lakewood': 18000
    }[brand] || 5000;

    const priceFactor = baseScore / 100;
    const minPrice = Math.floor(basePrice * priceFactor * 0.85);
    const maxPrice = Math.floor(basePrice * priceFactor * 1.1);

    const report = {
      id: reportId,
      score: baseScore,
      flaws,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        unit: 'CNY'
      },
      grade: baseScore >= 90 ? '全新' : baseScore >= 75 ? '几乎全新' : baseScore >= 60 ? '有明显使用痕迹' : '有瑕疵',
      generatedAt: new Date().toISOString()
    };

    reportsCache[reportId] = report;
    res.json(report);
  }, 300 + Math.random() * 200);
});

app.get('/api/reports/:id', (req, res) => {
  const report = reportsCache[req.params.id];
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
