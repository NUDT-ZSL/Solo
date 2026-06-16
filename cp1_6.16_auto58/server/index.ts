import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Instrument, Order, Wallet, Negotiation, OrderStatus } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const mockInstruments: Instrument[] = [
  {
    id: uuidv4(),
    name: '马丁 HD-28 原声吉他',
    brand: 'Martin',
    price: 18800,
    dailyRentalPrice: 282,
    status: 'selling',
    material: '云杉面板 / 玫瑰木背侧',
    year: 2019,
    condition: '95成新',
    description: '经典款马丁HD-28，保养良好，音色温暖通透，适合指弹和民谣伴奏。',
    images: [
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-001',
    sellerName: '吉他老王',
    sellerRating: 92,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: uuidv4(),
    name: '雅马哈 C40 古典吉他',
    brand: 'Yamaha',
    price: 680,
    dailyRentalPrice: 10.2,
    status: 'selling',
    material: '云杉面板 / 那都木背侧',
    year: 2021,
    condition: '9成新',
    description: '入门级古典吉他，尼龙弦手感柔和，适合初学者练习古典曲目。',
    images: [
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-002',
    sellerName: '音乐新手',
    sellerRating: 78,
    createdAt: '2024-02-20T14:00:00Z'
  },
  {
    id: uuidv4(),
    name: '斯坦威 Model O 三角钢琴',
    brand: 'Steinway',
    price: 680000,
    dailyRentalPrice: 10200,
    status: 'rented',
    material: '实木琴身 / 枫木音板',
    year: 2010,
    condition: '98成新',
    description: '顶级音乐会用三角钢琴，音色宏亮富有层次，专业演奏家首选。',
    images: [
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1552422535-c45813c61732?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-001',
    sellerName: '吉他老王',
    sellerRating: 92,
    createdAt: '2023-11-05T09:00:00Z'
  },
  {
    id: uuidv4(),
    name: 'Gibson Les Paul Standard 电吉他',
    brand: 'Gibson',
    price: 26500,
    dailyRentalPrice: 397.5,
    status: 'sold',
    material: '桃花心木琴身 / 枫木贴面',
    year: 2018,
    condition: '9成新',
    description: '经典LP造型，厚重的音色适合摇滚和布鲁斯演奏，配备原装硬盒。',
    images: [
      'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-003',
    sellerName: '摇滚青年',
    sellerRating: 85,
    createdAt: '2023-10-12T16:45:00Z'
  },
  {
    id: uuidv4(),
    name: '雅马哈 YAS-280 中音萨克斯',
    brand: 'Yamaha',
    price: 8500,
    dailyRentalPrice: 127.5,
    status: 'selling',
    material: '黄铜 / 金色漆',
    year: 2020,
    condition: '95成新',
    description: '专业级中音萨克斯，吹奏顺畅，音色饱满，适合爵士和流行演奏。',
    images: [
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-002',
    sellerName: '音乐新手',
    sellerRating: 78,
    createdAt: '2024-03-01T11:20:00Z'
  },
  {
    id: uuidv4(),
    name: '珠江 UP120 立式钢琴',
    brand: 'Pearl River',
    price: 12800,
    dailyRentalPrice: 192,
    status: 'selling',
    material: '实木音板 / 铸铁支架',
    year: 2017,
    condition: '85成新',
    description: '家用练习立式钢琴，音质稳定，适合考级和日常练习使用。',
    images: [
      'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-001',
    sellerName: '吉他老王',
    sellerRating: 92,
    createdAt: '2024-01-28T08:30:00Z'
  },
  {
    id: uuidv4(),
    name: 'DW Collector\'s Series 架子鼓',
    brand: 'DW',
    price: 58000,
    dailyRentalPrice: 870,
    status: 'selling',
    material: '北美枫木',
    year: 2019,
    condition: '9成新',
    description: '专业录音室级架子鼓，5鼓配置，音色通透有力，含全套硬件。',
    images: [
      'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-003',
    sellerName: '摇滚青年',
    sellerRating: 85,
    createdAt: '2024-02-10T13:15:00Z'
  },
  {
    id: uuidv4(),
    name: 'Strunal 4/4 小提琴',
    brand: 'Strunal',
    price: 3200,
    dailyRentalPrice: 48,
    status: 'selling',
    material: '云杉面板 / 枫木背侧',
    year: 2021,
    condition: '9成新',
    description: '捷克进口4/4小提琴，手工制作，音色优美，适合中级学习者。',
    images: [
      'https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=600&h=400&fit=crop'
    ],
    sellerId: 'seller-002',
    sellerName: '音乐新手',
    sellerRating: 78,
    createdAt: '2024-03-05T15:00:00Z'
  }
];

const mockOrders: Order[] = [
  {
    id: 'order-001',
    instrumentId: mockInstruments[3].id,
    instrumentName: mockInstruments[3].name,
    buyerId: 'buyer-001',
    sellerId: 'seller-003',
    type: 'purchase',
    price: 26500,
    status: 'completed',
    createdAt: '2023-12-01T10:00:00Z'
  }
];

const mockNegotiations: Negotiation[] = [
  {
    id: uuidv4(),
    instrumentId: mockInstruments[0].id,
    instrumentName: mockInstruments[0].name,
    buyerId: 'buyer-002',
    buyerName: '小李同学',
    sellerId: 'seller-001',
    proposedPrice: 16000,
    reason: '诚心购买，预算有限，望卖家考虑',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockWallet: Wallet = {
  userId: 'seller-001',
  balance: 28560.5,
  frozenDeposit: 20400,
  transactions: [
    {
      id: uuidv4(),
      type: 'consignment_income',
      amount: 26500,
      description: '寄卖收入 - Gibson Les Paul Standard',
      createdAt: '2023-12-02T09:00:00Z'
    },
    {
      id: uuidv4(),
      type: 'rental_deposit',
      amount: -20400,
      description: '租赁押金冻结 - 斯坦威 Model O',
      createdAt: '2024-03-10T14:00:00Z'
    },
    {
      id: uuidv4(),
      type: 'rental_income',
      amount: 3060,
      description: '租赁收入 - 珠江钢琴 16天',
      createdAt: '2024-02-15T10:30:00Z'
    },
    {
      id: uuidv4(),
      type: 'refund',
      amount: 999.5,
      description: '退款 - 租赁押金退还',
      createdAt: '2024-01-20T16:00:00Z'
    }
  ]
};

let instruments = [...mockInstruments];
let orders = [...mockOrders];
let negotiations = [...mockNegotiations];
let wallet = { ...mockWallet };

app.get('/api/instruments', (req, res) => {
  res.json(instruments);
});

app.get('/api/instruments/:id', (req, res) => {
  const instrument = instruments.find((i) => i.id === req.params.id);
  if (!instrument) {
    res.status(404).json({ error: '乐器未找到' });
    return;
  }
  res.json(instrument);
});

app.post('/api/orders', (req, res) => {
  const { instrumentId, type, price, rentalDays, buyerId } = req.body;
  const instrument = instruments.find((i) => i.id === instrumentId);

  if (!instrument) {
    res.status(404).json({ error: '乐器未找到' });
    return;
  }

  if (instrument.status === 'sold') {
    res.status(400).json({ error: '该乐器已售出' });
    return;
  }

  const order: Order = {
    id: uuidv4(),
    instrumentId,
    instrumentName: instrument.name,
    buyerId: buyerId || 'buyer-001',
    sellerId: instrument.sellerId,
    type,
    price,
    rentalDays: type === 'rental' ? rentalDays : undefined,
    status: 'completed' as OrderStatus,
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  if (type === 'purchase') {
    instruments = instruments.map((i) =>
      i.id === instrumentId ? { ...i, status: 'sold' as const } : i
    );
    wallet = {
      ...wallet,
      balance: wallet.balance + price,
      transactions: [
        {
          id: uuidv4(),
          type: 'consignment_income',
          amount: price,
          description: `寄卖收入 - ${instrument.name}`,
          createdAt: new Date().toISOString()
        },
        ...wallet.transactions
      ]
    };
  } else if (type === 'rental') {
    instruments = instruments.map((i) =>
      i.id === instrumentId ? { ...i, status: 'rented' as const } : i
    );
    const dailyRent = instrument.dailyRentalPrice;
    const deposit = Math.round(instrument.price * 0.3 * 100) / 100;
    const totalRent = dailyRent * (rentalDays || 1);
    wallet = {
      ...wallet,
      balance: wallet.balance + totalRent,
      frozenDeposit: wallet.frozenDeposit + deposit,
      transactions: [
        {
          id: uuidv4(),
          type: 'rental_income',
          amount: totalRent,
          description: `租赁收入 - ${instrument.name} ${rentalDays}天`,
          createdAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          type: 'rental_deposit',
          amount: -deposit,
          description: `租赁押金冻结 - ${instrument.name}`,
          createdAt: new Date().toISOString()
        },
        ...wallet.transactions
      ]
    };
  }

  res.status(201).json(order);
});

app.get('/api/wallet', (req, res) => {
  res.json(wallet);
});

app.get('/api/negotiations', (req, res) => {
  const { sellerId } = req.query;
  if (sellerId) {
    res.json(negotiations.filter((n) => n.sellerId === sellerId));
    return;
  }
  res.json(negotiations);
});

app.post('/api/negotiations', (req, res) => {
  const { instrumentId, proposedPrice, reason, buyerId, buyerName } = req.body;
  const instrument = instruments.find((i) => i.id === instrumentId);

  if (!instrument) {
    res.status(404).json({ error: '乐器未找到' });
    return;
  }

  if (instrument.status !== 'selling') {
    res.status(400).json({ error: '该乐器不可议价' });
    return;
  }

  const negotiation: Negotiation = {
    id: uuidv4(),
    instrumentId,
    instrumentName: instrument.name,
    buyerId: buyerId || 'buyer-001',
    buyerName: buyerName || '匿名买家',
    sellerId: instrument.sellerId,
    proposedPrice,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  negotiations.push(negotiation);
  res.status(201).json(negotiation);
});

app.put('/api/negotiations/:id', (req, res) => {
  const { status, counterPrice } = req.body;
  const negotiation = negotiations.find((n) => n.id === req.params.id);

  if (!negotiation) {
    res.status(404).json({ error: '议价记录未找到' });
    return;
  }

  negotiation.status = status;
  negotiation.counterPrice = counterPrice;
  negotiation.updatedAt = new Date().toISOString();

  if (status === 'accepted') {
    const instrument = instruments.find((i) => i.id === negotiation.instrumentId);
    if (instrument) {
      instruments = instruments.map((i) =>
        i.id === negotiation.instrumentId ? { ...i, status: 'sold' as const, price: negotiation.proposedPrice } : i
      );
    }
  }

  res.json(negotiation);
});

app.patch('/api/instruments/:id', (req, res) => {
  const { price, status } = req.body;
  const index = instruments.findIndex((i) => i.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: '乐器未找到' });
    return;
  }

  if (price !== undefined) instruments[index].price = price;
  if (status !== undefined) instruments[index].status = status;

  res.json(instruments[index]);
});

app.listen(PORT, () => {
  console.log(`乐器寄卖平台后端服务运行在 http://localhost:${PORT}`);
});
