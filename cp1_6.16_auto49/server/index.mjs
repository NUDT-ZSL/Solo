import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const flowers = [
  { id: 'f1', name: '红玫瑰', price: 8, season: '四季', color: 'red' },
  { id: 'f2', name: '粉康乃馨', price: 5, season: '春季', color: 'pink' },
  { id: 'f3', name: '白百合', price: 10, season: '夏季', color: 'white' },
  { id: 'f4', name: '黄向日葵', price: 6, season: '夏季', color: 'yellow' },
  { id: 'f5', name: '紫薰衣草', price: 4, season: '夏季', color: 'purple' },
  { id: 'f6', name: '红康乃馨', price: 5, season: '春季', color: 'red' },
  { id: 'f7', name: '粉玫瑰', price: 8, season: '四季', color: 'pink' },
  { id: 'f8', name: '白玫瑰', price: 8, season: '四季', color: 'white' },
  { id: 'f9', name: '满天星', price: 3, season: '四季', color: 'white' },
  { id: 'f10', name: '紫罗兰', price: 6, season: '春季', color: 'purple' },
  { id: 'f11', name: '黄玫瑰', price: 8, season: '四季', color: 'yellow' },
  { id: 'f12', name: '绿雏菊', price: 3, season: '秋季', color: 'green' },
];

const occasions = [
  {
    id: 'o1',
    name: '情人节',
    recommendations: ['f1', 'f9'],
    discount: 0.85,
    description: '红玫瑰 + 满天星，浪漫经典搭配',
  },
  {
    id: 'o2',
    name: '母亲节',
    recommendations: ['f2', 'f9'],
    discount: 0.9,
    description: '粉康乃馨 + 满天星，温馨感恩之选',
  },
  {
    id: 'o3',
    name: '教师节',
    recommendations: ['f6', 'f9'],
    discount: 0.9,
    description: '红康乃馨 + 满天星，尊师重道',
  },
  {
    id: 'o4',
    name: '生日祝福',
    recommendations: ['f4', 'f5', 'f9'],
    discount: 0.95,
    description: '向日葵 + 薰衣草 + 满天星，阳光灿烂',
  },
  {
    id: 'o5',
    name: '求婚纪念',
    recommendations: ['f1', 'f3', 'f9'],
    discount: 0.8,
    description: '红玫瑰 + 白百合 + 满天星，圣洁浪漫',
  },
];

const orders = [];

app.get('/api/flowers', (req, res) => {
  setTimeout(() => res.json(flowers), 50);
});

app.get('/api/occasions', (req, res) => {
  setTimeout(() => res.json(occasions), 50);
});

app.post('/api/orders', (req, res) => {
  const order = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  setTimeout(() => res.json({ success: true, orderId: order.id }), 200);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Flower shop backend running on http://localhost:${PORT}`);
});
