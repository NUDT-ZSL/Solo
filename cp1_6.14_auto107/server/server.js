import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let customers = [];
let pointLogs = [];
let coupons = [];
let redeemedCoupons = 0;

const generateId = () => Math.random().toString(36).substring(2, 11);
const generateCardNumber = () => {
  const prefix = 'CF';
  const num = String(Math.floor(Math.random() * 900000 + 100000));
  return prefix + num;
};

const getLevelByPoints = (points) => {
  if (points >= 500) return 'diamond';
  if (points >= 200) return 'gold';
  if (points >= 50) return 'silver';
  return 'bronze';
};

const POINTS_PER_YUAN = 0.1;
const POINTS_THRESHOLD = 100;

const initMockData = () => {
  const mockCustomers = [
    { name: '张伟', phone: '13800138001', points: 680 },
    { name: '李娜', phone: '13800138002', points: 420 },
    { name: '王芳', phone: '13800138003', points: 310 },
    { name: '刘洋', phone: '13800138004', points: 256 },
    { name: '陈静', phone: '13800138005', points: 189 },
    { name: '杨帆', phone: '13800138006', points: 145 },
    { name: '赵敏', phone: '13800138007', points: 98 },
    { name: '黄磊', phone: '13800138008', points: 76 },
    { name: '周婷', phone: '13800138009', points: 52 },
    { name: '吴磊', phone: '13800138010', points: 34 },
    { name: '郑雪', phone: '13800138011', points: 21 },
    { name: '孙浩', phone: '13800138012', points: 15 },
    { name: '马丽', phone: '13800138013', points: 8 },
    { name: '朱琳', phone: '13800138014', points: 3 },
    { name: '胡军', phone: '13800138015', points: 0 },
  ];

  const now = Date.now();
  mockCustomers.forEach((c, index) => {
    const id = generateId();
    const daysAgo = Math.floor(Math.random() * 60);
    const lastConsume = daysAgo > 30 ? null : new Date(now - daysAgo * 86400000).toISOString();
    customers.push({
      id,
      name: c.name,
      phone: c.phone,
      cardNumber: generateCardNumber(),
      level: getLevelByPoints(c.points),
      points: c.points,
      lastConsumeTime: lastConsume,
      createdAt: new Date(now - (index + 10) * 86400000).toISOString(),
    });

    const logCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < logCount; i++) {
      const amount = Math.floor(Math.random() * 200) + 20;
      const points = Math.floor(amount * POINTS_PER_YUAN);
      pointLogs.push({
        id: generateId(),
        customerId: id,
        points,
        reason: '消费积分',
        amount,
        createdAt: new Date(now - (i * 7 + Math.random() * 3) * 86400000).toISOString(),
      });
    }
  });

  const mockCoupons = [
    { type: 'fullReduction', name: '满50减10券', value: 10, threshold: 50, daysUntilExpire: 30 },
    { type: 'fullReduction', name: '满100减25券', value: 25, threshold: 100, daysUntilExpire: 15 },
    { type: 'discount', name: '8.8折优惠券', value: 88, daysUntilExpire: 45 },
    { type: 'discount', name: '7.5折特惠券', value: 75, daysUntilExpire: 7 },
    { type: 'exchange', name: '免费美式兑换券', value: 50, daysUntilExpire: 60 },
    { type: 'exchange', name: '拿铁兑换券', value: 80, daysUntilExpire: 30 },
    { type: 'fullReduction', name: '满30减5券', value: 5, threshold: 30, daysUntilExpire: -5 },
    { type: 'discount', name: '9折尝鲜券', value: 90, daysUntilExpire: -10 },
  ];

  mockCoupons.forEach((c) => {
    const expireDate = new Date(now + c.daysUntilExpire * 86400000).toISOString();
    coupons.push({
      id: generateId(),
      type: c.type,
      name: c.name,
      value: c.value,
      threshold: c.threshold,
      expireDate,
      isExpired: c.daysUntilExpire < 0,
      createdAt: new Date(now - 30 * 86400000).toISOString(),
    });
  });

  redeemedCoupons = 12;
};

initMockData();

app.get('/api/customers', (req, res) => {
  res.json(customers);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = customers.find((c) => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const customer = {
    id: generateId(),
    name,
    phone,
    cardNumber: generateCardNumber(),
    level: 'bronze',
    points: 0,
    lastConsumeTime: null,
    createdAt: new Date().toISOString(),
  };
  customers.push(customer);
  res.status(201).json(customer);
});

app.post('/api/customers/batch', (req, res) => {
  const { customers: newCustomers } = req.body;
  if (!Array.isArray(newCustomers)) return res.status(400).json({ error: 'Invalid data' });

  const created = newCustomers.map((c) => ({
    id: generateId(),
    name: c.name,
    phone: c.phone,
    cardNumber: generateCardNumber(),
    level: 'bronze',
    points: 0,
    lastConsumeTime: null,
    createdAt: new Date().toISOString(),
  }));
  customers.push(...created);
  res.status(201).json(created);
});

app.post('/api/customers/:id/consume', (req, res) => {
  const customer = customers.find((c) => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const pointsEarned = Math.floor(amount * POINTS_PER_YUAN);
  const oldPoints = customer.points;
  customer.points += pointsEarned;
  customer.level = getLevelByPoints(customer.points);
  customer.lastConsumeTime = new Date().toISOString();

  const log = {
    id: generateId(),
    customerId: customer.id,
    points: pointsEarned,
    reason: '消费积分',
    amount,
    createdAt: new Date().toISOString(),
  };
  pointLogs.push(log);

  const reachedThreshold =
    oldPoints < POINTS_THRESHOLD && customer.points >= POINTS_THRESHOLD;

  res.json({ customer, log, reachedThreshold });
});

app.get('/api/point-logs/:customerId', (req, res) => {
  const logs = pointLogs
    .filter((l) => l.customerId === req.params.customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(logs);
});

app.get('/api/coupons', (req, res) => {
  const now = new Date();
  coupons.forEach((c) => {
    c.isExpired = new Date(c.expireDate) < now;
  });
  res.json(coupons);
});

app.post('/api/coupons', (req, res) => {
  const { type, name, value, threshold, expireDate } = req.body;
  if (!type || !name || !value || !expireDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const coupon = {
    id: generateId(),
    type,
    name,
    value,
    threshold,
    expireDate,
    isExpired: new Date(expireDate) < new Date(),
    createdAt: new Date().toISOString(),
  };
  coupons.push(coupon);
  res.status(201).json(coupon);
});

app.put('/api/coupons/:id', (req, res) => {
  const index = coupons.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Coupon not found' });

  coupons[index] = {
    ...coupons[index],
    ...req.body,
    isExpired: new Date(req.body.expireDate || coupons[index].expireDate) < new Date(),
  };
  res.json(coupons[index]);
});

app.delete('/api/coupons/:id', (req, res) => {
  const index = coupons.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Coupon not found' });

  coupons.splice(index, 1);
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const period = req.query.period || 'month';
  const now = new Date();
  let startDate;

  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 86400000);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const activeCoupons = coupons.filter((c) => !c.isExpired).length;
  const topCustomers = [...customers]
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  res.json({
    issuedCoupons: coupons.length,
    redeemedCoupons,
    activeCoupons,
    topCustomers,
    period,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
