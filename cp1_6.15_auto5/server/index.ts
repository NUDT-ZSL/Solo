import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(express.json());

const campsites = [
  {
    id: uuidv4(),
    code: 'A-001',
    type: 'tent',
    maxPeople: 4,
    pricePerNight: 120,
    facilities: ['电源', '水源', '烧烤架'],
    bookedDates: []
  },
  {
    id: uuidv4(),
    code: 'B-002',
    type: 'rv',
    maxPeople: 6,
    pricePerNight: 280,
    facilities: ['电源', '水源', '排污口'],
    bookedDates: []
  },
  {
    id: uuidv4(),
    code: 'C-003',
    type: 'cabin',
    maxPeople: 8,
    pricePerNight: 580,
    facilities: ['电源', '水源', '空调', '卫生间'],
    bookedDates: []
  }
];

const equipmentList = [
  {
    id: uuidv4(),
    name: '双人帐篷',
    category: 'tent',
    dailyRent: 50,
    stock: 15,
    imageUrl: '',
    description: '防水防风双人帐篷，适合2-3人使用'
  },
  {
    id: uuidv4(),
    name: '羽绒睡袋',
    category: 'sleepingBag',
    dailyRent: 30,
    stock: 20,
    imageUrl: '',
    description: '舒适温度-5°C，适合春秋冬季'
  },
  {
    id: uuidv4(),
    name: '便携炉具',
    category: 'stove',
    dailyRent: 25,
    stock: 10,
    imageUrl: '',
    description: '瓦斯炉具，防风设计，附带锅具'
  },
  {
    id: uuidv4(),
    name: 'LED营地灯',
    category: 'lamp',
    dailyRent: 15,
    stock: 25,
    imageUrl: '',
    description: '可充电LED灯，三档亮度调节'
  },
  {
    id: uuidv4(),
    name: '登山背包 60L',
    category: 'backpack',
    dailyRent: 20,
    stock: 12,
    imageUrl: '',
    description: '专业登山背包，防水耐磨，多隔层设计'
  }
];

const orders: any[] = [];

app.get('/api/campsites', (req: Request, res: Response) => {
  res.json(campsites);
});

app.get('/api/equipment', (req: Request, res: Response) => {
  res.json(equipmentList);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const orderData = req.body;
  const newOrder = {
    id: uuidv4(),
    ...orderData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  console.log(`[模拟邮件通知] 订单 ${newOrder.id} 已创建，待审核`);
  console.log(`  收件人: ${orderData.customerEmail || 'admin@camping.com'}`);
  console.log(`  客户: ${orderData.customerName || '未知'}`);
  console.log(`  总价: ¥${orderData.totalPrice || 0}`);
  res.json({
    success: true,
    orderId: newOrder.id,
    message: '订单已提交，邮件通知已发送'
  });
});

app.listen(PORT, () => {
  console.log(`Camp API server running on http://localhost:${PORT}`);
});
