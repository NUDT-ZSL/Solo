import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Caregiver, Order, PetType, ServiceType, OrderStatus } from '../src/types';

const app = express();
app.use(express.json());

const mockCaregivers: Caregiver[] = [
  {
    id: 'c1',
    name: '王小明',
    avatar: '',
    rating: 4.8,
    bio: '有5年宠物寄养经验，家里有独立的宠物房间，院子围栏安全。热爱动物，能处理各种宠物的日常护理。',
    acceptedPets: ['dog', 'cat'],
    services: [
      { type: 'daycare', price: 120 },
      { type: 'overnight', price: 200 },
      { type: 'walking', price: 50 }
    ],
    servedCount: 156,
    reviewTags: [
      { text: '很有耐心', count: 45 },
      { text: '环境干净', count: 38 },
      { text: '照片多', count: 29 },
      { text: '准时', count: 22 }
    ],
    bookedDates: ['2026-06-18', '2026-06-19', '2026-06-25', '2026-07-01']
  },
  {
    id: 'c2',
    name: '李华',
    avatar: '',
    rating: 4.6,
    bio: '专业猫咪护理师，熟悉猫咪行为学。家中配备猫爬架、猫砂盆等设施，能为猫咪提供舒适的居住环境。',
    acceptedPets: ['cat'],
    services: [
      { type: 'daycare', price: 100 },
      { type: 'overnight', price: 180 },
      { type: 'homefeeding', price: 80 }
    ],
    servedCount: 98,
    reviewTags: [
      { text: '懂猫咪', count: 35 },
      { text: '细心', count: 30 },
      { text: '价格合理', count: 25 }
    ],
    bookedDates: ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-28', '2026-06-29', '2026-06-30']
  },
  {
    id: 'c3',
    name: '张芳',
    avatar: '',
    rating: 4.9,
    bio: '退休兽医助理，持有宠物急救证书。24小时在家，能随时关注宠物状态。擅长老年宠物和特殊需求宠物护理。',
    acceptedPets: ['dog', 'cat', 'rabbit'],
    services: [
      { type: 'daycare', price: 150 },
      { type: 'overnight', price: 260 },
      { type: 'walking', price: 60 },
      { type: 'homefeeding', price: 100 }
    ],
    servedCount: 245,
    reviewTags: [
      { text: '专业', count: 68 },
      { text: '值得信赖', count: 55 },
      { text: '经验丰富', count: 42 },
      { text: '超有爱心', count: 38 }
    ],
    bookedDates: ['2026-06-16', '2026-06-17', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26', '2026-06-27']
  },
  {
    id: 'c4',
    name: '陈大伟',
    avatar: '',
    rating: 4.5,
    bio: '资深遛狗达人，每天步行10公里以上。了解各种犬种的运动需求，能让您的爱犬获得充足的锻炼。',
    acceptedPets: ['dog'],
    services: [
      { type: 'daycare', price: 130 },
      { type: 'overnight', price: 220 },
      { type: 'walking', price: 55 }
    ],
    servedCount: 180,
    reviewTags: [
      { text: '遛狗专业', count: 52 },
      { text: '狗狗开心', count: 45 },
      { text: '体力好', count: 30 }
    ],
    bookedDates: ['2026-06-19', '2026-06-20', '2026-07-02', '2026-07-03']
  },
  {
    id: 'c5',
    name: '刘婷',
    avatar: '',
    rating: 4.7,
    bio: '小型宠物专家，尤其擅长兔子和仓鼠的护理。家中有专属小型宠物区域，定期消毒，温度适宜。',
    acceptedPets: ['rabbit', 'hamster', 'cat'],
    services: [
      { type: 'daycare', price: 90 },
      { type: 'overnight', price: 160 },
      { type: 'homefeeding', price: 70 }
    ],
    servedCount: 120,
    reviewTags: [
      { text: '懂小动物', count: 40 },
      { text: '设施齐全', count: 35 },
      { text: '温柔', count: 28 }
    ],
    bookedDates: ['2026-06-21', '2026-06-22', '2026-06-28']
  },
  {
    id: 'c6',
    name: '赵强',
    avatar: '',
    rating: 4.3,
    bio: '新晋寄养人，但从小与各种宠物为伴。工作时间灵活，能全身心投入宠物护理。期待与您的宠物相遇！',
    acceptedPets: ['dog', 'cat', 'hamster'],
    services: [
      { type: 'daycare', price: 100 },
      { type: 'overnight', price: 170 },
      { type: 'walking', price: 45 }
    ],
    servedCount: 35,
    reviewTags: [
      { text: '新人特惠', count: 20 },
      { text: '很上心', count: 18 },
      { text: '反馈及时', count: 15 }
    ],
    bookedDates: ['2026-06-24', '2026-06-25']
  },
  {
    id: 'c7',
    name: '孙丽娟',
    avatar: '',
    rating: 4.9,
    bio: '宠物美容师兼寄养人，提供寄养+美容套餐服务。家有50平米独立宠物活动区，24小时监控。',
    acceptedPets: ['dog', 'cat'],
    services: [
      { type: 'daycare', price: 180 },
      { type: 'overnight', price: 300 },
      { type: 'walking', price: 70 },
      { type: 'homefeeding', price: 120 }
    ],
    servedCount: 310,
    reviewTags: [
      { text: '服务高端', count: 60 },
      { text: '美容很棒', count: 55 },
      { text: '环境奢华', count: 48 },
      { text: '物超所值', count: 35 }
    ],
    bookedDates: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25']
  },
  {
    id: 'c8',
    name: '周建国',
    avatar: '',
    rating: 4.4,
    bio: '退休教师，时间充裕，耐心细致。喜欢与宠物为伴，会记录每日宠物状态日志并发给主人。',
    acceptedPets: ['dog', 'cat', 'rabbit'],
    services: [
      { type: 'daycare', price: 110 },
      { type: 'overnight', price: 190 },
      { type: 'homefeeding', price: 75 }
    ],
    servedCount: 88,
    reviewTags: [
      { text: '有耐心', count: 40 },
      { text: '日志详细', count: 35 },
      { text: '像家人', count: 28 }
    ],
    bookedDates: ['2026-06-26', '2026-06-27', '2026-07-04', '2026-07-05']
  },
  {
    id: 'c9',
    name: '吴敏',
    avatar: '',
    rating: 4.6,
    bio: '双职工家庭，早晚在家。小区绿化好，适合遛狗。注重宠物饮食健康，可提供定制化饮食方案。',
    acceptedPets: ['dog', 'cat'],
    services: [
      { type: 'daycare', price: 115 },
      { type: 'overnight', price: 195 },
      { type: 'walking', price: 50 }
    ],
    servedCount: 142,
    reviewTags: [
      { text: '饮食健康', count: 38 },
      { text: '环境好', count: 32 },
      { text: '负责', count: 28 }
    ],
    bookedDates: ['2026-06-18', '2026-06-25', '2026-06-26', '2026-07-01', '2026-07-02']
  },
  {
    id: 'c10',
    name: '郑浩然',
    avatar: '',
    rating: 4.2,
    bio: '自由职业者，工作时间弹性大。家里有一只金毛，性格温顺，能与其他狗狗友好相处。',
    acceptedPets: ['dog', 'rabbit'],
    services: [
      { type: 'daycare', price: 105 },
      { type: 'overnight', price: 185 },
      { type: 'walking', price: 48 }
    ],
    servedCount: 52,
    reviewTags: [
      { text: '时间灵活', count: 25 },
      { text: '有玩伴', count: 22 },
      { text: '性价比高', count: 20 }
    ],
    bookedDates: ['2026-06-23', '2026-06-30']
  }
];

const mockOrders: Order[] = [
  {
    id: 'o1',
    caregiverId: 'c1',
    caregiverName: '王小明',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: 'dog',
    petName: '豆豆',
    serviceType: 'overnight',
    startDate: '2026-06-18',
    endDate: '2026-06-19',
    totalPrice: 400,
    status: 'pending',
    createdAt: '2026-06-15T09:30:00Z'
  },
  {
    id: 'o2',
    caregiverId: 'c2',
    caregiverName: '李华',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: 'cat',
    petName: '咪咪',
    serviceType: 'overnight',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    totalPrice: 540,
    status: 'confirmed',
    createdAt: '2026-06-08T14:20:00Z'
  },
  {
    id: 'o3',
    caregiverId: 'c3',
    caregiverName: '张芳',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: 'rabbit',
    petName: '雪球',
    serviceType: 'daycare',
    startDate: '2026-06-05',
    endDate: '2026-06-07',
    totalPrice: 450,
    status: 'completed',
    rating: 5,
    review: '张阿姨非常专业，对雪球照顾得无微不至，每天还会发很多照片，非常满意！',
    createdAt: '2026-06-03T10:00:00Z'
  },
  {
    id: 'o4',
    caregiverId: 'c4',
    caregiverName: '陈大伟',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: 'dog',
    petName: '大黄',
    serviceType: 'walking',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    totalPrice: 165,
    status: 'completed',
    createdAt: '2026-05-30T16:45:00Z'
  },
  {
    id: 'o5',
    caregiverId: 'c5',
    caregiverName: '刘婷',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: 'hamster',
    petName: '花生',
    serviceType: 'homefeeding',
    startDate: '2026-06-12',
    endDate: '2026-06-14',
    totalPrice: 210,
    status: 'cancelled',
    createdAt: '2026-06-10T08:15:00Z'
  }
];

let orders: Order[] = [...mockOrders];

app.get('/api/caregivers', (req: Request, res: Response) => {
  setTimeout(() => {
    res.json(mockCaregivers);
  }, 100);
});

app.get('/api/caregivers/:id', (req: Request, res: Response) => {
  const caregiver = mockCaregivers.find(c => c.id === req.params.id);
  if (!caregiver) {
    return res.status(404).json({ error: '寄养人不存在' });
  }
  res.json(caregiver);
});

app.get('/api/orders', (req: Request, res: Response) => {
  const { caregiverId, ownerId } = req.query;
  let filtered = orders;
  if (caregiverId) {
    filtered = filtered.filter(o => o.caregiverId === caregiverId);
  }
  if (ownerId) {
    filtered = filtered.filter(o => o.ownerId === ownerId);
  }
  setTimeout(() => {
    res.json(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, 100);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const body = req.body as Partial<Order>;
  const newOrder: Order = {
    id: 'o' + uuidv4(),
    caregiverId: body.caregiverId || '',
    caregiverName: body.caregiverName || '',
    ownerId: 'u1',
    ownerName: '宠物主人',
    petType: body.petType || 'dog',
    petName: body.petName || '宝贝',
    serviceType: body.serviceType || 'overnight',
    startDate: body.startDate || '',
    endDate: body.endDate || '',
    totalPrice: body.totalPrice || 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.unshift(newOrder);

  const caregiver = mockCaregivers.find(c => c.id === newOrder.caregiverId);
  if (caregiver) {
    const start = new Date(newOrder.startDate);
    const end = new Date(newOrder.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!caregiver.bookedDates.includes(dateStr)) {
        caregiver.bookedDates.push(dateStr);
      }
    }
  }

  setTimeout(() => {
    res.status(201).json(newOrder);
  }, 200);
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  const updates = req.body as Partial<Order>;
  orders[orderIndex] = { ...orders[orderIndex], ...updates };
  res.json(orders[orderIndex]);
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  const { status } = req.body as { status: OrderStatus };
  orders[orderIndex].status = status;

  if (status === 'cancelled') {
    const order = orders[orderIndex];
    const caregiver = mockCaregivers.find(c => c.id === order.caregiverId);
    if (caregiver) {
      const start = new Date(order.startDate);
      const end = new Date(order.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        caregiver.bookedDates = caregiver.bookedDates.filter(bd => bd !== dateStr);
      }
    }
  }

  res.json(orders[orderIndex]);
});

app.patch('/api/orders/:id/review', (req: Request, res: Response) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  const { rating, review } = req.body as { rating: number; review: string };
  orders[orderIndex].rating = rating;
  orders[orderIndex].review = review;
  res.json(orders[orderIndex]);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`宠物寄养后端服务已启动: http://localhost:${PORT}`);
});
