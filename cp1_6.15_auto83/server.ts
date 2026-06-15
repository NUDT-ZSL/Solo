import express from 'express';

const app = express();
app.use(express.json());

const flowers = [
  { id: 1, name: '玫瑰', color: '#E74C3C', tag: 'rose' },
  { id: 2, name: '百合', color: '#F5F5DC', tag: 'lily' },
  { id: 3, name: '郁金香', color: '#FF69B4', tag: 'tulip' },
  { id: 4, name: '混搭', color: '#9B59B6', tag: 'mixed' },
  { id: 5, name: '向日葵', color: '#F1C40F', tag: 'sunflower' },
  { id: 6, name: '康乃馨', color: '#E91E63', tag: 'carnation' },
];

const customers = [
  { id: 1, name: '张三', phone: '13800138001' },
  { id: 2, name: '李四', phone: '13800138002' },
  { id: 3, name: '王五', phone: '13800138003' },
  { id: 4, name: '赵六', phone: '13800138004' },
  { id: 5, name: '孙七', phone: '13800138005' },
];

app.get('/api/flowers', (_req, res) => {
  res.json(flowers);
});

app.get('/api/customers', (_req, res) => {
  res.json(customers);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
